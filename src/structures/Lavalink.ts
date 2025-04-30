import axios, { AxiosInstance, AxiosError } from 'axios';
import { GatewayDispatchEvents, type Client } from 'discord.js';
import { WebSocket } from 'ws';
import { LavalinkOptions, PlayOptions, SearchType, TracksResult, Datum, LogLevel } from '../types';
import { buildLavalinkUrl, clampVolume, safeStringify } from '../utils/helpers';

export class Lavalink {
  private readonly client: Client;
  private readonly baseUrl: string;
  private readonly password: string;
  private lavalink?: WebSocket;
  private readonly rest: AxiosInstance;
  private sessionId?: string;
  // Stats data received from Lavalink
  private stats?: Record<string, any>;
  private readonly reconnectInterval: number;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly voiceUpdates: Record<string, any> = {};
  private readonly eventListeners: Record<string, Array<(...args: any[]) => void>> = {};
  private readonly clientName: string;
  private readonly customHeaders: Record<string, string>;
  private readonly logLevel: LogLevel;

  constructor(options: LavalinkOptions) {
    this.client = options.client;
    this.baseUrl = options.baseUrl;
    this.password = options.password;
    this.logLevel = options.logLevel ?? LogLevel.NORMAL;

    // Set custom options or defaults
    this.reconnectInterval = options.customOptions?.reconnectInterval ?? 5000;
    this.maxReconnectAttempts = options.customOptions?.maxReconnectAttempts ?? 5;
    this.clientName = options.customOptions?.clientName ?? 'discord-lavalink/1.0.0';
    this.customHeaders = options.customOptions?.headers ?? {};

    // Create REST client
    this.rest = axios.create({
      baseURL: this.baseUrl + '/v4',
      headers: {
        Authorization: this.password,
      },
    });

    // Set up voice state handling
    this.setupVoiceStateHandling();
  }

  /**
   * Logs a message based on the current log level
   * @param message - The message to log
   * @param level - The log level of this message
   * @param data - Optional data to include with the log
   * @private
   */
  private log(message: string, level: LogLevel = LogLevel.DEBUG, ...data: any[]): void {
    if (level === LogLevel.NORMAL && this.logLevel === LogLevel.NORMAL) {
      console.error(message, ...data);
    } else if (this.logLevel === LogLevel.DEBUG) {
      if (level === LogLevel.NORMAL) {
        console.error(message, ...data);
      } else {
        console.log(message, ...data);
      }
    }
  }

  /**
   * Sets up event listeners for Discord voice state and server updates
   * @private
   */
  private setupVoiceStateHandling() {
    this.client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => {
      const guildId = data.guild_id;
      this.log(`Received VOICE_STATE_UPDATE for guild ${guildId}`);

      this.voiceUpdates[guildId] ??= {};

      if (data.user_id === this.client.user?.id) {
        this.voiceUpdates[guildId].sessionId = data.session_id;
      }

      // Only attempt to send voice update if we have a session
      if (this.sessionId) {
        this.sendVoiceUpdate(guildId).catch((err) => {
          this.log(`Error handling voice state update for guild ${guildId}:`, LogLevel.NORMAL, err);
        });
      } else {
        this.log(`Storing voice state update for guild ${guildId} (waiting for session)`);
      }
    });

