/**
 * Safely converts WebSocket data to a string representation
 * @param data - The data to convert to a string
 * @returns The string representation of the data
 */
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
    // If JSON.stringify fails, fall back to String constructor
    return String(data);
  }
}

/**
 * Builds a WebSocket URL for Lavalink from the base HTTP URL
 * @param baseUrl - The base HTTP URL of the Lavalink server
 * @returns A URL object with the correct protocol and path for WebSocket connection
 */
export function buildLavalinkUrl(baseUrl: string): URL {
  const url = new URL(baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname += `${url.pathname.endsWith('/') ? '' : '/'}v4/websocket`;

  return url;
}

/**
 * Ensures volume is within the valid range for Lavalink (0-1000)
 * @param volume - The volume value to clamp
 * @returns The volume value clamped between 0 and 1000
 */
export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1000, volume));
}
