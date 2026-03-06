import axios, { AxiosInstance, AxiosError } from 'axios';
import { GatewayDispatchEvents, type Client } from 'discord.js';
import { WebSocket } from 'ws';
import { LavalinkOptions, PlayOptions, SearchType, TracksResult, Datum, LogLevel } from '../types';
import { buildLavalinkUrl, clampVolume, safeStringify } from '../utils/helpers';

interface VoiceState {
  sessionId?: string;
  event?: {
    token: string;
    endpoint: string;
  };
}

export class Lavalink {
  private readonly client: Client;
  private readonly baseUrl: string;
  private readonly password: string;
  private lavalink?: WebSocket;
  private readonly rest: AxiosInstance;
  private sessionId?: string;
  private stats?: Record<string, any>;
  private readonly reconnectInterval: number;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly voiceUpdates: Record<string, VoiceState> = {};
  private readonly eventListeners: Record<string, Array<(...args: any[]) => void>> = {};
  private readonly clientName: string;
  private readonly customHeaders: Record<string, string>;
  private readonly logLevel: LogLevel;
  private intentionalDisconnect = false;

  constructor(options: LavalinkOptions) {
    this.client = options.client;
    this.baseUrl = options.baseUrl;
    this.password = options.password;
    this.logLevel = options.logLevel ?? LogLevel.NORMAL;
    this.reconnectInterval = options.customOptions?.reconnectInterval ?? 5000;
    this.maxReconnectAttempts = options.customOptions?.maxReconnectAttempts ?? 5;
    this.clientName = options.customOptions?.clientName ?? 'discord-lavalink/1.0.0';
    this.customHeaders = options.customOptions?.headers ?? {};

    this.rest = axios.create({
      baseURL: this.baseUrl + '/v4',
      headers: {
        Authorization: this.password,
      },
    });

    this.setupVoiceStateHandling();
  }

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

  private setupVoiceStateHandling() {
    this.client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => {
      const guildId = data.guild_id;
      this.log(`Received VOICE_STATE_UPDATE for guild ${guildId}`);

      if (data.user_id !== this.client.user?.id) return;

      if (data.channel_id === null) {
        delete this.voiceUpdates[guildId];
        return;
      }

      this.voiceUpdates[guildId] ??= {};
      this.voiceUpdates[guildId].sessionId = data.session_id;

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

  connect(resumeSessionId?: string) {
    if (!this.client.application?.id) {
      throw new Error(
        'Discord client must be ready (client.application must be set) before connecting to Lavalink.'
      );
    }

    this.intentionalDisconnect = false;
    const url = buildLavalinkUrl(this.baseUrl);
    this.log(`Connecting to Lavalink at ${url.toString()}`);

    const headers: Record<string, string> = {
      Authorization: this.password,
      'User-Id': this.client.application.id,
      'Client-Name': this.clientName,
      ...this.customHeaders,
    };

    if (resumeSessionId) {
      headers['Session-Id'] = resumeSessionId;
    }

    this.lavalink = new WebSocket(url.toString(), { headers });

    this.lavalink.on('open', () => {
      this.log('Lavalink WebSocket connection established');
      this.reconnectAttempts = 0;
    });

    this.lavalink.on('error', (error) => {
      this.log('Lavalink WebSocket error:', LogLevel.NORMAL, error);
    });

    this.lavalink.on('close', (code, reason) => {
      this.log(`Lavalink WebSocket closed with code ${code}: ${reason}`);
      if (!this.intentionalDisconnect) {
        this.handleReconnect();
      }
    });

    this.lavalink.on('message', (data) => {
      try {
        const messageText = safeStringify(data);
        const payload = JSON.parse(messageText);
        this.log('Received Lavalink message:', LogLevel.DEBUG, payload.op);

        if (payload.op === 'ready') {
          this.sessionId = payload.sessionId;
          this.log(`Lavalink session established with ID: ${this.sessionId}`);
          this.log(`Session resumed: ${payload.resumed}`);
          this.emit('ready', payload);
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

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached, giving up', LogLevel.NORMAL);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    this.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.log('Reconnecting to Lavalink...');
      this.connect(this.sessionId);
    }, delay);
  }

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
        this.log(`Unhandled event type: ${payload.type}`, LogLevel.DEBUG);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(callback);
    return this;
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
    }
    return this;
  }

  private emit(event: string, data: any) {
    const callbacks = this.eventListeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  disconnect() {
    this.intentionalDisconnect = true;
    if (this.lavalink) {
      this.lavalink.close();
      this.lavalink = undefined;
    }
  }

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

  async tracks(query: string, searchType: SearchType = 'spsearch') {
    try {
      if (query.startsWith('http://') || query.startsWith('https://')) {
        return this.loadTracks(query);
      }

      this.log(`Searching for tracks with query: ${query} using ${searchType}`);

      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: {
          identifier: `${searchType}:${query}`,
        },
      });

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error searching for tracks: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to search for tracks: ${axiosError.message}`);
    }
  }

  async loadTracks(identifier: string): Promise<TracksResult> {
    try {
      this.log(`Loading tracks from identifier: ${identifier}`);

      const { data } = await this.rest.get<TracksResult>(`/loadtracks`, {
        params: { identifier },
      });

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error loading tracks: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to load tracks: ${axiosError.message}`);
    }
  }

