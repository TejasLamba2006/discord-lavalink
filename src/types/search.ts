/**
 * Search provider types supported by Lavalink and its plugins
 * Each provider has different capabilities and content availability
 */
export type SearchType =
  /** Standard YouTube search */
  | "ytsearch"
  /** YouTube Music search */
  | "ytmsearch"
  /** SoundCloud search */
  | "scsearch"
  /** Spotify search (requires Lavasrc plugin) */
  | "spsearch"
  /** Deezer search (requires Lavasrc plugin) */
  | "dzsearch"
  /** Apple Music search (requires Lavasrc plugin) */
  | "amsearch"
  /** Yandex Music search (requires Lavasrc plugin) */
  | "ymsearch";

/**
 * Result of a track search or load operation
 */
export interface TracksResult {
  /**
   * Type of result returned by Lavalink
   * - track: A single track was loaded
   * - playlist: A playlist was loaded
   * - search: Search results were returned
   * - empty: No matches were found
   * - error: An error occurred
   */
  loadType: "track" | "playlist" | "search" | "empty" | "error";
  /**
   * Array of track data returned by Lavalink
   */
  data: Datum[];
}

/**
 * Represents a single track returned by Lavalink
 */
export interface Datum {
  /**
   * Base64 encoded track data used for playback
   */
  encoded: string;
  /**
   * Metadata about the track
   */
  info: Info;
  /**
   * Additional data provided by Lavalink plugins
   */
  pluginInfo: PluginInfo;
  /**
   * User-defined data associated with the track
   */
  userData: PluginInfo;
}

/**
 * Additional information provided by Lavalink plugins
 */
export interface PluginInfo {
  /**
   * Dynamic key-value pairs that vary by plugin
   */
  [key: string]: any;
}

/**
 * Metadata information about a track
 */
export interface Info {
  /**
   * Unique identifier for the track
   */
  identifier: string;
  /**
   * Whether the track supports seeking
   */
  isSeekable: boolean;
  /**
   * Creator or artist of the track
   */
  author: string;
  /**
   * Duration of the track in milliseconds
   */
  length: number;
  /**
   * Whether the track is a livestream
   */
  isStream: boolean;
  /**
   * Current position in the track in milliseconds
   */
  position: number;
  /**
   * Title of the track
   */
  title: string;
  /**
   * URI/URL of the track
   */
  uri: string;
  /**
   * Name of the source (e.g., "youtube", "spotify")
   */
  sourceName: string;
  /**
   * URL to the track's artwork/thumbnail
   */
  artworkUrl: string;
  /**
   * International Standard Recording Code (if available)
   */
  isrc: null | string;
}
