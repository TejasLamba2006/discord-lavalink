# discord-lavalink Tests

This directory contains tests for the discord-lavalink package. The tests are written using Jest and TypeScript.

## Test Structure

- `lavalink.test.ts`: Tests for the main Lavalink class and its functionality
- `helpers.test.ts`: Tests for utility helper functions
- `types.test.ts`: Tests for type definitions

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The tests aim to achieve at least 80% coverage for:
- Statements
- Branches
- Functions
- Lines

## Writing Tests

When writing tests, follow these guidelines:

1. **Test Organization**: Use `describe` blocks to group related tests and `test` blocks for individual test cases.
2. **Mocking**: Use Jest's mocking capabilities to mock external dependencies like Discord.js, WebSocket, and Axios.
3. **Assertions**: Use Jest's assertion functions to verify expected behavior.
4. **Async Testing**: Use async/await for testing asynchronous code.
5. **Setup/Teardown**: Use `beforeEach` and `afterEach` hooks for setup and teardown.

Example:

```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Teardown code
  });

  test('should do something', async () => {
    // Test code
    expect(result).toBe(expectedValue);
  });
});
```

## Mocking Strategy

The tests use the following mocking strategy:

1. **Discord.js**: Mock the Client class and its methods
2. **WebSocket**: Mock the WebSocket class and its methods
3. **Axios**: Mock the axios.create function and its return value

This allows testing the Lavalink class in isolation without requiring actual connections to Discord or a Lavalink server.
