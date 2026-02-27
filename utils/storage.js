/**
 * Pokus Storage
 * Persistent data storage using ZeppOS LocalStorage
 */

import { LocalStorage } from '@zos/storage';

const storage = new LocalStorage();

// Storage keys (base keys - will be prefixed with 'dev_' in dev mode for data keys)
const KEYS = {
  // Data keys (separate storage for dev/normal mode)
  COINS: 'pokus_coins',
  CAUGHT: 'pokus_caught',
  SHINY: 'pokus_shiny',
  LAST_RESULT: 'pokus_last_result',
  FOCUS_HISTORY: 'pokus_focus_history',
  TOTAL_FOCUS_TIME: 'pokus_total_focus',
  TIMER_STATE: 'pokus_timer_state',
  NUDGE_ALARM_ID: 'pokus_nudge_alarm',
  ACCUMULATED_FOCUS: 'pokus_accumulated_focus', // Accumulated focus for encounter trigger
  RECENT_FOCUS: 'pokus_recent_focus', // Recent focus durations (array of seconds, max 3)
  RECENT_BREAK: 'pokus_recent_break', // Recent break durations (array of seconds, max 3)
  // Settings keys (shared across modes)
  SETTINGS_FOCUS_GOAL: 'pokus_focus_goal',
  SETTINGS_NUDGE_ENABLED: 'pokus_nudge_enabled',
  SETTINGS_NUDGE_INTERVAL: 'pokus_nudge_interval',
  SETTINGS_FLOW_RATIO: 'pokus_flow_ratio', // Flowmodoro ratio (3, 4, 5, 6)
  SETTINGS_DEV_MODE: 'pokus_dev_mode', // Dev mode toggle (shared)
};

// Keys that should NOT be prefixed in dev mode (settings are shared)
const SHARED_KEYS = [
  KEYS.SETTINGS_FOCUS_GOAL,
  KEYS.SETTINGS_NUDGE_ENABLED,
  KEYS.SETTINGS_NUDGE_INTERVAL,
  KEYS.SETTINGS_FLOW_RATIO,
  KEYS.SETTINGS_DEV_MODE,
];

// =============================================================================
// DEVELOPER MODE
// =============================================================================

/**
 * Check if developer mode is enabled
 * @returns {boolean}
 */
export function isDevMode() {
  try {
    const val = storage.getItem(KEYS.SETTINGS_DEV_MODE, false);
    return typeof val === 'boolean' ? val : false;
  } catch (e) {
    console.log('isDevMode error:', e);
    return false;
  }
}

/**
 * Set developer mode
 * @param {boolean} enabled
 */
export function setDevMode(enabled) {
  try {
    storage.setItem(KEYS.SETTINGS_DEV_MODE, enabled);
    console.log('setDevMode:', enabled);
  } catch (e) {
    console.log('setDevMode error:', e);
  }
}

/**
 * Get the actual storage key (adds 'dev_' prefix for data keys in dev mode)
 * @param {string} baseKey - Base key from KEYS
 * @returns {string} Actual key to use
 */
function getKey(baseKey) {
  // Settings are shared across modes
  if (SHARED_KEYS.includes(baseKey)) {
    return baseKey;
  }
  // Data keys get prefixed in dev mode
  if (isDevMode()) {
    return baseKey.replace('pokus_', 'pokus_dev_');
  }
  return baseKey;
}

// Default settings
const DEFAULT_SETTINGS = {
  focusGoal: 5, // minutes
  nudgeEnabled: true,
  nudgeInterval: 5, // minutes
  flowRatio: 4, // 4:1 ratio (4 min focus = 1 min break)
};

// =============================================================================
// COINS
// =============================================================================

/**
 * Get current coin balance
 * @returns {number}
 */
export function getCoins() {
  try {
    const val = storage.getItem(getKey(KEYS.COINS), 0);
    return typeof val === 'number' ? val : 0;
  } catch (e) {
    console.log('getCoins error:', e);
    return 0;
  }
}

/**
 * Set coin balance
 * @param {number} amount
 */
