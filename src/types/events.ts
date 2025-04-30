import { Info, PluginInfo } from "./search";

/**
 * Event interfaces for all events emitted by the Lavalink server
 * These are exported to allow for proper typing in application code
 */

/**
 * Event received when a connection to Lavalink is established
 */
export interface ReadyEvent {
  op: "ready";
  resumed: boolean;
  sessionId: string;
}

/**
 * Event containing server statistics periodically sent by Lavalink
 */
export interface StatsEvent {
  op: "stats";
  frameStats: null | {
    sent: number;
    nulled: number;
    deficit: number;
  };
  players: number;
  playingPlayers: number;
  uptime: number;
  memory: {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
}

/**
 * Event containing player state updates sent periodically by Lavalink
 */
export interface PlayerUpdateEvent {
  op: "playerUpdate";
  state: {
    time: number;
    position: number;
    connected: boolean;
    ping: number;
  };
  guildId: string;
}

/**
 * Event emitted when a track begins playing
 */
export interface TrackStartEvent {
  op: "event";
  type: "TrackStartEvent";
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
}

/**
 * Event emitted when a track finishes playing or is stopped
 */
export interface TrackEndEvent {
  op: "event";
  type: "TrackEndEvent";
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  reason: "finished" | "loadFailed" | "stopped" | "replaced" | "cleanup";
}

/**
 * Event emitted when an error occurs during track playback
 */
export interface TrackExceptionEvent {
  op: "event";
  type: "TrackExceptionEvent";
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  exception: {
    message: string | null;
    severity: "common" | "suspicious" | "fault";
    cause: string;
  };
}

/**
 * Event emitted when a track gets stuck during playback
 */
export interface TrackStuckEvent {
  op: "event";
  type: "TrackStuckEvent";
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  thresholdMs: number;
}

/**
 * Event emitted when the WebSocket connection to Discord voice servers is closed
 */
export interface WebSocketClosedEvent {
  op: "event";
  type: "WebSocketClosedEvent";
  guildId: string;
  code: number;
  reason: string;
  byRemote: boolean;
}

/**
 * Union type of all possible Lavalink events
 * Useful for type checking when handling events
 */
export type LavalinkEvent =
  | ReadyEvent
  | StatsEvent
  | PlayerUpdateEvent
  | TrackStartEvent
  | TrackEndEvent
  | TrackExceptionEvent
  | TrackStuckEvent
  | WebSocketClosedEvent;
