/**
 * Timer Page (Unified Focus + Break)
 * Drift-proof countdown timer that handles both Focus and Break modes.
 *
 * Params: { mode: 'focus'|'break', durationSeconds, canExtend, baseBreakSeconds }
 *
 * Running state: progress ring drains clockwise, countdown display, cancel button
 * Completion: vibrate every 3s, action overlay (mode-dependent buttons)
 */

import hmUI from '@zos/ui';
import { push, replace } from '@zos/router';
import { queryPermission, requestPermission } from '@zos/app';
import { setWakeUpRelaunch } from '@zos/display';
import { start as startService, stop as stopService } from '@zos/app-service';
import { Time } from '@zos/sensor';
import { set as setAlarm, cancel as cancelAlarm } from '@zos/alarm';
import { DEVICE_WIDTH, getGameConfig } from '../../utils/constants';
import {
  addCoins,
  addFocusTime,
  getTimerState,
  saveTimerState,
  clearTimerState,
  addAccumulatedFocus,
  getNudgeAlarmId,
  saveNudgeAlarmId,
  clearNudgeAlarmId,
  getNudgeInterval,
  isNudgeEnabled,
} from '../../utils/storage';
import { vibrateTimerDone, stopVibration } from '../../utils/vibration';

// ============================================================================
// Constants
// ============================================================================

const CX = DEVICE_WIDTH / 2; // 240
const TIMER_SERVICE_FILE = 'app-service/timer-service';
const TICK_MS = 250;

const COLORS = {
  bg: 0x000000,
  text: { primary: 0xffffff, muted: 0x8e8e93 },
  focus: { ring: 0x0a84ff, track: 0x0a1f2e },
  break: { ring: 0x30d158, track: 0x0a1f0a },
  button: { bg: 0x2c2c2e },
  catch: 0xffcb05,
  extend: 0x30d158,
};

// ============================================================================
// Module state
// ============================================================================

let ts = {
  mode: 'focus',
  durationSeconds: 300,
  endTime: 0,
  baseBreakSeconds: 0,
  canExtend: false,
  isCompleted: false,
  serviceStarted: false,
};

let timerId = null;
let vibrateIntervalId = null;
let gameConfig = null;
let timeSensor = null;

// Dash ring constants
// 36 × 10° = 360°; each dash is 8° arc at r=220 → ~30px along arc, 8px radially = elongated curved segment
const DASH_COUNT = 36;
const DASH_DEG = 8;
const GAP_DEG = 2;
const RING_LINE_WIDTH = 8;
const RING_R = 220; // inset so strokes stay inside the circular screen
const RING_X = CX - RING_R; // 20
const RING_Y = CX - RING_R; // 20
const RING_SIZE = RING_R * 2; // 440

// Widget references (running state)
let dashWidgets = []; // ARC widgets for the dashed ring
let litCount = DASH_COUNT;
let clockWidget = null;
let modeLabelWidget = null;
let countdownWidget = null;
let totalDurationWidget = null;
let cancelBtnBg = null;
let cancelBtnIcon = null;
let cancelHitbox = null;

// Completion overlay widgets (deleted on restart/extend)
let completionWidgets = [];

// ============================================================================
// Helpers
// ============================================================================