export function setCoins(amount) {
  try {
    storage.setItem(getKey(KEYS.COINS), amount);
  } catch (e) {
    console.log('setCoins error:', e);
  }
}

/**
 * Add coins to balance
 * @param {number} amount
 * @returns {number} New total
 */
export function addCoins(amount) {
  const current = getCoins();
  const newTotal = current + amount;
  setCoins(newTotal);
  return newTotal;
}

// =============================================================================
// POKEMON COLLECTION
// =============================================================================

/**
 * Get list of caught Pokemon IDs
 * @returns {number[]}
 */
export function getCaughtPokemon() {
  try {
    const val = storage.getItem(getKey(KEYS.CAUGHT), []);
    return Array.isArray(val) ? val : [];
  } catch (e) {
    console.log('getCaughtPokemon error:', e);
    return [];
  }
}

/**
 * Add a caught Pokemon to collection
 * @param {number} id - Pokemon ID
 * @param {boolean} isShiny - Whether it's shiny
 */
export function addCaughtPokemon(id, isShiny) {
  try {
    // Add to caught list (deduplicated)
    const caught = getCaughtPokemon();
    if (!caught.includes(id)) {
      caught.push(id);
      storage.setItem(getKey(KEYS.CAUGHT), caught);
    }

    // Add to shiny list if shiny (deduplicated)
    if (isShiny) {
      let shiny = storage.getItem(getKey(KEYS.SHINY), []);
      if (!Array.isArray(shiny)) shiny = [];
      if (!shiny.includes(id)) {
        shiny.push(id);
        storage.setItem(getKey(KEYS.SHINY), shiny);
      }
    }
  } catch (e) {
    console.log('addCaughtPokemon error:', e);
  }
}

/**
 * Get list of shiny Pokemon IDs
 * @returns {number[]}
 */
export function getShinyPokemon() {
  try {
    const val = storage.getItem(getKey(KEYS.SHINY), []);
    return Array.isArray(val) ? val : [];
  } catch (e) {
    console.log('getShinyPokemon error:', e);
    return [];
  }
}

// =============================================================================
// ENCOUNTER RESULT
// =============================================================================

/**
 * Save encounter result for result screen
 * @param {number} pokemonId
 * @param {string} pokemonName
 * @param {number} typeId
 * @param {number} typeId2
 * @param {boolean} isShiny
 * @param {boolean} caught
 */
export function saveLastResult(pokemonId, pokemonName, typeId, typeId2, isShiny, caught) {
  try {
    storage.setItem(getKey(KEYS.LAST_RESULT), {
      id: pokemonId,
      name: pokemonName,
      typeId: typeId,
      typeId2: typeId2,
      shiny: isShiny,
      caught: caught,
    });
  } catch (e) {
    console.log('saveLastResult error:', e);
  }
}

/**
 * Get last encounter result
 * @returns {Object|null}
 */
export function getLastResult() {
  try {
    const val = storage.getItem(getKey(KEYS.LAST_RESULT), null);
    return val && val.id ? val : null;
  } catch (e) {
    console.log('getLastResult error:', e);
    return null;
  }
}

// =============================================================================
// FOCUS TIME TRACKING
// =============================================================================

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string}
 */
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get focus history (last 7 days stored)
 * Format: { "2025-12-07": 1500, "2025-12-06": 900, ... } (seconds per day)
 * @returns {Object}
 */
export function getFocusHistory() {
  try {
    const val = storage.getItem(getKey(KEYS.FOCUS_HISTORY), {});
    return typeof val === 'object' && val !== null ? val : {};
  } catch (e) {
    console.log('getFocusHistory error:', e);
    return {};
  }
}

/**
 * Add focus time to today's total and all-time total
 * Keeps only last 7 days in history to save memory
 * @param {number} seconds - Focus time in seconds
 */
