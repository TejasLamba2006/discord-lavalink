# discord-lavalink
![ChatGPT Image May 2, 2025, 02_12_12 AM](https://github.com/user-attachments/assets/d7caa00e-6476-495f-9a3e-621e8795cd54)

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

A TypeScript wrapper for [Lavalink v4](https://github.com/lavalink-devs/Lavalink) that works with Discord.js v14. Handles the WebSocket connection, REST calls, voice state forwarding, and auto-reconnect — so you can focus on building your bot instead of re-implementing all that every time.

Built this in about 2 hours from scratch. It covers what most music bots actually need.

## What it does

- Connects to Lavalink v4 over WebSocket and keeps the connection alive with exponential backoff reconnect
- Searches across YouTube, YouTube Music, SoundCloud, Spotify, Deezer, Apple Music, and Yandex Music
- Full playback control: play, stop, pause, seek, volume
- Forwards voice state updates from Discord to Lavalink automatically
- Session resuming via the Lavalink v4 sessions API
- All audio filters Lavalink exposes: equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass
- Full TypeScript types for everything

## Installation

```bash
npm install discord-lavalink
```

## Prerequisites

You need a running [Lavalink v4 server](https://github.com/lavalink-devs/Lavalink). If you don't have one yet, see the [setup guide](docs/lavalink-setup.md).

You also need discord.js v14 and @discordjs/voice.

## Quick start

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { Lavalink, LogLevel } from 'discord-lavalink';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const lavalink = new Lavalink({
  client,
  baseUrl: 'http://localhost:2333',
  password: 'youshallnotpass',
  logLevel: LogLevel.NORMAL,
});

lavalink.on('ready', (data) => {
  console.log(`Lavalink ready, session: ${data.sessionId}`);
});

lavalink.on('trackStart', (data) => {
  console.log(`Now playing: ${data.track.info.title}`);
});

client.on('ready', () => {
  lavalink.connect();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'play') return;

  const query = interaction.options.getString('song', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply('This command can only be used in a server!');
    return;
  }

  const member = interaction.member;
  if (!member || !('voice' in member) || !member.voice.channel) {
    await interaction.reply('You need to be in a voice channel!');
    return;
  }

  await interaction.deferReply();

  joinVoiceChannel({
    channelId: member.voice.channel.id,
    guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  try {
    const result = await lavalink.tracks(query);

    if (result.loadType === 'empty' || result.loadType === 'error') {
      await interaction.editReply('Nothing found.');
      return;
    }

    await lavalink.play(guildId, result);
    const title =
      result.loadType === 'track'
        ? result.data.info.title
        : result.loadType === 'search'
          ? result.data[0].info.title
          : result.data.info.name;

    await interaction.editReply(`Now playing: ${title}`);
  } catch (error) {
    console.error(error);
    await interaction.editReply('Something went wrong.');
  }
});

client.login('YOUR_DISCORD_BOT_TOKEN');
```

## Configuration

```typescript
const lavalink = new Lavalink({
  client,
  baseUrl: 'http://localhost:2333',
  password: 'youshallnotpass',
  logLevel: LogLevel.NORMAL,
  customOptions: {
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    headers: {},
    clientName: 'discord-lavalink/1.0.0',
  },
});
```

`LogLevel.NORMAL` only logs errors. `LogLevel.DEBUG` logs everything — useful when something isn't working and you need to see what's happening.

## API

### Connection

```typescript
lavalink.connect();
lavalink.connect('previousSessionId');

lavalink.disconnect();

await lavalink.configureResuming(60);
```

Pass the previous session ID to `connect()` to resume a session. Call `configureResuming()` after connecting to tell Lavalink to keep session state alive for the given number of seconds.

### Track loading

```typescript
const result = await lavalink.tracks('never gonna give you up', 'ytsearch');
const result = await lavalink.loadTracks('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
```

`tracks()` prepends the search type prefix automatically. If you pass a URL, it loads directly without a prefix. `loadTracks()` always loads from an identifier or URL as-is.

### Playback

```typescript
await lavalink.play(guildId, track);
await lavalink.play(guildId, track, {
  volume: 80,
  paused: false,
  position: 30000,
  noReplace: true,
  filters: {
    volume: 1.0,
    equalizer: [{ band: 0, gain: 0.2 }],
  },
});

await lavalink.stop(guildId);

await lavalink.pause(guildId, true);
await lavalink.pause(guildId, false);

await lavalink.seek(guildId, 60000);

await lavalink.setVolume(guildId, 50);

const player = await lavalink.getPlayer(guildId);
```

`play()` accepts a `Datum` object, a `TracksResult` (it picks the right track from it), or a raw encoded/identifier string. When `noReplace` is true, Lavalink won't replace a currently playing track.

### Events

```typescript
lavalink.on('ready', (data) => { });
lavalink.on('trackStart', (data) => { });
lavalink.on('trackEnd', (data) => { });
lavalink.on('trackException', (data) => { });
lavalink.on('trackStuck', (data) => { });
lavalink.on('playerUpdate', (data) => { });
lavalink.on('webSocketClosed', (data) => { });
lavalink.on('stats', (data) => { });

lavalink.off('trackStart', myHandler);
```

## Search types

| Type | Source |
|------|--------|
| `ytsearch` | YouTube |
| `ytmsearch` | YouTube Music |
| `scsearch` | SoundCloud |
| `spsearch` | Spotify (requires LavaSrc plugin) |
| `dzsearch` | Deezer (requires LavaSrc plugin) |
| `amsearch` | Apple Music (requires LavaSrc plugin) |
| `ymsearch` | Yandex Music (requires LavaSrc plugin) |

## Audio filters

Pass any of these in `options.filters` when calling `play()`, or update them with a separate `play()` call:

```typescript
const filters = {
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
    speed: 1.0,
    pitch: 1.0,
    rate: 1.0,
  },
  tremolo: { frequency: 2.0, depth: 0.5 },
  vibrato: { frequency: 2.0, depth: 0.5 },
  rotation: { rotationHz: 0.0 },
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
  lowPass: { smoothing: 20.0 },
};
```

See [docs/audio-filters.md](docs/audio-filters.md) for what each filter actually does.

## Lavalink server setup

See [docs/lavalink-setup.md](docs/lavalink-setup.md).

## Examples

The [example/](example/) directory has a basic bot and a search example.

## Contributing

Open a PR. Fork the repo, make your change, and submit it against `main`. If you're fixing a bug, a test case reproducing the issue is appreciated.

## License

MIT — see [LICENSE](LICENSE).

## Credits

Built by [TejasLamba2006](https://github.com/TejasLamba2006).
