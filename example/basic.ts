/**
 * discord-lavalink Starter Example Bot
 *
 * This example demonstrates how to create a simple music bot using discord-lavalink.
 * It includes basic commands for playing, pausing, skipping, and controlling volume.
 *
 * Environment variables:
 * - DISCORD_TOKEN: Your Discord bot token
 * - LAVALINK_URL: URL of your Lavalink server (default: http://localhost:2333)
 * - LAVALINK_PASSWORD: Password for your Lavalink server (default: youshallnotpass)
 * - DEBUG: Set to 'true' for verbose logging
 *
 * To run with debug logging: DEBUG=true ts-node example/basic.ts
 * To run with normal logging: ts-node example/basic.ts
 */

import {
  Client,
  GatewayIntentBits,
  Message,
  EmbedBuilder,
  ActivityType,
  ColorResolvable
} from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import { Lavalink, LogLevel, Filters } from '../src';

// Note: You'll need to install dotenv if you want to use environment variables
// npm install dotenv
// For this example, we'll use hardcoded values instead of environment variables

// Bot configuration
const PREFIX = '!'; // Command prefix
const PRIMARY_COLOR = '#5865F2' as ColorResolvable;
const ERROR_COLOR = '#ED4245' as ColorResolvable;
const SUCCESS_COLOR = '#57F287' as ColorResolvable;

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Lavalink client
const lavalink = new Lavalink({
  client,
  baseUrl: 'http://localhost:2333', // Change this to your Lavalink server URL
  password: 'youshallnotpass',      // Change this to your Lavalink server password
  logLevel: LogLevel.NORMAL,        // Use LogLevel.DEBUG for verbose logging
  customOptions: {
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
    clientName: 'discord-lavalink-example/1.0.0',
  },
});

// Track queue system (simple implementation)
const queues = new Map<string, any[]>();

// Helper function to create embeds
function createEmbed(title: string, description: string, color: ColorResolvable = PRIMARY_COLOR) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

// Helper function to check if user is in a voice channel
function ensureVoiceChannel(message: Message) {
  if (!message.member?.voice.channel) {
    message.reply({
      embeds: [createEmbed('Error', 'You need to be in a voice channel to use this command!', ERROR_COLOR)]
    });
    return false;
  }
  return true;
}

// Helper function to get the queue for a guild
function getQueue(guildId: string) {
  if (!queues.has(guildId)) {
    queues.set(guildId, []);
  }
  return queues.get(guildId) || [];
}

// Helper function to play the next track in queue
async function playNextTrack(guildId: string) {
  const queue = getQueue(guildId);

  if (queue.length === 0) {
    console.log(`Queue is empty for guild ${guildId}`);
    return;
  }

  const track = queue[0];
  try {
    await lavalink.play(guildId, track);
    console.log(`Now playing: ${track.info.title} in guild ${guildId}`);
  } catch (error) {
    console.error('Error playing track:', error);
    // Remove the problematic track and try the next one
    queue.shift();
    if (queue.length > 0) {
      playNextTrack(guildId);
    }
  }
}

// Set up event listeners for Lavalink
lavalink.on('ready', (data: any) => {
  console.log(`Lavalink session established with ID: ${data.sessionId}`);
  console.log(`Session resumed: ${data.resumed}`);
});

lavalink.on('trackStart', (data: any) => {
  console.log(`Track started: ${data.track?.info.title}`);
});

lavalink.on('trackEnd', (data: any) => {
  console.log(`Track ended: ${data.track?.info.title} (Reason: ${data.reason})`);

  // If track finished naturally, play the next track in queue
  if (data.reason === 'finished') {
    const guildId = data.guildId;
    const queue = getQueue(guildId);

    // Remove the track that just ended
    queue.shift();

    // Play next track if available
    if (queue.length > 0) {
      playNextTrack(guildId);
    } else {
      console.log(`Queue is now empty for guild ${guildId}`);
    }
  }
});

lavalink.on('trackException', (data: any) => {
  console.error(`Track exception: ${data.exception?.message}`);
});

lavalink.on('trackStuck', (data: any) => {
  console.warn(`Track stuck: ${data.track?.info.title}, threshold: ${data.thresholdMs}ms`);

  // Skip the stuck track
  const guildId = data.guildId;
  const queue = getQueue(guildId);

  // Remove the stuck track
  queue.shift();

  // Play next track if available
  if (queue.length > 0) {
    playNextTrack(guildId);
  }
});

// Handle Discord client ready event
client.on('ready', async () => {
  if (!client.user) return;

  console.log(`Logged in as ${client.user.tag}`);

  // Set bot activity
  client.user.setActivity('music | !help', { type: ActivityType.Listening });

  try {
    // Connect to Lavalink
    lavalink.connect();

    // Wait for Lavalink session to be established
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for Lavalink connection'));
      }, 10000);

      // One-time event listener
      const readyHandler = () => {
        clearTimeout(timeout);
        resolve();
      };

      lavalink.on('ready', readyHandler);

      // Note: In a production environment, you would want to remove this listener
      // if Lavalink supported removeListener. For this example, we'll leave it.
    });

    // Configure session resuming
    await lavalink.configureResuming(60);

    console.log('Ready to play music!');
  } catch (error) {
    console.error('Error in initialization:', error);
  }
});

