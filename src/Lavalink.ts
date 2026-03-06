import axios, { AxiosError, AxiosInstance } from 'axios';
import { GatewayDispatchEvents, type Client } from 'discord.js';
import { WebSocket } from 'ws';

export class Lavalink {
  private readonly client: Client;
  private readonly baseUrl: string;
  private readonly password: string;
  private lavalink?: WebSocket;
  private readonly rest: AxiosInstance;
  private sessionId?: string;
  private stats?: {
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
  };
  private readonly reconnectInterval = 5000;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly voiceUpdates: Record<string, any> = {};
  private readonly eventListeners: Record<string, Function[]> = {};

  constructor({ client, baseUrl, password }: LavalinkOptions) {
    this.client = client;
    this.baseUrl = baseUrl;
    this.password = password;
    this.rest = axios.create({
      baseURL: this.baseUrl + '/v4',
      headers: {
        Authorization: this.password,
      },
    });

    client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => {
      const guildId = data.guild_id;
      console.log(`Received VOICE_STATE_UPDATE for guild ${guildId}`);

      this.voiceUpdates[guildId] ??= {};

      if (data.user_id === this.client.user?.id) {
        this.voiceUpdates[guildId].sessionId = data.session_id;
        this.voiceUpdates[guildId].channelId = data.channel_id;
      }

      // Only attempt to send voice update if we have a session
      if (this.sessionId) {
        this.sendVoiceUpdate(guildId).catch((err) => {
          console.error(`Error handling voice state update for guild ${guildId}:`, err);
        });
      } else {
        console.log(`Storing voice state update for guild ${guildId} (waiting for session)`);
      }
    });

