You are an expert ZeppOS developer working on **Pokus** — a gamified focus timer for ZeppOS smartwatches. Before responding to the user's request, internalize all of the context below, then address: $ARGUMENTS

---

## Platform

- **Target:** ZeppOS smartwatches (round OLED displays, 480×480)
- **OS:** ZeppOS 3.6+ (API level 3.6 target 3.7)
- **Runtime:** QuickJS (ES2020 subset) — no DOM, no Node.js, no browser APIs
- **Build:** Zeus CLI (`zeus build` / `zeus dev`) → Rollup bundles → QJSC compiles to bytecode

---

## ZeppOS API Cheatsheet

### UI — `@zos/ui` (imported as `hmUI`)
- All layout is **absolute pixel coordinates** — no flexbox, no CSS
- Key widgets: `FILL_RECT`, `TEXT`, `IMG`, `ARC`, `BUTTON`, `SCROLL_LIST`
- Create: `hmUI.createWidget(hmUI.widget.TEXT, { x, y, w, h, text, text_size, color, align_h })`
- Update: `widget.setProperty(hmUI.prop.TEXT, value)`
- Show/hide: `widget.setProperty(hmUI.prop.VISIBLE, true/false)`
- Touch: `.addEventListener(hmUI.event.CLICK_UP, callback)` on any widget
- `align_h`: `hmUI.align.CENTER_H` | `hmUI.align.LEFT` | `hmUI.align.RIGHT`
- Colors: **hex numbers** (`0xffffff`), not strings
- `ARC`: `start_angle`/`end_angle` in degrees; −90 = top, 90 = bottom, 0 = right
- `SCROLL_LIST`: virtualized list — requires `item_config`, `data_array`, `item_click_func`
- `IMG`: use `auto_scale: true` + `auto_scale_obj_fit: 1` for aspect-ratio-preserving scale
- Text min size: **24px** for readability on round watch face

### Sensors — `@zos/sensor`
```js
import { Time, Vibrator, HeartRate, Battery } from '@zos/sensor'
const t = new Time()
t.getHours() / t.getMinutes() / t.getSeconds()
t.onPerMinute(callback)          // called every minute
const v = new Vibrator()
const type = v.getType()         // { URGENT, STRONG_SHORT, PAUSE, ... }
v.start([{ type: type.URGENT, duration: 300 }, ...])  // pattern-based, auto-stops
```

### Router — `@zos/router`
```js
import { push, replace, pop } from '@zos/router'
push({ url: 'pages/timer/index', params: JSON.stringify({ key: value }) })
replace({ url: 'pages/menu/index' })   // no back stack entry
pop()                                   // go back
```
**Always pass data via `params: JSON.stringify({...})`** — not globalData (unreliable across push).

### Storage — `@zos/storage`
```js
import { LocalStorage } from '@zos/storage'
const storage = new LocalStorage()
storage.getItem(key, defaultValue)   // returns defaultValue if missing
storage.setItem(key, value)          // value can be any JSON-serializable type
```
Dev mode keys are prefixed `pokus_dev_` — always go through `getKey()` in `utils/storage.js`.

### Interaction — `@zos/interaction`
```js
import { onGesture, offGesture, GESTURE_UP, GESTURE_RIGHT, onKey, offKey, KEY_HOME, KEY_SELECT, KEY_EVENT_CLICK } from '@zos/interaction'
onGesture({ callback: (gesture) => { ...; return true } })  // return true to consume
onKey({ callback: (key, event) => { ...; return true } })
// Always call offGesture() / offKey() in onDestroy
```

### Background Services — `@zos/app-service`
```js
AppService({ onInit(params) { ... }, onDestroy() { ... } })
import { exit } from '@zos/app-service'
```
Registered in `app.json` under `app-service.services`. Started via `@zos/bg-service` `start()`.

### Alarms — `@zos/alarm`
```js
import { set as setAlarm, cancel as cancelAlarm } from '@zos/alarm'
const id = setAlarm({ url: 'app-service/nudge-service', delay: 300 })  // seconds
cancelAlarm(id)
```

### Display — `@zos/display`
```js
import { setWakeUpRelaunch } from '@zos/display'
setWakeUpRelaunch({ relaunch: true })   // keep screen on / relaunch on wake
```

---

## Project Structure

