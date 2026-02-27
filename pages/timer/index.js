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
import { getApp, queryPermission, requestPermission } from '@zos/app';
import { setWakeUpRelaunch } from '@zos/display';
import { start as startService, stop as stopService } from '@zos/app-service';
import { Time } from '@zos/sensor';
import { set as setAlarm, cancel as cancelAlarm } from '@zos/alarm';
import { DEVICE_WIDTH, getGameConfig, getEncounterThreshold } from '../../utils/constants';
import {
  addCoins,
  addFocusTime,
  getTimerState,
  saveTimerState,
  clearTimerState,
  getAccumulatedFocus,
  addAccumulatedFocus,
  deductAccumulatedFocus,
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

// Widget references (running state)
let progressArc = null;
let clockWidget = null;
let modeLabelWidget = null;
let countdownWidget = null;
let totalDurationWidget = null;
let statusTextWidget = null;
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
  const vis = visible ? 1 : 0;
  const widgets = [
    clockWidget,
    modeLabelWidget,
    countdownWidget,
    totalDurationWidget,
    statusTextWidget,
    cancelBtnBg,
    cancelBtnIcon,
    cancelHitbox,
  ];
  for (const w of widgets) {
    if (w) {
      try {
        w.setProperty(hmUI.prop.VISIBLE, vis);
      } catch (e) {
        // ignore
      }
    }
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
// Timer tick
// ============================================================================

function updateArc(remaining) {
  if (!progressArc) return;
  const progress = ts.durationSeconds > 0 ? remaining / ts.durationSeconds : 0;
  const endAngle = -90 + progress * 360;
  // Avoid end_angle === start_angle (causes rendering issues)
  const safeEnd = Math.max(-89, endAngle);
  progressArc.setProperty(hmUI.prop.MORE, { end_angle: safeEnd });
}

function updateRunningUI() {
  const remaining = getRemainingSeconds();

  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(remaining));
  }
  if (statusTextWidget) {
    statusTextWidget.setProperty(hmUI.prop.TEXT, getStatusText(remaining));
  }
  updateArc(remaining);
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
    const coins = Math.floor(ts.durationSeconds / gameConfig.ENCOUNTER_THRESHOLD);
    if (coins > 0) addCoins(coins);
    cancelNudgeAlarm();
    stopTimerService();
  }

  clearTimerState();
  setWakeUpRelaunch({ relaunch: false });

  // Update arc to solid full circle
  if (progressArc) {
    progressArc.setProperty(hmUI.prop.MORE, { end_angle: 270 });
  }

  // Hide running state widgets
  setRunningVisible(false);

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

function makeBtn(x, y, w, h, color) {
  return hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x,
    y,
    w,
    h,
    radius: Math.floor(h / 2),
    color,
  });
}

function makeBtnText(x, y, w, h, text, color) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x,
    y,
    w,
    h,
    text,
    text_size: 28,
    color,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  });
}

function makeHitbox(x, y, w, h, callback) {
  const hb = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x,
    y,
    w,
    h,
    radius: Math.floor(h / 2),
    color: 0x000000,
    alpha: 0,
  });
  hb.addEventListener(hmUI.event.CLICK_UP, callback);
  return hb;
}

function buildCompletionOverlay() {
  const modeColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
  const title = ts.mode === 'focus' ? 'Focus Done!' : 'Break Done!';
  const doneText = `${formatTime(ts.durationSeconds)} \u2713`;

  const BW = 320; // button width
  const BH = 62; // button height
  const BX = CX - BW / 2; // 80

  // Title
  const titleW = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 90,
    w: DEVICE_WIDTH,
    h: 44,
    text: title,
    text_size: 34,
    color: modeColor,
    align_h: hmUI.align.CENTER_H,
  });
  completionWidgets.push(titleW);

  // Completed time
  const doneW = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 142,
    w: DEVICE_WIDTH,
    h: 52,
    text: doneText,
    text_size: 40,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
  });
  completionWidgets.push(doneW);

  // Divider
  const divW = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 80,
    y: 205,
    w: 320,
    h: 1,
    color: 0x3a3a3a,
  });
  completionWidgets.push(divW);

  if (ts.mode === 'focus') {
    const canCatch = getAccumulatedFocus() >= getEncounterThreshold();
    let y1, y2, y3;

    if (canCatch) {
      y1 = 220; // Catch Pokemon
      y2 = 290; // New Focus
      y3 = 360; // Take Break
    } else {
      y1 = null; // no catch button
      y2 = 245; // New Focus
      y3 = 315; // Take Break
    }

    if (canCatch) {
      completionWidgets.push(makeBtn(BX, y1, BW, BH, COLORS.button.bg));
      completionWidgets.push(makeBtnText(BX, y1, BW, BH, 'Catch Pokemon!', COLORS.catch));
      completionWidgets.push(makeHitbox(BX, y1, BW, BH, handleCatchPokemon));
    }

    completionWidgets.push(makeBtn(BX, y2, BW, BH, COLORS.button.bg));
    completionWidgets.push(makeBtnText(BX, y2, BW, BH, 'New Focus', COLORS.text.primary));
    completionWidgets.push(makeHitbox(BX, y2, BW, BH, handleNewFocus));

    completionWidgets.push(makeBtn(BX, y3, BW, BH, COLORS.button.bg));
    completionWidgets.push(makeBtnText(BX, y3, BW, BH, 'Take Break', COLORS.text.primary));
    completionWidgets.push(makeHitbox(BX, y3, BW, BH, handleTakeBreak));
  } else {
    // Break done
    const extSecs = Math.floor(ts.baseBreakSeconds / 2);
    const extMins = Math.floor(extSecs / 60);
    const extRemSecs = extSecs % 60;
    const extLabel =
      extMins > 0
        ? `Extend +${extMins}m${extRemSecs > 0 ? ` ${extRemSecs}s` : ''}`
        : `Extend +${extSecs}s`;

    if (ts.canExtend && extSecs > 0) {
      completionWidgets.push(makeBtn(BX, 235, BW, BH, COLORS.button.bg));
      completionWidgets.push(makeBtnText(BX, 235, BW, BH, extLabel, COLORS.extend));
      completionWidgets.push(makeHitbox(BX, 235, BW, BH, handleExtend));

      completionWidgets.push(makeBtn(BX, 305, BW, BH, COLORS.button.bg));
      completionWidgets.push(makeBtnText(BX, 305, BW, BH, 'Start Focus', COLORS.text.primary));
      completionWidgets.push(makeHitbox(BX, 305, BW, BH, handleStartFocus));
    } else {
      completionWidgets.push(makeBtn(BX, 265, BW, BH, COLORS.button.bg));
      completionWidgets.push(makeBtnText(BX, 265, BW, BH, 'Start Focus', COLORS.text.primary));
      completionWidgets.push(makeHitbox(BX, 265, BW, BH, handleStartFocus));
    }
  }
}

