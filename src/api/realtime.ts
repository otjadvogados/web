import axios from 'utils/axios';

type Listener = (data: any) => void;
type ListenerMap = Record<string, Set<Listener>>;

export type RealtimeClient = {
  on(event: string, cb: Listener): void;
  off(event: string, cb: Listener): void;
  send(event: string, data: any): void;
  close(): void;
  readonly connected: boolean;
};

const listeners: ListenerMap = {};
let wsRef: WebSocket | null = null;
let connecting = false;
let pendingResolvers: Array<(client: RealtimeClient) => void> = [];

const fallbackOrigin =
  typeof window !== 'undefined' ? 'http://localhost:22211' : 'http://localhost:22211';
const envRealtimePath =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_REALTIME_PATH) || '/ws';

function getAuthToken(): string | undefined {
  try {
    const candidates = ['serviceToken', 'accessToken', 'token', 'access_token', 'jwt', 'authToken'];
    for (const key of candidates) {
      const val = localStorage.getItem(key);
      if (val && val !== 'undefined' && val.trim()) return val.trim();
    }
  } catch {}

  try {
    const auth =
      (axios as any)?.defaults?.headers?.common?.Authorization ||
      (axios as any)?.defaults?.headers?.Authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      if (token) return token;
    }
  } catch {}

  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (match && match[1]) {
      const token = decodeURIComponent(match[1]);
      if (token && token !== 'undefined' && token.trim()) return token.trim();
    }
  } catch {}

  return undefined;
}

function toWsScheme(url: string): string {
  if (url.startsWith('https://')) return url.replace('https://', 'wss://');
  if (url.startsWith('http://')) return url.replace('http://', 'ws://');
  return url;
}

function resolveBase(explicitBase?: string): string {
  const candidates = [
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_REALTIME_ORIGIN) || '',
    explicitBase || '',
    ((axios as any)?.defaults?.baseURL as string) || '',
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_API_URL) || ''
  ];

  for (const candidate of candidates) {
    const trimmed = (candidate || '').trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed, fallbackOrigin);
      return url.origin;
    } catch {
      // ignora e tenta o próximo
    }
  }

  return fallbackOrigin;
}

function buildWsUrl(explicitBase?: string): string {
  const baseOrigin = resolveBase(explicitBase);
  const wsOrigin = toWsScheme(baseOrigin.replace(/\/+$/, ''));
  const path = envRealtimePath.startsWith('/') ? envRealtimePath : `/${envRealtimePath}`;
  const token = getAuthToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${wsOrigin}${path}${query}`;
}

function flushResolvers(client: RealtimeClient) {
  if (!pendingResolvers.length) return;
  const resolvers = pendingResolvers.slice();
  pendingResolvers = [];
  for (const fn of resolvers) {
    try {
      fn(client);
    } catch {}
  }
}

function removeResolver(fn: (client: RealtimeClient) => void) {
  const idx = pendingResolvers.indexOf(fn);
  if (idx >= 0) pendingResolvers.splice(idx, 1);
}

const client: RealtimeClient = {
  on(event, cb) {
    (listeners[event] ||= new Set()).add(cb);
  },
  off(event, cb) {
    const set = listeners[event];
    if (!set) return;
    set.delete(cb);
    if (!set.size) delete listeners[event];
  },
  send(event, data) {
    if (wsRef && wsRef.readyState === WebSocket.OPEN) {
      try {
        wsRef.send(JSON.stringify({ event, data }));
      } catch {}
    }
  },
  close() {
    try {
      wsRef?.close();
    } catch {}
  },
  get connected() {
    return !!wsRef && wsRef.readyState === WebSocket.OPEN;
  }
};

function attachSocketHandlers(baseUrl?: string) {
  const url = buildWsUrl(baseUrl);
  const token = getAuthToken();

  try {
    wsRef?.close();
  } catch {}

  wsRef = token ? new WebSocket(url, ['bearer', token]) : new WebSocket(url);
  connecting = true;

  wsRef.onopen = () => {
    connecting = false;
    // eslint-disable-next-line no-console
    console.info('[realtime] open', { url, hasToken: !!token });
    flushResolvers(client);
  };

  wsRef.onclose = (ev) => {
    connecting = false;
    // eslint-disable-next-line no-console
    console.info('[realtime] close', { code: ev.code, reason: ev.reason });
    wsRef = null;
  };

  wsRef.onerror = (ev) => {
    // eslint-disable-next-line no-console
    console.warn('[realtime] error', ev);
  };

  wsRef.onmessage = (ev) => {
    let payload: any;
    try {
      payload = JSON.parse(ev.data);
    } catch {
      return;
    }

    const event = payload?.event;
    if (!event) return;

    const subs = listeners[event];
    if (!subs || !subs.size) return;

    const data = payload?.data;
    for (const cb of Array.from(subs)) {
      try {
        cb(data);
      } catch {}
    }
  };
}

export function getRealtimeSocket(baseUrl?: string): RealtimeClient {
  const state = wsRef?.readyState;
  if (state === WebSocket.OPEN || state === WebSocket.CONNECTING || connecting) {
    return client;
  }

  attachSocketHandlers(baseUrl);
  return client;
}

export function ensureRealtimeConnected(
  timeoutMs = 3000,
  baseUrl?: string
): Promise<RealtimeClient> {
  const realtime = getRealtimeSocket(baseUrl);
  if (realtime.connected) return Promise.resolve(realtime);

  return new Promise((resolve) => {
    let finished = false;
    const resolveOnce = (c: RealtimeClient) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      removeResolver(resolveOnce);
      resolve(c);
    };

    const timer = setTimeout(() => {
      resolveOnce(realtime);
    }, Math.max(800, timeoutMs));

    pendingResolvers.push(resolveOnce);
  });
}

// Tipagem básica do evento transmitido pelo backend
export type CaseProgressEvent = {
  ts?: string;
  runId?: string | null;
  kind: 'log' | 'phase' | 'ai';
  code?: string;
  message: string;
  meta?: any;
};

export type TimelineItem = {
  id: string;
  ts: number;
  runId: string | null;
  kind: 'log' | 'phase' | 'ai';
  code?: string;
  message: string;
  meta?: any;
};


