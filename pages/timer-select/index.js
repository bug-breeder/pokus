/**
 * Timer Select Page
 * Mode selection screen with FOCUS | BREAK tabs, recent timers, presets, and custom duration.
 * Content scrolls in SCROLL_LIST; + button is fixed at the bottom.
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
  tabActive: { focus: 0x0a84ff, break: 0x30d158 },
  tabInactive: 0x2c2c2e,
};

const CIRCLE_SIZE = 140;
const CIRCLE_GAP = 28;
const CIRCLE_LEFT_X = (DEVICE_WIDTH - 2 * CIRCLE_SIZE - CIRCLE_GAP) / 2; // 86
const CIRCLE_RIGHT_X = CIRCLE_LEFT_X + CIRCLE_SIZE + CIRCLE_GAP; // 254

// Layout zones
const CONTENT_Y = 162; // below tabs
const PLUS_BAR_Y = 400; // fixed bar starts here
const PLUS_BAR_H = 80;
const LIST_H = PLUS_BAR_Y - CONTENT_Y; // 238

// ============================================================================
// Module state
// ============================================================================

// Switch geometry
const SW_W = 320; // pill track width
const SW_H = 64; // pill track height
const SW_X = CX - SW_W / 2; // 80
const SW_Y = 90;
const KNOB_W = SW_W / 2 - 4; // 156 — half-pill knob
const KNOB_H = SW_H - 8; // 56
const KNOB_RADIUS = KNOB_H / 2; // 28
const KNOB_FOCUS_X = SW_X + 4; // 84 — left position
const KNOB_BREAK_X = SW_X + SW_W / 2; // 240 — right position

let currentMode = 'focus';
let switchKnob = null;
let scrollListWidget = null;
let scrollListData = [];
let plusBarIcon = null;
let contentWidgets = [];
let customPickerMode = false;
let customMinutes = 5;
let customMinutesText = null;

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function selectDuration(seconds) {
  if (seconds <= 0) return;
  saveRecentTimer(seconds);
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

function cw(widget) {
  contentWidgets.push(widget);
  return widget;
}

function clearContentWidgets() {
  for (const w of contentWidgets) {
    try {
      hmUI.deleteWidget(w);
    } catch {
      // ignore
    }
  }
  contentWidgets = [];
  customMinutesText = null;
}

// ============================================================================
// SCROLL_LIST data builders
// ============================================================================

function buildScrollListData(mode) {
  const recentTimers = getRecentTimers();
  const presets = mode === 'focus' ? FOCUS_PRESET_MINUTES : BREAK_PRESET_MINUTES;
  const circleImg = mode === 'focus' ? 'raw/icons/circle-focus.png' : 'raw/icons/circle-break.png';
  const items = [];

  // Recent section (only if there are recent timers)
  if (recentTimers.length > 0) {
    items.push({ _type: 1, label: 'Recent' });
    for (let i = 0; i < recentTimers.length; i += 2) {
      const leftSecs = recentTimers[i];
      const rightSecs = recentTimers[i + 1] || 0;
      items.push({
        _type: 2,
        leftLabel: formatDuration(leftSecs),
        leftSecs,
        leftImg: circleImg,
        rightLabel: rightSecs ? formatDuration(rightSecs) : '',
        rightSecs,
        rightImg: rightSecs ? circleImg : '',
      });
    }
  }

  // Presets section
  items.push({ _type: 1, label: 'Presets' });
  for (let i = 0; i < presets.length; i += 2) {
    const leftMins = presets[i];
    const rightMins = presets[i + 1] || 0;
    items.push({
      _type: 2,
      leftLabel: formatDuration(leftMins * 60),
      leftSecs: leftMins * 60,
      leftImg: circleImg,
      rightLabel: rightMins ? formatDuration(rightMins * 60) : '',
      rightSecs: rightMins ? rightMins * 60 : 0,
      rightImg: rightMins ? circleImg : '',
    });
  }

  return items;
}

function buildTypeConfig(items) {
  if (items.length === 0) return [{ start: 0, end: 0, type_id: 1 }];
  const configs = [];
  let start = 0;
  let curType = items[0]._type;
  for (let i = 1; i <= items.length; i++) {
    const t = i < items.length ? items[i]._type : null;
    if (i === items.length || t !== curType) {
      configs.push({ start, end: i - 1, type_id: curType });
      start = i;
      curType = t;
    }
  }
  return configs;
}

// ============================================================================
// Scroll list create / destroy
// ============================================================================

function createScrollList(mode) {
  const items = buildScrollListData(mode);
  scrollListData = items;
  const typeConfig = buildTypeConfig(items);

  scrollListWidget = hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
    x: 0,
    y: CONTENT_Y,
    w: DEVICE_WIDTH,
    h: LIST_H,
    item_space: 0,
    snap_to_center: false,

    item_config: [
      // Type 1 — section label row (h=56)
      {
        type_id: 1,
        item_height: 56,
        item_bg_color: 0x000000,
        item_bg_radius: 0,
        text_view: [
          {
            x: 48,
            y: 12,
            w: 384,
            h: 32,
            key: 'label',
            color: 0x8e8e93,
            text_size: 32,
          },
        ],
        text_view_count: 1,
        image_view: [],
        image_view_count: 0,
      },
      // Type 2 — two-circle row (h=172)
      {
        type_id: 2,
        item_height: 172,
        item_bg_color: 0x000000,
        item_bg_radius: 0,
        image_view: [
          {
            x: CIRCLE_LEFT_X,
            y: 8,
            w: CIRCLE_SIZE,
            h: CIRCLE_SIZE,
            key: 'leftImg',
            action: true,
          },
          {
            x: CIRCLE_RIGHT_X,
            y: 8,
            w: CIRCLE_SIZE,
            h: CIRCLE_SIZE,
            key: 'rightImg',
            action: true,
          },
        ],
        image_view_count: 2,
        text_view: [
          {
            x: CIRCLE_LEFT_X,
            y: 8,
            w: CIRCLE_SIZE,
            h: CIRCLE_SIZE,
            key: 'leftLabel',
            color: 0xffffff,
            text_size: 36,
            align_h: hmUI.align.CENTER_H,
            align_v: hmUI.align.CENTER_V,
          },
          {
            x: CIRCLE_RIGHT_X,
            y: 8,
            w: CIRCLE_SIZE,
            h: CIRCLE_SIZE,
            key: 'rightLabel',
            color: 0xffffff,
            text_size: 36,
            align_h: hmUI.align.CENTER_H,
            align_v: hmUI.align.CENTER_V,
          },
        ],
        text_view_count: 2,
      },
    ],
    item_config_count: 2,

    data_type_config: typeConfig,
    data_type_config_count: typeConfig.length,
    data_array: items,
    data_count: items.length,

    item_click_func: (list, index, data_key) => {
      console.log('[TimerSelect] click:', index, data_key);
      if (customPickerMode) return;
      const item = scrollListData[index];
      if (!item || item._type !== 2) return;
      if (data_key === 'leftImg' || data_key === 'leftLabel') {
        if (item.leftSecs > 0) selectDuration(item.leftSecs);
      } else if (data_key === 'rightImg' || data_key === 'rightLabel') {
        if (item.rightSecs > 0) selectDuration(item.rightSecs);
      }
    },
  });
}

function destroyScrollList() {
  if (scrollListWidget) {
    try {
      hmUI.deleteWidget(scrollListWidget);
    } catch {
      // ignore
    }
    scrollListWidget = null;
  }
}

// ============================================================================
// Tab management
// ============================================================================

function updateSwitch(mode) {
  if (!switchKnob) return;
  switchKnob.setProperty(hmUI.prop.X, mode === 'focus' ? KNOB_FOCUS_X : KNOB_BREAK_X);
  switchKnob.setProperty(
    hmUI.prop.COLOR,
    mode === 'focus' ? COLORS.tabActive.focus : COLORS.tabActive.break
  );
}

function switchMode(newMode) {
  if (newMode === currentMode && !customPickerMode) return;

  // Exit picker if open — destroy picker widgets and recreate scroll list
  if (customPickerMode) {
    customPickerMode = false;
    clearContentWidgets();
    if (plusBarIcon) plusBarIcon.setProperty(hmUI.prop.SRC, 'raw/icons/plus-solid.png');
    createScrollList(newMode);
    currentMode = newMode;
    updateSwitch(newMode);
    return;
  }

  currentMode = newMode;
  updateSwitch(newMode);

  // Refresh scroll list data in-place
  const items = buildScrollListData(newMode);
  scrollListData = items;
  const typeConfig = buildTypeConfig(items);

  if (scrollListWidget) {
    scrollListWidget.setProperty(hmUI.prop.UPDATE_DATA, {
      data_type_config: typeConfig,
      data_type_config_count: typeConfig.length,
      data_array: items,
      data_count: items.length,
      on_page: 0,
    });
  }
}

// ============================================================================
// Custom duration picker
// ============================================================================

function openCustomPicker() {
  customPickerMode = true;
  customMinutes = 5;
  clearContentWidgets();

  // Delete scroll list so it doesn't show through (VISIBLE prop not supported on SCROLL_LIST)
  destroyScrollList();
  if (plusBarIcon) plusBarIcon.setProperty(hmUI.prop.SRC, 'raw/icons/check.png');

  // Background fill for content area
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: CONTENT_Y,
      w: DEVICE_WIDTH,
      h: LIST_H,
      color: COLORS.bg,
    })
  );

  // Panel card
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 60,
      y: CONTENT_Y + 16,
      w: 360,
      h: 168,
      radius: 24,
      color: 0x1c1c1e,
    })
  );

  // "Custom Duration" label
  cw(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: CONTENT_Y + 32,
      w: 360,
      h: 32,
      text: 'Custom Duration',
      text_size: 26,
      color: COLORS.text.muted,
      align_h: hmUI.align.CENTER_H,
    })
  );

  // ── Minus (−) ──
  const btnY = CONTENT_Y + 80;
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 80,
      y: btnY,
      w: 76,
      h: 76,
      radius: 38,
      color: 0x2c2c2e,
    })
  );
  cw(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 80,
      y: btnY,
      w: 76,
      h: 76,
      text: '\u2212',
      text_size: 42,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
  );
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 68,
      y: btnY - 12,
      w: 100,
      h: 100,
      color: 0x000000,
      alpha: 0,
    })
  ).addEventListener(hmUI.event.CLICK_UP, () => {
    if (customMinutes > 1) {
      customMinutes--;
      if (customMinutesText) customMinutesText.setProperty(hmUI.prop.TEXT, `${customMinutes}m`);
    }
  });

  // ── Value display ──
  customMinutesText = cw(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 156,
      y: btnY,
      w: 168,
      h: 76,
      text: `${customMinutes}m`,
      text_size: 46,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
  );

  // ── Plus (+) ──
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 324,
      y: btnY,
      w: 76,
      h: 76,
      radius: 38,
      color: 0x2c2c2e,
    })
  );
  cw(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 324,
      y: btnY,
      w: 76,
      h: 76,
      text: '+',
      text_size: 42,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
  );
  cw(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 312,
      y: btnY - 12,
      w: 100,
      h: 100,
      color: 0x000000,
      alpha: 0,
    })
  ).addEventListener(hmUI.event.CLICK_UP, () => {
    if (customMinutes < 60) {
      customMinutes++;
      if (customMinutesText) customMinutesText.setProperty(hmUI.prop.TEXT, `${customMinutes}m`);
    }
  });
}

// ============================================================================
// Page
// ============================================================================

Page({
  onInit(params) {
    console.log('[TimerSelect] onInit, params:', params);

    try {
      const p = params ? (typeof params === 'string' ? JSON.parse(params) : params) : {};
      if (p.mode === 'break' || p.mode === 'focus') currentMode = p.mode;
    } catch {
      // use default mode
    }

    // Reset module state
    customPickerMode = false;
    customMinutes = 5;
    contentWidgets = [];
    switchKnob = null;
    scrollListWidget = null;
    scrollListData = [];
    plusBarIcon = null;
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

    // Background — fixed 480px height prevents page-level scrolling
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
      h: 44,
      text: 'Timer',
      text_size: 36,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
    });

    // ── Mode switch (Focus ← → Break) ──
    // Track (pill background)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: SW_X,
      y: SW_Y,
      w: SW_W,
      h: SW_H,
      radius: SW_H / 2,
      color: COLORS.tabInactive,
    });
    // Sliding knob
    switchKnob = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: currentMode === 'focus' ? KNOB_FOCUS_X : KNOB_BREAK_X,
      y: SW_Y + 4,
      w: KNOB_W,
      h: KNOB_H,
      radius: KNOB_RADIUS,
      color: currentMode === 'focus' ? COLORS.tabActive.focus : COLORS.tabActive.break,
    });
    // "Focus" label (left half)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: SW_X,
      y: SW_Y,
      w: SW_W / 2,
      h: SW_H,
      text: 'Focus',
      text_size: 28,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    // "Break" label (right half)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: SW_X + SW_W / 2,
      y: SW_Y,
      w: SW_W / 2,
      h: SW_H,
      text: 'Break',
      text_size: 28,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    // Left-half tap → Focus
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: SW_X,
        y: SW_Y,
        w: SW_W / 2,
        h: SW_H,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => switchMode('focus'));
    // Right-half tap → Break
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: SW_X + SW_W / 2,
        y: SW_Y,
        w: SW_W / 2,
        h: SW_H,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => switchMode('break'));

    // ── SCROLL_LIST (content, y=162 to y=400) ──
    createScrollList(currentMode);

    // ── Fixed + bar (y=400–480, always visible) ──
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: PLUS_BAR_Y,
      w: DEVICE_WIDTH,
      h: PLUS_BAR_H,
      color: 0x1c1c1e,
    });
    plusBarIcon = hmUI.createWidget(hmUI.widget.IMG, {
      x: CX - 24,
      y: PLUS_BAR_Y + (PLUS_BAR_H - 48) / 2,
      w: 48,
      h: 48,
      src: 'raw/icons/plus-solid.png',
    });
    // Clickable overlay on bar — acts as + or ✓ depending on picker state
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: 0,
        y: PLUS_BAR_Y,
        w: DEVICE_WIDTH,
        h: PLUS_BAR_H,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => {
        if (customPickerMode) {
          selectDuration(customMinutes * 60);
        } else {
          openCustomPicker();
        }
      });
  },

  onDestroy() {
    console.log('[TimerSelect] onDestroy');
    offGesture();
    contentWidgets = [];
    scrollListWidget = null;
    plusBarIcon = null;
    customMinutesText = null;
  },
});
