"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseUrl } from "@/lib/supabase/env";
import posthog from "posthog-js";

export interface VideoUploadTask {
  videoId: string;
  fileName: string;
  progress: number;
  state: "uploading" | "completed" | "failed";
  error?: string;
}

interface CreatedVideo {
  id: string;
  title: string;
  folder_id: string | null;
  mime_type: string;
  object_path: string;
  status: "processing";
  created_at: string;
  storage_provider: "supabase" | "r2";
}

interface VideoUploadContextValue {
  tasks: VideoUploadTask[];
  startUpload: (file: File, folderId: string | null) => Promise<CreatedVideo>;
}

const VideoUploadContext = createContext<VideoUploadContextValue | null>(null);

function storageEndpoint() {
  const url = new URL(getSupabaseUrl());
  const projectRef = url.hostname.split(".")[0];
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}

function readDuration(file: File) {
  return new Promise<number>((resolve) => {
    const element = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (duration = 0) => {
      URL.revokeObjectURL(url);
      element.removeAttribute("src");
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    element.preload = "metadata";
    element.onloadedmetadata = () => finish(element.duration);
    element.onerror = () => finish();
    element.src = url;
  });
}

export function VideoUploadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<VideoUploadTask[]>([]);
  const activeUploads = useRef(new Map<string, tus.Upload>());

  const updateTask = useCallback((videoId: string, updates: Partial<VideoUploadTask>) => {
    setTasks((current) => current.map((task) => task.videoId === videoId ? { ...task, ...updates } : task));
  }, []);

  const notifyVideosChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent("prisma:videos-changed"));
  }, []);

  const startUpload = useCallback(async (file: File, folderId: string | null) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sua sessão expirou. Entre novamente para enviar o vídeo.");

    const durationPromise = readDuration(file);
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: file.name, fileName: file.name, mimeType: file.type, sizeBytes: file.size, folderId, status: "processing" }),
    });
    const payload = await response.json().catch(() => null) as { video?: CreatedVideo; error?: string; message?: string } | null;
    if (!response.ok || !payload?.video) throw new Error(payload?.message || payload?.error || "Não foi possível preparar o envio.");

    const video = payload.video;
    // O caminho do objeto agora é decidido pelo servidor: usar o valor devolvido
    // mantém o upload alinhado com a linha gravada em `videos`.
    const objectPath = video.object_path;
    setTasks((current) => [{ videoId: video.id, fileName: file.name, progress: 0, state: "uploading" }, ...current.filter((task) => task.videoId !== video.id)]);
    notifyVideosChanged();

    if (video.storage_provider === "r2") {
      void (async () => {
        let uploadId = "";
        try {
          const initResponse = await fetch(`/api/videos/${video.id}/multipart`, {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create" }),
          });
          const init = await initResponse.json() as { uploadId?: string; partSize?: number; error?: string; message?: string };
          if (!initResponse.ok || !init.uploadId || !init.partSize) throw new Error(init.message || init.error || "Não foi possível iniciar o upload no R2.");
          uploadId = init.uploadId;
          const partCount = Math.ceil(file.size / init.partSize);
          const completed: Array<{ etag: string; partNumber: number }> = [];
          let nextPart = 1;
          let uploadedBytes = 0;

          const worker = async () => {
            while (nextPart <= partCount) {
              const partNumber = nextPart++;
              const start = (partNumber - 1) * init.partSize!;
              const end = Math.min(file.size, start + init.partSize!);
              const signResponse = await fetch(`/api/videos/${video.id}/multipart`, {
                method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign", uploadId, partNumber }),
              });
              const signed = await signResponse.json() as { url?: string; error?: string; message?: string };
              if (!signResponse.ok || !signed.url) throw new Error(signed.message || signed.error || "Falha ao autorizar uma parte do upload.");
              const uploadResponse = await fetch(signed.url, { method: "PUT", body: file.slice(start, end) });
              const etag = uploadResponse.headers.get("etag");
              if (!uploadResponse.ok || !etag) throw new Error("O R2 não confirmou uma parte do arquivo. Confira o CORS do bucket.");
              completed.push({ etag, partNumber });
              uploadedBytes += end - start;
              updateTask(video.id, { progress: Math.min(99, Math.round((uploadedBytes / file.size) * 100)) });
            }
          };
          await Promise.all(Array.from({ length: Math.min(3, partCount) }, () => worker()));
          const duration = await durationPromise;
          const completeResponse = await fetch(`/api/videos/${video.id}/multipart`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "complete", uploadId, parts: completed, durationSeconds: duration || null }),
          });
          const complete = await completeResponse.json().catch(() => null) as { error?: string; message?: string } | null;
          if (!completeResponse.ok) throw new Error(complete?.message || complete?.error || "O arquivo chegou ao R2, mas não foi publicado.");
          posthog.capture("video_upload_completed", { storage_provider: "r2", file_name: file.name, size_bytes: file.size });
          updateTask(video.id, { progress: 100, state: "completed" });
        } catch (error) {
          if (uploadId) await fetch(`/api/videos/${video.id}/multipart`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "abort", uploadId }) }).catch(() => undefined);
          posthog.capture("video_upload_failed", { storage_provider: "r2", file_name: file.name, size_bytes: file.size, error: error instanceof Error ? error.message : "unknown" });
          updateTask(video.id, { state: "failed", error: error instanceof Error ? error.message : "Falha no envio ao R2." });
        } finally {
          notifyVideosChanged();
        }
      })();
      return video;
    }

    const upload = new tus.Upload(file, {
      endpoint: storageEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, "x-upsert": "false" },
      async onBeforeRequest(request) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) throw new Error("Sua sessão expirou durante o upload. Entre novamente e tente outra vez.");
        request.setHeader("authorization", `Bearer ${currentSession.access_token}`);
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: "videos",
        objectName: objectPath,
        contentType: file.type || "video/mp4",
        cacheControl: "31536000",
      },
      onProgress(bytesUploaded, bytesTotal) {
        const progress = bytesTotal > 0 ? Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)) : 0;
        updateTask(video.id, { progress });
      },
      async onSuccess() {
        activeUploads.current.delete(video.id);
        const duration = await durationPromise;
        const finalize = await fetch(`/api/videos/${video.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "ready", durationSeconds: duration || null }),
        });
        if (finalize.ok) {
          posthog.capture("video_upload_completed", { storage_provider: "supabase", file_name: file.name, size_bytes: file.size });
          updateTask(video.id, { progress: 100, state: "completed" });
        } else {
          updateTask(video.id, { state: "failed", error: "O arquivo chegou ao Storage, mas não foi publicado." });
        }
        notifyVideosChanged();
      },
      async onError(error) {
        activeUploads.current.delete(video.id);
        posthog.capture("video_upload_failed", { storage_provider: "supabase", file_name: file.name, size_bytes: file.size, error: error.message || "unknown" });
        updateTask(video.id, { state: "failed", error: error.message || "Falha no envio." });
        await fetch(`/api/videos/${video.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "failed" }) });
        notifyVideosChanged();
      },
    });

    activeUploads.current.set(video.id, upload);
    upload.start();
    return video;
  }, [notifyVideosChanged, updateTask]);

  const value = useMemo(() => ({ tasks, startUpload }), [startUpload, tasks]);
  return <VideoUploadContext.Provider value={value}>{children}</VideoUploadContext.Provider>;
}

export function useVideoUploads() {
  const context = useContext(VideoUploadContext);
  if (!context) throw new Error("useVideoUploads must be used inside VideoUploadProvider");
  return context;
}
