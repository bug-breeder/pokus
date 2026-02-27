/**
 * Encounter Page - Minimal Clean Design
 * Pokemon catch minigame with animated pokeball
 *
 * Design: ZUI philosophy
 * - Pokemon name in type color + type badge
 * - Clean timing bar with larger cursor
 * - Animated bouncing pokeball (suggests swipe up)
 * - No instruction text - pokeball speaks for itself
 */

import hmUI from '@zos/ui';
import { replace } from '@zos/router';
import { getApp } from '@zos/app';
import {
  onKey,
  offKey,
  onGesture,
  offGesture,
  KEY_HOME,
  KEY_SELECT,
  KEY_SHORTCUT,
  KEY_EVENT_CLICK,
  GESTURE_UP,
} from '@zos/interaction';
import { DEVICE_WIDTH, DEVICE_HEIGHT, getGameConfig, getTypeColor } from '../../utils/constants';
import { getRandomPokemon, getPokemonById } from '../../utils/pokedex';
import { addCaughtPokemon, saveLastResult } from '../../utils/storage';

const CX = DEVICE_WIDTH / 2;

// =============================================================================
// DESIGN CONSTANTS
// =============================================================================

const COLORS = {
  bg: 0x000000,
  ring: 0xffd700,
  text: {
    primary: 0xffffff,
    secondary: 0xb8b8b8,
    muted: 0x8e8e93,
    success: 0x30d158,
    danger: 0xfa5151,
    shiny: 0xffd700,
  },
  timingBar: {
    bg: 0x2c2c2e,
    greenZone: 0x30d158,
    cursor: 0xffffff,
  },
};

const TYPOGRAPHY = {
  pokemonName: 34,
  shinyBadge: 22,
  feedback: 32,
};

// Layout
const SPRITE_SIZE = 240;
const SPRITE_Y = 70;

// Timing bar (cleaner design)
const BAR_WIDTH = 280;
const BAR_HEIGHT = 16;
const BAR_X = (DEVICE_WIDTH - BAR_WIDTH) / 2;
const BAR_Y = 365;
// These will be set in onInit from gameConfig
let GREEN_ZONE_WIDTH = 80; // Default, updated in onInit
const GREEN_ZONE_START = (BAR_WIDTH - GREEN_ZONE_WIDTH) / 2;
const CURSOR_WIDTH = 12;
const CURSOR_HEIGHT = 28;
let CURSOR_SPEED = 4; // Default, updated in onInit

// Pokeball (larger)
const POKEBALL_SIZE = 80;
const POKEBALL_BASE_Y = 400;
const BOUNCE_AMPLITUDE = 18;
const BOUNCE_SPEED = 0.006; // Bouncy!

const ANIM = {
  THROW_DURATION: 650,
  THROW_INTERVAL: 16,
  THROW_START_X: CX - POKEBALL_SIZE / 2,
  THROW_START_Y: POKEBALL_BASE_Y,
  THROW_END_X: CX - POKEBALL_SIZE / 2,
  THROW_END_Y: SPRITE_Y + SPRITE_SIZE / 2 - POKEBALL_SIZE / 2,
  THROW_ARC_HEIGHT: 50,
  SHAKE_INTERVAL: 16,
  SHAKE_COUNT: 3,
  SHAKE_DURATION: 400,
  SHAKE_PAUSE: 300,
  SHAKE_AMPLITUDE: 15,
};

// =============================================================================
// PAGE STATE
// =============================================================================

let state = {
  pokemon: null,
  isShiny: false,
  cursorX: 0,
  cursorDirection: 1,
  cursorTimerId: null,
  bounceTimerId: null,
  animTimerId: null,
  thrown: false,
  caught: false,
  bounceTime: 0,
  gameConfig: null, // Loaded on init
  // Widgets
  cursor: null,
  pokeball: null,
  pokemonImg: null,
  timingBarBg: null,
  greenZone: null,
  headerText: null,
};

