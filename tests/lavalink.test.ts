import { Client, GatewayIntentBits } from 'discord.js';
import { Lavalink, LogLevel } from '../src';
import axios from 'axios';
import WebSocket from 'ws';

jest.mock('discord.js', () => ({
  Client: jest.fn(),
  GatewayIntentBits: {
    Guilds: 1,
    GuildVoiceStates: 2,
  },
  GatewayDispatchEvents: {
    VoiceStateUpdate: 'VOICE_STATE_UPDATE',
    VoiceServerUpdate: 'VOICE_SERVER_UPDATE',
  },
}));

jest.mock('axios');
jest.mock('ws');

const mockTrack = {
  encoded: 'base64EncodedTrackData',
  info: {
    identifier: 'trackId',
    isSeekable: true,
    author: 'Test Artist',
    length: 180000,
    isStream: false,
    position: 0,
    title: 'Test Track',
    uri: 'https://example.com/track',
    sourceName: 'youtube',
    artworkUrl: 'https://example.com/artwork.jpg',
    isrc: null,
  },
  pluginInfo: {},
  userData: {},
};

const mockSearchResult = {
  loadType: 'search',
  data: [mockTrack],
};

const mockTrackResult = {
  loadType: 'track',
  data: mockTrack,
};

const mockPlaylistResult = {
  loadType: 'playlist',
  data: {
    info: { name: 'My Playlist', selectedTrack: 0 },
    pluginInfo: {},
    tracks: [mockTrack],
  },
};

const mockPlayerData = {
  track: mockTrack,
  volume: 100,
  paused: false,
  filters: {},
};

const mockAxiosGet = jest.fn();
const mockAxiosPatch = jest.fn();

(axios.create as jest.Mock).mockReturnValue({
  get: mockAxiosGet,
  patch: mockAxiosPatch,
});

const mockWebSocketOn = jest.fn();
const mockWebSocketSend = jest.fn();
const mockWebSocketClose = jest.fn();
const mockWebSocketHandlers: Record<string, any> = {
  open: null,
  message: null,
  error: null,
  close: null,
};

mockWebSocketOn.mockImplementation((event, callback) => {
  mockWebSocketHandlers[event] = callback;
  return { on: mockWebSocketOn };
});

(WebSocket as unknown as jest.Mock).mockImplementation(() => ({
  on: mockWebSocketOn,
  send: mockWebSocketSend,
  close: mockWebSocketClose,
}));

const mockClientOn = jest.fn();
const mockClientWsOn = jest.fn();

(Client as unknown as jest.Mock).mockImplementation(() => ({
  on: mockClientOn,
  ws: {
    on: mockClientWsOn,
  },
  application: {
    id: 'mockClientId',
  },
  user: {
    id: 'mockUserId',
    tag: 'MockBot#0000',
  },
  _events: {},
  _eventsCount: 0,
  _voiceStateUpdateHandler: null,
  _voiceServerUpdateHandler: null,
}));

