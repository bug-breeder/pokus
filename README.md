# Pokus

A gamified focus timer for **Amazfit smartwatches**, built on ZeppOS. Pokus uses Pokemon-style rewards to make staying focused more engaging -- focus longer, earn coins, encounter and catch Pokemon, and build your collection over time.

## How It Works

1. **Start a focus session** from the main menu
2. **Earn coins** as you stay focused (1 coin per 5-minute block)
3. **Get nudge vibrations** at configurable intervals to keep you on track
4. **Encounter a wild Pokemon** after 5+ minutes of focus
5. **Catch it** with a timing-bar minigame -- land in the green zone for the best odds
6. **Take a break** calculated by the Flowmodoro method (focus time / ratio)
7. **Build your Pokedex** -- 151 Gen 1 Pokemon to collect, with rare shinies

## Features

- **Flowmodoro timer** with configurable focus-to-break ratios (3:1 to 6:1)
- **Pokemon encounters** with a skill-based catch mechanic
- **Pokedex** to browse your collection (caught and uncaught)
- **Stats page** with weekly focus heatmap and all-time totals
- **Nudge system** -- alarm-based vibration reminders during focus sessions
- **Customizable settings** -- focus goals, nudge intervals, flow ratios
- **Developer mode** with separate save data for testing

## Tech Stack

- **Platform:** ZeppOS 3.6+ (Amazfit smartwatches)
- **Language:** JavaScript (ES2020)
- **UI:** ZeppOS hmUI widget system
- **Storage:** ZeppOS LocalStorage
- **Background:** App services with Alarm API for nudge vibrations

## Project Structure

```
pokus/
├── app.js                  # App entry point
├── app.json                # ZeppOS config, pages, permissions
├── app-service/
│   ├── timer-service.js    # Session monitor (exits when session ends)
│   └── nudge-service.js    # Alarm-based vibration nudges
├── pages/
│   ├── home/               # Title screen
│   ├── menu/               # Main navigation
│   ├── timer/              # Focus timer with progress arc
│   ├── break/              # Break countdown
│   ├── encounter/          # Pokemon catch minigame
│   ├── result/             # Catch result
│   ├── stats/              # Focus stats and heatmap
│   ├── pokedex/            # Pokemon list (scrollable)
│   ├── pokedex-detail/     # Single Pokemon view
│   ├── settings/           # App settings
│   ├── help/               # How to play
│   └── confirm/            # Confirmation dialog
├── utils/
│   ├── constants.js        # Device dimensions, colors, game config
│   ├── storage.js          # LocalStorage wrapper
│   ├── pokedex.js          # Gen 1 Pokemon data (151 entries)
│   └── vibration.js        # Haptic feedback patterns
├── assets/
│   └── raw/                # Sprites, icons, type badges
└── lib/
    └── download-pokemon.js # Build tool: sprite copier and pokedex generator
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 16
- [Zeus CLI](https://docs.zepp.com/docs/guides/tools/cli/) -- `npm i @zeppos/zeus-cli -g`
- Amazfit smartwatch running ZeppOS 3.6+ (or the [ZeppOS Simulator](https://docs.zepp.com/docs/guides/tools/simulator/))

### Setup

```bash
npm install
zeus login        # log in to Zepp Open Platform (required for device preview)
```

### Development

```bash
zeus dev          # compile and preview in simulator (watches for changes)
zeus preview      # compile and preview on device (scan QR code in Zepp App)
zeus build        # build .zab installer (output in dist/)
```

## License

ISC
