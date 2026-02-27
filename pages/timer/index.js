/**
 * Timer Page - ZUI/ZeppOS Design
 * Clean, minimal focus timer following system design language
 * 
 * Color scheme:
 * - Before ready: Blue progress ring
 * - When ready: Green progress ring
 * - All text: White
 * 
 * Background Service:
 * - Starts timer-service when session begins
 * - Service runs even after app exits
 * - Service handles nudge vibrations
 */

import hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
// getApp removed - using URL params instead of globalData
import { setWakeUpRelaunch } from '@zos/display'
import { start as startService, stop as stopService } from '@zos/app-service'
import { queryPermission, requestPermission } from '@zos/app'
import { Time } from '@zos/sensor'
import { DEVICE_WIDTH, DEVICE_HEIGHT, getGameConfig, MIN_BREAK_TIME } from '../../utils/constants'
import { set as setAlarm, cancel as cancelAlarm } from '@zos/alarm'
import {
  addCoins,
  addFocusTime,
  getTimerState,
  saveTimerState,
  clearTimerState,
  getFlowRatio,
  getNudgeAlarmId,
  saveNudgeAlarmId,
  clearNudgeAlarmId,
  getNudgeInterval,
  isNudgeEnabled
} from '../../utils/storage'

// ============================================================================
// Color Palette (Cohesive Design)
// ============================================================================

const COLORS = {
  bg: 0x000000,
  
  // Text - all white for clarity
  text: {
    primary: 0xFFFFFF,
    muted: 0x8E8E93,
  },
  
  // Progress ring
  ring: {
    track: 0x0A1F0A,        // Very dark green track
    progress: 0x0A84FF,     // Blue while counting
    ready: 0x30D158,        // Bright green when ready
  },
  
  // Button
  button: {
    bg: 0x2C2C2E,
  }
}

// Layout constants
const CX = DEVICE_WIDTH / 2

// ============================================================================
// Timer Configuration
// ============================================================================

const TIMER_SERVICE_FILE = 'app-service/timer-service'
const TICK_INTERVAL = 250

// ============================================================================
// Page State
// ============================================================================

let timeSensor = null

