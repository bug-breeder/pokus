/**
 * Break Page - Flowmodoro Rest Timer
 * Countdown timer after focus session
 * Similar design to timer page
 * 
 * Features:
 * - Countdown from calculated break time
 * - Progress ring (draining)
 * - Skip button with play icon
 * - Auto-vibrate and navigate to encounter when done
 */

import hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
// getApp removed - using URL params instead of globalData
import { setWakeUpRelaunch } from '@zos/display'
import { Time } from '@zos/sensor'
import { vibrateBreakComplete } from '../../utils/vibration'
import { DEVICE_WIDTH, DEVICE_HEIGHT, MIN_BREAK_TIME } from '../../utils/constants'

// ============================================================================
// Color Palette (Similar to Timer)
// ============================================================================

const COLORS = {
  bg: 0x000000,
  
  text: {
    primary: 0xFFFFFF,
    muted: 0x8E8E93,
    accent: 0x30D158,  // Green for "Relax"
  },
  
  ring: {
    track: 0x1C3D1C,        // Dark green track
    progress: 0x30D158,     // Green progress (draining)
  },
  
  button: {
    bg: 0x2C2C2E,
    skip: 0x30D158,         // Green skip button
  }
}

// Layout constants
const CX = DEVICE_WIDTH / 2

// ============================================================================
// Timer Configuration
// ============================================================================

const TICK_INTERVAL = 250

// ============================================================================
// Page State
// ============================================================================

let timeSensor = null

let state = {
  timerId: null,
  totalBreakSeconds: 0,
  remainingSeconds: 0,
  focusSeconds: 0,
  earnedCoins: 0,
  widgets: {
    timer: null,
    status: null,
    progressArc: null,
    clock: null,
  }
}

/**
 * Get current time as HH:MM string
 */
function getCurrentTime() {
  if (!timeSensor) {
    timeSensor = new Time()
  }
  const hours = timeSensor.getHours()
  const mins = timeSensor.getMinutes()
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Update clock widget
 */
function updateClock() {
  if (state.widgets.clock) {
    state.widgets.clock.setProperty(hmUI.prop.TEXT, getCurrentTime())
  }
}

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Vibrate to notify user (uses pattern-based vibration)
 */
function vibrate() {
  vibrateBreakComplete()
}

/**
 * Update UI with remaining time
 */
function updateUI() {
  const remaining = state.remainingSeconds
  const total = state.totalBreakSeconds
  
  // Timer text
  if (state.widgets.timer) {
    state.widgets.timer.setProperty(hmUI.prop.TEXT, formatTime(remaining))
  }

  // Progress arc (draining from full to empty)
  const progress = total > 0 ? remaining / total : 0
  const endAngle = -90 + (progress * 360)
  if (state.widgets.progressArc) {
    state.widgets.progressArc.setProperty(hmUI.prop.MORE, { 
      end_angle: endAngle
    })
  }

  // Status text
  if (state.widgets.status) {
    if (remaining <= 0) {
      state.widgets.status.setProperty(hmUI.prop.TEXT, 'Break complete!')
    } else {
      state.widgets.status.setProperty(hmUI.prop.TEXT, 'Time to relax')
    }
  }
}

/**
 * Timer tick (countdown)
 */
function tick() {
  if (state.remainingSeconds > 0) {
    state.remainingSeconds--
    updateUI()
    
    if (state.remainingSeconds <= 0) {
      breakComplete()
    }
  }
}

function startTimer() {
  if (state.timerId === null) {
    state.timerId = setInterval(tick, 1000)  // 1 second ticks for countdown
  }
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId)
    state.timerId = null
  }
}

/**
 * Break time is complete - vibrate and go to encounter
 */
function breakComplete() {
  console.log('[Break] Break complete!')
  stopTimer()
  vibrate()
  
  // Short delay then navigate to encounter
  setTimeout(() => {
    goToEncounter()
  }, 500)
}

/**
 * Skip break and go directly to encounter
 */
function skipBreak() {
  console.log('[Break] Skip pressed')
  stopTimer()
  goToEncounter()
}

/**
 * Navigate to encounter page
 */