function resetState() {
  state = {
    pokemon: null,
    isShiny: false,
    cursorX: 0,
    cursorDirection: 1,
    cursorTimerId: null,
    bounceTimerId: null,
    animTimerId: null,
    thrown: false,
    caught: false,
    bounceTime: 0,
    gameConfig: null,
    cursor: null,
    pokeball: null,
    pokemonImg: null,
    timingBarBg: null,
    greenZone: null,
    headerText: null,
  };
}

function clearTimers() {
  if (state.cursorTimerId) {
    clearInterval(state.cursorTimerId);
    state.cursorTimerId = null;
  }
  if (state.bounceTimerId) {
    clearInterval(state.bounceTimerId);
    state.bounceTimerId = null;
  }
  if (state.animTimerId) {
    clearInterval(state.animTimerId);
    state.animTimerId = null;
  }
}

// =============================================================================
// ANIMATIONS
// =============================================================================

function animateCursor() {
  if (state.thrown) return;

  state.cursorX += CURSOR_SPEED * state.cursorDirection;

  if (state.cursorX >= BAR_WIDTH - CURSOR_WIDTH) {
    state.cursorX = BAR_WIDTH - CURSOR_WIDTH;
    state.cursorDirection = -1;
  } else if (state.cursorX <= 0) {
    state.cursorX = 0;
    state.cursorDirection = 1;
  }

  if (state.cursor) {
    state.cursor.setProperty(hmUI.prop.X, BAR_X + state.cursorX);
  }
}

function animateBounce() {
  if (state.thrown) return;

  state.bounceTime += 16; // ~60fps

  // Smooth sine wave bounce (suggests upward motion)
  const bounceOffset = Math.sin(state.bounceTime * BOUNCE_SPEED) * BOUNCE_AMPLITUDE;

  if (state.pokeball) {
    state.pokeball.setProperty(hmUI.prop.Y, POKEBALL_BASE_Y - Math.abs(bounceOffset));
  }
}

function isInGreenZone() {
  return (
    state.cursorX >= GREEN_ZONE_START &&
    state.cursorX <= GREEN_ZONE_START + GREEN_ZONE_WIDTH - CURSOR_WIDTH
  );
}

function getCatchChance() {
  const config = state.gameConfig;
  if (isInGreenZone()) {
    const greenCenter = GREEN_ZONE_START + GREEN_ZONE_WIDTH / 2;
    const distFromCenter = Math.abs(state.cursorX + CURSOR_WIDTH / 2 - greenCenter);
    const maxDist = GREEN_ZONE_WIDTH / 2;
    const proximity = 1 - distFromCenter / maxDist;

    return (
      config.CATCH_CHANCE_GREEN_EDGE +
      (config.CATCH_CHANCE_GREEN - config.CATCH_CHANCE_GREEN_EDGE) * proximity
    );
  }
  return config.CATCH_CHANCE_MISS;
}

function easeOutQuad(t) {
  return t * (2 - t);
}

function animateThrow(onComplete) {
  const startTime = Date.now();
  const startY = state.pokeball ? POKEBALL_BASE_Y : ANIM.THROW_START_Y;

  state.animTimerId = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ANIM.THROW_DURATION, 1);
    const easedProgress = easeOutQuad(progress);

    const y = startY + (ANIM.THROW_END_Y - startY) * easedProgress;
    const arcOffset = Math.sin(progress * Math.PI) * ANIM.THROW_ARC_HEIGHT;
    const x = ANIM.THROW_START_X - arcOffset;

    if (state.pokeball) {
      state.pokeball.setProperty(hmUI.prop.X, x);
      state.pokeball.setProperty(hmUI.prop.Y, y);
    }

    if (progress >= 1) {
      clearInterval(state.animTimerId);
      state.animTimerId = null;

      if (state.pokemonImg) {
        state.pokemonImg.setProperty(hmUI.prop.VISIBLE, false);
      }

      onComplete();
    }
  }, ANIM.THROW_INTERVAL);
}

