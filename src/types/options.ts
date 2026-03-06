import { Client } from 'discord.js';

export enum LogLevel {
  NORMAL = 'normal',
  DEBUG = 'debug',
}

export interface LavalinkOptions {
  client: Client;
  baseUrl: string;
  password: string;
  logLevel?: LogLevel;
  customOptions?: {
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
    headers?: Record<string, string>;
    clientName?: string;
  };
}

export interface PlayOptions {
  volume?: number;
  paused?: boolean;
  position?: number;
  filters?: Filters;
  noReplace?: boolean;
}

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
