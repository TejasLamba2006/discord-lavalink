/**
 * Tests for utility helper functions
 */

import { safeStringify, buildLavalinkUrl, clampVolume } from '../src/utils/helpers';

describe('Utility Helpers', () => {
  describe('safeStringify', () => {
    test('should handle string input', () => {
      const input = 'test string';
      expect(safeStringify(input)).toBe('test string');
    });

    test('should handle Buffer input', () => {
      const input = Buffer.from('test buffer');
      expect(safeStringify(input)).toBe('test buffer');
    });

    test('should handle object input', () => {
      const input = { key: 'value' };
      expect(safeStringify(input)).toBe('{"key":"value"}');
    });

    test('should handle array input', () => {
      const input = [1, 2, 3];
      expect(safeStringify(input)).toBe('[1,2,3]');
    });

    test('should handle circular reference', () => {
      const input: any = { key: 'value' };
      input.self = input; // Create circular reference
      
      // When JSON.stringify fails, it should fall back to String constructor
      expect(safeStringify(input)).toBe('[object Object]');
    });
  });

  describe('buildLavalinkUrl', () => {
    test('should convert HTTP URL to WebSocket URL', () => {
      const input = 'http://localhost:2333';
      const result = buildLavalinkUrl(input);
      
      expect(result.toString()).toBe('ws://localhost:2333/v4/websocket');
    });

    test('should convert HTTPS URL to secure WebSocket URL', () => {
      const input = 'https://lavalink.example.com';
      const result = buildLavalinkUrl(input);
      
      expect(result.toString()).toBe('wss://lavalink.example.com/v4/websocket');
    });

    test('should handle URLs with trailing slash', () => {
      const input = 'http://localhost:2333/';
      const result = buildLavalinkUrl(input);
      
      expect(result.toString()).toBe('ws://localhost:2333/v4/websocket');
    });

    test('should handle URLs with path', () => {
      const input = 'http://localhost:2333/lavalink';
      const result = buildLavalinkUrl(input);
      
      expect(result.toString()).toBe('ws://localhost:2333/lavalink/v4/websocket');
    });
  });

  describe('clampVolume', () => {
    test('should return the same value for volume within range', () => {
      expect(clampVolume(500)).toBe(500);
    });

    test('should clamp volume to minimum (0)', () => {
      expect(clampVolume(-100)).toBe(0);
    });

    test('should clamp volume to maximum (1000)', () => {
      expect(clampVolume(1500)).toBe(1000);
    });

    test('should handle edge cases', () => {
      expect(clampVolume(0)).toBe(0);
      expect(clampVolume(1000)).toBe(1000);
    });
  });
});
