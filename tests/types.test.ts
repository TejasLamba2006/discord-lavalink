/**
 * Tests for type definitions
 * 
 * These tests ensure that the type definitions are correctly structured
 * and can be used as expected.
 */

import { LogLevel, Filters, SearchType } from '../src/types';

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
        'ymsearch'
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
          { band: 1, gain: 0.3 }
        ],
        karaoke: {
          level: 1.0,
          monoLevel: 1.0,
          filterBand: 220.0,
          filterWidth: 100.0
        },
        timescale: {
          speed: 1.2,
          pitch: 1.0,
          rate: 1.0
        },
        tremolo: {
          frequency: 4.0,
          depth: 0.5
        },
        vibrato: {
          frequency: 4.0,
          depth: 0.5
        },
        rotation: {
          rotationHz: 0.2
        },
        distortion: {
          sinOffset: 0.0,
          sinScale: 1.0,
          cosOffset: 0.0,
          cosScale: 1.0,
          tanOffset: 0.0,
          tanScale: 1.0,
          offset: 0.0,
          scale: 1.0
        },
        channelMix: {
          leftToLeft: 1.0,
          leftToRight: 0.0,
          rightToLeft: 0.0,
          rightToRight: 1.0
        },
        lowPass: {
          smoothing: 20.0
        }
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
