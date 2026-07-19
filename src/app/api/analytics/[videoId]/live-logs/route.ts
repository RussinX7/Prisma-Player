import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { videoId } = await context.params;
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.toUpperCase() ?? "";

  const supabase = await createClient();

  // Verify ownership
  const { data: video } = await supabase
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  }

  // Get last 50 events for this video and country in the last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  let query = supabase
    .from("video_events")
    .select("session_id, event_type, progress_percent, device_type, created_at")
    .eq("video_id", videoId)
    .gt("created_at", last24h);

  if (country && country !== "DESCONHECIDO" && country !== "XX") {
    query = query.eq("country_code", country);
  }

  const { data: events, error } = await query
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "failed_to_load_live_logs" }, { status: 500 });
  }

  const logs = (events ?? []).map((row) => {
    let eventName = "Acessou a página";
    if (row.event_type === "play") eventName = "Iniciou a reprodução (Play)";
    else if (row.event_type === "complete") eventName = "Concluiu o vídeo (100%)";
    else if (row.event_type === "cta_click") eventName = "Clicou no CTA de Compra";
    else if (row.event_type === "conversion") eventName = "Conversão Aprovada";
    else if (row.event_type === "progress") {
      eventName = `Chegou a ${row.progress_percent}% do vídeo`;
    }

    const deviceName = row.device_type === "mobile" ? "Mobile"
      : row.device_type === "tablet" ? "Tablet"
      : row.device_type === "desktop" ? "Desktop" : "Outro";

    return {
      id: `${row.session_id}-${row.event_type}-${row.progress_percent}-${row.created_at}`,
      time: new Date(row.created_at).toLocaleTimeString("pt-BR"),
      event: eventName,
      device: deviceName,
    };
  });

  return NextResponse.json({ logs }, { headers: { "Cache-Control": "no-store" } });
}
