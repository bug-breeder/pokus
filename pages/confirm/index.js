/**
 * Confirmation Page - Destructive Action Style
 * Designed for circular 480x480 display
 * Stacked buttons with prominent destructive action
 */

import hmUI from '@zos/ui';
import { back, replace } from '@zos/router';
import { getApp } from '@zos/app';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../../utils/constants';
import { resetAllProgress } from '../../utils/storage';

const CX = DEVICE_WIDTH / 2;

const COLORS = {
  bg: 0x000000,
  text: {
    primary: 0xffffff,
    secondary: 0xaaaaaa, // Brighter gray for better readability
  },
  button: {
    cancel: 0x3a3a3c,
    cancelText: 0xffffff,
    destructive: 0xfa5151,
    destructiveText: 0xffffff,
  },
  icon: 0xffcc00, // Warning yellow
};

let params = {
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
  icon: null,
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDestructive: false,
  onConfirmAction: null,
};

Page({
  onInit(urlParams) {
    console.log('[Confirm] onInit, urlParams:', urlParams);

    // Reset to defaults
    params = {
      title: 'Are you sure?',
      message: 'This action cannot be undone.',
      icon: null,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      isDestructive: false,
      onConfirmAction: null,
    };

    // Parse URL params (passed as JSON string)
    if (urlParams) {
      try {
        const parsed = typeof urlParams === 'string' ? JSON.parse(urlParams) : urlParams;
        params = { ...params, ...parsed };
        console.log('[Confirm] Parsed params:', JSON.stringify(params));
      } catch (e) {
        console.log('[Confirm] Parse error:', e);
      }
    }
  },

  build() {
    console.log('[Confirm] build');

    // Black background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg,
    });

    // === Layout Constants ===
    const BUTTON_WIDTH = 300;
    const BUTTON_HEIGHT = 60;
    const BUTTON_RADIUS = 30;
    const BUTTON_GAP = 14;
    const ICON_SIZE = 56;

    // Calculate positions from bottom up
    // Buttons need to be within the visible circle area
    const destructiveBtnY = 350;
    const cancelBtnY = destructiveBtnY - BUTTON_HEIGHT - BUTTON_GAP; // 276

    // Content area above buttons
    const contentTop = 60;

    // === Top Content ===
    // Center content vertically between top safe area and buttons
    const availableHeight = cancelBtnY - 40 - contentTop; // Space for content
    const titleSize = 36;
    const messageSize = 26;
    const iconHeight = params.icon ? ICON_SIZE + 24 : 0;
    const textBlockHeight = 50 + 20 + 70; // title + gap + message
    const totalContentHeight = iconHeight + textBlockHeight;

    let currentY = contentTop + (availableHeight - totalContentHeight) / 2;

    // 1. Warning Icon (only if provided)
    if (params.icon) {
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - ICON_SIZE / 2,
        y: currentY,
        w: ICON_SIZE,
        h: ICON_SIZE,
        src: params.icon,
      });
      currentY += ICON_SIZE + 24;
    }

    // 2. Title - bold and clear
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 40,
      y: currentY,
      w: DEVICE_WIDTH - 80,
      h: 50,
      text: params.title,
      text_size: titleSize,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    currentY += 50 + 12;

    // 3. Message - readable secondary text
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 50,
      y: currentY,
      w: DEVICE_WIDTH - 100,
      h: 80,
      text: params.message,
      text_size: messageSize,
      color: COLORS.text.secondary,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP,
    });

    // === Buttons ===
    const btnX = CX - BUTTON_WIDTH / 2;

    // Cancel Button (gray, subtle)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: btnX,
      y: cancelBtnY,
      w: BUTTON_WIDTH,
      h: BUTTON_HEIGHT,
      radius: BUTTON_RADIUS,
      color: COLORS.button.cancel,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: btnX,
      y: cancelBtnY,
      w: BUTTON_WIDTH,
      h: BUTTON_HEIGHT,
      text: params.cancelText,
      text_size: 28,
      color: COLORS.button.cancelText,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    // Cancel touch area
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: btnX,
        y: cancelBtnY,
        w: BUTTON_WIDTH,
        h: BUTTON_HEIGHT,
        radius: BUTTON_RADIUS,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => this.handleResult(false));

    // Destructive Button (red, prominent)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: btnX,
      y: destructiveBtnY,
      w: BUTTON_WIDTH,
      h: BUTTON_HEIGHT,
      radius: BUTTON_RADIUS,
      color: COLORS.button.destructive,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: btnX,
      y: destructiveBtnY,
      w: BUTTON_WIDTH,
      h: BUTTON_HEIGHT,
      text: params.confirmText,
      text_size: 28,
      color: COLORS.button.destructiveText,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });
    // Destructive touch area
    hmUI
      .createWidget(hmUI.widget.FILL_RECT, {
        x: btnX,
        y: destructiveBtnY,
        w: BUTTON_WIDTH,
        h: BUTTON_HEIGHT,
        radius: BUTTON_RADIUS,
        color: 0x000000,
        alpha: 0,
      })
      .addEventListener(hmUI.event.CLICK_UP, () => this.handleResult(true));
  },

  handleResult(confirmed) {
    if (confirmed && params.onConfirmAction === 'reset_progress') {
      // Handle reset progress directly and go home
      console.log('[Confirm] Resetting progress...');
      resetAllProgress();
      console.log('[Confirm] Progress reset! Going home.');
      replace({ url: 'pages/home/index' });
      return;
    }

    // Default: go back to previous page
    try {
      const app = getApp();
      if (app?.globalData) {
        app.globalData.confirmResult = {
          confirmed,
          action: params.onConfirmAction,
        };
      }
    } catch (e) {
      console.log('[Confirm] Error:', e);
    }
    back();
  },

  onDestroy() {
    console.log('[Confirm] onDestroy');
  },
});
