import { DurableObject } from "cloudflare:workers";

// Holds connections only. No business data, credentials or database writes.
export class DashboardUpdates extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response(null, { status: 426 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  notify() {
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send('{"type":"dashboard-updated"}'); } catch { socket.close(1011, "Reconnect"); }
    }
  }
  webSocketMessage(socket: WebSocket) { socket.close(1008, "Read-only connection"); }
}