function animateShake(onComplete) {
  const baseX = ANIM.THROW_END_X;
  const cycleDuration = ANIM.SHAKE_DURATION + ANIM.SHAKE_PAUSE;
  const totalDuration = cycleDuration * ANIM.SHAKE_COUNT;
  const startTime = Date.now();

  state.animTimerId = setInterval(() => {
    const elapsed = Date.now() - startTime;

    if (elapsed >= totalDuration) {
      clearInterval(state.animTimerId);
      state.animTimerId = null;
      if (state.pokeball) {
        state.pokeball.setProperty(hmUI.prop.X, baseX);
      }
      onComplete();
      return;
    }

    const cycleElapsed = elapsed % cycleDuration;
    let offset = 0;

    if (cycleElapsed < ANIM.SHAKE_DURATION) {
      const shakeProgress = cycleElapsed / ANIM.SHAKE_DURATION;
      offset = Math.sin(shakeProgress * Math.PI * 2) * ANIM.SHAKE_AMPLITUDE;
    }

    if (state.pokeball) {
      state.pokeball.setProperty(hmUI.prop.X, baseX + offset);
    }
  }, ANIM.SHAKE_INTERVAL);
}

// =============================================================================
// THROW ACTION
// =============================================================================

function throwPokeball() {
  if (state.thrown) return;
  state.thrown = true;

  clearTimers();

  const catchChance = getCatchChance();
  state.caught = Math.random() < catchChance;
  console.log('[Encounter] Throw! Chance:', catchChance.toFixed(2), 'Caught:', state.caught);

  // Hide timing bar
  if (state.cursor) state.cursor.setProperty(hmUI.prop.VISIBLE, false);
  if (state.timingBarBg) state.timingBarBg.setProperty(hmUI.prop.VISIBLE, false);
  if (state.greenZone) state.greenZone.setProperty(hmUI.prop.VISIBLE, false);

  // Update header
  if (state.headerText) {
    state.headerText.setProperty(hmUI.prop.TEXT, '...');
    state.headerText.setProperty(hmUI.prop.COLOR, COLORS.text.secondary);
  }

  animateThrow(() => {
    animateShake(() => {
      if (state.caught && state.pokemon) {
        addCaughtPokemon(state.pokemon.id, state.isShiny);
      }

      saveLastResult(
        state.pokemon.id,
        state.pokemon.name,
        state.pokemon.typeId,
        state.pokemon.typeId2 || 0,
        state.isShiny,
        state.caught
      );

      if (state.headerText) {
        state.headerText.setProperty(hmUI.prop.TEXT, state.caught ? 'GOTCHA!' : 'So close...');
        state.headerText.setProperty(
          hmUI.prop.COLOR,
          state.caught ? COLORS.text.success : COLORS.text.danger
        );
        state.headerText.setProperty(hmUI.prop.TEXT_SIZE, TYPOGRAPHY.feedback);
      }

      setTimeout(() => {
        replace({ url: 'pages/result/index' });
      }, 500);
    });
  });
}

// =============================================================================
// PAGE
// =============================================================================

