/**
 * How to Play - Help Screen
 * Following ZUI Design Philosophy
 * - Natural, Simple, Symbiotic
 * - Card-based layout
 * - Proper typography (min 24px)
 */

import hmUI from '@zos/ui';
import { DEVICE_WIDTH } from '../../utils/constants';

// ZUI Design Tokens
const COLORS = {
  bg: 0x000000,
  card: 0x1c1c1e,
  title: 0xffffff,
  heading: 0xffd700, // Pokemon yellow accent
  text: 0xb8b8b8,
  muted: 0x8e8e93,
};

// ZUI Typography (larger for readability)
const TYPOGRAPHY = {
  largeTitle: 40,
  title: 34,
  body: 30,
  caption: 26,
};

// ZUI Spacing (larger padding)
const SPACING = {
  cardMargin: 45,
  cardPadding: 24,
  itemGap: 20,
};

const CARD_WIDTH = DEVICE_WIDTH - SPACING.cardMargin * 2;

// Help content - numbered steps with colors
const TIPS = [
  {
    num: '1',
    title: 'Start Focus',
    desc: 'Tap the green button to begin your focus timer',
    color: 0x30d158,
  },
  { num: '2', title: 'Earn Coins', desc: '1 coin per second of focus time', color: 0xffd700 },
  {
    num: '3',
    title: 'Catch Pokémon',
    desc: 'Focus 5+ seconds to encounter a wild Pokémon',
    color: 0xff6b6b,
  },
  {
    num: '4',
    title: 'Build Collection',
    desc: 'View your Pokédex and stats in the menu',
    color: 0x0a84ff,
  },
  { num: '5', title: 'Set Goals', desc: 'Customize daily goals in Settings', color: 0xff9500 },
];

Page({
  onInit() {
    console.log('[Help] onInit');
  },

  build() {
    console.log('[Help] build');

    // Calculate content height
    const headerHeight = 100;
    const cardHeight = 145; // Taller cards for larger text
    const totalHeight = headerHeight + TIPS.length * (cardHeight + SPACING.itemGap) + 80;

    // Background (extended for scroll)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: totalHeight,
      color: COLORS.bg,
    });

    let currentY = 45;

    // Page title
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: currentY,
      w: DEVICE_WIDTH,
      h: 50,
      text: 'How to Play',
      text_size: TYPOGRAPHY.largeTitle,
      color: COLORS.title,
      align_h: hmUI.align.CENTER_H,
    });
    currentY += 70;

    // Tips as cards (no icons, just numbered)
    TIPS.forEach((tip) => {
      // Card background
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: SPACING.cardMargin,
        y: currentY,
        w: CARD_WIDTH,
        h: cardHeight,
        radius: 20,
        color: COLORS.card,
      });

      // Title with number (colored)
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: SPACING.cardMargin + SPACING.cardPadding,
        y: currentY + 10,
        w: CARD_WIDTH - SPACING.cardPadding * 2,
        h: 40,
        text: `${tip.num}. ${tip.title}`,
        text_size: TYPOGRAPHY.body,
        color: tip.color,
        align_h: hmUI.align.LEFT,
      });

      // Description
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: SPACING.cardMargin + SPACING.cardPadding,
        y: currentY + 54,
        w: CARD_WIDTH - SPACING.cardPadding * 2,
        h: 80,
        text: tip.desc,
        text_size: TYPOGRAPHY.caption,
        color: COLORS.text,
        align_h: hmUI.align.LEFT,
        text_style: hmUI.text_style.WRAP,
      });

      currentY += cardHeight + SPACING.itemGap;
    });

    // Footer hint
    currentY += 10;
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: currentY,
      w: DEVICE_WIDTH,
      h: 30,
      text: 'Swipe down to return',
      text_size: TYPOGRAPHY.caption,
      color: COLORS.muted,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    console.log('[Help] onDestroy');
  },
});
