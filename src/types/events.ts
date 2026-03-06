import { Info, PluginInfo } from './search';

export interface ReadyEvent {
  op: 'ready';
  resumed: boolean;
  sessionId: string;
}

export interface StatsEvent {
  op: 'stats';
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

export interface PlayerUpdateEvent {
  op: 'playerUpdate';
  state: {
    time: number;
    position: number;
    connected: boolean;
    ping: number;
  };
  guildId: string;
}

export interface TrackStartEvent {
  op: 'event';
  type: 'TrackStartEvent';
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
}

export interface TrackEndEvent {
  op: 'event';
  type: 'TrackEndEvent';
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  reason: 'finished' | 'loadFailed' | 'stopped' | 'replaced' | 'cleanup';
}

export interface TrackExceptionEvent {
  op: 'event';
  type: 'TrackExceptionEvent';
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  exception: {
    message: string | null;
    severity: 'common' | 'suspicious' | 'fault';
    cause: string;
  };
}

export interface TrackStuckEvent {
  op: 'event';
  type: 'TrackStuckEvent';
  guildId: string;
  track: {
    encoded: string;
    info: Info;
    pluginInfo: PluginInfo;
    userData: PluginInfo;
  };
  thresholdMs: number;
}

export interface WebSocketClosedEvent {
  op: 'event';
  type: 'WebSocketClosedEvent';
  guildId: string;
  code: number;
  reason: string;
  byRemote: boolean;
}

export type LavalinkEvent =
  | ReadyEvent
  | StatsEvent
  | PlayerUpdateEvent
  | TrackStartEvent
  | TrackEndEvent
  | TrackExceptionEvent
  | TrackStuckEvent
  | WebSocketClosedEvent;