// ============================================================================
// Action handlers
// ============================================================================

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

  // Reset arc to full, update text widgets, show running state
  if (progressArc) {
    progressArc.setProperty(hmUI.prop.MORE, { end_angle: 270 });
  }
  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(ts.durationSeconds));
  }
  if (totalDurationWidget) {
    totalDurationWidget.setProperty(hmUI.prop.TEXT, `/ ${formatTime(ts.durationSeconds)}`);
  }
  if (statusTextWidget) {
    statusTextWidget.setProperty(hmUI.prop.TEXT, getStatusText(ts.durationSeconds));
  }
  if (clockWidget) {
    clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
  }

  setRunningVisible(true);
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

function handleCatchPokemon() {
  if (!ts.isCompleted) return;
  stopVibrations();
  deductAccumulatedFocus(getEncounterThreshold());
  // Pass focus seconds for shiny calculation
  try {
    const app = getApp();
    if (app) {
      if (!app.globalData) app.globalData = {};
      app.globalData.sessionSeconds = ts.durationSeconds;
    }
  } catch (e) {
    // ignore
  }
  push({ url: 'pages/encounter/index' });
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

  if (progressArc) {
    progressArc.setProperty(hmUI.prop.MORE, { end_angle: 270 });
  }
  if (countdownWidget) {
    countdownWidget.setProperty(hmUI.prop.TEXT, formatTime(extSecs));
  }
  if (totalDurationWidget) {
    totalDurationWidget.setProperty(hmUI.prop.TEXT, `/ ${formatTime(extSecs)}`);
  }
  if (statusTextWidget) {
    statusTextWidget.setProperty(hmUI.prop.TEXT, getStatusText(extSecs));
  }
  if (clockWidget) {
    clockWidget.setProperty(hmUI.prop.TEXT, getCurrentTime());
  }

  setRunningVisible(true);
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
    y: 50,
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

  countdownWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 140,
    w: DEVICE_WIDTH,
    h: 92,
    text: formatTime(remaining),
    text_size: 78,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
  });

  totalDurationWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 240,
    w: DEVICE_WIDTH,
    h: 36,
    text: `/ ${formatTime(ts.durationSeconds)}`,
    text_size: 28,
    color: COLORS.text.muted,
    align_h: hmUI.align.CENTER_H,
  });

  statusTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y: 284,
    w: DEVICE_WIDTH,
    h: 32,
    text: getStatusText(remaining),
    text_size: 24,
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
    progressArc = null;
    clockWidget = null;
    modeLabelWidget = null;
    countdownWidget = null;
    totalDurationWidget = null;
    statusTextWidget = null;
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

    const ringColor = ts.mode === 'focus' ? COLORS.focus.ring : COLORS.break.ring;
    const trackColor = ts.mode === 'focus' ? COLORS.focus.track : COLORS.break.track;

    // ── Background ──
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: 480,
      color: COLORS.bg,
    });

    // ── Ring track (full dark circle) ──
    hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: 480,
      start_angle: 0,
      end_angle: 360,
      color: trackColor,
      line_width: 12,
    });

    // ── Progress arc (drains from full as time passes) ──
    const remaining = getRemainingSeconds();
    const initProgress = ts.durationSeconds > 0 ? remaining / ts.durationSeconds : 0;
    const initEndAngle = ts.isCompleted ? 270 : Math.max(-89, -90 + initProgress * 360);

    progressArc = hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: 480,
      start_angle: -90,
      end_angle: initEndAngle,
      color: ringColor,
      line_width: 12,
    });

    // ── Running state widgets ──
    buildRunningState();

    if (ts.isCompleted) {
      // Recovered after already completing — show completion state directly
      setRunningVisible(false);
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
    // Note: don't stop the service here — it should keep running for focus mode
  },
});
