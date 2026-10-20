/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

export { DashboardUpdates } from "./dashboard-updates";

interface Env {
  DASHBOARD_UPDATES?: DurableObjectNamespace<import("./dashboard-updates").DashboardUpdates>;
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/dashboard-events") {
      if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response(null, { status: 426 });
      if (request.headers.get("Origin") !== url.origin) return new Response(null, { status: 403 });
      if (!env.DASHBOARD_UPDATES) return new Response(null, { status: 503 });
      return env.DASHBOARD_UPDATES.get(env.DASHBOARD_UPDATES.idFromName("store")).fetch(request);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    // The existing authenticated API completes its save before a notification.
    // Notification failure must never turn a completed save into a failed save.
    if (url.pathname === "/api/store" && request.method === "POST" && response.ok && env.DASHBOARD_UPDATES) {
      ctx.waitUntil(env.DASHBOARD_UPDATES.get(env.DASHBOARD_UPDATES.idFromName("store")).notify().catch(() => console.warn("Dashboard notification unavailable")));
    }
    return response;
  },
};

export default worker;
