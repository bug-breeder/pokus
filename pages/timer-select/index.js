/**
 * Timer Select Page
 * Mode selection screen with FOCUS | BREAK tabs, recent timers, presets, and custom duration.
 */

import hmUI from '@zos/ui';
import { push, replace } from '@zos/router';
import { onGesture, offGesture, GESTURE_RIGHT } from '@zos/interaction';
import { DEVICE_WIDTH, FOCUS_PRESET_MINUTES, BREAK_PRESET_MINUTES } from '../../utils/constants';
import { getRecentTimers, saveRecentTimer } from '../../utils/storage';

const CX = DEVICE_WIDTH / 2; // 240

const COLORS = {
  bg: 0x000000,
  text: { primary: 0xffffff, muted: 0x8e8e93 },
  focus: 0x0a84ff,
  break: 0x30d158,
  tabActive: { focus: 0x0a84ff, break: 0x30d158 },
  tabInactive: 0x2c2c2e,
  card: 0x1c1c1e,
  cardRing: { focus: 0x0a2040, break: 0x0a2010 },
  pill: 0x2c2c2e,
  plusArea: 0x0a0a0a,
};

// ============================================================================
// Module state
// ============================================================================

let currentMode = 'focus';
let contentWidgets = []; // All mode-specific or picker-specific widgets
let tabWidgets = { focusBg: null, breakBg: null };
let plusBg = null;
let plusText = null;
let customPickerMode = false;
let customMinutes = 5;
let customMinutesText = null; // ref for live update

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${String(mins).padStart(2, '0')}:00`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function selectDuration(seconds) {
  saveRecentTimer(currentMode, seconds);
  const isBreak = currentMode === 'break';
  push({
    url: 'pages/timer/index',
    params: JSON.stringify({
      mode: currentMode,
      durationSeconds: seconds,
      canExtend: isBreak,
      baseBreakSeconds: isBreak ? seconds : 0,
    }),
  });
}

function deleteContentWidgets() {
  for (const w of contentWidgets) {
    try {
      hmUI.deleteWidget(w);
    } catch (e) {
      // ignore
    }
  }
  contentWidgets = [];
  customMinutesText = null;
}

// ============================================================================
// Tab management
// ============================================================================

function updateTabs(mode) {
  if (tabWidgets.focusBg) {
    tabWidgets.focusBg.setProperty(
      hmUI.prop.COLOR,
      mode === 'focus' ? COLORS.tabActive.focus : COLORS.tabInactive
    );
  }
  if (tabWidgets.breakBg) {
    tabWidgets.breakBg.setProperty(
      hmUI.prop.COLOR,
      mode === 'break' ? COLORS.tabActive.break : COLORS.tabInactive
    );
  }
}

function switchMode(newMode) {
  if (newMode === currentMode && !customPickerMode) return;
  customPickerMode = false;
  updatePlusButton(false);
  deleteContentWidgets();
  currentMode = newMode;
  updateTabs(newMode);
  buildNormalContent(newMode);
}

// ============================================================================
// Plus button toggle
// ============================================================================

function updatePlusButton(isClose) {
  if (plusBg) {
    plusBg.setProperty(hmUI.prop.COLOR, isClose ? 0x3a3a3a : 0x2c2c2e);
  }
  if (plusText) {
    plusText.setProperty(hmUI.prop.TEXT, isClose ? '×' : '+');
  }
}

function toggleCustomPicker() {
  if (customPickerMode) {
    customPickerMode = false;
    updatePlusButton(false);
    deleteContentWidgets();
    buildNormalContent(currentMode);
  } else {
    customPickerMode = true;
    customMinutes = 5;
    updatePlusButton(true);
    deleteContentWidgets();
    buildCustomPicker();
  }
}

// ============================================================================
// Normal content (recents + presets)
// ============================================================================

function buildNormalContent(mode) {
  const recentTimers = getRecentTimers(mode);
  let nextY = 125;

  // ── Recent section ──
  if (recentTimers.length > 0) {
    const recentLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 48,
      y: nextY,
      w: 200,
      h: 28,
      text: 'Recent',
      text_size: 22,
      color: COLORS.text.muted,
    });
    contentWidgets.push(recentLabel);

    nextY += 34;
    const cardSize = 110;
    const cardGap = 14;
    const totalW = recentTimers.length * cardSize + (recentTimers.length - 1) * cardGap;
    const cardStartX = CX - totalW / 2;

    recentTimers.forEach((seconds, i) => {
      const cx = cardStartX + i * (cardSize + cardGap);
      const cy = nextY;

      const cardBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: cx,
        y: cy,
        w: cardSize,
        h: cardSize,
        radius: cardSize / 2,
        color: COLORS.card,
      });
      contentWidgets.push(cardBg);

      const arcRing = hmUI.createWidget(hmUI.widget.ARC, {
        x: cx,
        y: cy,
        w: cardSize,
        h: cardSize,
        start_angle: 0,
        end_angle: 360,
        color: mode === 'focus' ? COLORS.cardRing.focus : COLORS.cardRing.break,
        line_width: 4,
      });
      contentWidgets.push(arcRing);

      const timeText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: cx,
        y: cy + 36,
        w: cardSize,
        h: 38,
        text: formatDuration(seconds),
        text_size: 24,
        color: COLORS.text.primary,
        align_h: hmUI.align.CENTER_H,
      });
      contentWidgets.push(timeText);

      const hitbox = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: cx,
        y: cy,
        w: cardSize,
        h: cardSize,
        radius: cardSize / 2,
        color: 0x000000,
        alpha: 0,
      });
      hitbox.addEventListener(hmUI.event.CLICK_UP, () => {
        selectDuration(seconds);
      });
      contentWidgets.push(hitbox);
    });

    nextY += cardSize + 16;
  }

  // ── Presets section ──
  const presetsLabel = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 48,
    y: nextY,
    w: 200,
    h: 28,
    text: 'Presets',
    text_size: 22,
    color: COLORS.text.muted,
  });
  contentWidgets.push(presetsLabel);

  nextY += 34;
  const presets = mode === 'focus' ? FOCUS_PRESET_MINUTES : BREAK_PRESET_MINUTES;
  const pillW = 118;
  const pillH = 44;
  const pillGapX = 11;
  const pillGapY = 10;
  const pillsPerRow = 3;
  const rowW = pillsPerRow * pillW + (pillsPerRow - 1) * pillGapX;
  const pillStartX = CX - rowW / 2;

  presets.forEach((mins, i) => {
    const row = Math.floor(i / pillsPerRow);
    const col = i % pillsPerRow;
    const px = pillStartX + col * (pillW + pillGapX);
    const py = nextY + row * (pillH + pillGapY);
    const seconds = mins * 60;

    const pillBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: px,
      y: py,
      w: pillW,
      h: pillH,
      radius: pillH / 2,
      color: COLORS.pill,
    });
    contentWidgets.push(pillBg);

    const pillLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: px,
      y: py,
      w: pillW,
      h: pillH,
      text: `${mins}m`,
      text_size: 24,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    contentWidgets.push(pillLabel);

    const pillHit = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: px,
      y: py,
      w: pillW,
      h: pillH,
      radius: pillH / 2,
      color: 0x000000,
      alpha: 0,
    });
    pillHit.addEventListener(hmUI.event.CLICK_UP, () => {
      selectDuration(seconds);
    });
    contentWidgets.push(pillHit);
  });
}

// ============================================================================
// Custom picker (overlays the content area)
// ============================================================================

function buildCustomPicker() {
  // Panel background
  const panelBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 60,
    y: 150,
    w: 360,
    h: 210,
    radius: 24,
    color: 0x1c1c1e,
  });
  contentWidgets.push(panelBg);

  // Header
  const header = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 60,
    y: 168,
    w: 360,
    h: 28,
    text: 'Custom Duration',
    text_size: 22,
    color: COLORS.text.muted,
    align_h: hmUI.align.CENTER_H,
  });
  contentWidgets.push(header);

  // Minus button
  const minusBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 84,
    y: 210,
    w: 60,
    h: 60,
    radius: 30,
    color: 0x2c2c2e,
  });
  contentWidgets.push(minusBg);

  const minusLabel = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 84,
    y: 210,
    w: 60,
    h: 60,
    text: '−',
    text_size: 34,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  });
  contentWidgets.push(minusLabel);

  const minusHit = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 74,
    y: 200,
    w: 80,
    h: 80,
    color: 0x000000,
    alpha: 0,
  });
  minusHit.addEventListener(hmUI.event.CLICK_UP, () => {
    if (customMinutes > 1) {
      customMinutes--;
      if (customMinutesText) {
        customMinutesText.setProperty(hmUI.prop.TEXT, `${customMinutes}m`);
      }
    }
  });
  contentWidgets.push(minusHit);

  // Minutes display
  customMinutesText = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 155,
    y: 210,
    w: 170,
    h: 60,
    text: `${customMinutes}m`,
    text_size: 36,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  });
  contentWidgets.push(customMinutesText);

  // Plus button
  const plusInnerBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 336,
    y: 210,
    w: 60,
    h: 60,
    radius: 30,
    color: 0x2c2c2e,
  });
  contentWidgets.push(plusInnerBg);

  const plusInnerLabel = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 336,
    y: 210,
    w: 60,
    h: 60,
    text: '+',
    text_size: 34,
    color: COLORS.text.primary,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  });
  contentWidgets.push(plusInnerLabel);

  const plusInnerHit = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 326,
    y: 200,
    w: 80,
    h: 80,
    color: 0x000000,
    alpha: 0,
  });
  plusInnerHit.addEventListener(hmUI.event.CLICK_UP, () => {
    if (customMinutes < 60) {
      customMinutes++;
      if (customMinutesText) {
        customMinutesText.setProperty(hmUI.prop.TEXT, `${customMinutes}m`);
      }
    }
  });
  contentWidgets.push(plusInnerHit);

  // Start button
  const startBgColor = currentMode === 'focus' ? COLORS.focus : COLORS.break;
  const startBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 90,
    y: 294,
    w: 300,
    h: 54,
    radius: 27,
    color: startBgColor,
  });
  contentWidgets.push(startBg);

  const startLabel = hmUI.createWidget(hmUI.widget.TEXT, {
    x: 90,
    y: 294,
    w: 300,
    h: 54,
    text: 'Start',
    text_size: 28,
    color: 0x000000,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  });
  contentWidgets.push(startLabel);

  const startHit = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 90,
    y: 294,
    w: 300,
    h: 54,
    radius: 27,
    color: 0x000000,
    alpha: 0,
  });
  startHit.addEventListener(hmUI.event.CLICK_UP, () => {
    selectDuration(customMinutes * 60);
  });
  contentWidgets.push(startHit);
}

// ============================================================================
// Page
// ============================================================================

Page({
  onInit(params) {
    console.log('[TimerSelect] onInit, params:', params);

    // Accept a default mode from params (e.g., 'break' when coming from focus done)
    try {
      const p = params ? (typeof params === 'string' ? JSON.parse(params) : params) : {};
      if (p.mode === 'break' || p.mode === 'focus') {
        currentMode = p.mode;
      }
    } catch (e) {
      // use default mode
    }

    // Reset picker state on each init
    customPickerMode = false;
    customMinutes = 5;
    contentWidgets = [];
    tabWidgets = { focusBg: null, breakBg: null };
    plusBg = null;
    plusText = null;
    customMinutesText = null;

    onGesture({
      callback: (event) => {
        if (event === GESTURE_RIGHT) {
          replace({ url: 'pages/home/index' });
          return true;
        }
        return false;
      },
    });
  },

  build() {
    console.log('[TimerSelect] build, mode:', currentMode);

    // ── Background ──
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: 480,
      color: COLORS.bg,
    });

    // ── Title ──
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 20,
      w: DEVICE_WIDTH,
      h: 36,
      text: 'Timer',
      text_size: 30,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
    });

    // ── Tabs ──
    const tabW = 196;
    const tabH = 48;
    const tabY = 68;
    const focusTabX = CX - tabW - 2; // left tab
    const breakTabX = CX + 2; // right tab

    tabWidgets.focusBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: focusTabX,
      y: tabY,
      w: tabW,
      h: tabH,
      radius: tabH / 2,
      color: currentMode === 'focus' ? COLORS.tabActive.focus : COLORS.tabInactive,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: focusTabX,
      y: tabY,
      w: tabW,
      h: tabH,
      text: 'FOCUS',
      text_size: 24,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: focusTabX,
        y: tabY,
        w: tabW,
        h: tabH,
        radius: tabH / 2,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => {
        switchMode('focus');
      });

    tabWidgets.breakBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: breakTabX,
      y: tabY,
      w: tabW,
      h: tabH,
      radius: tabH / 2,
      color: currentMode === 'break' ? COLORS.tabActive.break : COLORS.tabInactive,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: breakTabX,
      y: tabY,
      w: tabW,
      h: tabH,
      text: 'BREAK',
      text_size: 24,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: breakTabX,
        y: tabY,
        w: tabW,
        h: tabH,
        radius: tabH / 2,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => {
        switchMode('break');
      });

    // ── Plus button area (bottom) ──
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 392,
      w: DEVICE_WIDTH,
      h: 88,
      color: COLORS.plusArea,
    });

    const plusSize = 56;
    const plusX = CX - plusSize / 2;
    const plusY = 404;

    plusBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: plusX,
      y: plusY,
      w: plusSize,
      h: plusSize,
      radius: plusSize / 2,
      color: 0x2c2c2e,
    });

    plusText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: plusX,
      y: plusY,
      w: plusSize,
      h: plusSize,
      text: '+',
      text_size: 32,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: plusX - 12,
        y: plusY - 12,
        w: plusSize + 24,
        h: plusSize + 24,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => {
        toggleCustomPicker();
      });

    // ── Initial content ──
    buildNormalContent(currentMode);
  },

  onDestroy() {
    console.log('[TimerSelect] onDestroy');
    offGesture();
  },
});
