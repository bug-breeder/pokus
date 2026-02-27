/**
 * Vibration Utility
 * Centralized vibration patterns using pattern-based API (auto-stops)
 * 
 * Uses getType() API (API_LEVEL 3.6+) with array-based start()
 * Pattern-based vibrations automatically stop after completion
 * 
 * MAXIMUM INTENSITY patterns for strong haptic feedback
 */

import { Vibrator } from '@zos/sensor'

let vibrator = null

/**
 * Get or create the vibrator instance
 */
function getVibrator() {
  if (!vibrator) {
    vibrator = new Vibrator()
  }
  return vibrator
}

/**
 * Focus nudge - STRONG intensity, must get user's attention
 * Used every 5 minutes during focus session
 * Pattern: 5 urgent pulses
 */
export function vibrateNudge() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 }
    ])
  } catch (e) {
    console.log('vibrateNudge error:', e)
  }
}

/**
 * Break complete - STRONG, break is over, time to catch!
 * Pattern: 5 urgent pulses
 */
export function vibrateBreakComplete() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 },
      { type: type.URGENT, duration: 300 }
    ])
  } catch (e) {
    console.log('vibrateBreakComplete error:', e)
  }
}

/**
 * Catch success - MAXIMUM celebratory "GOTCHA!" feeling
 * Pattern: 5 rapid pulses + pause + 3 long pulses (victory fanfare)
 */
export function vibrateCatchSuccess() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.URGENT, duration: 200 },
      { type: type.URGENT, duration: 200 },
      { type: type.URGENT, duration: 200 },
      { type: type.URGENT, duration: 200 },
      { type: type.URGENT, duration: 200 },
      { type: type.PAUSE, duration: 150 },
      { type: type.URGENT, duration: 400 },
      { type: type.URGENT, duration: 400 },
      { type: type.URGENT, duration: 400 }
    ])
  } catch (e) {
    console.log('vibrateCatchSuccess error:', e)
  }
}

/**
 * Catch fail - noticeable but less celebratory
 * Pattern: 3 medium pulses (disappointment)
 */
export function vibrateCatchFail() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.STRONG_SHORT, duration: 300 },
      { type: type.STRONG_SHORT, duration: 300 },
      { type: type.STRONG_SHORT, duration: 300 }
    ])
  } catch (e) {
    console.log('vibrateCatchFail error:', e)
  }
}

/**
 * Button tap - noticeable haptic feedback
 * Pattern: 1 strong pulse
 */
export function vibrateButtonTap() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.STRONG_SHORT, duration: 150 }
    ])
  } catch (e) {
    console.log('vibrateButtonTap error:', e)
  }
}

/**
 * Session start - strong confirmation feel
 * Pattern: 3 urgent pulses (let's go!)
 */
export function vibrateSessionStart() {
  try {
    const v = getVibrator()
    const type = v.getType()
    v.start([
      { type: type.URGENT, duration: 250 },
      { type: type.URGENT, duration: 250 },
      { type: type.URGENT, duration: 250 }
    ])
  } catch (e) {
    console.log('vibrateSessionStart error:', e)
  }
}

/**
 * Stop any ongoing vibration (safety cleanup)
 */
export function stopVibration() {
  if (vibrator) {
    try {
      vibrator.stop()
    } catch (e) {
      // Ignore
    }
  }
}