Page({
  onInit() {
    console.log('[Encounter] onInit');
    resetState();

    // Get game config based on current mode
    state.gameConfig = getGameConfig();

    // Update timing constants from config
    GREEN_ZONE_WIDTH = state.gameConfig.TIMING_GREEN_WIDTH;
    CURSOR_SPEED = state.gameConfig.TIMING_CURSOR_SPEED;

    let focusSeconds = 0;
    try {
      const app = getApp();
      if (app && app.globalData) {
        focusSeconds = app.globalData.sessionSeconds || 0;
      }
    } catch (e) {
      console.log('[Encounter] globalData error:', e);
    }

    state.pokemon = getRandomPokemon();

    const config = state.gameConfig;
    const shinyChance = Math.min(
      config.SHINY_BASE + (focusSeconds / 100) * config.SHINY_MAX,
      config.SHINY_MAX
    );
    state.isShiny = Math.random() < shinyChance;

    console.log('[Encounter] Pokemon:', state.pokemon.name, 'Shiny:', state.isShiny);
  },

  build() {
    console.log('[Encounter] build');

    if (!state.pokemon) {
      state.pokemon = getPokemonById(25) || getRandomPokemon();
    }

    const pokemon = state.pokemon;
    const typeColor = getTypeColor(pokemon.typeId);
    const hasDualType = pokemon.typeId2 > 0;

    // === Black background ===
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg,
    });

    // === Border ring (thinner) ===
    hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: 0,
      end_angle: 360,
      color: COLORS.ring,
      line_width: 4,
    });

    // === Pokemon name ===
    state.headerText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 20,
      w: DEVICE_WIDTH,
      h: 42,
      text: state.isShiny ? `★ ${pokemon.name}` : pokemon.name,
      text_size: TYPOGRAPHY.pokemonName,
      color: state.isShiny ? COLORS.text.shiny : typeColor,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    });

    // === Type badge(s) ===
    const typeY = 58;
    if (hasDualType) {
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - 78,
        y: typeY,
        w: 72,
        h: 28,
        src: 'raw/types/' + pokemon.typeId + '.png',
        auto_scale: true,
      });
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX + 6,
        y: typeY,
        w: 72,
        h: 28,
        src: 'raw/types/' + pokemon.typeId2 + '.png',
        auto_scale: true,
      });
    } else {
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - 36,
        y: typeY,
        w: 72,
        h: 28,
        src: 'raw/types/' + pokemon.typeId + '.png',
        auto_scale: true,
      });
    }

    // === Pokemon sprite ===
    state.pokemonImg = hmUI.createWidget(hmUI.widget.IMG, {
      x: CX - SPRITE_SIZE / 2,
      y: SPRITE_Y + 20,
      w: SPRITE_SIZE,
      h: SPRITE_SIZE,
      src: 'raw/pokemon/' + pokemon.id + '.png',
      auto_scale: true,
      auto_scale_obj_fit: 1,
    });

    // === Timing Bar ===
    state.timingBarBg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: BAR_X,
      y: BAR_Y,
      w: BAR_WIDTH,
      h: BAR_HEIGHT,
      radius: BAR_HEIGHT / 2,
      color: COLORS.timingBar.bg,
    });

    state.greenZone = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: BAR_X + GREEN_ZONE_START,
      y: BAR_Y,
      w: GREEN_ZONE_WIDTH,
      h: BAR_HEIGHT,
      radius: BAR_HEIGHT / 2,
      color: COLORS.timingBar.greenZone,
    });

    state.cursor = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: BAR_X,
      y: BAR_Y - 6,
      w: CURSOR_WIDTH,
      h: CURSOR_HEIGHT,
      radius: 6,
      color: COLORS.timingBar.cursor,
    });

    // === Pokeball (with bounce animation) ===
    state.pokeball = hmUI.createWidget(hmUI.widget.IMG, {
      x: ANIM.THROW_START_X,
      y: POKEBALL_BASE_Y,
      w: POKEBALL_SIZE,
      h: POKEBALL_SIZE,
      src: 'raw/pokeball.png',
      auto_scale: true,
    });

    // Start animations
    state.cursorTimerId = setInterval(animateCursor, state.gameConfig.TIMING_ANIM_INTERVAL);
    state.bounceTimerId = setInterval(animateBounce, 16); // ~60fps for smooth bounce

    // Register swipe up
    onGesture({
      callback: (gesture) => {
        if (gesture === GESTURE_UP) {
          console.log('[Encounter] Swipe UP!');
          throwPokeball();
          return true;
        }
        return false;
      },
    });

    // Register crown/button
    onKey({
      callback: (key, keyEvent) => {
        if (keyEvent === KEY_EVENT_CLICK) {
          if (key === KEY_HOME || key === KEY_SELECT || key === KEY_SHORTCUT) {
            console.log('[Encounter] Crown/Button!');
            throwPokeball();
            return true;
          }
        }
        return false;
      },
    });
  },

  onDestroy() {
    console.log('[Encounter] onDestroy');
    clearTimers();
    offGesture();
    offKey();
  },
});