export function addFocusTime(seconds) {
  try {
    const history = getFocusHistory();
    const today = getTodayKey();

    // Add to today's total
    history[today] = (history[today] || 0) + seconds;

    // Keep only last 7 days in history
    const keys = Object.keys(history).sort().reverse();
    const cleaned = {};
    for (let i = 0; i < Math.min(keys.length, 7); i++) {
      cleaned[keys[i]] = history[keys[i]];
    }
    storage.setItem(getKey(KEYS.FOCUS_HISTORY), cleaned);

    // Also add to all-time total (separate key, never cleaned up)
    const total = getTotalFocusTime();
    storage.setItem(getKey(KEYS.TOTAL_FOCUS_TIME), total + seconds);

    console.log('addFocusTime:', seconds, 'Today:', cleaned[today], 'Total:', total + seconds);
  } catch (e) {
    console.log('addFocusTime error:', e);
  }
}

/**
 * Get total focus time (all-time, not just last 7 days)
 * @returns {number} Total seconds
 */
export function getTotalFocusTime() {
  try {
    const val = storage.getItem(getKey(KEYS.TOTAL_FOCUS_TIME), 0);
    return typeof val === 'number' ? val : 0;
  } catch (e) {
    console.log('getTotalFocusTime error:', e);
    return 0;
  }
}

/**
 * Get weekly focus time (sum of last 7 days)
 * @returns {number} Total seconds this week
 */
export function getWeeklyFocusTime() {
  try {
    const data = getWeeklyFocusData();
    return data.reduce((sum, day) => sum + day.seconds, 0);
  } catch (e) {
    console.log('getWeeklyFocusTime error:', e);
    return 0;
  }
}

/**
 * Get focus data for last 7 days (for heatmap)
 * @returns {Array<{date: string, day: string, seconds: number}>}
 */
export function getWeeklyFocusData() {
  try {
    const history = getFocusHistory();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      result.push({
        date: key,
        day: days[date.getDay()],
        seconds: history[key] || 0,
      });
    }

    return result;
  } catch (e) {
    console.log('getWeeklyFocusData error:', e);
    return [];
  }
}

// =============================================================================
// TIMER STATE (for surviving screen-off and app relaunch)
// =============================================================================

/**
 * Get persisted timer state
 * @returns {Object|null} { startTime: number, isRunning: boolean } or null
 */
export function getTimerState() {
  try {
    const val = storage.getItem(getKey(KEYS.TIMER_STATE), null);
    return val && val.startTime ? val : null;
  } catch (e) {
    console.log('getTimerState error:', e);
    return null;
  }
}

/**
 * Save timer state
 * @param {Object} timerState - { mode, startTime, endTime, durationSeconds, baseBreakSeconds, canExtend, isRunning }
 */
export function saveTimerState(timerState) {
  try {
    const state = {
      ...timerState,
      isRunning: timerState.isRunning !== false,
    };
    storage.setItem(getKey(KEYS.TIMER_STATE), state);
    console.log(
      'saveTimerState: mode=',
      state.mode,
      'endTime=',
      state.endTime,
      'running:',
      state.isRunning
    );
  } catch (e) {
    console.log('saveTimerState error:', e);
  }
}

/**
 * Clear timer state (when session ends)
 */
export function clearTimerState() {
  try {
    storage.setItem(getKey(KEYS.TIMER_STATE), null);
    console.log('clearTimerState');
  } catch (e) {
    console.log('clearTimerState error:', e);
  }
}

/**
 * Check if timer is currently running (for background service)
 * @returns {boolean}
 */
export function isTimerRunning() {
  try {
    const state = getTimerState();
    return !!(state && state.startTime && state.isRunning !== false);
  } catch {
    return false;
  }
}

// =============================================================================
// ACCUMULATED FOCUS (for Pokemon encounter trigger)
// =============================================================================

/**
 * Get accumulated focus seconds (counts toward encounter trigger)
 * @returns {number}
 */
export function getAccumulatedFocus() {
  try {
    const val = storage.getItem(getKey(KEYS.ACCUMULATED_FOCUS), 0);
    return typeof val === 'number' ? val : 0;
  } catch (e) {
    console.log('getAccumulatedFocus error:', e);
    return 0;
  }
}

/**
 * Add focus seconds to accumulated total
 * @param {number} seconds
 */
export function addAccumulatedFocus(seconds) {
  try {
    const current = getAccumulatedFocus();
    storage.setItem(getKey(KEYS.ACCUMULATED_FOCUS), current + seconds);
    console.log('addAccumulatedFocus:', seconds, 'total:', current + seconds);
  } catch (e) {
    console.log('addAccumulatedFocus error:', e);
  }
}

