# Audio Filters Guide

One of the coolest features of discord-lavalink is the ability to add audio filters to your music! This guide will show you how to use them to make your music sound awesome.

## What Are Audio Filters?

Audio filters change how your music sounds. You can:
- Make the bass stronger
- Change the speed of the song
- Add cool wobble effects
- And much more!

## How to Use Filters

You can apply filters when you start playing a track:

```javascript
await lavalink.play(guildId, track, {
  filters: {
    // Your filters go here
  }
});
```

Or you can update filters on a currently playing track:

```javascript
await lavalink.play(guildId, currentlyPlayingTrack, {
  filters: {
    // Your new filters go here
  }
});
```

## Available Filters

### Volume

Changes the volume of the track:

```javascript
filters: {
  volume: 1.5  // 150% volume (1.0 is normal)
}
```

### Equalizer

The equalizer lets you boost or reduce specific frequency ranges. It has 15 bands (0-14):
- Lower bands (0-3): Bass frequencies
- Middle bands (4-10): Mid-range frequencies
- Higher bands (11-14): Treble frequencies

Each band can be set from -0.25 to 1.0:

```javascript
filters: {
  equalizer: [
    { band: 0, gain: 0.6 },  // Boost bass
    { band: 1, gain: 0.5 },
    { band: 2, gain: 0.4 },
    { band: 3, gain: 0.3 },
    { band: 4, gain: 0.2 },
    { band: 5, gain: 0.1 },
    { band: 6, gain: 0.0 },  // Leave mid frequencies normal
    { band: 7, gain: 0.0 },
    { band: 8, gain: 0.0 },
    { band: 9, gain: 0.0 },
    { band: 10, gain: 0.0 },
    { band: 11, gain: -0.1 }, // Reduce treble a bit
    { band: 12, gain: -0.1 },
    { band: 13, gain: -0.1 },
    { band: 14, gain: -0.1 }
  ]
}
```

### Karaoke

Tries to remove vocals from the track (results vary by song):

```javascript
filters: {
  karaoke: {
    level: 1.0,       // Karaoke level
    monoLevel: 1.0,   // Mono level
    filterBand: 220.0, // Filter band
    filterWidth: 100.0 // Filter width
  }
}
```

### Timescale

Changes the speed, pitch, and rate of the track:

```javascript
filters: {
  timescale: {
    speed: 1.2,  // 20% faster
    pitch: 1.0,  // Normal pitch
    rate: 1.0    // Normal rate
  }
}
```

- `speed`: How fast the track plays (1.0 = normal, 2.0 = twice as fast)
- `pitch`: The pitch of the track (1.0 = normal, 2.0 = chipmunk effect)
- `rate`: Combination of speed and pitch

### Tremolo

Creates a volume wobble effect:

```javascript
filters: {
  tremolo: {
    frequency: 4.0,  // 4 wobbles per second
    depth: 0.5       // How strong the wobble is (0-1)
  }
}
```

### Vibrato

Creates a pitch wobble effect:

```javascript
filters: {
  vibrato: {
    frequency: 4.0,  // 4 wobbles per second
    depth: 0.5       // How strong the wobble is (0-1)
  }
}
```

### Rotation

Makes the audio sound like it's rotating around your head (works best with headphones):

```javascript
filters: {
  rotation: {
    rotationHz: 0.2  // Rotation speed in Hz
  }
}
```

### Distortion

Adds distortion to the track:

```javascript
filters: {
  distortion: {
    sinOffset: 0.0,
    sinScale: 1.0,
    cosOffset: 0.0,
    cosScale: 1.0,
    tanOffset: 0.0,
    tanScale: 1.0,
    offset: 0.0,
    scale: 1.0
  }
}
```

### Channel Mix

Controls how the left and right audio channels mix:

```javascript
filters: {
  channelMix: {
    leftToLeft: 1.0,    // Left channel to left output
    leftToRight: 0.0,   // Left channel to right output
    rightToLeft: 0.0,   // Right channel to left output
    rightToRight: 1.0   // Right channel to right output
  }
}
```

For mono sound:
```javascript
filters: {
  channelMix: {
    leftToLeft: 0.5,
    leftToRight: 0.5,
    rightToLeft: 0.5,
    rightToRight: 0.5
  }
}
```

### Low Pass

Reduces high frequencies:

```javascript
filters: {
  lowPass: {
    smoothing: 20.0  // How much to reduce high frequencies
  }
}
```

## Cool Filter Combinations

### Bass Boost

```javascript
filters: {
  equalizer: [
    { band: 0, gain: 0.6 },
    { band: 1, gain: 0.5 },
    { band: 2, gain: 0.4 }
  ]
}
```

### Nightcore Effect

```javascript
filters: {
  timescale: {
    speed: 1.3,
    pitch: 1.3,
    rate: 1.0
  }
}
```

### Vaporwave Effect

```javascript
filters: {
  timescale: {
    speed: 0.8,
    pitch: 0.8,
    rate: 1.0
  }
}
```

### 8D Audio Effect

```javascript
filters: {
  rotation: {
    rotationHz: 0.2
  }
}
```

### Phone Call Effect

```javascript
filters: {
  equalizer: [
    { band: 0, gain: -0.25 },
    { band: 1, gain: -0.25 },
    { band: 2, gain: -0.25 },
    { band: 3, gain: -0.25 },
    { band: 4, gain: 0.25 },
    { band: 5, gain: 0.25 },
    { band: 6, gain: 0.25 },
    { band: 7, gain: 0.25 },
    { band: 8, gain: -0.25 },
    { band: 9, gain: -0.25 },
    { band: 10, gain: -0.25 },
    { band: 11, gain: -0.25 },
    { band: 12, gain: -0.25 },
    { band: 13, gain: -0.25 },
    { band: 14, gain: -0.25 }
  ]
}
```

## Tips for Using Filters

1. **Start with small changes**: Extreme filter settings can make music sound bad
2. **Different songs react differently**: What sounds good on one song might not work on another
3. **Combine filters carefully**: Too many filters at once can cause weird effects
4. **Reset filters**: To remove all filters, just set an empty filters object:

```javascript
await lavalink.play(guildId, track, {
  filters: {}
});
```

## Creating a Filter Command

Here's an example of how to create a command that applies filters:

```javascript
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'filter') return;
  
  const guildId = interaction.guildId;
  if (!guildId) return;
  
  const filterType = interaction.options.getString('type', true);
  
  // Get current player
  const player = await lavalink.getPlayer(guildId);
  if (!player || !player.track) {
    await interaction.reply('No track is currently playing!');
    return;
  }
  
  let filters = {};
  
  switch (filterType) {
    case 'bassboost':
      filters = {
        equalizer: [
          { band: 0, gain: 0.6 },
          { band: 1, gain: 0.5 },
          { band: 2, gain: 0.4 }
        ]
      };
      break;
      
    case 'nightcore':
      filters = {
        timescale: {
          speed: 1.3,
          pitch: 1.3,
          rate: 1.0
        }
      };
      break;
      
    case 'vaporwave':
      filters = {
        timescale: {
          speed: 0.8,
          pitch: 0.8,
          rate: 1.0
        }
      };
      break;
      
    case '8d':
      filters = {
        rotation: {
          rotationHz: 0.2
        }
      };
      break;
      
    case 'reset':
      filters = {};
      break;
      
    default:
      await interaction.reply('Unknown filter type!');
      return;
  }
  
  // Apply the filter
  await lavalink.play(guildId, player.track, { filters });
  
  await interaction.reply(`Applied ${filterType} filter!`);
});
```

Have fun making your music sound awesome! 🎵
