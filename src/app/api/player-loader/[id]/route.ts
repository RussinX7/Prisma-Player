import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("/* Prisma Player: invalid id */", { status: 400, headers: { "content-type": "application/javascript; charset=utf-8" } });
  const script = `(()=>{const s=document.currentScript;const roots=[...document.querySelectorAll('[data-prisma-player="${id}"]')].filter(e=>!e.dataset.prismaMounted);for(const root of roots){root.dataset.prismaMounted='true';root.style.background='transparent';root.style.border='0';root.style.boxShadow='none';root.style.overflow='hidden';root.style.lineHeight='0';const mobile=root.dataset.mobilePlayer;const selected=mobile&&matchMedia('(max-width: 767px)').matches?mobile:'${id}';const mode=root.dataset.mode==='ab'?'/embed/ab/':'/embed/';const frame=document.createElement('iframe');const site=encodeURIComponent(location.href);frame.src=new URL(mode+selected+'?site='+site,s.src).origin+mode+selected+'?site='+site;frame.title=root.dataset.title||'Prisma Player';frame.loading=root.dataset.loading||'lazy';frame.allow='autoplay; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.scrolling='no';frame.referrerPolicy='strict-origin-when-cross-origin';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;display:block;overflow:hidden;background:transparent;color-scheme:normal';addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='prisma-player:resize'||event.data?.playerId!==selected)return;const height=Number(event.data.height);if(!Number.isFinite(height)||height<1)return;root.style.paddingTop='0';root.style.height=Math.ceil(height)+'px'},false);root.replaceChildren(frame)}})();`;
  return new NextResponse(script, { headers: {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "public, max-age=0, must-revalidate",
    "access-control-allow-origin": "*",
    "cross-origin-resource-policy": "cross-origin",
    "x-content-type-options": "nosniff",
  } });
}
