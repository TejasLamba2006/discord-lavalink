# Setting Up Lavalink Server

This guide will help you set up a Lavalink server for use with the discord-lavalink package. Lavalink is what actually handles the audio processing and streaming for your Discord bot.

## What is Lavalink?

Lavalink is a standalone audio sending node that connects to Discord. It handles the complicated audio stuff so your bot doesn't have to!

## Requirements

- Java 11 or newer
- At least 512MB of RAM
- A stable internet connection

## Step 1: Download Lavalink

First, download the latest version of Lavalink:

1. Go to the [Lavalink GitHub releases page](https://github.com/lavalink-devs/Lavalink/releases)
2. Download the latest `Lavalink.jar` file

## Step 2: Create Configuration File

Create a file named `application.yml` in the same folder as the Lavalink.jar file. This tells Lavalink how to run.

Here's a basic configuration:

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
    bufferDurationMs: 400
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
```

## Step 3: Run Lavalink

Open a terminal or command prompt in the folder where you have the Lavalink.jar and application.yml files, then run:

```bash
java -jar Lavalink.jar
```

You should see Lavalink start up and eventually show "Lavalink is ready to accept connections."

## Adding Plugins for More Features

Lavalink can do even more cool stuff with plugins! Here's how to add some popular ones:

### Adding Spotify Support

To add Spotify support, you need to:

1. Get Spotify API credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Add the Lavasrc plugin to your configuration

Update your `application.yml` like this:

```yaml
lavalink:
  plugins:
    - dependency: com.github.topi314.lavasrc:lavasrc-plugin:4.0.0
  server:
    # ... your existing server config ...

plugins:
  lavasrc:
    sources:
      spotify: true
    spotify:
      clientId: "your-spotify-client-id"
      clientSecret: "your-spotify-client-secret"
      countryCode: "US"
```

### Adding Deezer Support

To add Deezer support:

```yaml
lavalink:
  plugins:
    - dependency: com.github.topi314.lavasrc:lavasrc-plugin:4.0.0
  server:
    # ... your existing server config ...

plugins:
  lavasrc:
    sources:
      deezer: true
    deezer:
      masterKey: "your-deezer-master-key"
```

### Adding Apple Music Support

To add Apple Music support:

```yaml
lavalink:
  plugins:
    - dependency: com.github.topi314.lavasrc:lavasrc-plugin:4.0.0
  server:
    # ... your existing server config ...

plugins:
  lavasrc:
    sources:
      applemusic: true
```

## Complete Example Configuration

Here's a complete example with all the popular plugins:

```yaml
server:
  port: 2333
  address: 0.0.0.0
lavalink:
  plugins:
    - dependency: com.github.topi314.lavasrc:lavasrc-plugin:4.0.0
    - dependency: dev.lavalink.youtube:youtube-plugin:0e5cfca4e88c32db430ce76e6866b13035c85d22
      snapshot: true
  server:
    password: "youshallnotpass"
    sources:
      youtube: false  # Disabled because we're using the YouTube plugin
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
  youtube:
    enabled: true
    allowDirectPlaylistIds: true
    allowDirectVideoIds: true
    allowSearch: true
    clients:
      - MUSIC
      - ANDROID_VR
      - WEB
      - WEBEMBEDDED
```

## Running Lavalink 24/7

If you want your bot to be available all the time, you'll need to run Lavalink 24/7. Here are some options:

### Option 1: Run on Your Computer

You can keep Lavalink running on your computer, but your computer needs to stay on.

### Option 2: Use a VPS or Cloud Server

You can rent a VPS (Virtual Private Server) or use a cloud service like:
- [DigitalOcean](https://www.digitalocean.com/)
- [Linode](https://www.linode.com/)
- [AWS](https://aws.amazon.com/)
- [Google Cloud](https://cloud.google.com/)

### Option 3: Use a Free Hosting Service

Some services offer free hosting with limitations:
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Railway](https://railway.app/)
- [Heroku](https://www.heroku.com/) (limited hours on free tier)

## Troubleshooting

### Lavalink Won't Start

- Make sure you have Java 11 or newer installed
- Check that your application.yml file is in the same folder as Lavalink.jar
- Make sure your application.yml has the correct format (YAML is sensitive to spacing)

### Can't Connect to Lavalink

- Make sure Lavalink is running
- Check that you're using the correct password in your bot code
- Make sure the port (default 2333) is open if connecting from another machine

### No Sound Playing

- Check if YouTube/Spotify/etc. is enabled in your configuration
- Make sure your bot has joined the voice channel
- Check if the volume is set correctly

### Spotify/Deezer Not Working

- Make sure you've added the correct plugin
- Check that your API credentials are correct
- Verify that the sources are enabled in the configuration

## Need More Help?

For more detailed information, check out the [official Lavalink documentation](https://lavalink.dev/).