  async play(guildId: string, track: TracksResult | Datum | string, options: PlayOptions = {}) {
    if (!this.sessionId) {
      throw new Error('Lavalink play called before WebSocket connection was initiated.');
    }

    let trackData: {
      encoded?: string;
      identifier?: string;
    } | null = null;

    if (typeof track === 'string') {
      trackData = track.length > 15 ? { encoded: track } : { identifier: track };
    } else if ('loadType' in track) {
      if (track.loadType === 'track') {
        trackData = { encoded: track.data.encoded };
      } else if (track.loadType === 'search' && track.data.length > 0) {
        trackData = { encoded: track.data[0]?.encoded };
      } else if (track.loadType === 'playlist' && track.data.tracks.length > 0) {
        trackData = { encoded: track.data.tracks[0]?.encoded };
      }
    } else if ('info' in track && 'encoded' in track) {
      trackData = { encoded: track.encoded };
    }

    if (!trackData) {
      const errorMsg = `Invalid track data: ${JSON.stringify(track)}`;
      this.log(errorMsg, LogLevel.NORMAL);
      throw new Error(`[Lavalink] ${errorMsg}`);
    }

    try {
      const playerUpdate: Record<string, any> = {
        track: trackData,
        volume: options.volume ?? 100,
        paused: options.paused ?? false,
      };

      if (options.position !== undefined) {
        playerUpdate.position = options.position;
      }

      if (options.filters !== undefined) {
        playerUpdate.filters = options.filters;
      }

      this.log(`Sending play request for guild ${guildId}`, LogLevel.DEBUG, playerUpdate);

      if (options.noReplace) {
        await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, playerUpdate, {
          params: { noReplace: true },
        });
      } else {
        await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, playerUpdate);
      }

      this.log(`Successfully started playback in guild ${guildId}`);
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Error playing track: ${axiosError.message}`, LogLevel.NORMAL);
      throw new Error(`Failed to play track: ${axiosError.message}`);
    }
  }

  async stop(guildId: string) {
    if (!this.sessionId) {
      throw new Error('Lavalink stop called before WebSocket connection was initiated.');
    }

    try {
      this.log(`Stopping playback in guild ${guildId}`);

      await this.rest.patch(`/sessions/${this.sessionId}/players/${guildId}`, {
        track: { encoded: null },
      });

      this.log(`Successfully stopped playback in guild ${guildId}`);
      return true;
    } catch (error) {
      this.log('Error stopping playback:', LogLevel.NORMAL, error);
      return false;
    }
  }

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

  async setVolume(guildId: string, volume: number) {
    if (!this.sessionId) {
      throw new Error('Lavalink setVolume called before WebSocket connection was initiated.');
    }

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
        return null;
      }
      this.log('Error getting player:', LogLevel.NORMAL, error);
      throw error;
    }
  }

  private processPendingVoiceUpdates() {
    this.log('Processing pending voice updates...');

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

  private async sendVoiceUpdate(guildId: string) {
    if (
      this.sessionId &&
      this.voiceUpdates[guildId]?.sessionId &&
      this.voiceUpdates[guildId]?.event
    ) {
      try {
        const voiceData = {
          voice: {
            token: this.voiceUpdates[guildId].event!.token,
            endpoint: this.voiceUpdates[guildId].event!.endpoint,
            sessionId: this.voiceUpdates[guildId].sessionId,
          },
        };

        this.log(
          `Sending voice update to Lavalink via REST API for guild ${guildId}:`,
          LogLevel.DEBUG,
          JSON.stringify(voiceData)
        );

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