function getRemainingSeconds() {
  return Math.max(0, Math.round((ts.endTime - Date.now()) / 1000));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStatusText(remainingSeconds) {
  if (remainingSeconds <= 0) return '';
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s left`;
  if (mins > 0) return `${mins}m left`;
  return `${secs}s left`;
}

function getCurrentTime() {
  if (!timeSensor) timeSensor = new Time();
  const h = timeSensor.getHours();
  const m = timeSensor.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================================
// Running state widget helpers
// ============================================================================

function setRunningVisible(visible) {
  // TEXT widgets: blank/restore content — VISIBLE prop is unreliable on TEXT in ZeppOS
  if (visible) {
    const modeLabel = ts.mode === 'focus' ? 'Focus' : 'Break';
    if (modeLabelWidget) modeLabelWidget.setProperty(hmUI.prop.TEXT, modeLabel);
    if (countdownWidget)
      countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(getRemainingSeconds()));
    if (totalDurationWidget)
      totalDurationWidget.setProperty(hmUI.prop.TEXT, formatTime(ts.durationSeconds));
    if (clockWidget) clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
  } else {
    if (modeLabelWidget) modeLabelWidget.setProperty(hmUI.prop.TEXT, '');
    if (countdownWidget) countdownWidget.setProperty(hmUI.prop.TEXT, '');
    if (totalDurationWidget) totalDurationWidget.setProperty(hmUI.prop.TEXT, '');
    if (clockWidget) clockWidget.setProperty(hmUI.prop.TEXT, '');
  }
  setCancelVisible(visible ? 1 : 0);
}

function setCancelVisible(visible) {
  const vis = visible ? 1 : 0;
  for (const w of [cancelBtnBg, cancelBtnIcon, cancelHitbox]) {
    if (w)
      try {
        w.setProperty(hmUI.prop.VISIBLE, vis);
      } catch {}
  }
}

function deleteCompletionWidgets() {
  for (const w of completionWidgets) {
    try {
      hmUI.deleteWidget(w);
    } catch (e) {
      // ignore
    }
  }
  completionWidgets = [];
}

// ============================================================================
// Dash ring helpers
// ============================================================================

function buildDashRing() {
  const activeColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
  const trackColor = ts.mode === 'focus' ? COLORS.focus.track : COLORS.break.track;
  const remaining = getRemainingSeconds();
  const progress = ts.durationSeconds > 0 ? remaining / ts.durationSeconds : 0;
  litCount = ts.isCompleted ? DASH_COUNT : Math.round(progress * DASH_COUNT);

  dashWidgets = [];
  for (let i = 0; i < DASH_COUNT; i++) {
    const startAngle = -90 + i * (DASH_DEG + GAP_DEG);
    const endAngle = startAngle + DASH_DEG;
    dashWidgets.push(
      hmUI.createWidget(hmUI.widget.ARC, {
        x: RING_X,
        y: RING_Y,
        w: RING_SIZE,
        h: RING_SIZE,
        start_angle: startAngle,
        end_angle: endAngle,
        color: i < litCount ? activeColor : trackColor,
        line_width: RING_LINE_WIDTH,
      })
    );
  }
}

function updateDashRing(remaining) {
  if (dashWidgets.length === 0) return;
  const progress = ts.durationSeconds > 0 ? remaining / ts.durationSeconds : 0;
  const newLit = Math.round(progress * DASH_COUNT);
  if (newLit === litCount) return;

  const activeColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
  const trackColor = ts.mode === 'focus' ? COLORS.focus.track : COLORS.break.track;
  const lo = Math.min(newLit, litCount);
  const hi = Math.max(newLit, litCount);
  for (let i = lo; i < hi; i++) {
    if (dashWidgets[i]) {
      dashWidgets[i].setProperty(hmUI.prop.COLOR, i < newLit ? activeColor : trackColor);
    }
  }
  litCount = newLit;
}

function setDashRingFull() {
  if (dashWidgets.length === 0) return;
  const activeColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
  for (let i = 0; i < DASH_COUNT; i++) {
    if (dashWidgets[i]) dashWidgets[i].setProperty(hmUI.prop.COLOR, activeColor);
  }
  litCount = DASH_COUNT;
}

// ============================================================================
// Timer tick
// ============================================================================

function updateRunningUI() {
  const remaining = getRemainingSeconds();
  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(remaining));
  }
  updateDashRing(remaining);
}

function tick() {
  const remaining = getRemainingSeconds();
  updateRunningUI();
  if (remaining <= 0 && !ts.isCompleted) {
    onTimerComplete();
  }
}

function startTick() {
  if (timerId === null) {
    timerId = setInterval(tick, TICK_MS);
  }
}

function stopTick() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

// ============================================================================
// Background service & nudge alarm
// ============================================================================

function doStartService() {
  try {
    startService({
      file: TIMER_SERVICE_FILE,
      param: JSON.stringify({ startTime: Date.now() }),
      complete_func: (info) => {
        console.log('[Timer] Service start:', info.file, info.result);
        ts.serviceStarted = info.result;
      },
    });
  } catch (e) {
    console.log('[Timer] doStartService error:', e);
  }
}

function startTimerService() {
  if (ts.serviceStarted) return;
  try {
    const perm = queryPermission({ permissions: ['device:os.bg_service'] });
    if (perm && perm[0] !== 2) {
      requestPermission({
        permissions: ['device:os.bg_service'],
        callback: (r) => {
          if (r && r[0] === 2) doStartService();
        },
      });
    } else {
      doStartService();
    }
  } catch (e) {
    console.log('[Timer] startTimerService error:', e);
  }
}

function stopTimerService() {
  try {
    stopService({
      file: TIMER_SERVICE_FILE,
      complete_func: (info) => {
        console.log('[Timer] Service stop:', info.file, info.result);
        ts.serviceStarted = false;
      },
    });
  } catch (e) {
    console.log('[Timer] stopTimerService error:', e);
  }
}

function cancelNudgeAlarm() {
  try {
    const id = getNudgeAlarmId();
    if (id) {
      cancelAlarm(id);
      clearNudgeAlarmId();
    }
  } catch (e) {
    console.log('[Timer] cancelNudgeAlarm error:', e);
  }
}

function scheduleFirstNudge() {
  if (!isNudgeEnabled()) return;
  try {
    cancelNudgeAlarm();
    const delaySecs = getNudgeInterval() * 60;
    const id = setAlarm({ url: 'app-service/nudge-service', delay: delaySecs });
    saveNudgeAlarmId(id);
    console.log('[Timer] Nudge scheduled in', getNudgeInterval(), 'min, id:', id);
  } catch (e) {
    console.log('[Timer] scheduleFirstNudge error:', e);
  }
}

// ============================================================================
// Timer completion
// ============================================================================

function onTimerComplete() {
  console.log('[Timer] Complete! mode:', ts.mode, 'duration:', ts.durationSeconds);
  ts.isCompleted = true;
  stopTick();

  if (ts.mode === 'focus') {
    addFocusTime(ts.durationSeconds);
    addAccumulatedFocus(ts.durationSeconds);
    const coins = Math.floor(ts.durationSeconds / gameConfig.COIN_BLOCK_SECONDS);
    if (coins > 0) addCoins(coins);
    cancelNudgeAlarm();
    stopTimerService();
  }

  clearTimerState();
  setWakeUpRelaunch({ relaunch: false });

  // Light up all dashes (full ring on completion)
  setDashRingFull();

  // Hide only the cancel button — keep timer display visible
  setCancelVisible(false);

  // Start repeating vibration (every 3s until user acts)
  vibrateTimerDone();
  vibrateIntervalId = setInterval(vibrateTimerDone, 3000);

  buildCompletionOverlay();
}

function stopVibrations() {
  if (vibrateIntervalId !== null) {
    clearInterval(vibrateIntervalId);
    vibrateIntervalId = null;
  }
  stopVibration();
}

// ============================================================================
// Completion overlay builders
// ============================================================================

// Create a circular icon button and push all sub-widgets into completionWidgets
function makeIconBtn(x, y, size, bgColor, iconSrc, callback) {
  const iconSize = Math.round(size * 0.55);
  const iconOff = Math.round((size - iconSize) / 2);

  completionWidgets.push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x,
      y,
      w: size,
      h: size,
      radius: size / 2,
      color: bgColor,
    })
  );

  completionWidgets.push(
    hmUI.createWidget(hmUI.widget.IMG, {
      x: x + iconOff,
      y: y + iconOff,
      w: iconSize,
      h: iconSize,
      src: iconSrc,
      auto_scale: true,
      auto_scale_obj_fit: 1,
    })
  );

  const hb = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x,
    y,
    w: size,
    h: size,
    radius: size / 2,
    color: 0x000000,
    alpha: 0,
  });
  hb.addEventListener(hmUI.event.CLICK_UP, callback);
  completionWidgets.push(hb);
}

function buildCompletionOverlay() {
  // Crescent arc: 3 buttons placed along a circle of r=155 at the bottom of the screen.
  // Angles from top clockwise: left=220°, center=180° (nadir), right=140°
  // Action buttons (play/pause) are larger; dismiss X is smaller.
  // Arc center coords: L=(140,359) C=(240,395) R=(340,359)
  const A = 76; // action button size (play / pause)
  const D = 64; // dismiss button size (x)
  const L = { x: 140 - A / 2, y: 359 - A / 2 }; // { x:102, y:321 }
  const C = { x: 240 - D / 2, y: 395 - D / 2 }; // { x:208, y:363 }
  const R = { x: 340 - A / 2, y: 359 - A / 2 }; // { x:302, y:321 }

  if (ts.mode === 'focus') {
    // left=flame/blue(New Focus), center=x/dark(Dismiss), right=mug/green(Take Break)
    makeIconBtn(L.x, L.y, A, COLORS.focus.ring, 'raw/icons/fire-white.png', handleNewFocus);
    makeIconBtn(C.x, C.y, D, COLORS.button.bg, 'raw/icons/x.png', handleDismiss);
    makeIconBtn(R.x, R.y, A, COLORS.break.ring, 'raw/icons/mug-white.png', handleTakeBreak);
  } else {
    const extSecs = Math.floor(ts.baseBreakSeconds / 2);
    if (ts.canExtend && extSecs > 0) {
      // left=mug/green(Extend), center=x/dark(Dismiss), right=flame/blue(Start Focus)
      makeIconBtn(L.x, L.y, A, COLORS.break.ring, 'raw/icons/mug-white.png', handleExtend);
      makeIconBtn(C.x, C.y, D, COLORS.button.bg, 'raw/icons/x.png', handleDismiss);
      makeIconBtn(R.x, R.y, A, COLORS.focus.ring, 'raw/icons/fire-white.png', handleStartFocus);
    } else {
      // 2 buttons: x/dark(Dismiss) at L arc + flame/blue(Start Focus) at R arc
      makeIconBtn(L.x, L.y, D, COLORS.button.bg, 'raw/icons/x.png', handleDismiss);
      makeIconBtn(R.x, R.y, A, COLORS.focus.ring, 'raw/icons/fire-white.png', handleStartFocus);
    }
  }
}

// ============================================================================
// Action handlers
// ============================================================================

function handleDismiss() {
  stopVibrations();
  replace({ url: 'pages/timer-select/index' });
}

function handleCancel() {
  if (ts.isCompleted) return;
  stopTick();
  stopVibrations();
  if (ts.mode === 'focus') {
    stopTimerService();
    cancelNudgeAlarm();
  }
  clearTimerState();
  setWakeUpRelaunch({ relaunch: false });
  replace({ url: 'pages/timer-select/index' });
}

function handleNewFocus() {
  if (!ts.isCompleted) return;
  stopVibrations();
  deleteCompletionWidgets();

  ts.isCompleted = false;
  ts.endTime = Date.now() + ts.durationSeconds * 1000;

  saveTimerState({
    mode: ts.mode,
    startTime: Date.now(),
    endTime: ts.endTime,
    durationSeconds: ts.durationSeconds,
    baseBreakSeconds: ts.baseBreakSeconds,
    canExtend: ts.canExtend,
    isRunning: true,
  });

  startTimerService();
  scheduleFirstNudge();
  setWakeUpRelaunch({ relaunch: true });

  // Reset ring to full, update countdown, restore cancel button
  setDashRingFull();
  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(ts.durationSeconds));
  }
  if (totalDurationWidget) {
    totalDurationWidget.setProperty(hmUI.prop.TEXT, formatTime(ts.durationSeconds));
  }
  if (clockWidget) {
    clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
  }

  setCancelVisible(true);
  startTick();
}

function handleTakeBreak() {
  if (!ts.isCompleted) return;
  stopVibrations();
  push({
    url: 'pages/timer-select/index',
    params: JSON.stringify({ mode: 'break' }),
  });
}

function handleExtend() {
  if (!ts.isCompleted) return;
  stopVibrations();
  deleteCompletionWidgets();

  const extSecs = Math.floor(ts.baseBreakSeconds / 2);
  ts.canExtend = false;
  ts.isCompleted = false;
  ts.durationSeconds = extSecs;
  ts.endTime = Date.now() + extSecs * 1000;

  saveTimerState({
    mode: ts.mode,
    startTime: Date.now(),
    endTime: ts.endTime,
    durationSeconds: ts.durationSeconds,
    baseBreakSeconds: ts.baseBreakSeconds,
    canExtend: false,
    isRunning: true,
  });
  setWakeUpRelaunch({ relaunch: true });

  setDashRingFull();
  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(extSecs));
  }
  if (totalDurationWidget) {
    totalDurationWidget.setProperty(hmUI.prop.TEXT, formatTime(extSecs));
  }
  if (clockWidget) {
    clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
  }

  setCancelVisible(true);
  startTick();
}

function handleStartFocus() {
  if (!ts.isCompleted) return;
  stopVibrations();
  replace({ url: 'pages/timer-select/index' });
}

// ============================================================================
// Build running state widgets
// ============================================================================

function buildRunningState() {
  const modeColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
  const modeLabel = ts.mode === 'focus' ? 'Focus' : 'Break';
  const remaining = getRemainingSeconds();

  clockWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 36,
    w: DEVICE_WIDTH,
    h: 30,
    text: getCurrentTime(),
    text_size: 24,
    color: COLORS.text.muted,
    align_h: hmUI.align.CENTER_H,
  });

  modeLabelWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 90,
    w: DEVICE_WIDTH,
    h: 44,
    text: modeLabel,
    text_size: 34,
    color: modeColor,
    align_h: hmUI.align.CENTER_H,
  });

  // Countdown (shifted up to leave room for crescent buttons)
  countdownWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 178,
    w: DEVICE_WIDTH,
    h: 92,
    text: formatTime(remaining),
    text_size: 78,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
  });

  // Total duration shown small below countdown
  totalDurationWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 264,
    w: DEVICE_WIDTH,
    h: 32,
    text: formatTime(ts.durationSeconds),
    text_size: 26,
    color: COLORS.text.muted,
    align_h: hmUI.align.CENTER_H,
  });

  const btnSize = 76;
  const iconSize = 52;
  const btnX = CX - btnSize / 2;
  const btnY = 356;

  cancelBtnBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: btnX,
    y: btnY,
    w: btnSize,
    h: btnSize,
    radius: btnSize / 2,
    color: COLORS.button.bg,
  });

  cancelBtnIcon = hmUI.createWidget(hmUI.widget.IMG, {
    x: CX - iconSize / 2,
    y: btnY + (btnSize - iconSize) / 2,
    w: iconSize,
    h: iconSize,
    src: 'raw/icons/x.png',
    auto_scale: true,
    auto_scale_obj_fit: 1,
  });

  cancelHitbox = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: btnX - 16,
    y: btnY - 16,
    w: btnSize + 32,
    h: btnSize + 32,
    color: 0x000000,
    alpha: 0,
  });
  cancelHitbox.addEventListener(hmUI.event.CLICK_UP, () => {
    handleCancel();
  });
}

// ============================================================================
// Clock update
// ============================================================================

function updateClock() {
  if (clockWidget) {
    try {
      clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
    } catch (e) {
      // ignore
    }
  }
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit(params) {
    console.log('[Timer] onInit, params:', params);

    // Reset module state
    ts = {
      mode: 'focus',
      durationSeconds: 300,
      endTime: 0,
      baseBreakSeconds: 0,
      canExtend: false,
      isCompleted: false,
      serviceStarted: false,
    };
    timerId = null;
    vibrateIntervalId = null;
    completionWidgets = [];
    dashWidgets = [];
    litCount = DASH_COUNT;
    clockWidget = null;
    modeLabelWidget = null;
    countdownWidget = null;
    totalDurationWidget = null;
    cancelBtnBg = null;
    cancelBtnIcon = null;
    cancelHitbox = null;

    gameConfig = getGameConfig();

    // Initialize Time sensor for clock display
    timeSensor = new Time();
    timeSensor.onPerMinute(updateClock);

    // Try to parse URL params (fresh start)
    let parsedParams = null;
    try {
      parsedParams = params ? (typeof params === 'string' ? JSON.parse(params) : params) : null;
    } catch (e) {
      console.log('[Timer] params parse error:', e);
    }

    if (parsedParams && parsedParams.mode) {
      // Fresh start from navigation params
      ts.mode = parsedParams.mode;
      ts.durationSeconds = parsedParams.durationSeconds || 300;
      ts.canExtend = parsedParams.canExtend || false;
      ts.baseBreakSeconds = parsedParams.baseBreakSeconds || ts.durationSeconds;
      ts.endTime = Date.now() + ts.durationSeconds * 1000;

      saveTimerState({
        mode: ts.mode,
        startTime: Date.now(),
        endTime: ts.endTime,
        durationSeconds: ts.durationSeconds,
        baseBreakSeconds: ts.baseBreakSeconds,
        canExtend: ts.canExtend,
        isRunning: true,
      });

      if (ts.mode === 'focus') {
        startTimerService();
        scheduleFirstNudge();
      }

      setWakeUpRelaunch({ relaunch: true });
      console.log('[Timer] New', ts.mode, 'timer:', ts.durationSeconds, 's');
    } else {
      // Attempt to recover from saved state (e.g., wrist-raise relaunch)
      const saved = getTimerState();
      if (saved && saved.endTime && saved.isRunning !== false) {
        ts.mode = saved.mode || 'focus';
        ts.endTime = saved.endTime;
        ts.durationSeconds = saved.durationSeconds || 300;
        ts.canExtend = saved.canExtend || false;
        ts.baseBreakSeconds = saved.baseBreakSeconds || ts.durationSeconds;

        // If already expired when recovered, mark as completed
        if (Date.now() >= saved.endTime) {
          ts.isCompleted = true;
        }

        if (ts.mode === 'focus' && !ts.isCompleted) {
          startTimerService();
          if (!getNudgeAlarmId()) scheduleFirstNudge();
        }

        setWakeUpRelaunch({ relaunch: true });
        console.log('[Timer] Recovered', ts.mode, 'state, remaining:', getRemainingSeconds(), 's');
      } else {
        // No valid state, go to selection screen
        console.log('[Timer] No valid state, redirecting to timer-select');
        replace({ url: 'pages/timer-select/index' });
        return;
      }
    }
  },

  build() {
    console.log('[Timer] build, mode:', ts.mode, 'completed:', ts.isCompleted);

    // ── Background ──
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: 480,
      color: COLORS.bg,
    });

    // ── Dashed progress ring ──
    buildDashRing();

    // ── Running state widgets ──
    buildRunningState();

    if (ts.isCompleted) {
      // Recovered after already completing — show completion state directly
      setCancelVisible(false);
      buildCompletionOverlay();
    } else {
      startTick();
    }
  },

  onShow() {
    console.log('[Timer] onShow');
    if (!ts.isCompleted) {
      updateRunningUI();
      startTick();
    }
  },

  onHide() {
    console.log('[Timer] onHide');
    stopTick();
  },

  onDestroy() {
    console.log('[Timer] onDestroy');
    stopTick();
    stopVibrations();
    timeSensor = null;
    totalDurationWidget = null;
    // Note: don't stop the service here — it should keep running for focus mode
  },
});
