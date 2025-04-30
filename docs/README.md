# discord-lavalink Documentation

![discord-lavalink Logo](https://i.imgur.com/IG5Abk5.png)

Welcome to the discord-lavalink documentation! This library makes it super easy to add music functionality to your Discord bot.

## Getting Started

- [Quick Start Guide](README.md) - Learn the basics of using discord-lavalink
- [Setting Up Lavalink Server](lavalink-setup.md) - How to set up your Lavalink server
- [Audio Filters Guide](audio-filters.md) - Learn how to make your music sound awesome

## Features

- 🚀 **Simple & Intuitive API** - Easy to use with minimal setup
- 🔌 **Full Lavalink v4 Support** - Compatible with the latest Lavalink features
- 🎵 **Advanced Audio Playback** - Control volume, filters, and more
- 🔍 **Multiple Search Providers** - YouTube, Spotify, SoundCloud, and more
- 📊 **Detailed Player Information** - Track position, state, and events
- 🔄 **Session Resuming** - Seamless playback across reconnections
- 📝 **TypeScript Support** - Full type definitions for a better development experience
- 🔧 **Customizable** - Configure to fit your specific needs

## Installation

```bash
npm install discord-lavalink
```

or with Yarn:

```bash
yarn add discord-lavalink
```

## Basic Example

```javascript
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { Lavalink, LogLevel } from 'discord-lavalink';

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Create Lavalink client
const lavalink = new Lavalink({
  client,
  baseUrl: 'http://localhost:2333',
  password: 'youshallnotpass',
  logLevel: LogLevel.NORMAL,
});

// Connect to Lavalink when ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  lavalink.connect();
});

// Example command to play music
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!play')) {
    const query = message.content.slice(6);
    const guildId = message.guild.id;
    
    // Join the voice channel
    joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: guildId,
      adapterCreator: message.guild.voiceAdapterCreator,
    });
    
    // Search for the track
    const searchResult = await lavalink.tracks(query);
    
    if (!searchResult.data || searchResult.data.length === 0) {
      message.reply('No tracks found!');
      return;
    }
    
    // Play the first track
    const track = searchResult.data[0];
    await lavalink.play(guildId, track);
    
    message.reply(`Now playing: ${track.info.title}`);
  }
});

// Login to Discord
client.login('YOUR_BOT_TOKEN');
```

## Need Help?

If you need help with discord-lavalink:

- Check the [GitHub repository](https://github.com/TejasLamba2006/discord-lavalink)
- Open an [issue](https://github.com/TejasLamba2006/discord-lavalink/issues) if you think you've found a bug
- Look at the [examples](https://github.com/TejasLamba2006/discord-lavalink/tree/main/example) for more usage examples

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/TejasLamba2006/discord-lavalink/blob/main/LICENSE) file for details.
