"use client";
import { useEffect, useState } from "react";

export function useDashboardUpdates() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let pending: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let attempts = 0;
    const refresh = () => {
      clearTimeout(pending);
      pending = setTimeout(() => { if (!disposed) setRevision(value => value + 1); }, 250);
    };
    const connect = () => {
      if (disposed || document.hidden) return;
      socket = new WebSocket(location.origin.replace(/^http/, "ws") + "/api/dashboard-events");
      socket.onopen = () => { attempts = 0; refresh(); };
      socket.onmessage = event => {
        try { if (JSON.parse(event.data).type === "dashboard-updated") refresh(); } catch { /* Ignore malformed messages. */ }
      };
      socket.onclose = () => {
        if (!disposed && !document.hidden) retry = setTimeout(connect, Math.min(60000, 1000 * 2 ** Math.min(attempts++, 6)) + Math.random() * 1000);
      };
      socket.onerror = () => socket?.close();
    };
    const visibility = () => {
      clearTimeout(retry);
      if (document.hidden) socket?.close();
      else if (!socket || socket.readyState >= WebSocket.CLOSING) connect();
    };
    document.addEventListener("visibilitychange", visibility);
    connect();
    return () => { disposed = true; clearTimeout(retry); clearTimeout(pending); document.removeEventListener("visibilitychange", visibility); socket?.close(); };
  }, []);
  return revision;
}