    this.client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) => {
      const guildId = data.guild_id;
      this.log(`Received VOICE_SERVER_UPDATE for guild ${guildId}`);

      this.voiceUpdates[guildId] ??= {};
      this.voiceUpdates[guildId].event = data;

      // Only attempt to send voice update if we have a session
      if (this.sessionId) {
        this.sendVoiceUpdate(guildId).catch((err) => {
          this.log(
            `Error handling voice server update for guild ${guildId}:`,
            LogLevel.NORMAL,
            err
          );
        });
      } else {
        this.log(`Storing voice server update for guild ${guildId} (waiting for session)`);
      }
    });
  }

  /**
   * Establishes a connection to the Lavalink server
   * @param resumeSessionId - Optional session ID to resume a previous connection
   */
  connect(resumeSessionId?: string) {
    const url = buildLavalinkUrl(this.baseUrl);
    this.log(`Connecting to Lavalink at ${url.toString()}`);

    const headers: Record<string, string> = {
      Authorization: this.password,
      'User-Id': this.client.application?.id ?? '',
      'Client-Name': this.clientName, // gotta follow the rules or it gets mad
      ...this.customHeaders,
    };

    // Add session ID for resuming if provided
    if (resumeSessionId) {
      headers['Session-Id'] = resumeSessionId;
    }

    this.lavalink = new WebSocket(url.toString(), { headers });

    this.lavalink.on('open', () => {
      this.log('Lavalink WebSocket connection established');
      this.reconnectAttempts = 0; // we good now, reset the fail counter
    });

    this.lavalink.on('error', (error) => {
      this.log('Lavalink WebSocket error:', LogLevel.NORMAL, error);
    });

    this.lavalink.on('close', (code, reason) => {
      this.log(`Lavalink WebSocket closed with code ${code}: ${reason}`);
      this.handleReconnect();
    });

    this.lavalink.on('message', (data) => {
      try {
        // Convert WebSocket data to string safely
        const messageText = safeStringify(data);
        const payload = JSON.parse(messageText);
        this.log('Received Lavalink message:', LogLevel.DEBUG, payload.op);

        if (payload.op === 'ready') {
          this.sessionId = payload.sessionId;
          this.log(`Lavalink session established with ID: ${this.sessionId}`);
          this.log(`Session resumed: ${payload.resumed}`);
          this.emit('ready', payload);

          // Process any pending voice updates now that we have a session
          this.processPendingVoiceUpdates();
        } else if (payload.op === 'stats') {
          const statsData = { ...payload };
          delete statsData.op;
          this.stats = statsData;
          this.emit('stats', statsData);
        } else if (payload.op === 'playerUpdate') {
          this.log(`Player update for guild ${payload.guildId}:`, LogLevel.DEBUG, payload.state);
          this.emit('playerUpdate', payload);
        } else if (payload.op === 'event') {
          this.log(`Event received: ${payload.type} for guild ${payload.guildId}`);
          this.handleEvent(payload);
        } else {
          this.log('Unknown payload:', LogLevel.DEBUG, payload);
        }
      } catch (error) {
        this.log('Error parsing Lavalink message:', LogLevel.NORMAL, error);
      }
    });
  }

  /**
   * Handles reconnection attempts when the WebSocket connection is closed
   * @private
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached, giving up', LogLevel.NORMAL);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;
    this.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.log('Reconnecting to Lavalink...');
      this.connect(this.sessionId); // try to pick up where we left off
    }, delay);
  }

  /**
   * Processes events received from the Lavalink server
   * @param payload - The event payload received from Lavalink
   * @private
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
   * Registers an event listener for Lavalink events
   * @param event - The event name to listen for
   * @param callback - The function to call when the event occurs
   * @returns The Lavalink instance for chaining
   */
  on(event: string, callback: (...args: any[]) => void) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(callback);
    return this;
  }

  /**
   * Triggers all registered callbacks for a specific event
   * @param event - The event name to emit
   * @param data - The data to pass to the event listeners
   * @private
   */
  private emit(event: string, data: any) {
    const callbacks = this.eventListeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Closes the connection to the Lavalink server
   */
  disconnect() {
    if (this.lavalink) {
      this.lavalink.close();
      this.lavalink = undefined;
    }
  }

  /**
   * Configures session resuming capability with the Lavalink server
   * @param timeout - The number of seconds Lavalink should wait before cleaning up a disconnected session
   * @returns A promise that resolves to true if successful, false otherwise
   * @throws Error if called before a session is established
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
      this.log(`Configured session resuming with timeout: ${timeout}s`);
      return true;
    } catch (error) {
      this.log('Failed to configure session resuming:', LogLevel.NORMAL, error);
      return false;
    }
  }

  /**
   * Searches for tracks using the specified search provider
   * @param query - The search query or URL to find tracks
   * @param searchType - The search provider to use (defaults to Spotify search)
   * @returns A promise that resolves to the search results
   * @throws Error if the search fails
   * @see {@link SearchType} for available search providers
   */
  async tracks(query: string, searchType: SearchType = 'spsearch') {
    try {
      // Handle direct URLs for Spotify, etc.
      if (query.startsWith('http')) {
        if (query.includes('spotify.com')) {
          return this.loadTracks(query);
        }
      }

      this.log(`Searching for tracks with query: ${query} using ${searchType}`);

      // Regular search
      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: {
          identifier: `${searchType}:${query}`,
        },
      });

      this.log(`Found ${data.data.length} tracks for query: ${query}`, LogLevel.DEBUG);
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error searching for tracks: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to search for tracks: ${axiosError.message}`);
    }
  }

  /**
   * Loads tracks directly from a URL or identifier without search
   * @param identifier - The URL or identifier to load (e.g., Spotify URL, YouTube URL)
   * @returns A promise that resolves to the track results
   * @throws Error if loading fails
   */
  async loadTracks(identifier: string): Promise<TracksResult> {
    try {
      this.log(`Loading tracks from identifier: ${identifier}`);

      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: { identifier },
      });

      this.log(`Loaded ${data.data.length} tracks from identifier`, LogLevel.DEBUG);
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error loading tracks: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to load tracks: ${axiosError.message}`);
    }
  }

  /**
   * Plays a track in the specified guild
   * @param guildId - The Discord guild ID where the track should be played
   * @param track - The track to play (can be a track object, search result, or encoded track string)
   * @param options - Optional playback settings like volume, position, etc.
   * @returns A promise that resolves to true if successful
   * @throws Error if the session isn't established or if playback fails
   * @see {@link PlayOptions} for available playback options
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
      // if it's a long weird string, probs base64 encoded track
      // if it's short, probs just an ID
      trackData = track.length > 15 ? { encoded: track } : { identifier: track };
      this.log(`Playing track from ${track.length > 15 ? 'encoded string' : 'identifier'}`);
    } else if ('data' in track && Array.isArray(track.data) && track.data.length > 0) {
      // came from a search, grab the first result
      trackData = { encoded: track.data[0]?.encoded };
      this.log(`Playing first track from search results`);
    } else if ('info' in track && 'encoded' in track) {
      // already a track obj, just use it
      trackData = { encoded: track.encoded };
      const trackInfo = track.info;
      this.log(`Playing track: ${trackInfo.title} by ${trackInfo.author}`);
    }

    if (!trackData) {
      const errorMsg = `Invalid track data: ${JSON.stringify(track)}`;
      this.log(errorMsg, LogLevel.NORMAL);
      throw new Error(`[Lavalink] ${errorMsg}`);
    }

    try {
      const playerUpdate = {
        track: trackData,
        volume: options.volume ?? 100,
        paused: options.paused ?? false,
        position: options.position,
        filters: options.filters,
      };

      this.log(`Sending play request for guild ${guildId}`, LogLevel.DEBUG, playerUpdate);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, playerUpdate);

      this.log(`Successfully started playback in guild ${guildId}`);
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error playing track: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to play track: ${axiosError.message}`);
    }
  }

  /**
   * Stops playback in the specified guild
   * @param guildId - The Discord guild ID where playback should be stopped
   * @returns A promise that resolves to true if successful, false otherwise
   * @throws Error if the session isn't established
   */
  async stop(guildId: string) {
    if (!this.sessionId) {
      throw new Error('Lavalink stop called before WebSocket connection was initiated.');
    }

    try {
      this.log(`Stopping playback in guild ${guildId}`);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        track: null,
      });

      this.log(`Successfully stopped playback in guild ${guildId}`);
      return true;
    } catch (error) {
      this.log('Error stopping playback:', LogLevel.NORMAL, error);
      return false;
    }
  }

  /**
   * Pauses or resumes playback in the specified guild
   * @param guildId - The Discord guild ID where playback should be paused/resumed
   * @param paused - Whether to pause (true) or resume (false) playback
   * @returns A promise that resolves to true if successful, false otherwise
   * @throws Error if the session isn't established
   */
  async pause(guildId: string, paused: boolean = true) {
    if (!this.sessionId) {
      throw new Error('Lavalink pause called before WebSocket connection was initiated.');
    }

    try {
      this.log(`${paused ? 'Pausing' : 'Resuming'} playback in guild ${guildId}`);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        paused,
      });

      this.log(`Successfully ${paused ? 'paused' : 'resumed'} playback in guild ${guildId}`);
      return true;
    } catch (error) {
      this.log(`Error ${paused ? 'pausing' : 'resuming'} playback:`, LogLevel.NORMAL, error);
      return false;
    }
  }

  /**
   * Seeks to a specific position in the currently playing track
   * @param guildId - The Discord guild ID where the track is playing
   * @param position - The position to seek to in milliseconds
   * @returns A promise that resolves to true if successful, false otherwise
   * @throws Error if the session isn't established
   */
  async seek(guildId: string, position: number) {
    if (!this.sessionId) {
      throw new Error('Lavalink seek called before WebSocket connection was initiated.');
    }

    try {
      this.log(`Seeking to position ${position}ms in guild ${guildId}`);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        position,
      });

      this.log(`Successfully seeked to position ${position}ms in guild ${guildId}`);
      return true;
    } catch (error) {
      this.log('Error seeking:', LogLevel.NORMAL, error);
      return false;
    }
  }

  /**
   * Sets the volume for playback in the specified guild
   * @param guildId - The Discord guild ID where volume should be adjusted
   * @param volume - The volume level (0-1000, where 100 is normal volume)
   * @returns A promise that resolves to true if successful, false otherwise
   * @throws Error if the session isn't established
   */
  async setVolume(guildId: string, volume: number) {
    if (!this.sessionId) {
      throw new Error('Lavalink setVolume called before WebSocket connection was initiated.');
    }

    // Ensure volume is within valid range
    volume = clampVolume(volume);

    try {
      this.log(`Setting volume to ${volume} in guild ${guildId}`);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        volume,
      });

      this.log(`Successfully set volume to ${volume} in guild ${guildId}`);
      return true;
    } catch (error) {
      this.log('Error setting volume:', LogLevel.NORMAL, error);
      return false;
    }
  }

  /**
   * Retrieves information about the player in the specified guild
   * @param guildId - The Discord guild ID to get player information for
   * @returns A promise that resolves to the player data, or null if no player exists
   * @throws Error if the session isn't established or if retrieval fails
   */
  async getPlayer(guildId: string) {
    if (!this.sessionId) {
      throw new Error('Lavalink getPlayer called before WebSocket connection was initiated.');
    }

    try {
      this.log(`Getting player information for guild ${guildId}`);

      const { data } = await this.rest.get(`/sessions/${this.sessionId}/players/${guildId}`);

      this.log(
        `Successfully retrieved player information for guild ${guildId}`,
        LogLevel.DEBUG,
        data
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        this.log(`No player exists for guild ${guildId}`);
        return null; // Player doesn't exist
      }
      this.log('Error getting player:', LogLevel.NORMAL, error);
      throw error;
    }
  }

  /**
   * Processes any pending voice updates that were received before the session was established
   * @private
   */
  private processPendingVoiceUpdates() {
    this.log('Processing pending voice updates...');

    // Process all guilds with pending voice updates
    Object.keys(this.voiceUpdates).forEach((guildId) => {
      if (this.voiceUpdates[guildId]?.sessionId && this.voiceUpdates[guildId]?.event) {
        this.log(`Processing pending voice update for guild ${guildId}`);
        this.sendVoiceUpdate(guildId).catch((err) => {
          this.log(
            `Error processing pending voice update for guild ${guildId}:`,
            LogLevel.NORMAL,
            err
          );
        });
      }
    });
  }

  /**
   * Sends voice connection information to Lavalink via REST API
   * Note: In Lavalink v4, voice updates are sent via REST API instead of WebSocket
   * @param guildId - The Discord guild ID for the voice connection
   * @private
   */
  private async sendVoiceUpdate(guildId: string) {
    if (
      this.sessionId &&
      this.voiceUpdates[guildId]?.sessionId &&
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

        this.log(
          `Sending voice update to Lavalink via REST API for guild ${guildId}:`,
          LogLevel.DEBUG,
          JSON.stringify(voiceData)
        );

        // Update the player with voice information
        await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, voiceData);

        this.log(`Voice update for guild ${guildId} sent successfully`);
      } catch (error) {
        this.log(`Error sending voice update for guild ${guildId}:`, LogLevel.NORMAL, error);
      }
    } else {
      this.log(`Incomplete voice data for guild ${guildId}, waiting for more updates`);
    }
  }
}
