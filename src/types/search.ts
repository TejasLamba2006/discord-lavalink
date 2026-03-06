export type SearchType =
  | 'ytsearch'
  | 'ytmsearch'
  | 'scsearch'
  | 'spsearch'
  | 'dzsearch'
  | 'amsearch'
  | 'ymsearch';

export interface PlaylistInfo {
  name: string;
  selectedTrack: number;
}

export interface PluginInfo {
  [key: string]: any;
}

export interface Info {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  sourceName: string;
  artworkUrl: string;
  isrc: null | string;
}

export interface Datum {
  encoded: string;
  info: Info;
  pluginInfo: PluginInfo;
  userData: PluginInfo;
}

export type TracksResult =
  | { loadType: 'track'; data: Datum }
  | { loadType: 'playlist'; data: { info: PlaylistInfo; pluginInfo: PluginInfo; tracks: Datum[] } }
  | { loadType: 'search'; data: Datum[] }
  | { loadType: 'empty'; data: Record<string, never> }
  | {
      loadType: 'error';
      data: { message: string; severity: 'common' | 'suspicious' | 'fault'; cause: string };
    };