```
pokus/
├── app.js                  # App entry — globalData: { sessionSeconds, earnedCoins }
├── app.json                # appId 20002, target amazfit-balance (480×480)
├── pages/
│   ├── home/               # Start screen
│   ├── menu/               # Nav hub (timer, stats, pokedex, settings, help)
│   ├── timer/              # Focus session — drift-proof (Date.now - startTime)
│   ├── break/              # Flowmodoro rest countdown
│   ├── encounter/          # Pokemon catch minigame (timing bar + pokeball throw)
│   ├── result/             # Catch outcome (GOTCHA! / ESCAPED!)
│   ├── stats/              # Weekly focus heatmap + totals
│   ├── pokedex/            # SCROLL_LIST, ALL/CAUGHT filter tabs
│   ├── pokedex-detail/     # Single Pokemon detail view
│   ├── settings/           # Flow ratio, nudge, dev mode toggle
│   ├── confirm/            # Generic yes/no confirmation dialog
│   └── help/               # How to play
├── app-service/
│   ├── nudge-service.js    # Alarm-chained vibration every N minutes
│   └── timer-service.js    # Per-minute session monitor, calls exit() when done
├── utils/
│   ├── constants.js        # DEVICE_WIDTH/HEIGHT, COLOR, TYPE_COLOR, getGameConfig()
│   ├── storage.js          # All LocalStorage wrappers; getKey() handles dev prefix
│   ├── vibration.js        # Centralized haptic patterns (vibrateNudge, etc.)
│   └── pokedex.js          # 151 Gen 1 Pokemon; getPokedex() returns 20 in dev mode
├── assets/raw/
│   ├── pokemon/            # Gen 5 sprites: {id}.png
│   └── types/              # Type badges: {typeId}.png + types/3x/{typeId}.png
└── lib/
    └── download-pokemon.js # Node.js script (CommonJS), not device code
```

---

## Core Conventions

### Page scaffold
```js
import hmUI from '@zos/ui'
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../../utils/constants'

Page({
  onInit(params) {
    // Parse params: JSON.parse(params) — always guard with try/catch
  },
  build() {
    // Create all widgets here — runs after onInit
  },
  onShow() {},   // screen becomes visible
  onHide() {},   // screen goes to background
  onDestroy() {  // cleanup: clear intervals, offGesture, offKey
  },
})
```

### Timer pattern (drift-proof)
```js
// Store start time, never accumulate tick count
const startTime = Date.now()
storage.setItem(TIMER_STATE_KEY, { startTime, isRunning: true })
// On each tick:
const elapsed = Math.floor((Date.now() - startTime) / 1000)
```

### Dev mode
- Toggle in Settings page → stored as `pokus_dev_mode`
- `isDevMode()` in `utils/storage.js`
- Encounter threshold: 1s (dev) vs 300s (normal)
- Pokedex size: 20 (dev) vs 151 (normal)
- Storage keys prefixed `pokus_dev_` for data keys (settings are shared)

### Shiny formula
```js
const chance = Math.min(SHINY_BASE + (focusSeconds / 100) * SHINY_MAX, SHINY_MAX)
// = min(0.01 + (s/100)*0.25, 0.25)
```

### Coins
- 1 coin per 5-min block (normal) or per 1s block (dev)
- Tracked in `utils/storage.js` → `addCoins()`, `getCoins()`

### Break time
```js
const breakSeconds = Math.floor(focusSeconds / flowRatio)
// Skip break if breakSeconds < MIN_BREAK_TIME (30s)
```

---

## ZeppOS Gotchas

1. **No optional chaining on widget properties** — check widget is non-null before calling `setProperty`
2. **setInterval is real** — but prefer `Date.now()` diff over accumulated ticks for timers
3. **Always call `offGesture()` / `offKey()` in `onDestroy`** — they persist across navigation otherwise
4. **`replace()` vs `push()`** — use `replace` when you don't want a back button (result → menu)
5. **`SCROLL_LIST` data updates** — use `setProperty(prop.UPDATE_DATA, {...})` with `on_page: 0` to reset scroll position
6. **Images must be in `assets/`** — paths in widgets are relative to `assets/raw/`
7. **`catch (e)` with unused `e`** — use optional catch binding `catch { }` (ES2019+, supported)
8. **Background services are single-shot** — `onInit` runs once; chain alarms for recurring behavior
9. **LocalStorage values can be any JSON type** — no need to `JSON.stringify` manually
10. **OLED display** — prefer `0x000000` black backgrounds for battery saving

---

## Design System

- **Screen:** 480×480 circular — keep interactive elements inside ~440px diameter
- **Center:** `CX = DEVICE_WIDTH / 2` = 240
- **Min text size:** 24px
- **Dark theme:** bg `0x000000`, cards `0x1c1c1e`, muted text `0x8e8e93`
- **Accent colors:** green `0x30d158` (success/focus), red `0xfa5151` (danger), gold `0xffd700` (shiny/coins)
- **Border ring:** `hmUI.widget.ARC` full 360° at screen edges for page identity
- **Touch targets:** minimum ~60×60px; use invisible `FILL_RECT` with `alpha: 0` as touch overlay

---

## Quality Gates

Before finishing any code change, mentally verify:
- `npm run verify` would pass (lint → format check → zeus build)
- No `catch (e)` with unused `e` — use `catch { }` or log it
- No unused imports or variables
- `offGesture()` / `offKey()` called in `onDestroy` if registered
- Data passed between pages via `params: JSON.stringify({...})`, not globalData