/**
 * Deduct focus seconds from accumulated total (called when encounter is triggered)
 * @param {number} seconds
 */
export function deductAccumulatedFocus(seconds) {
  try {
    const current = getAccumulatedFocus();
    const newVal = Math.max(0, current - seconds);
    storage.setItem(getKey(KEYS.ACCUMULATED_FOCUS), newVal);
    console.log('deductAccumulatedFocus:', seconds, 'remaining:', newVal);
  } catch (e) {
    console.log('deductAccumulatedFocus error:', e);
  }
}

// =============================================================================
// RECENT TIMERS (for timer-select screen)
// =============================================================================

/**
 * Get recent timer durations for a mode
 * @param {'focus'|'break'} mode
 * @returns {number[]} Array of seconds (most recent first, max 3)
 */
export function getRecentTimers(mode) {
  try {
    const key = mode === 'break' ? KEYS.RECENT_BREAK : KEYS.RECENT_FOCUS;
    const val = storage.getItem(getKey(key), []);
    return Array.isArray(val) ? val : [];
  } catch (e) {
    console.log('getRecentTimers error:', e);
    return [];
  }
}

/**
 * Save a timer duration to recent list for the given mode
 * Deduplicates and keeps most recent first, max 3 entries
 * @param {'focus'|'break'} mode
 * @param {number} seconds
 */
export function saveRecentTimer(mode, seconds) {
  try {
    const key = mode === 'break' ? KEYS.RECENT_BREAK : KEYS.RECENT_FOCUS;
    const existing = getRecentTimers(mode);
    // Deduplicate: remove if already in list
    const filtered = existing.filter((s) => s !== seconds);
    // Prepend new entry, keep max 3
    const updated = [seconds, ...filtered].slice(0, 3);
    storage.setItem(getKey(key), updated);
    console.log('saveRecentTimer:', mode, seconds, 'list:', updated);
  } catch (e) {
    console.log('saveRecentTimer error:', e);
  }
}

// =============================================================================
// NUDGE ALARM & STICKY NOTIFICATION (for 5-minute focus nudges)
// =============================================================================

/**
 * Save the alarm ID for the nudge reminder
 * @param {number} alarmId - Alarm ID returned from alarm.set()
 */
export function saveNudgeAlarmId(alarmId) {
  try {
    storage.setItem(getKey(KEYS.NUDGE_ALARM_ID), alarmId);
    console.log('saveNudgeAlarmId:', alarmId);
  } catch (e) {
    console.log('saveNudgeAlarmId error:', e);
  }
}

/**
 * Get the stored nudge alarm ID
 * @returns {number|null}
 */
export function getNudgeAlarmId() {
  try {
    const val = storage.getItem(getKey(KEYS.NUDGE_ALARM_ID), null);
    return typeof val === 'number' && val !== 0 ? val : null;
  } catch (e) {
    console.log('getNudgeAlarmId error:', e);
    return null;
  }
}

/**
 * Clear the nudge alarm ID
 */
export function clearNudgeAlarmId() {
  try {
    storage.setItem(getKey(KEYS.NUDGE_ALARM_ID), null);
    console.log('clearNudgeAlarmId');
  } catch (e) {
    console.log('clearNudgeAlarmId error:', e);
  }
}

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * Get focus goal in minutes
 * @returns {number}
 */
export function getFocusGoal() {
  try {
    const val = storage.getItem(KEYS.SETTINGS_FOCUS_GOAL, DEFAULT_SETTINGS.focusGoal);
    return typeof val === 'number' ? val : DEFAULT_SETTINGS.focusGoal;
  } catch (e) {
    console.log('getFocusGoal error:', e);
    return DEFAULT_SETTINGS.focusGoal;
  }
}

/**
 * Set focus goal in minutes
 * @param {number} minutes
 */
export function setFocusGoal(minutes) {
  try {
    storage.setItem(KEYS.SETTINGS_FOCUS_GOAL, minutes);
  } catch (e) {
    console.log('setFocusGoal error:', e);
  }
}

