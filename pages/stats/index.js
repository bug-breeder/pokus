/**
 * Stats Page
 * Weekly focus heatmap and total stats
 */

import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT, COLOR } from '../../utils/constants';
import {
  getWeeklyFocusData,
  getTotalFocusTime,
  getCoins,
  getCaughtPokemon,
} from '../../utils/storage';
import { getPokedex } from '../../utils/pokedex';

/**
 * Format seconds as compact duration
 * - Under 1h: "45m"
 * - 1-99h: "5h 30m" or "56h" (skip 0m)
 * - 100h+: "4d 5h" (days)
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  // 100+ hours: show days
  if (hours >= 100) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return days + 'd';
    return days + 'd ' + remainingHours + 'h';
  }

  // 1-99 hours
  if (hours > 0) {
    if (mins === 0) return hours + 'h';
    return hours + 'h ' + mins + 'm';
  }

  // Under 1 hour
  return mins + 'm';
}

/**
 * Format large numbers with K/M suffix
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num + '';
}

/**
 * Get heatmap color based on focus intensity
 * @param {number} seconds - Focus time in seconds
 * @param {number} maxSeconds - Max seconds in the week for scaling
 * @returns {number} Color hex
 */
function getHeatmapColor(seconds, maxSeconds) {
  if (seconds === 0) return 0x1a1a1a; // Dark gray for no activity

  // Calculate intensity (0-1)
  const intensity = Math.min(seconds / Math.max(maxSeconds, 1), 1);

  // Gradient from dark green to bright green
  if (intensity < 0.25) return 0x1a4d1a; // Very dark green
  if (intensity < 0.5) return 0x2d7a2d; // Dark green
  if (intensity < 0.75) return 0x3dad3d; // Medium green
  return COLOR.GREEN; // Bright green
}

Page({
  onInit() {
    console.log('[Stats] onInit');
  },

  build() {
    console.log('[Stats] build');

    const weeklyData = getWeeklyFocusData();
    const totalSeconds = getTotalFocusTime();
    const coins = getCoins();
    const caughtPokemon = getCaughtPokemon();
    const pokedex = getPokedex();
    const totalPokemon = pokedex.length;
    // Count caught Pokemon that are in current Pokedex (respects dev mode)
    const caughtInDex = caughtPokemon.filter((id) => pokedex.some((p) => p.id === id)).length;

    // Calculate this week's total
    let weeklyTotal = 0;
    let maxSeconds = 0;
    for (const day of weeklyData) {
      weeklyTotal += day.seconds;
      if (day.seconds > maxSeconds) maxSeconds = day.seconds;
    }

    // Black background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLOR.BG,
    });

    // This week total (main stat at top)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 25,
      w: DEVICE_WIDTH,
      h: 60,
      text: formatDuration(weeklyTotal),
      text_size: 52,
      color: COLOR.WHITE,
      align_h: hmUI.align.CENTER_H,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 85,
      w: DEVICE_WIDTH,
      h: 34,
      text: 'this week',
      text_size: 30,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });

    // All time and coins (above chart)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 20,
      y: 125,
      w: DEVICE_WIDTH / 2 - 20,
      h: 38,
      text: formatDuration(totalSeconds),
      text_size: 34,
      color: COLOR.WHITE,
      align_h: hmUI.align.CENTER_H,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 20,
      y: 163,
      w: DEVICE_WIDTH / 2 - 20,
      h: 28,
      text: 'all time',
      text_size: 24,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: DEVICE_WIDTH / 2,
      y: 125,
      w: DEVICE_WIDTH / 2 - 20,
      h: 38,
      text: formatNumber(coins),
      text_size: 34,
      color: COLOR.YELLOW,
      align_h: hmUI.align.CENTER_H,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: DEVICE_WIDTH / 2,
      y: 163,
      w: DEVICE_WIDTH / 2 - 20,
      h: 28,
      text: 'coins',
      text_size: 24,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });

    // Heatmap grid (7 days)
    const boxSize = 58;
    const gap = 4;
    const totalWidth = 7 * boxSize + 6 * gap;
    const startX = (DEVICE_WIDTH - totalWidth) / 2;
    const heatmapY = 200;

    for (let i = 0; i < weeklyData.length; i++) {
      const day = weeklyData[i];
      const x = startX + i * (boxSize + gap);

      // Day box (heatmap cell)
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: x,
        y: heatmapY,
        w: boxSize,
        h: boxSize,
        radius: 12,
        color: getHeatmapColor(day.seconds, maxSeconds),
      });

      // Day label
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: x,
        y: heatmapY + boxSize + 4,
        w: boxSize,
        h: 26,
        text: day.day,
        text_size: 22,
        color: i === 6 ? COLOR.GREEN : COLOR.GRAY, // Highlight today
        align_h: hmUI.align.CENTER_H,
      });

      // Time label (if has data) - show hours if >= 100 mins
      if (day.seconds > 0) {
        const mins = Math.floor(day.seconds / 60);
        let label = mins + '';
        if (mins >= 100) {
          const hours = Math.floor(mins / 60);
          label = hours + 'h';
        }
        hmUI.createWidget(hmUI.widget.TEXT, {
          x: x,
          y: heatmapY + 17,
          w: boxSize,
          h: 28,
          text: label,
          text_size: mins >= 100 ? 22 : 26, // Smaller font for "Xh" format
          color: COLOR.WHITE,
          align_h: hmUI.align.CENTER_H,
        });
      }
    }

    // Legend
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: heatmapY + boxSize + 34,
      w: DEVICE_WIDTH,
      h: 28,
      text: 'focus time per day',
      text_size: 24,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });

    // Pokemon collected (below chart)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 350,
      w: DEVICE_WIDTH,
      h: 54,
      text: caughtInDex + ' / ' + totalPokemon,
      text_size: 48,
      color: COLOR.WHITE,
      align_h: hmUI.align.CENTER_H,
    });

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 404,
      w: DEVICE_WIDTH,
      h: 32,
      text: 'Pokémon collected',
      text_size: 28,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    console.log('[Stats] onDestroy');
  },
});
