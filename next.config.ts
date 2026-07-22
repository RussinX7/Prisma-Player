import type { NextConfig } from "next";

/**
 * `unsafe-inline` stays in script-src because the theme bootstrap, the JSON-LD
 * block and Next's own hydration payload are inline; a nonce would require
 * per-request rewriting in the proxy. The policy still blocks attacker-hosted
 * scripts, plugin content, <base> hijacking and off-site form posts.
 */
function contentSecurityPolicy(frameAncestors: string) {
  const scriptSrc = ["'self'", "'unsafe-inline'", process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com https://*.i.posthog.com https://*.posthog.com",
  ].join("; ");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async headers() {
    return [{
      source: "/embed/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: contentSecurityPolicy("*") },
      ],
    }, {
      source: "/:path((?!embed(?:/|$)).*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        { key: "Content-Security-Policy", value: contentSecurityPolicy("'self'") },
      ],
    }];
  },
};

export default nextConfig;