let state = {
  timerId: null,
  startTime: null,
  seconds: 0,
  gameConfig: null,  // Loaded on init based on dev mode
  serviceStarted: false,
  widgets: {
    timer: null,
    coins: null,
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
 * Format seconds as MM:SS or H:MM:SS
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Calculate elapsed seconds from start time
 */
function calcElapsedSeconds() {
  if (!state.startTime) return 0
  return Math.round((Date.now() - state.startTime) / 1000)
}

/**
 * Start the background timer service
 */
function startTimerService() {
  if (state.serviceStarted) {
    console.log('[Timer] Service already started')
    return
  }

  try {
    // Check permission first
    const permResult = queryPermission({ permissions: ['device:os.bg_service'] })
    console.log('[Timer] Permission check:', permResult)
    
    if (permResult && permResult[0] !== 2) {
      // Need to request permission
      requestPermission({
        permissions: ['device:os.bg_service'],
        callback: (results) => {
          console.log('[Timer] Permission request result:', results)
          if (results && results[0] === 2) {
            doStartService()
          }
        }
      })
    } else {
      doStartService()
    }
  } catch (e) {
    console.log('[Timer] startTimerService error:', e)
  }
}

/**
 * Actually start the service after permission is granted
 */
function doStartService() {
  try {
    const result = startService({
      file: TIMER_SERVICE_FILE,
      param: JSON.stringify({ startTime: state.startTime }),
      complete_func: (info) => {
        console.log('[Timer] Service start callback:', info.file, info.result)
        state.serviceStarted = info.result
      }
      // Note: 'reload: true' requires API_LEVEL 4.0, default is true anyway
    })
    console.log('[Timer] Start service result:', result)
  } catch (e) {
    console.log('[Timer] doStartService error:', e)
  }
}

/**
 * Stop the background timer service
 */
function stopTimerService() {
  try {
    stopService({
      file: TIMER_SERVICE_FILE,
      complete_func: (info) => {
        console.log('[Timer] Service stop callback:', info.file, info.result)
        state.serviceStarted = false
      }
    })
  } catch (e) {
    console.log('[Timer] stopTimerService error:', e)
  }
}

/**
 * Cancel any existing nudge alarm
 */
function cancelNudgeAlarm() {
  try {
    const alarmId = getNudgeAlarmId()
    if (alarmId) {
      cancelAlarm(alarmId)
      clearNudgeAlarmId()
      console.log('[Timer] Cancelled nudge alarm:', alarmId)
    }
  } catch (e) {
    console.log('[Timer] cancelNudgeAlarm error:', e)
  }
}

/**
 * Schedule the first nudge alarm (subsequent alarms are chained by nudge-service)
 */
function scheduleFirstNudge() {
  try {
    // Check if nudges are enabled
    if (!isNudgeEnabled()) {
      console.log('[Timer] Nudges disabled, not scheduling')
      return
    }
    
    // Cancel any existing alarm first
    cancelNudgeAlarm()
    
    // Get interval in minutes, convert to seconds
    const intervalMinutes = getNudgeInterval()
    const delaySeconds = intervalMinutes * 60
    
    // Schedule alarm to trigger nudge-service
    const alarmId = setAlarm({
      url: 'app-service/nudge-service',
      delay: delaySeconds
    })
    
    // Save alarm ID for later cancellation
    saveNudgeAlarmId(alarmId)
    console.log('[Timer] Scheduled first nudge in', intervalMinutes, 'minutes, alarm ID:', alarmId)
  } catch (e) {
    console.log('[Timer] scheduleFirstNudge error:', e)
  }
}

/**
 * Calculate coins earned (1 coin per 5-min block)
 */
function calcCoins(seconds) {
  const config = state.gameConfig
  return Math.floor(seconds / config.ENCOUNTER_THRESHOLD) * config.COINS_PER_BLOCK
}

/**
 * Format remaining time as "Xm Ys"
 */
function formatRemaining(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s until encounter`
  }
  return `${secs}s until encounter`
}

/**
 * Update UI with current elapsed time
 */
function updateUI() {
  const config = state.gameConfig
  const seconds = state.seconds
  const coins = calcCoins(seconds)
  const isReady = seconds >= config.ENCOUNTER_THRESHOLD

  // Timer text
  if (state.widgets.timer) {
    state.widgets.timer.setProperty(hmUI.prop.TEXT, formatTime(seconds))
  }

  // Coins earned
  if (state.widgets.coins) {
    state.widgets.coins.setProperty(hmUI.prop.TEXT, `+${coins}`)
  }

  // Progress arc - Blue before ready, Green when ready
  const progress = Math.min(seconds / config.ENCOUNTER_THRESHOLD, 1)
  const endAngle = -90 + (progress * 360)
  if (state.widgets.progressArc) {
    state.widgets.progressArc.setProperty(hmUI.prop.MORE, { 
      end_angle: endAngle,
      color: isReady ? COLORS.ring.ready : COLORS.ring.progress
    })
  }

  // Status text - muted while counting, green when ready
  if (state.widgets.status) {
    if (isReady) {
      state.widgets.status.setProperty(hmUI.prop.TEXT, 'Catch ready!')
      state.widgets.status.setProperty(hmUI.prop.COLOR, COLORS.ring.ready)
    } else {
      const remaining = config.ENCOUNTER_THRESHOLD - seconds
      state.widgets.status.setProperty(hmUI.prop.TEXT, formatRemaining(remaining))
      state.widgets.status.setProperty(hmUI.prop.COLOR, COLORS.text.muted)
    }
  }
}

/**
 * Timer tick (UI update only - timing is calculated from startTime)
 */
function tick() {
  const newSeconds = calcElapsedSeconds()
  if (newSeconds !== state.seconds) {
    state.seconds = newSeconds
    updateUI()
  }
}

function startTimer() {
  if (state.timerId === null) {
    state.timerId = setInterval(tick, TICK_INTERVAL)
  }
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId)
    state.timerId = null
  }
}

/**
 * End the focus session
 */
function endSession() {
  console.log('[Timer] endSession:', state.seconds, 'seconds')

  stopTimer()
  stopTimerService()
  clearTimerState()
  
  // Cancel any pending nudge alarms
  cancelNudgeAlarm()

  const seconds = state.seconds
  const earnedCoins = calcCoins(seconds)

  addCoins(earnedCoins)
  if (seconds > 0) {
    addFocusTime(seconds)
  }

  // Calculate break time based on Flowmodoro ratio
  const flowRatio = getFlowRatio()
  const breakSeconds = Math.floor(seconds / flowRatio)
  
  console.log('[Timer] Focus:', seconds, 'Ratio:', flowRatio, 'Break:', breakSeconds)

  setWakeUpRelaunch({ relaunch: false })

  // Check if eligible for encounter (met minimum focus time)
  if (seconds >= state.gameConfig.ENCOUNTER_THRESHOLD) {
    // If break time is long enough, go to break page first
    if (breakSeconds >= MIN_BREAK_TIME) {
      // Pass data via URL params (globalData is unreliable)
      push({
        url: 'pages/break/index',
        params: JSON.stringify({
          focusSeconds: seconds,
          breakSeconds: breakSeconds,
          earnedCoins: earnedCoins
        })
      })
    } else {
      // Short break, skip directly to encounter
      push({ url: 'pages/encounter/index' })
    }
  } else {
    // Didn't meet minimum focus time, go home
    replace({ url: 'pages/home/index' })
  }
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit() {
    console.log('[Timer] onInit')
    
    // Get game config based on current mode (dev or normal)
    state.gameConfig = getGameConfig()
    console.log('[Timer] Mode:', state.gameConfig.ENCOUNTER_THRESHOLD === 1 ? 'DEV' : 'NORMAL')
    
    setWakeUpRelaunch({ relaunch: true })
    
    // Initialize Time sensor for clock display
    timeSensor = new Time()
    timeSensor.onPerMinute(updateClock)
    
    const savedState = getTimerState()
    if (savedState && savedState.startTime) {
      // Resume existing session
      state.startTime = savedState.startTime
      state.seconds = calcElapsedSeconds()
      console.log('[Timer] Resumed session, elapsed:', state.seconds)
      
      // Try to start service in case it was killed
      startTimerService()
      
      // Re-schedule nudge alarm if none exists (alarm may have been cleared)
      if (!getNudgeAlarmId()) {
        scheduleFirstNudge()
      }
    } else {
      // Start new session
      state.startTime = Date.now()
      state.seconds = 0
      saveTimerState({ startTime: state.startTime, isRunning: true })
      startTimerService()
      
      // Schedule the first nudge alarm
      scheduleFirstNudge()
      
      console.log('[Timer] New session started')
    }
    
    state.timerId = null
  },

  build() {
    console.log('[Timer] build')

    const config = state.gameConfig
    const isReady = state.seconds >= config.ENCOUNTER_THRESHOLD

    // ========== BACKGROUND ==========
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg
    })

    // ========== PROGRESS ARC ==========
    // Background track (very dark green)
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

    // Progress arc (blue → green when ready)
    const progress = Math.min(state.seconds / config.ENCOUNTER_THRESHOLD, 1)
    const endAngle = -90 + (progress * 360)
    
    state.widgets.progressArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: -90,
      end_angle: endAngle,
      color: isReady ? COLORS.ring.ready : COLORS.ring.progress,
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
      text: 'Focus',
      text_size: 32,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })

    // ========== TIMER DISPLAY ==========
    state.widgets.timer = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 135,
      w: DEVICE_WIDTH,
      h: 90,
      text: formatTime(state.seconds),
      text_size: 80,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })

    // ========== COINS EARNED (White) ==========
    state.widgets.coins = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 240,
      w: DEVICE_WIDTH,
      h: 36,
      text: `+${calcCoins(state.seconds)}`,
      text_size: 32,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })

    // ========== STATUS TEXT ==========
    const remaining = config.ENCOUNTER_THRESHOLD - state.seconds
    state.widgets.status = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 295,
      w: DEVICE_WIDTH,
      h: 36,
      text: isReady ? 'Catch ready!' : formatRemaining(remaining),
      text_size: 28,
      color: isReady ? COLORS.ring.ready : COLORS.text.muted,
      align_h: hmUI.align.CENTER_H
    })

    // ========== STOP BUTTON ==========
    const btnSize = 76  // Large button
    const iconSize = 56  // Much larger icon
    const btnY = DEVICE_HEIGHT -120

    // Button background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: CX - btnSize / 2,
      y: btnY,
      w: btnSize,
      h: btnSize,
      radius: btnSize / 2,
      color: COLORS.button.bg
    })

    // X icon - perfectly centered in button with scaling
    hmUI.createWidget(hmUI.widget.IMG, {
      x: CX - iconSize / 2,
      y: btnY + (btnSize - iconSize) / 2,
      w: iconSize,
      h: iconSize,
      src: 'raw/icons/x.png',
      auto_scale: true,
      auto_scale_obj_fit: 1  // Fit within bounds
    })

    // Touch area (larger for easier tapping)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: CX - btnSize / 2 - 16,
      y: btnY - 16,
      w: btnSize + 32,
      h: btnSize + 32,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      console.log('[Timer] Stop clicked')
      endSession()
    })

    // Update UI and start timer
    updateUI()
    startTimer()
  },

  onShow() {
    console.log('[Timer] onShow')
    state.seconds = calcElapsedSeconds()
    updateUI()
    startTimer()
  },

  onHide() {
    console.log('[Timer] onHide')
    stopTimer()
  },

  onDestroy() {
    console.log('[Timer] onDestroy')
    stopTimer()
    // Note: Don't stop the service here - it should keep running!
  }
})