    client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) => {
      const guildId = data.guild_id;
      console.log(`Received VOICE_SERVER_UPDATE for guild ${guildId}`);

      this.voiceUpdates[guildId] ??= {};
      this.voiceUpdates[guildId].event = data;

      // Only attempt to send voice update if we have a session
      if (this.sessionId) {
        this.sendVoiceUpdate(guildId).catch((err) => {
          console.error(`Error handling voice server update for guild ${guildId}:`, err);
        });
      } else {
        console.log(`Storing voice server update for guild ${guildId} (waiting for session)`);
      }
    });
  }

  /**
   * Connect to the Lavalink server
   * @param resumeSessionId Optional session ID to resume
   */
  connect(resumeSessionId?: string) {
    const url = new URL(
      this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, this.baseUrl.length - 1) : this.baseUrl
    );
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname += `${url.pathname.endsWith('/') ? '' : '/'}v4/websocket`;

    console.log(`Connecting to Lavalink at ${url.toString()}`);

    const headers: Record<string, string> = {
      Authorization: this.password,
      'User-Id': this.client.application?.id ?? '',
      'Client-Name': `tfi-lavalink/1.0.0`, // Proper format as per docs
    };

    // Add session ID for resuming if provided
    if (resumeSessionId) {
      headers['Session-Id'] = resumeSessionId;
    }

    this.lavalink = new WebSocket(url.toString(), { headers });

    this.lavalink.on('open', () => {
      console.log('Lavalink WebSocket connection established');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    });

    this.lavalink.on('error', (error) => {
      console.error('Lavalink WebSocket error:', error);
    });

    this.lavalink.on('close', (code, reason) => {
      console.log(`Lavalink WebSocket closed with code ${code}: ${reason}`);
      this.handleReconnect();
    });

    this.lavalink.on('message', (data) => {
      try {
        // Convert WebSocket data to string safely
        const messageText =
          typeof data === 'string'
            ? data
            : data instanceof Buffer
              ? data.toString()
              : JSON.stringify(data);
        const payload = JSON.parse(messageText);
        console.log('Received Lavalink message:', payload.op);

        if (payload.op === 'ready') {
          this.sessionId = payload.sessionId;
          console.log(`Lavalink session established with ID: ${this.sessionId}`);
          console.log(`Session resumed: ${payload.resumed}`);
          this.emit('ready', payload);

          // Process any pending voice updates now that we have a session
          this.processPendingVoiceUpdates();
        } else if (payload.op === 'stats') {
          const statsData = { ...payload };
          delete statsData.op;
          this.stats = statsData;
          this.emit('stats', statsData);
        } else if (payload.op === 'playerUpdate') {
          console.log(`Player update for guild ${payload.guildId}:`, payload.state);
          this.emit('playerUpdate', payload);
        } else if (payload.op === 'event') {
          console.log(`Event received: ${payload.type} for guild ${payload.guildId}`);
          this.handleEvent(payload);
        } else {
          console.log('Unknown payload:', payload);
        }
      } catch (error) {
        console.error('Error parsing Lavalink message:', error);
      }
    });
  }

  /**
   * Handle reconnection to Lavalink
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;
    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      console.log('Reconnecting to Lavalink...');
      this.connect(this.sessionId); // Try to resume the session
    }, delay);
  }

  /**
   * Handle Lavalink events
   */
  private handleEvent(payload: any) {
    switch (payload.type) {
      case 'TrackStartEvent':
        this.emit('trackStart', payload);
        break;
      case 'TrackEndEvent':
        this.emit('trackEnd', payload);
        break;
      case 'TrackExceptionEvent':
        this.emit('trackException', payload);
        break;
      case 'TrackStuckEvent':
        this.emit('trackStuck', payload);
        break;
      case 'WebSocketClosedEvent':
        this.emit('webSocketClosed', payload);
        break;
      default:
        console.log(`Unhandled event type: ${payload.type}`);
    }
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: Function) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(callback);
    return this;
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: string, data: any) {
    const callbacks = this.eventListeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Disconnect from Lavalink
   */
  disconnect() {
    if (this.lavalink) {
      this.lavalink.close();
      this.lavalink = undefined;
    }
  }

  /**
   * Configure session for resuming
   * @param timeout Timeout in seconds
   */
  async configureResuming(timeout: number = 60) {
    if (!this.sessionId) {
      throw new Error('Cannot configure resuming without an active session');
    }

    try {
      await this.rest.patch(`/sessions/${this.sessionId}`, {
        resuming: true,
        timeout,
      });
      console.log(`Configured session resuming with timeout: ${timeout}s`);
      return true;
    } catch (error) {
      console.error('Failed to configure session resuming:', error);
      return false;
    }
  }

  /**
   * Search for tracks
   * @param query Search query
   * @param searchType Search type (default: ytmsearch - YouTube Music search)
   */
  async tracks(query: string, searchType: SearchType = 'ytmsearch') {
    try {
      if (query.startsWith('http')) {
        if (query.includes('spotify.com') || query.includes('deezer.com')) {
          return this.loadTracks(query);
        }
      }

      // Regular search
      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: {
          identifier: `${searchType}:${query}`,
        },
      });
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error searching for tracks: ${axiosError.message}`);
      throw new Error(`Failed to search for tracks: ${axiosError.message}`);
    }
  }

  /**
   * Load tracks directly from a URL or identifier
   * @param identifier The URL or identifier to load
   */
  async loadTracks(identifier: string): Promise<TracksResult> {
    try {
      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: { identifier },
      });
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error loading tracks: ${axiosError.message}`);
      throw new Error(`Failed to load tracks: ${axiosError.message}`);
    }
  }

  /**
   * Play a track in a guild
   * @param guildId Guild ID
   * @param track Track to play
   * @param options Play options
   */
  async play(guildId: string, track: TracksResult | Datum | string, options: PlayOptions = {}) {
    if (!this.sessionId) {
      throw new Error('Lavalink play called before WebSocket connection was initiated.');
    }

    let trackData: {
      encoded?: string;
      identifier?: string;
    } | null = null;

    if (typeof track === 'string') {
      // If it's a base64 encoded track (longer than 15 chars), use it directly
      // Otherwise treat it as an identifier
      trackData = track.length > 15 ? { encoded: track } : { identifier: track };
    } else if ('data' in track && Array.isArray(track.data) && track.data.length > 0) {
      // It's a search result
      trackData = { encoded: track.data[0]?.encoded };
    } else if ('info' in track && 'encoded' in track) {
      // It's a track object
      trackData = { encoded: track.encoded };
    }

    if (!trackData) {
      throw new Error(`[Lavalink] Invalid track data: ${JSON.stringify(track)}`);
    }

    try {
      const playerUpdate = {
        track: trackData,
        volume: options.volume ?? 100,
        paused: options.paused ?? false,
        position: options.position,
        filters: options.filters,
      };

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, playerUpdate);

      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error playing track: ${axiosError.message}`);
      throw new Error(`Failed to play track: ${axiosError.message}`);
    }
  }

  /**
   * Stop playback in a guild
   * @param guildId Guild ID
   */
  async stop(guildId: string) {
    if (!this.sessionId) {
      throw new Error('Lavalink stop called before WebSocket connection was initiated.');
    }

    try {
      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        track: null,
      });
      return true;
    } catch (error) {
      console.error('Error stopping playback:', error);
      return false;
    }
  }

  /**
   * Pause or resume playback in a guild
   * @param guildId Guild ID
   * @param paused Whether to pause or resume
   */
  async pause(guildId: string, paused: boolean = true) {
    if (!this.sessionId) {
      throw new Error('Lavalink pause called before WebSocket connection was initiated.');
    }

    try {
      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        paused,
      });
      return true;
    } catch (error) {
      console.error(`Error ${paused ? 'pausing' : 'resuming'} playback:`, error);
      return false;
    }
  }

  /**
   * Seek to a position in the current track
   * @param guildId Guild ID
   * @param position Position in milliseconds
   */
  async seek(guildId: string, position: number) {
    if (!this.sessionId) {
      throw new Error('Lavalink seek called before WebSocket connection was initiated.');
    }

    try {
      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        position,
      });
      return true;
    } catch (error) {
      console.error('Error seeking:', error);
      return false;
    }
  }

  /**
   * Set volume for a guild
   * @param guildId Guild ID
   * @param volume Volume (0-1000)
   */
  async setVolume(guildId: string, volume: number) {
    if (!this.sessionId) {
      throw new Error('Lavalink setVolume called before WebSocket connection was initiated.');
    }

    // Ensure volume is within valid range
    volume = Math.max(0, Math.min(1000, volume));

    try {
      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        volume,
      });
      return true;
    } catch (error) {
      console.error('Error setting volume:', error);
      return false;
    }
  }

  /**
   * Get player information for a guild
   * @param guildId Guild ID
   */
  async getPlayer(guildId: string) {
    if (!this.sessionId) {
      throw new Error('Lavalink getPlayer called before WebSocket connection was initiated.');
    }

    try {
      const { data } = await this.rest.get(`/sessions/${this.sessionId}/players/${guildId}`);
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null; // Player doesn't exist
      }
      console.error('Error getting player:', error);
      throw error;
    }
  }

  /**
   * Process any pending voice updates that were received before the session was established
   */
  private processPendingVoiceUpdates() {
    console.log('Processing pending voice updates...');

    // Process all guilds with pending voice updates
    Object.keys(this.voiceUpdates).forEach((guildId) => {
      if (this.voiceUpdates[guildId]?.sessionId && this.voiceUpdates[guildId]?.event) {
        console.log(`Processing pending voice update for guild ${guildId}`);
        this.sendVoiceUpdate(guildId).catch((err) => {
          console.error(`Error processing pending voice update for guild ${guildId}:`, err);
        });
      }
    });
  }

  /**
   * Send voice update to Lavalink
   * This forwards Discord voice connection information to Lavalink
   * In Lavalink v4, voice updates are sent via the REST API, not WebSocket
   * @param guildId Guild ID
   */
  private async sendVoiceUpdate(guildId: string) {
    if (
      this.sessionId &&
      this.voiceUpdates[guildId]?.sessionId &&
      this.voiceUpdates[guildId]?.channelId &&
      this.voiceUpdates[guildId]?.event
    ) {
      try {
        // In Lavalink v4, we need to use the REST API to update voice state
        const voiceData = {
          voice: {
            token: this.voiceUpdates[guildId].event.token,
            endpoint: this.voiceUpdates[guildId].event.endpoint,
            sessionId: this.voiceUpdates[guildId].sessionId,
          },
        };

        console.log(
          `Sending voice update to Lavalink via REST API for guild ${guildId}:`,
          JSON.stringify(voiceData)
        );

        // Update the player with voice information
        await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, voiceData);

        console.log(`Voice update for guild ${guildId} sent successfully`);
      } catch (error) {
        console.error(`Error sending voice update for guild ${guildId}:`, error);
      }
    } else {
      console.log(`Incomplete voice data for guild ${guildId}, waiting for more updates`);
    }
  }
}
export interface LavalinkOptions {
  client: Client;
  baseUrl: string;
  password: string;
}

export interface PlayOptions {
  volume?: number;
  paused?: boolean;
  position?: number;
  filters?: Filters;
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

/**
 * Search types supported by Lavalink and its plugins
 */
export type SearchType =
  | 'ytsearch' // YouTube search
  | 'ytmsearch' // YouTube Music search
  | 'scsearch' // SoundCloud search
  | 'spsearch' // Spotify search (via Lavasrc plugin)
  | 'dzsearch' // Deezer search (via Lavasrc plugin)
  | 'amsearch' // Apple Music search (via Lavasrc plugin)
  | 'ymsearch'; // Yandex Music search (via Lavasrc plugin)

export interface TracksResult {
  loadType: 'track' | 'playlist' | 'search' | 'empty' | 'error';
  data: Datum[];
}

export interface Datum {
  encoded: string;
  info: Info;
  pluginInfo: PluginInfo;
  userData: PluginInfo;
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

// The following interfaces document the structure of events received from Lavalink
// They are exported for use in applications that need to handle these events

/**
 * Ready event received when connection is established
 */
export interface ReadyEvent {
  op: 'ready';
  resumed: boolean;
  sessionId: string;
}

/**
 * Stats event received periodically with node statistics
 */
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

/**
 * Player update event received with current player state
 */
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

/**
 * Track start event received when a track starts playing
 */
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

/**
 * Track end event received when a track ends
 */
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

/**
 * Track exception event received when a track throws an exception
 */
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

/**
 * Track stuck event received when a track gets stuck
 */
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

/**
 * WebSocket closed event received when the connection to Discord voice servers is closed
 */
export interface WebSocketClosedEvent {
  op: 'event';
  type: 'WebSocketClosedEvent';
  guildId: string;
  code: number;
  reason: string;
  byRemote: boolean;
}

// Note: The interfaces above document the structure of events received from Lavalink
// They are not directly used in the code but serve as reference for developers
