/**
 * Title Screen - Pokus
 * Clean, modern design with animated Pikachu
 * Designed for circular 480x480 display
 */

import hmUI from '@zos/ui';
import { push } from '@zos/router';
import { setWakeUpRelaunch } from '@zos/display';
import { cancel as cancelAlarm } from '@zos/alarm';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../../utils/constants';
import { clearTimerState, getNudgeAlarmId, clearNudgeAlarmId } from '../../utils/storage';

const CX = DEVICE_WIDTH / 2;
const CY = DEVICE_HEIGHT / 2;

// ZUI Design Tokens (following DESIGN.md)
const COLORS = {
  bg: 0x000000,
  title: 0xffd700, // Pokemon yellow/gold
  subtitle: 0xffffff,
  hint: 0x8e8e93, // ZUI text.caption color
  accent: 0xffd700,
  // Radial gradient colors (black edge to cool blue-gray center - modern, neutral)
  gradient: [
    0x000000, // Outer: Pure black
    0x0a0c10, // Very dark blue-gray
    0x141820, // Deep slate
    0x1e2430, // Rich blue-gray
    0x283040, // Inner: Cool slate center
  ],
};

// ZUI Typography (minimum 24px for readability)
const TYPOGRAPHY = {
  largeTitle: 48, // Main title
  title: 36, // Secondary title
  body: 32, // Body text
  subheadline: 28, // Subtitle
  caption: 24, // Minimum readable
};

// Animation state
let state = {
  hintText: null,
  pulseTimer: null,
  isVisible: true,
};

Page({
  onInit() {
    console.log('[Home] onInit');

    // Clear any stale timer state
    clearTimerState();

    // Cancel any pending nudge alarms
    const alarmId = getNudgeAlarmId();
    if (alarmId) {
      try {
        cancelAlarm({ alarmId });
        console.log('[Home] Cancelled alarm:', alarmId);
      } catch (e) {
        console.log('[Home] Cancel alarm error:', e);
      }
      clearNudgeAlarmId();
    }

    // Disable wake-up relaunch when on title screen
    setWakeUpRelaunch({ relaunch: false });
  },

  build() {
    console.log('[Home] build');

    // === Radial Gradient Background (Dark Blue to Black) ===
    // Layer 1: Outer ring - Deep blue
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.gradient[0],
    });

    // Layer 2-5: Concentric circles - bigger indigo center
    const gradientSteps = [
      { size: 460, color: COLORS.gradient[1] },
      { size: 400, color: COLORS.gradient[2] },
      { size: 340, color: COLORS.gradient[3] },
      { size: 280, color: COLORS.gradient[4] },
    ];

    gradientSteps.forEach((step) => {
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: CX - step.size / 2,
        y: CY - step.size / 2,
        w: step.size,
        h: step.size,
        radius: step.size / 2,
        color: step.color,
      });
    });

    // === Pikachu Running Animation ===
    // 240x171 (0.5x), 4 frames, ~7KB total
    const pikachuW = 240;
    const pikachuH = 171;

    hmUI.createWidget(hmUI.widget.IMG_ANIM, {
      x: CX - pikachuW / 2 - 20,
      y: CY - pikachuH / 2 - 40, // Centered, slightly up to make room for text
      anim_path: 'raw/pikachu_frames',
      anim_prefix: 'pikachu',
      anim_ext: 'png',
      anim_fps: 8,
      anim_size: 4,
      repeat_count: 0,
      anim_status: hmUI.anim_status.START,
      display_on_restart: 1,
    });

    // === Title: Pokus ===
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 310,
      w: DEVICE_WIDTH,
      h: 60,
      text: 'Pokus',
      text_size: TYPOGRAPHY.largeTitle, // 48px
      color: COLORS.title,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    // === Subtitle (ZUI subheadline: 28px) ===
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 40,
      y: 368,
      w: DEVICE_WIDTH - 80,
      h: 35,
      text: 'Focus. Catch. Collect.',
      text_size: TYPOGRAPHY.subheadline, // 28px
      color: COLORS.subtitle,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    // === Tap Hint - Decorative lines ===
    state.hintText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 418,
      w: DEVICE_WIDTH,
      h: 30,
      text: '───  tap to start  ───',
      text_size: TYPOGRAPHY.caption, // 24px (minimum readable)
      color: COLORS.hint,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    // Gentle pulse animation
    state.pulseTimer = setInterval(() => {
      if (state.hintText) {
        state.isVisible = !state.isVisible;
        state.hintText.setProperty(hmUI.prop.COLOR, state.isVisible ? COLORS.hint : 0x333333);
      }
    }, 1000);

    // === Full-screen Tap Area ===
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: 0,
        y: 0,
        w: DEVICE_WIDTH,
        h: DEVICE_HEIGHT,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => {
        console.log('[Home] Screen tapped');
        push({ url: 'pages/menu/index' });
      });
  },

  onDestroy() {
    console.log('[Home] onDestroy');
    if (state.pulseTimer) {
      clearInterval(state.pulseTimer);
      state.pulseTimer = null;
    }
    state.hintText = null;
  },
});
