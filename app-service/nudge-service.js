/**
 * Nudge Service (Alarm-Based)
 *
 * Triggered by alarm API every nudge interval (default 5 min).
 * After vibrating, schedules the NEXT alarm to chain nudges.
 *
 * Flow:
 * 1. Timer page schedules first alarm when session starts
 * 2. Alarm fires -> this service runs
 * 3. Service vibrates + schedules next alarm
 * 4. Timer page cancels alarm when session ends
 */

import { log as Logger } from '@zos/utils';
import { Vibrator } from '@zos/sensor';
import { LocalStorage } from '@zos/storage';
import { set as setAlarm } from '@zos/alarm';

const logger = Logger.getLogger('nudge-service');
const storage = new LocalStorage();

// Storage keys (must match storage.js)
const TIMER_STATE_KEY = 'pokus_timer_state';
const DEV_MODE_KEY = 'pokus_dev_mode';
const NUDGE_ENABLED_KEY = 'pokus_nudge_enabled';
const NUDGE_INTERVAL_KEY = 'pokus_nudge_interval';
const NUDGE_ALARM_ID_KEY = 'pokus_nudge_alarm';

// Default settings
const DEFAULT_NUDGE_INTERVAL = 5; // minutes

/**
 * Check if developer mode is enabled
 */
function isDevMode() {
  try {
    return storage.getItem(DEV_MODE_KEY, false) === true;
  } catch {
    return false;
  }
}

/**
 * Get the actual storage key
 */
function getKey(baseKey) {
  // Settings are shared across modes
  if (baseKey.includes('_nudge_') || baseKey === DEV_MODE_KEY) {
    return baseKey;
  }
  if (isDevMode()) {
    return baseKey.replace('pokus_', 'pokus_dev_');
  }
  return baseKey;
}

/**
 * Check if a focus session is currently active
 */
function isSessionActive() {
  try {
    const key = getKey(TIMER_STATE_KEY);
    const state = storage.getItem(key, null);
    return !!(state && state.startTime && state.isRunning !== false);
  } catch (e) {
    logger.log('isSessionActive error:', e);
    return false;
  }
}

/**
 * Check if nudges are enabled
 */
function isNudgeEnabled() {
  try {
    return storage.getItem(NUDGE_ENABLED_KEY, true) !== false;
  } catch {
    return true;
  }
}

/**
 * Get nudge interval in minutes
 */
function getNudgeInterval() {
  try {
    return storage.getItem(NUDGE_INTERVAL_KEY, DEFAULT_NUDGE_INTERVAL) || DEFAULT_NUDGE_INTERVAL;
  } catch {
    return DEFAULT_NUDGE_INTERVAL;
  }
}

/**
 * Save the alarm ID for cleanup later
 */
function saveAlarmId(alarmId) {
  try {
    storage.setItem(NUDGE_ALARM_ID_KEY, alarmId);
    logger.log('Saved alarm ID:', alarmId);
  } catch (e) {
    logger.log('saveAlarmId error:', e);
  }
}

/**
 * Schedule the next nudge alarm
 */
function scheduleNextNudge() {
  try {
    const intervalMinutes = getNudgeInterval();
    const delaySeconds = intervalMinutes * 60;

    const alarmId = setAlarm({
      url: 'app-service/nudge-service',
      delay: delaySeconds,
    });

    saveAlarmId(alarmId);
    logger.log('Scheduled next nudge in', intervalMinutes, 'minutes, alarm ID:', alarmId);
  } catch (e) {
    logger.log('scheduleNextNudge error:', e);
  }
}

/**
 * Send vibration nudge using pattern-based API (auto-stops)
 * MAXIMUM INTENSITY - 5 urgent pulses to get user's attention
 */
function vibrateNudge() {
  try {
    const vibrator = new Vibrator();
    const type = vibrator.getType();
    // Pattern-based vibration auto-stops after completion
    vibrator.start([
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
    ]);
    logger.log('Vibration nudge sent');
  } catch (e) {
    logger.log('vibrateNudge error:', e);
  }
}

AppService({
  onInit(params) {
    logger.log('Nudge service triggered', params || '');

    // Check if session is still active
    if (!isSessionActive()) {
      logger.log('No active session, skipping nudge');
      return;
    }

    // Check if nudges are enabled
    if (!isNudgeEnabled()) {
      logger.log('Nudges disabled, skipping');
      // Still schedule next alarm in case user re-enables
      scheduleNextNudge();
      return;
    }

    // Vibrate!
    vibrateNudge();

    // Schedule the next nudge alarm (chain the alarms)
    scheduleNextNudge();

    // Single execution: service exits automatically after onInit completes
  },

  onDestroy() {
    logger.log('Nudge service exiting');
  },
});
