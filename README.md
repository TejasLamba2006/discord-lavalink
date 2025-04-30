# discord-lavalink

<div align="center">
  <br>
  <p>
    <a href="https://www.npmjs.com/package/discord-lavalink"><img src="https://img.shields.io/npm/v/discord-lavalink.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/discord-lavalink"><img src="https://img.shields.io/npm/dt/discord-lavalink.svg?maxAge=3600" alt="NPM downloads" /></a>
    <a href="https://github.com/TejasLamba2006/discord-lavalink/actions"><img src="https://github.com/TejasLamba2006/discord-lavalink/workflows/Tests/badge.svg" alt="Build status" /></a>
    <a href="https://github.com/TejasLamba2006/discord-lavalink/blob/main/LICENSE"><img src="https://img.shields.io/github/license/TejasLamba2006/discord-lavalink" alt="License" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/discord-lavalink/"><img src="https://nodei.co/npm/discord-lavalink.png?downloads=true&stars=true" alt="npm installnfo" /></a>
  </p>
</div>

## Stats
![image](https://github.com/user-attachments/assets/ae866059-679f-42fa-8062-835da319e470)

Took me about 2 hours to code form scratch and publish  

A powerful and easy-to-use TypeScript wrapper for [Lavalink](https://github.com/lavalink-devs/Lavalink) with Discord.js integration.

## Features

- 🚀 **Simple & Intuitive API** - Easy to use with minimal setup
- 🔌 **Full Lavalink v4 Support** - Compatible with the latest Lavalink features
- 🎵 **Advanced Audio Playback** - Control volume, filters, and more
- 🔍 **Multiple Search Providers** - YouTube, Spotify, SoundCloud, and more
- 📊 **Detailed Player Information** - Track position, state, and events
- 🔄 **Session Resuming** - Seamless playback across reconnections
- 📝 **TypeScript Support** - Full type definitions for a better development experience
- 🔧 **Customizable** - Configure to fit your specific needs

## Getting Started

- [Quick Start Guide](README.md) - Learn the basics of using discord-lavalink
- [Setting Up Lavalink Server](lavalink-setup.md) - How to set up your Lavalink server
- [Audio Filters Guide](audio-filters.md) - Learn how to make your music sound awesome

## Installation

```bash
npm install discord-lavalink
```

or with Yarn:

```bash
yarn add discord-lavalink
```

## Prerequisites

Before using this library, you need:

1. A running [Lavalink server](https://github.com/lavalink-devs/Lavalink) (v4.x)
2. [discord.js](https://discord.js.org/) (v14.x)

## Quick Start

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { Lavalink, LogLevel } from 'discord-lavalink';

// Create Discord client with required intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Initialize Lavalink client
const lavalink = new Lavalink({
  client,
  baseUrl: 'http://localhost:2333',  // Your Lavalink server URL
  password: 'youshallnotpass',       // Your Lavalink server password
  logLevel: LogLevel.NORMAL,         // NORMAL for errors only, DEBUG for verbose logging
});

// Set up event listeners for Lavalink
lavalink.on('ready', (data) => {
  console.log(`Lavalink session established with ID: ${data.sessionId}`);
});

lavalink.on('trackStart', (data) => {
  console.log(`Now playing: ${data.track.info.title}`);
});

// Handle Discord client ready event
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Connect to Lavalink
  lavalink.connect();
});

// Example command to play music
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'play') return;

  const query = interaction.options.getString('song', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply('This command can only be used in a server!');
    return;
  }

  // Join voice channel
  const member = interaction.member;
  if (!member || !('voice' in member) || !member.voice.channel) {
    await interaction.reply('You need to be in a voice channel!');
    return;
  }

  await interaction.deferReply();

  // Join the voice channel
  joinVoiceChannel({
    channelId: member.voice.channel.id,
    guildId: guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  // Search for the track
  try {
    const searchResult = await lavalink.tracks(query);

    if (!searchResult.data || searchResult.data.length === 0) {
      await interaction.editReply('No tracks found!');
      return;
    }

    const track = searchResult.data[0];
    await lavalink.play(guildId, track);

    await interaction.editReply(`Now playing: ${track.info.title}`);
  } catch (error) {
    console.error(error);
    await interaction.editReply('An error occurred while trying to play the track.');
  }
});

// Login to Discord
client.login('YOUR_DISCORD_BOT_TOKEN');
```

## Setting Up Lavalink Server

This library requires a running Lavalink server. If you don't have one set up yet, follow these steps:

1. Visit the [official Lavalink documentation](https://lavalink.dev/) for detailed setup instructions
2. Download the latest Lavalink.jar from the [GitHub releases](https://github.com/lavalink-devs/Lavalink/releases)
3. Create an `application.yml` file (example below)
4. Run the server with `java -jar Lavalink.jar`

Example `application.yml`:

```yaml
server:
  port: 2333
  address: 0.0.0.0
lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    filters:
      volume: true
      equalizer: true
      karaoke: true
      timescale: true
      tremolo: true
      vibrato: true
      distortion: true
      rotation: true
      channelMix: true
      lowPass: true
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true

plugins:
  lavasrc:
    sources:
      spotify: true
      deezer: true
      yandexmusic: false
      applemusic: false
    spotify:
      clientId: "your-spotify-client-id"
      clientSecret: "your-spotify-client-secret"
      countryCode: "US"
    deezer:
      masterKey: "your-deezer-master-key"
```

## API Documentation

### Initialization

```typescript
const lavalink = new Lavalink({
  client: discordClient,
  baseUrl: 'http://localhost:2333',
  password: 'youshallnotpass',
  logLevel: LogLevel.NORMAL, // Optional: NORMAL or DEBUG
  customOptions: {           // Optional
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    headers: {},
    clientName: 'discord-lavalink/1.0.0'
  }
});
```

### Connection Management

```typescript
// Connect to Lavalink
lavalink.connect();

// Disconnect from Lavalink
lavalink.disconnect();

// Configure session resuming
await lavalink.configureResuming(60); // Timeout in seconds
```

### Track Loading

```typescript
// Search for tracks
const results = await lavalink.tracks('never gonna give you up', 'ytsearch');

// Load tracks from URL
const playlist = await lavalink.loadTracks('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
```

### Playback Control

```typescript
// Play a track
await lavalink.play(guildId, track, {
  volume: 80,        // 80% volume
  paused: false,     // Start playing immediately
  position: 30000,   // Start 30 seconds in
  filters: {         // Optional audio filters
    volume: 1.0,
    equalizer: [
      { band: 0, gain: 0.2 },
      { band: 1, gain: 0.3 },
    ]
  }
});

// Stop playback
await lavalink.stop(guildId);

// Pause/resume playback
await lavalink.pause(guildId, true);  // Pause
await lavalink.pause(guildId, false); // Resume

// Seek to position
await lavalink.seek(guildId, 60000); // Seek to 1 minute

// Set volume
await lavalink.setVolume(guildId, 50); // 50% volume

// Get player information
const player = await lavalink.getPlayer(guildId);
```

### Event Handling

```typescript
// Listen for events
lavalink.on('ready', (data) => {
  console.log(`Connected to Lavalink, session ID: ${data.sessionId}`);
});

lavalink.on('trackStart', (data) => {
  console.log(`Track started: ${data.track.info.title}`);
});

lavalink.on('trackEnd', (data) => {
  console.log(`Track ended: ${data.track.info.title} (Reason: ${data.reason})`);
});

lavalink.on('trackException', (data) => {
  console.error(`Track exception: ${data.exception.message}`);
});

lavalink.on('trackStuck', (data) => {
  console.warn(`Track stuck: ${data.track.info.title}`);
});

lavalink.on('playerUpdate', (data) => {
  console.log(`Player update for guild ${data.guildId}, position: ${data.state.position}ms`);
});

lavalink.on('webSocketClosed', (data) => {
  console.log(`WebSocket closed for guild ${data.guildId}, code: ${data.code}`);
});
```

## Search Types

The library supports various search types:

| Search Type | Description |
|-------------|-------------|
| `ytsearch`  | YouTube search |
| `ytmsearch` | YouTube Music search |
| `scsearch`  | SoundCloud search |
| `spsearch`  | Spotify search (requires Spotify plugin) |
| `dzsearch`  | Deezer search (requires Deezer plugin) |
| `amsearch`  | Apple Music search (requires Apple Music plugin) |
| `ymsearch`  | Yandex Music search (requires Yandex Music plugin) |

## Audio Filters

You can apply various audio filters to enhance the playback experience:

```typescript
await lavalink.play(guildId, track, {
  filters: {
    volume: 1.0,
    equalizer: [
      { band: 0, gain: 0.2 },
      { band: 1, gain: 0.3 },
      // ... up to band 14
    ],
    karaoke: {
      level: 1.0,
      monoLevel: 1.0,
      filterBand: 220.0,
      filterWidth: 100.0
    },
    timescale: {
      speed: 1.0, // Speed change
      pitch: 1.0, // Pitch change
      rate: 1.0   // Rate change
    },
    tremolo: {
      frequency: 2.0, // Tremolo frequency
      depth: 0.5      // Tremolo depth
    },
    vibrato: {
      frequency: 2.0, // Vibrato frequency
      depth: 0.5      // Vibrato depth
    },
    rotation: {
      rotationHz: 0.0 // Rotation speed
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
  }
});
```

## Logging

The library supports two logging levels:

```typescript
// Only log errors and critical information
const lavalink = new Lavalink({
  // ...other options
  logLevel: LogLevel.NORMAL
});

// Log everything including debug information
const lavalink = new Lavalink({
  // ...other options
  logLevel: LogLevel.DEBUG
});
```

## Examples

Check out the [examples directory](https://github.com/TejasLamba2006/discord-lavalink/tree/main/example) for more usage examples:

- Basic usage
- Search functionality
- Audio filters
- Event handling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you need help with this library, you can:

- [Open an issue](https://github.com/TejasLamba2006/discord-lavalink/issues)

## Credits

- [TejasLamba2006](https://github.com/TejasLamba2006)