// Handle message commands
client.on('messageCreate', async (message) => {
  // Ignore messages from bots or messages without the prefix
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  // Parse command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  // Get guild ID (required for most commands)
  const guildId = message.guild?.id;
  if (!guildId) {
    message.reply('This command can only be used in a server!');
    return;
  }

  // Command handler
  switch (command) {
    case 'play':
    case 'p': {
      if (!ensureVoiceChannel(message)) return;

      const query = args.join(' ');
      if (!query) {
        message.reply({
          embeds: [createEmbed('Error', 'Please provide a song to play!', ERROR_COLOR)]
        });
        return;
      }

      // Join the voice channel if not already joined
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) {
        message.reply({
          embeds: [createEmbed('Error', 'You need to be in a voice channel to use this command!', ERROR_COLOR)]
        });
        return;
      }

      if (!getVoiceConnection(guildId)) {
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: message.guild!.voiceAdapterCreator,
        });
      }

      // Show searching message
      const searchingMsg = await message.channel.send({
        embeds: [createEmbed('🔍 Searching...', `Looking for: ${query}`)]
      });

      try {
        // Search for the track
        const searchResult = await lavalink.tracks(query);

        if (!searchResult.data || searchResult.data.length === 0) {
          searchingMsg.edit({
            embeds: [createEmbed('No Results', 'No tracks found for your query!', ERROR_COLOR)]
          });
          return;
        }

        const track = searchResult.data[0];
        const queue = getQueue(guildId);

        // Add track to queue
        queue.push(track);

        // If this is the only track in queue, play it immediately
        if (queue.length === 1) {
          await playNextTrack(guildId);
          searchingMsg.edit({
            embeds: [createEmbed('🎵 Now Playing', `[${track.info.title}](${track.info.uri}) by ${track.info.author}`, SUCCESS_COLOR)]
          });
        } else {
          // Otherwise, add it to queue
          searchingMsg.edit({
            embeds: [createEmbed('🎵 Added to Queue', `[${track.info.title}](${track.info.uri}) by ${track.info.author}\nPosition in queue: ${queue.length - 1}`, SUCCESS_COLOR)]
          });
        }
      } catch (error) {
        console.error('Error searching for track:', error);
        searchingMsg.edit({
          embeds: [createEmbed('Error', 'An error occurred while searching for the track!', ERROR_COLOR)]
        });
      }
      break;
    }

    case 'skip':
    case 's': {
      if (!ensureVoiceChannel(message)) return;

      const queue = getQueue(guildId);
      if (queue.length === 0) {
        message.reply({
          embeds: [createEmbed('Queue Empty', 'There are no tracks in the queue!', ERROR_COLOR)]
        });
        return;
      }

      // Get current track before skipping
      const currentTrack = queue[0];

      // Remove current track
      queue.shift();

      if (queue.length > 0) {
        // Play next track
        await playNextTrack(guildId);
        message.reply({
          embeds: [createEmbed('⏭️ Skipped', `Skipped [${currentTrack.info.title}](${currentTrack.info.uri})\nNow playing: [${queue[0].info.title}](${queue[0].info.uri})`, SUCCESS_COLOR)]
        });
      } else {
        // Stop playback if queue is empty
        await lavalink.stop(guildId);
        message.reply({
          embeds: [createEmbed('⏭️ Skipped', `Skipped [${currentTrack.info.title}](${currentTrack.info.uri})\nQueue is now empty.`, SUCCESS_COLOR)]
        });
      }
      break;
    }

    case 'stop': {
      if (!ensureVoiceChannel(message)) return;

      // Clear queue and stop playback
      queues.set(guildId, []);
      await lavalink.stop(guildId);

      // Disconnect from voice channel
      const connection = getVoiceConnection(guildId);
      if (connection) {
        connection.destroy();
      }

      message.reply({
        embeds: [createEmbed('⏹️ Stopped', 'Playback stopped and queue cleared.', SUCCESS_COLOR)]
      });
      break;
    }

    case 'pause': {
      if (!ensureVoiceChannel(message)) return;

      await lavalink.pause(guildId, true);
      message.reply({
        embeds: [createEmbed('⏸️ Paused', 'Playback paused.', SUCCESS_COLOR)]
      });
      break;
    }

    case 'resume': {
      if (!ensureVoiceChannel(message)) return;

      await lavalink.pause(guildId, false);
      message.reply({
        embeds: [createEmbed('▶️ Resumed', 'Playback resumed.', SUCCESS_COLOR)]
      });
      break;
    }

    case 'volume': {
      if (!ensureVoiceChannel(message)) return;

      const volume = parseInt(args[0]);
      if (isNaN(volume) || volume < 0 || volume > 100) {
        message.reply({
          embeds: [createEmbed('Error', 'Please provide a valid volume between 0 and 100!', ERROR_COLOR)]
        });
        return;
      }

      // Convert 0-100 scale to 0-1000 scale used by Lavalink
      const lavalinkVolume = volume * 10;
      await lavalink.setVolume(guildId, lavalinkVolume);

      message.reply({
        embeds: [createEmbed('🔊 Volume', `Volume set to ${volume}%`, SUCCESS_COLOR)]
      });
      break;
    }

    case 'queue':
    case 'q': {
      const queue = getQueue(guildId);

      if (queue.length === 0) {
        message.reply({
          embeds: [createEmbed('Queue Empty', 'There are no tracks in the queue!', ERROR_COLOR)]
        });
        return;
      }

      // Format queue as a list
      let queueText = '';
      queue.forEach((track, index) => {
        if (index === 0) {
          queueText += `**Now Playing:**\n[${track.info.title}](${track.info.uri}) by ${track.info.author}\n\n`;
        } else {
          queueText += `**${index}.** [${track.info.title}](${track.info.uri}) by ${track.info.author}\n`;
        }
      });

      message.reply({
        embeds: [createEmbed('🎵 Queue', queueText || 'Queue is empty!', PRIMARY_COLOR)]
      });
      break;
    }

    case 'bassboost': {
      if (!ensureVoiceChannel(message)) return;

      const player = await lavalink.getPlayer(guildId);
      if (!player || !player.track) {
        message.reply({
          embeds: [createEmbed('Error', 'No track is currently playing!', ERROR_COLOR)]
        });
        return;
      }

      // Apply bass boost filter
      const filters: Filters = {
        equalizer: [
          { band: 0, gain: 0.6 },
          { band: 1, gain: 0.5 },
          { band: 2, gain: 0.4 }
        ]
      };

      await lavalink.play(guildId, player.track, { filters });

      message.reply({
        embeds: [createEmbed('🔊 Bass Boost', 'Bass boost filter applied!', SUCCESS_COLOR)]
      });
      break;
    }

    case 'nightcore': {
      if (!ensureVoiceChannel(message)) return;

      const player = await lavalink.getPlayer(guildId);
      if (!player || !player.track) {
        message.reply({
          embeds: [createEmbed('Error', 'No track is currently playing!', ERROR_COLOR)]
        });
        return;
      }

      // Apply nightcore filter
      const filters: Filters = {
        timescale: {
          speed: 1.3,
          pitch: 1.3,
          rate: 1.0
        }
      };

      await lavalink.play(guildId, player.track, { filters });

      message.reply({
        embeds: [createEmbed('🎵 Nightcore', 'Nightcore filter applied!', SUCCESS_COLOR)]
      });
      break;
    }

    case 'resetfilters': {
      if (!ensureVoiceChannel(message)) return;

      const player = await lavalink.getPlayer(guildId);
      if (!player || !player.track) {
        message.reply({
          embeds: [createEmbed('Error', 'No track is currently playing!', ERROR_COLOR)]
        });
        return;
      }

      // Reset all filters
      await lavalink.play(guildId, player.track, { filters: {} });

      message.reply({
        embeds: [createEmbed('🔄 Reset Filters', 'All filters have been reset!', SUCCESS_COLOR)]
      });
      break;
    }

    case 'help': {
      const helpEmbed = new EmbedBuilder()
        .setTitle('🎵 Music Bot Commands')
        .setColor(PRIMARY_COLOR)
        .setDescription('Here are all the available commands:')
        .addFields(
          { name: `${PREFIX}play <song>`, value: 'Plays a song or adds it to the queue' },
          { name: `${PREFIX}skip`, value: 'Skips the current song' },
          { name: `${PREFIX}stop`, value: 'Stops playback and clears the queue' },
          { name: `${PREFIX}pause`, value: 'Pauses the current song' },
          { name: `${PREFIX}resume`, value: 'Resumes playback' },
          { name: `${PREFIX}volume <0-100>`, value: 'Sets the volume' },
          { name: `${PREFIX}queue`, value: 'Shows the current queue' },
          { name: `${PREFIX}bassboost`, value: 'Applies bass boost filter' },
          { name: `${PREFIX}nightcore`, value: 'Applies nightcore filter' },
          { name: `${PREFIX}resetfilters`, value: 'Resets all audio filters' }
        )
        .setFooter({ text: 'Made with discord-lavalink' });

      message.reply({ embeds: [helpEmbed] });
      break;
    }

    default:
      // Unknown command
      break;
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Disconnecting from Lavalink...');
  lavalink.disconnect();
  client.destroy();
  process.exit(0);
});

// Login to Discord
// Replace 'YOUR_BOT_TOKEN' with your actual Discord bot token
client.login('YOUR_BOT_TOKEN')
  .catch(error => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
  });