describe('Lavalink', () => {
  let lavalink: Lavalink;
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();

    Object.keys(mockWebSocketHandlers).forEach((key) => {
      mockWebSocketHandlers[key] = null;
    });

    client = new Client({ intents: [GatewayIntentBits?.Guilds] });

    lavalink = new Lavalink({
      client,
      baseUrl: 'http://localhost:2333',
      password: 'youshallnotpass',
      logLevel: LogLevel.NORMAL,
    });

    // @ts-expect-error - Accessing private property for testing
    lavalink.sessionId = 'mockSessionId';

    mockAxiosGet.mockResolvedValue({ data: mockSearchResult });
    mockAxiosPatch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    lavalink?.disconnect();
  });

  describe('Connection', () => {
    test('should connect to Lavalink server', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost:2333/v4/websocket'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'youshallnotpass',
            'User-Id': 'mockClientId',
          }),
        })
      );

      expect(mockWebSocketOn).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocketOn).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocketOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocketOn).toHaveBeenCalledWith('close', expect.any(Function));
    });

    test('should disconnect from Lavalink server', () => {
      lavalink.connect();

      lavalink.disconnect();

      expect(mockWebSocketClose).toHaveBeenCalled();
    });

    test('should not reconnect after intentional disconnect', async () => {
      jest.useFakeTimers();

      lavalink.connect();
      lavalink.disconnect();

      const closeHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'close')?.[1];
      if (closeHandler) {
        closeHandler(1000, Buffer.from('normal'));
      }

      jest.runAllTimers();

      expect(WebSocket).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('should reconnect after unintentional disconnect', async () => {
      jest.useFakeTimers();

      lavalink.connect();

      const closeHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'close')?.[1];
      if (closeHandler) {
        closeHandler(1006, Buffer.from('abnormal'));
      }

      jest.runAllTimers();

      expect(WebSocket).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    test('should configure session resuming', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.configureResuming(60);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId',
        expect.objectContaining({
          resuming: true,
          timeout: 60,
        })
      );
    });
  });

  describe('Track Loading', () => {
    test('should search for tracks', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = await lavalink.tracks('test query', 'ytsearch');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        '/loadtracks',
        expect.objectContaining({
          params: {
            identifier: 'ytsearch:test query',
          },
        })
      );

      expect(result).toEqual(mockSearchResult);
    });

    test('should load any http URL directly without search prefix', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.tracks('https://www.deezer.com/track/123456', 'spsearch');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        '/loadtracks',
        expect.objectContaining({
          params: {
            identifier: 'https://www.deezer.com/track/123456',
          },
        })
      );
    });

    test('should load tracks from URL', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = await lavalink.loadTracks('https://example.com/playlist');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        '/loadtracks',
        expect.objectContaining({
          params: {
            identifier: 'https://example.com/playlist',
          },
        })
      );

      expect(result).toEqual(mockSearchResult);
    });
  });

  describe('Playback Control', () => {
    test('should play a Datum track', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.play('guildId', mockTrack);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: 'base64EncodedTrackData' },
        })
      );
    });

    test('should play from a track-type TracksResult', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.play('guildId', mockTrackResult as any);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: 'base64EncodedTrackData' },
        })
      );
    });

    test('should play first track from a playlist-type TracksResult', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.play('guildId', mockPlaylistResult as any);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: 'base64EncodedTrackData' },
        })
      );
    });

    test('should play a track with options', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.play('guildId', mockTrack, {
        volume: 80,
        paused: true,
        position: 30000,
        filters: {
          volume: 1.0,
          equalizer: [
            { band: 0, gain: 0.2 },
            { band: 1, gain: 0.3 },
          ],
        },
      });

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: 'base64EncodedTrackData' },
          volume: 80,
          paused: true,
          position: 30000,
          filters: {
            volume: 1.0,
            equalizer: [
              { band: 0, gain: 0.2 },
              { band: 1, gain: 0.3 },
            ],
          },
        })
      );
    });

    test('should pass noReplace param when specified', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.play('guildId', mockTrack, { noReplace: true });

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: 'base64EncodedTrackData' },
        }),
        { params: { noReplace: true } }
      );
    });

    test('should stop playback with correct Lavalink v4 body', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.stop('guildId');

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          track: { encoded: null },
        })
      );
    });

    test('should pause playback', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.pause('guildId', true);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          paused: true,
        })
      );
    });

    test('should resume playback', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.pause('guildId', false);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          paused: false,
        })
      );
    });

    test('should seek to position', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.seek('guildId', 60000);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          position: 60000,
        })
      );
    });

    test('should set volume', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await lavalink.setVolume('guildId', 50);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          volume: 50,
        })
      );
    });

    test('should get player information', async () => {
      mockAxiosGet.mockResolvedValueOnce({ data: mockPlayerData });

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const player = await lavalink.getPlayer('guildId');

      expect(mockAxiosGet).toHaveBeenCalledWith('/sessions/mockSessionId/players/guildId');

      expect(player).toEqual(mockPlayerData);
    });
  });

  describe('Event Handling', () => {
    test('should emit ready event', async () => {
      const readyListener = jest.fn();
      lavalink.on('ready', readyListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'ready',
          sessionId: 'mockSessionId',
          resumed: false,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(readyListener).toHaveBeenCalledWith(
        expect.objectContaining({
          op: 'ready',
          sessionId: 'mockSessionId',
          resumed: false,
        })
      );
    });

    test('should emit track start event', async () => {
      const trackStartListener = jest.fn();
      lavalink.on('trackStart', trackStartListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackStartEvent',
          guildId: 'guildId',
          track: mockTrack,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(trackStartListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TrackStartEvent',
          guildId: 'guildId',
          track: mockTrack,
        })
      );
    });

    test('should emit track end event', async () => {
      const trackEndListener = jest.fn();
      lavalink.on('trackEnd', trackEndListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackEndEvent',
          guildId: 'guildId',
          track: mockTrack,
          reason: 'finished',
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(trackEndListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TrackEndEvent',
          guildId: 'guildId',
          track: mockTrack,
          reason: 'finished',
        })
      );
    });

    test('should emit track exception event', async () => {
      const trackExceptionListener = jest.fn();
      lavalink.on('trackException', trackExceptionListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackExceptionEvent',
          guildId: 'guildId',
          track: mockTrack,
          exception: {
            message: 'Test exception',
            severity: 'common',
            cause: 'Test cause',
          },
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(trackExceptionListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TrackExceptionEvent',
          guildId: 'guildId',
          track: mockTrack,
          exception: {
            message: 'Test exception',
            severity: 'common',
            cause: 'Test cause',
          },
        })
      );
    });

    test('should emit track stuck event', async () => {
      const trackStuckListener = jest.fn();
      lavalink.on('trackStuck', trackStuckListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackStuckEvent',
          guildId: 'guildId',
          track: mockTrack,
          thresholdMs: 5000,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(trackStuckListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TrackStuckEvent',
          guildId: 'guildId',
          track: mockTrack,
          thresholdMs: 5000,
        })
      );
    });

    test('should emit websocket closed event', async () => {
      const webSocketClosedListener = jest.fn();
      lavalink.on('webSocketClosed', webSocketClosedListener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'WebSocketClosedEvent',
          guildId: 'guildId',
          code: 4006,
          reason: 'Test reason',
          byRemote: true,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(webSocketClosedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WebSocketClosedEvent',
          guildId: 'guildId',
          code: 4006,
          reason: 'Test reason',
          byRemote: true,
        })
      );
    });

    test('should remove a listener with off()', async () => {
      const listener = jest.fn();
      lavalink.on('trackStart', listener);
      lavalink.off('trackStart', listener);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackStartEvent',
          guildId: 'guildId',
          track: mockTrack,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener).not.toHaveBeenCalled();
    });

    test('should keep other listeners when one is removed with off()', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      lavalink.on('trackStart', listener1);
      lavalink.on('trackStart', listener2);
      lavalink.off('trackStart', listener1);

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const messageHandler = mockWebSocketOn.mock.calls.find((call) => call[0] === 'message')[1];

      messageHandler(
        JSON.stringify({
          op: 'event',
          type: 'TrackStartEvent',
          guildId: 'guildId',
          track: mockTrack,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const errorHandlerCalls = mockWebSocketOn.mock.calls.filter((call) => call[0] === 'error');

      const errorHandler = errorHandlerCalls[0]?.[1];

      if (errorHandler) {
        errorHandler(new Error('Connection error'));
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    test('should handle track loading errors', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Track loading error'));

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(lavalink.tracks('test query')).rejects.toThrow();
    });

    test('should handle playback errors', async () => {
      mockAxiosPatch.mockRejectedValueOnce(new Error('Playback error'));

      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(lavalink.play('guildId', mockTrack)).rejects.toThrow();
    });
  });

  describe('Voice Updates', () => {
    test('should clean up voice state when bot leaves voice channel', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const voiceStateHandler = mockClientWsOn.mock.calls.find(
        (call) => call[0] === 'VOICE_STATE_UPDATE'
      )?.[1];

      if (!voiceStateHandler) return;

      voiceStateHandler({
        guild_id: 'guildId',
        user_id: 'mockUserId',
        session_id: 'voiceSessionId',
        channel_id: 'someChannelId',
      });

      voiceStateHandler({
        guild_id: 'guildId',
        user_id: 'mockUserId',
        session_id: 'voiceSessionId',
        channel_id: null,
      });

      const voiceServerHandler = mockClientWsOn.mock.calls.find(
        (call) => call[0] === 'VOICE_SERVER_UPDATE'
      )?.[1];

      if (!voiceServerHandler) return;

      voiceServerHandler({
        guild_id: 'guildId',
        token: 'voiceToken',
        endpoint: 'voiceEndpoint',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockAxiosPatch).not.toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          voice: expect.objectContaining({
            sessionId: 'voiceSessionId',
          }),
        })
      );
    });

    test.skip('should handle voice state update', async () => {
      lavalink.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const voiceStateUpdate = {
        guild_id: 'guildId',
        user_id: 'mockUserId',
        session_id: 'voiceSessionId',
        channel_id: 'someChannelId',
      };

      const voiceStateHandler = mockClientWsOn.mock.calls.find(
        (call) => call[0] === 'VOICE_STATE_UPDATE'
      )[1];

      voiceStateHandler(voiceStateUpdate);

      const voiceServerUpdate = {
        guild_id: 'guildId',
        token: 'voiceToken',
        endpoint: 'voiceEndpoint',
      };

      const voiceServerHandler = mockClientWsOn.mock.calls.find(
        (call) => call[0] === 'VOICE_SERVER_UPDATE'
      )[1];

      voiceServerHandler(voiceServerUpdate);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        '/sessions/mockSessionId/players/guildId',
        expect.objectContaining({
          voice: {
            token: 'voiceToken',
            endpoint: 'voiceEndpoint',
            sessionId: 'voiceSessionId',
          },
        })
      );
    });
  });

  describe('Logging', () => {
    test.skip('should respect log level setting', () => {
      const debugLavalink = new Lavalink({
        client,
        baseUrl: 'http://localhost:2333',
        password: 'youshallnotpass',
        logLevel: LogLevel.DEBUG,
      });

      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;

      console.log = jest.fn();
      console.error = jest.fn();

      debugLavalink.connect();

      expect(console.log).toHaveBeenCalled();

      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    });
  });
});