/**
 * Check if nudge vibration is enabled
 * @returns {boolean}
 */
export function isNudgeEnabled() {
  try {
    const val = storage.getItem(KEYS.SETTINGS_NUDGE_ENABLED, DEFAULT_SETTINGS.nudgeEnabled);
    return typeof val === 'boolean' ? val : DEFAULT_SETTINGS.nudgeEnabled;
  } catch (e) {
    console.log('isNudgeEnabled error:', e);
    return DEFAULT_SETTINGS.nudgeEnabled;
  }
}

/**
 * Set nudge vibration enabled/disabled
 * @param {boolean} enabled
 */
export function setNudgeEnabled(enabled) {
  try {
    storage.setItem(KEYS.SETTINGS_NUDGE_ENABLED, enabled);
  } catch (e) {
    console.log('setNudgeEnabled error:', e);
  }
}

/**
 * Get nudge interval in minutes
 * @returns {number}
 */
export function getNudgeInterval() {
  try {
    const val = storage.getItem(KEYS.SETTINGS_NUDGE_INTERVAL, DEFAULT_SETTINGS.nudgeInterval);
    return typeof val === 'number' ? val : DEFAULT_SETTINGS.nudgeInterval;
  } catch (e) {
    console.log('getNudgeInterval error:', e);
    return DEFAULT_SETTINGS.nudgeInterval;
  }
}

/**
 * Set nudge interval in minutes
 * @param {number} minutes
 */
export function setNudgeInterval(minutes) {
  try {
    storage.setItem(KEYS.SETTINGS_NUDGE_INTERVAL, minutes);
  } catch (e) {
    console.log('setNudgeInterval error:', e);
  }
}

/**
 * Get Flowmodoro ratio (focus:break ratio, e.g. 4 means 4:1)
 * @returns {number}
 */
export function getFlowRatio() {
  try {
    const val = storage.getItem(KEYS.SETTINGS_FLOW_RATIO, DEFAULT_SETTINGS.flowRatio);
    return typeof val === 'number' ? val : DEFAULT_SETTINGS.flowRatio;
  } catch (e) {
    console.log('getFlowRatio error:', e);
    return DEFAULT_SETTINGS.flowRatio;
  }
}

/**
 * Set Flowmodoro ratio
 * @param {number} ratio - 3, 4, 5, or 6
 */
export function setFlowRatio(ratio) {
  try {
    storage.setItem(KEYS.SETTINGS_FLOW_RATIO, ratio);
  } catch (e) {
    console.log('setFlowRatio error:', e);
  }
}

// =============================================================================
// RESET ALL PROGRESS
// =============================================================================

/**
 * Reset all progress data (coins, caught Pokemon, focus history, etc.)
 * Settings are preserved. Only resets data for current mode (dev or normal).
 */
export function resetAllProgress() {
  try {
    const mode = isDevMode() ? 'DEV' : 'NORMAL';

    // Reset coins
    storage.setItem(getKey(KEYS.COINS), 0);

    // Reset caught Pokemon
    storage.setItem(getKey(KEYS.CAUGHT), []);
    storage.setItem(getKey(KEYS.SHINY), []);

    // Reset last result
    storage.setItem(getKey(KEYS.LAST_RESULT), null);

    // Reset focus history
    storage.setItem(getKey(KEYS.FOCUS_HISTORY), {});
    storage.setItem(getKey(KEYS.TOTAL_FOCUS_TIME), 0);

    // Clear timer state
    storage.setItem(getKey(KEYS.TIMER_STATE), null);
    storage.setItem(getKey(KEYS.NUDGE_ALARM_ID), null);

    // Clear accumulated focus and recent timers
    storage.setItem(getKey(KEYS.ACCUMULATED_FOCUS), 0);
    storage.setItem(getKey(KEYS.RECENT_FOCUS), []);
    storage.setItem(getKey(KEYS.RECENT_BREAK), []);

    console.log('resetAllProgress: All progress data cleared for', mode, 'mode');
  } catch (e) {
    console.log('resetAllProgress error:', e);
  }
}
