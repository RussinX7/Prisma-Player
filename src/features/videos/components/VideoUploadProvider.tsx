"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseUrl } from "@/lib/supabase/env";

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
  status: "processing";
  created_at: string;
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

    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-150) || "video.mp4";
    const objectPath = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    const durationPromise = readDuration(file);
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: file.name, objectPath, mimeType: file.type, sizeBytes: file.size, folderId, status: "processing" }),
    });
    const payload = await response.json().catch(() => null) as { video?: CreatedVideo; error?: string } | null;
    if (!response.ok || !payload?.video) throw new Error(payload?.error || "Não foi possível preparar o envio.");

    const video = payload.video;
    setTasks((current) => [{ videoId: video.id, fileName: file.name, progress: 0, state: "uploading" }, ...current.filter((task) => task.videoId !== video.id)]);
    notifyVideosChanged();

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
        updateTask(video.id, finalize.ok ? { progress: 100, state: "completed" } : { state: "failed", error: "O arquivo chegou ao Storage, mas não foi publicado." });
        notifyVideosChanged();
      },
      async onError(error) {
        activeUploads.current.delete(video.id);
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
