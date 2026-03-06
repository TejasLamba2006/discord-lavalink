export function safeStringify(data: any): string {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof Buffer) {
    return data.toString();
  }

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function buildLavalinkUrl(baseUrl: string): URL {
  const url = new URL(baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname += `${url.pathname.endsWith('/') ? '' : '/'}v4/websocket`;

  return url;
}

export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1000, volume));
}