function goToEncounter() {
  setWakeUpRelaunch({ relaunch: false })
  push({ url: 'pages/encounter/index' })
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit(params) {
    console.log('[Break] onInit, params:', params)
    
    setWakeUpRelaunch({ relaunch: true })
    
    // Initialize Time sensor for clock display
    timeSensor = new Time()
    timeSensor.onPerMinute(updateClock)
    
    // Get break time from URL params (more reliable than globalData)
    try {
      let parsedParams = null
      if (params) {
        if (typeof params === 'string') {
          parsedParams = JSON.parse(params)
        } else {
          parsedParams = params
        }
      }
      
      if (parsedParams) {
        state.totalBreakSeconds = parsedParams.breakSeconds || 60
        state.focusSeconds = parsedParams.focusSeconds || 0
        state.earnedCoins = parsedParams.earnedCoins || 0
      } else {
        // Fallback defaults
        state.totalBreakSeconds = 60
        state.focusSeconds = 0
        state.earnedCoins = 0
      }
    } catch (e) {
      console.log('[Break] params parse error:', e)
      state.totalBreakSeconds = 60
      state.focusSeconds = 0
      state.earnedCoins = 0
    }
    
    state.remainingSeconds = state.totalBreakSeconds
    state.timerId = null
    
    console.log('[Break] Break time:', state.totalBreakSeconds, 'Focus:', state.focusSeconds)
  },

  build() {
    console.log('[Break] build')

    // ========== BACKGROUND ==========
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg
    })

    // ========== PROGRESS ARC ==========
    // Background track
    hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: 0,
      end_angle: 360,
      color: COLORS.ring.track,
      line_width: 8
    })

    // Progress arc (starts full, drains to empty)
    const progress = state.totalBreakSeconds > 0 ? state.remainingSeconds / state.totalBreakSeconds : 1
    const endAngle = -90 + (progress * 360)
    
    state.widgets.progressArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: -90,
      end_angle: endAngle,
      color: COLORS.ring.progress,
      line_width: 8
    })

    // ========== CURRENT TIME ==========
    state.widgets.clock = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 45,
      w: DEVICE_WIDTH,
      h: 30,
      text: getCurrentTime(),
      text_size: 24,
      color: COLORS.text.muted,
      align_h: hmUI.align.CENTER_H
    })

    // ========== TITLE ==========
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 85,
      w: DEVICE_WIDTH,
      h: 40,
      text: 'Break',
      text_size: 32,
      color: COLORS.text.accent,
      align_h: hmUI.align.CENTER_H
    })

    // ========== TIMER DISPLAY ==========
    state.widgets.timer = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 135,
      w: DEVICE_WIDTH,
      h: 90,
      text: formatTime(state.remainingSeconds),
      text_size: 80,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })

    // ========== FOCUS TIME EARNED ==========
    const focusMins = Math.floor(state.focusSeconds / 60)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 240,
      w: DEVICE_WIDTH,
      h: 36,
      text: `${focusMins} min focused`,
      text_size: 28,
      color: COLORS.text.muted,
      align_h: hmUI.align.CENTER_H
    })

    // ========== STATUS TEXT ==========
    state.widgets.status = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 285,
      w: DEVICE_WIDTH,
      h: 36,
      text: 'Time to relax',
      text_size: 28,
      color: COLORS.text.accent,
      align_h: hmUI.align.CENTER_H
    })

    // ========== SKIP BUTTON ==========
    const btnSize = 76
    const iconSize = 40
    const btnY = DEVICE_HEIGHT - 120

    // Button background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: CX - btnSize / 2,
      y: btnY,
      w: btnSize,
      h: btnSize,
      radius: btnSize / 2,
      color: COLORS.button.bg
    })

    // Play icon (skip)
    hmUI.createWidget(hmUI.widget.IMG, {
      x: CX - iconSize / 2 + 4,  // Slight offset for visual centering of play icon
      y: btnY + (btnSize - iconSize) / 2,
      w: iconSize,
      h: iconSize,
      src: 'raw/icons/play.png',
      auto_scale: true,
      auto_scale_obj_fit: 1
    })

    // Touch area
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: CX - btnSize / 2 - 16,
      y: btnY - 16,
      w: btnSize + 32,
      h: btnSize + 32,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      console.log('[Break] Skip clicked')
      skipBreak()
    })

    // Start countdown
    updateUI()
    startTimer()
  },

  onShow() {
    console.log('[Break] onShow')
    startTimer()
  },

  onHide() {
    console.log('[Break] onHide')
    stopTimer()
  },

  onDestroy() {
    console.log('[Break] onDestroy')
    stopTimer()
  }
})

