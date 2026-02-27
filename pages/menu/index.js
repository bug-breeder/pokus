/**
 * Main Menu Page
 * Central navigation hub
 */

import hmUI from '@zos/ui';
import { push, replace } from '@zos/router';
import { onGesture, offGesture, GESTURE_RIGHT } from '@zos/interaction';
import { DEVICE_WIDTH, DEVICE_HEIGHT, COLOR, getEncounterThreshold } from '../../utils/constants';
import { getCaughtPokemon, getAccumulatedFocus, deductAccumulatedFocus } from '../../utils/storage';

const CX = DEVICE_WIDTH / 2;

// Layout constants (6 buttons + version, scrollable)
const LAYOUT = {
  BUTTON_START_Y: 70,
  BUTTON_GAP: 82,
  BUTTON_WIDTH: 320,
  BUTTON_HEIGHT: 72,
  VERSION_Y: 580,
};

Page({
  onInit() {
    console.log('[Menu] onInit');

    // Override back gesture to go to home instead of previous page
    onGesture({
      callback: (event) => {
        if (event === GESTURE_RIGHT) {
          console.log('[Menu] Back gesture -> Home');
          replace({ url: 'pages/home/index' });
          return true; // Prevent default back behavior
        }
        return false;
      },
    });
  },

  build() {
    console.log('[Menu] build');

    // Black background (extended for scroll)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT + 100, // Extra space for scrolling
      color: COLOR.BG,
    });

    // ========== MENU BUTTONS ==========

    // Start Focus (green, primary action)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: 'Start Focus',
      text_size: 28,
      color: COLOR.BG,
      radius: 36,
      normal_color: COLOR.GREEN,
      press_color: COLOR.DARK_GREEN,
      click_func: () => {
        console.log('[Menu] Start Timer clicked');
        push({ url: 'pages/timer-select/index' });
      },
    });

    // Catch Pokemon (yellow when ready, gray when not)
    const accumulated = getAccumulatedFocus();
    const threshold = getEncounterThreshold();
    const encounters = Math.floor(accumulated / threshold);
    const catchReady = encounters > 0;
    const catchLabel = catchReady
      ? `Hunt!${encounters > 1 ? ` (${encounters})` : ''}`
      : (() => {
          const accMins = Math.floor(accumulated / 60);
          const thrMins = Math.floor(threshold / 60);
          return threshold >= 60
            ? `Hunt (${accMins}m / ${thrMins}m)`
            : `Hunt (${accumulated}s / ${threshold}s)`;
        })();

    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y + LAYOUT.BUTTON_GAP,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: catchLabel,
      text_size: catchReady ? 28 : 22,
      color: catchReady ? COLOR.YELLOW : COLOR.GRAY,
      radius: 36,
      normal_color: COLOR.DARK_GRAY,
      press_color: COLOR.GRAY,
      click_func: () => {
        console.log('[Menu] Catch Pokemon clicked, ready:', catchReady);
        if (!catchReady) return;
        deductAccumulatedFocus(threshold);
        push({ url: 'pages/encounter/index' });
      },
    });

    // Statistics (gray, secondary)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y + LAYOUT.BUTTON_GAP * 2,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: 'Statistics',
      text_size: 28,
      color: COLOR.WHITE,
      radius: 36,
      normal_color: COLOR.DARK_GRAY,
      press_color: COLOR.GRAY,
      click_func: () => {
        console.log('[Menu] Statistics clicked');
        push({ url: 'pages/stats/index' });
      },
    });

    // Pokédex (gray, secondary)
    const caught = getCaughtPokemon();
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y + LAYOUT.BUTTON_GAP * 3,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: 'Pokédex (' + caught.length + ')',
      text_size: 28,
      color: COLOR.WHITE,
      radius: 36,
      normal_color: COLOR.DARK_GRAY,
      press_color: COLOR.GRAY,
      click_func: () => {
        console.log('[Menu] Pokédex clicked');
        push({ url: 'pages/pokedex/index' });
      },
    });

    // Settings (gray, secondary)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y + LAYOUT.BUTTON_GAP * 4,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: 'Settings',
      text_size: 28,
      color: COLOR.WHITE,
      radius: 36,
      normal_color: COLOR.DARK_GRAY,
      press_color: COLOR.GRAY,
      click_func: () => {
        console.log('[Menu] Settings clicked');
        push({ url: 'pages/settings/index' });
      },
    });

    // How to Play (gray, secondary)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: CX - LAYOUT.BUTTON_WIDTH / 2,
      y: LAYOUT.BUTTON_START_Y + LAYOUT.BUTTON_GAP * 5,
      w: LAYOUT.BUTTON_WIDTH,
      h: LAYOUT.BUTTON_HEIGHT,
      text: 'How to Play',
      text_size: 28,
      color: COLOR.WHITE,
      radius: 36,
      normal_color: COLOR.DARK_GRAY,
      press_color: COLOR.GRAY,
      click_func: () => {
        console.log('[Menu] How to Play clicked');
        push({ url: 'pages/help/index' });
      },
    });

    // ========== VERSION ==========
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: LAYOUT.VERSION_Y,
      w: DEVICE_WIDTH,
      h: 32,
      text: 'v2.0.0',
      text_size: 24, // Larger version text
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    console.log('[Menu] onDestroy');
    offGesture();
  },
});
