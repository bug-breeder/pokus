/**
 * Timer Service (Session Monitor)
 *
 * Background service that monitors the focus session.
 *
 * NOTE: Nudge vibrations are now handled by nudge-service.js via the Alarm API,
 * which is more reliable than Time.onPerMinute() in background services.
 *
 * This service now only:
 * - Monitors if session is still active
 * - Exits when session ends (cleanup)
 */

import { log as Logger } from '@zos/utils';
import { Time } from '@zos/sensor';
import { LocalStorage } from '@zos/storage';
import { exit } from '@zos/app-service';

const logger = Logger.getLogger('timer-service');
const storage = new LocalStorage();

// Storage keys (must match storage.js)
const TIMER_STATE_KEY = 'pokus_timer_state';
const DEV_MODE_KEY = 'pokus_dev_mode';

// Service state
let timeSensor = null;

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
 * Get the actual storage key (adds prefix for dev mode)
 */
function getKey(baseKey) {
  if (baseKey === DEV_MODE_KEY) {
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
 * Called every minute by Time sensor - just monitors session state
 */
function onMinuteTick() {
  logger.log('Timer service tick');

  // Check if session is still active, exit if not
  if (!isSessionActive()) {
    logger.log('No active session, exiting service');
    exit();
    return;
  }

  // Session still active, continue monitoring
  logger.log('Session still active');
}

AppService({
  onInit(params) {
    logger.log('Timer service started', params || '');

    // Initialize Time sensor for per-minute callbacks
    timeSensor = new Time();

    // Register minute tick callback (just for session monitoring)
    timeSensor.onPerMinute(onMinuteTick);

    // Check immediately if session is active
    if (!isSessionActive()) {
      logger.log('No active session on init, exiting');
      exit();
      return;
    }

    logger.log('Session active, monitoring started');
  },

  onDestroy() {
    logger.log('Timer service stopping');
    timeSensor = null;
  },
});
