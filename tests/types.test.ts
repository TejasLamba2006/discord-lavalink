import { LogLevel, Filters, SearchType } from '../src/types';
import type { TracksResult, Datum } from '../src/types';

describe('Type Definitions', () => {
  describe('LogLevel', () => {
    test('should have NORMAL and DEBUG values', () => {
      expect(LogLevel.NORMAL).toBe('normal');
      expect(LogLevel.DEBUG).toBe('debug');
    });
  });

  describe('SearchType', () => {
    test('should accept valid search types', () => {
      const searchTypes: SearchType[] = [
        'ytsearch',
        'ytmsearch',
        'scsearch',
        'spsearch',
        'dzsearch',
        'amsearch',
        'ymsearch',
      ];

      expect(searchTypes.length).toBe(7);
    });
  });

  describe('TracksResult', () => {
    test('search result should have Datum array in data', () => {
      const result: TracksResult = {
        loadType: 'search',
        data: [
          {
            encoded: 'abc123',
            info: {
              identifier: 'id1',
              isSeekable: true,
              author: 'Artist',
              length: 180000,
              isStream: false,
              position: 0,
              title: 'Track',
              uri: 'https://example.com',
              sourceName: 'youtube',
              artworkUrl: '',
              isrc: null,
            },
            pluginInfo: {},
            userData: {},
          },
        ],
      };

      expect(result.loadType).toBe('search');
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as Datum[])[0].encoded).toBe('abc123');
    });

    test('track result should have a single Datum in data', () => {
      const result: TracksResult = {
        loadType: 'track',
        data: {
          encoded: 'xyz789',
          info: {
            identifier: 'id2',
            isSeekable: true,
            author: 'Artist',
            length: 200000,
            isStream: false,
            position: 0,
            title: 'Song',
            uri: 'https://example.com/song',
            sourceName: 'spotify',
            artworkUrl: '',
            isrc: 'USRC12345678',
          },
          pluginInfo: {},
          userData: {},
        },
      };

      expect(result.loadType).toBe('track');
      expect((result.data as Datum).encoded).toBe('xyz789');
    });

    test('empty result should have empty data', () => {
      const result: TracksResult = {
        loadType: 'empty',
        data: {},
      };

      expect(result.loadType).toBe('empty');
    });

    test('error result should have error data', () => {
      const result: TracksResult = {
        loadType: 'error',
        data: { message: 'Not found', severity: 'common', cause: 'NO_MATCHES' },
      };

      expect(result.loadType).toBe('error');
      expect(result.data.message).toBe('Not found');
    });
  });

  describe('Filters', () => {
    test('should create valid filter objects', () => {
      const filters: Filters = {
        volume: 1.0,
        equalizer: [
          { band: 0, gain: 0.2 },
          { band: 1, gain: 0.3 },
        ],
        karaoke: {
          level: 1.0,
          monoLevel: 1.0,
          filterBand: 220.0,
          filterWidth: 100.0,
        },
        timescale: {
          speed: 1.2,
          pitch: 1.0,
          rate: 1.0,
        },
        tremolo: {
          frequency: 4.0,
          depth: 0.5,
        },
        vibrato: {
          frequency: 4.0,
          depth: 0.5,
        },
        rotation: {
          rotationHz: 0.2,
        },
        distortion: {
          sinOffset: 0.0,
          sinScale: 1.0,
          cosOffset: 0.0,
          cosScale: 1.0,
          tanOffset: 0.0,
          tanScale: 1.0,
          offset: 0.0,
          scale: 1.0,
        },
        channelMix: {
          leftToLeft: 1.0,
          leftToRight: 0.0,
          rightToLeft: 0.0,
          rightToRight: 1.0,
        },
        lowPass: {
          smoothing: 20.0,
        },
      };

      expect(filters).toHaveProperty('volume');
      expect(filters).toHaveProperty('equalizer');
      expect(filters).toHaveProperty('karaoke');
      expect(filters).toHaveProperty('timescale');
      expect(filters).toHaveProperty('tremolo');
      expect(filters).toHaveProperty('vibrato');
      expect(filters).toHaveProperty('rotation');
      expect(filters).toHaveProperty('distortion');
      expect(filters).toHaveProperty('channelMix');
      expect(filters).toHaveProperty('lowPass');
    });
  });
});

describe('Type Definitions', () => {
  describe('LogLevel', () => {
    test('should have NORMAL and DEBUG values', () => {
      expect(LogLevel.NORMAL).toBe('normal');
      expect(LogLevel.DEBUG).toBe('debug');
    });
  });

  describe('SearchType', () => {
    test('should accept valid search types', () => {
      // This is a type test, so we're just checking that these assignments are valid
      const searchTypes: SearchType[] = [
        'ytsearch',
        'ytmsearch',
        'scsearch',
        'spsearch',
        'dzsearch',
        'amsearch',
        'ymsearch',
      ];

      // Verify we have the expected number of search types
      expect(searchTypes.length).toBe(7);
    });
  });

  describe('Filters', () => {
    test('should create valid filter objects', () => {
      // Create a filter object with all possible filters
      const filters: Filters = {
        volume: 1.0,
        equalizer: [
          { band: 0, gain: 0.2 },
          { band: 1, gain: 0.3 },
        ],
        karaoke: {
          level: 1.0,
          monoLevel: 1.0,
          filterBand: 220.0,
          filterWidth: 100.0,
        },
        timescale: {
          speed: 1.2,
          pitch: 1.0,
          rate: 1.0,
        },
        tremolo: {
          frequency: 4.0,
          depth: 0.5,
        },
        vibrato: {
          frequency: 4.0,
          depth: 0.5,
        },
        rotation: {
          rotationHz: 0.2,
        },
        distortion: {
          sinOffset: 0.0,
          sinScale: 1.0,
          cosOffset: 0.0,
          cosScale: 1.0,
          tanOffset: 0.0,
          tanScale: 1.0,
          offset: 0.0,
          scale: 1.0,
        },
        channelMix: {
          leftToLeft: 1.0,
          leftToRight: 0.0,
          rightToLeft: 0.0,
          rightToRight: 1.0,
        },
        lowPass: {
          smoothing: 20.0,
        },
      };

      // Verify the filter object has all the expected properties
      expect(filters).toHaveProperty('volume');
      expect(filters).toHaveProperty('equalizer');
      expect(filters).toHaveProperty('karaoke');
      expect(filters).toHaveProperty('timescale');
      expect(filters).toHaveProperty('tremolo');
      expect(filters).toHaveProperty('vibrato');
      expect(filters).toHaveProperty('rotation');
      expect(filters).toHaveProperty('distortion');
      expect(filters).toHaveProperty('channelMix');
      expect(filters).toHaveProperty('lowPass');
    });
  });
});
