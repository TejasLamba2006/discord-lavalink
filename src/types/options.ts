import { Client } from 'discord.js';

/**
 * Log level for controlling the verbosity of logging
 */
export enum LogLevel {
  /**
   * Only log errors and critical information
   */
  NORMAL = 'normal',

  /**
   * Log everything including debug information
   */
  DEBUG = 'debug',
}

/**
 * Configuration options for initializing the Lavalink client
 */
export interface LavalinkOptions {
  /**
   * Discord.js client instance
   */
  client: Client;

  /**
   * Base URL of the Lavalink server (e.g., "http://localhost:2333")
   */
  baseUrl: string;

  /**
   * Password for authenticating with the Lavalink server
   */
  password: string;

  /**
   * Controls the verbosity of logging
   * @default LogLevel.NORMAL
   */
  logLevel?: LogLevel;
  /**
   * Additional configuration options for fine-tuning the client behavior
   */
  customOptions?: {
    /**
     * Maximum number of reconnection attempts when connection is lost
     * @default 5
     */
    maxReconnectAttempts?: number;
    /**
     * Delay between reconnection attempts in milliseconds
     * @default 5000
     */
    reconnectInterval?: number;
    /**
     * Custom headers to send with the WebSocket connection
     */
    headers?: Record<string, string>;
    /**
     * Custom client name identifier
     * @default "discord-lavalink/1.0.0"
     */
    clientName?: string;
  };
}

/**
 * Options for controlling track playback behavior
 */
export interface PlayOptions {
  /**
   * Volume level for playback (0-1000, where 100 is normal volume)
   */
  volume?: number;
  /**
   * Whether playback should start in a paused state
   */
  paused?: boolean;
  /**
   * Position in milliseconds to start playback from
   */
  position?: number;
  /**
   * Audio filters to apply to the track
   * @see {@link Filters}
   */
  filters?: Filters;
}

/**
 * Audio filters that can be applied to modify the sound output
 */
export interface Filters {
  volume?: number;
  equalizer?: Equalizer[];
  karaoke?: Karaoke;
  timescale?: Timescale;
  tremolo?: Tremolo;
  vibrato?: Vibrato;
  rotation?: Rotation;
  distortion?: Distortion;
  channelMix?: ChannelMix;
  lowPass?: LowPass;
  pluginFilters?: Record<string, any>;
}

export interface Equalizer {
  band: number;
  gain: number;
}

export interface Karaoke {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface Timescale {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface Tremolo {
  frequency?: number;
  depth?: number;
}

export interface Vibrato {
  frequency?: number;
  depth?: number;
}

export interface Rotation {
  rotationHz?: number;
}

export interface Distortion {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}

export interface ChannelMix {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}

export interface LowPass {
  smoothing?: number;
}
