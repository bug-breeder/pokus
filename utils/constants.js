/**
 * Pokus Constants
 * Screen dimensions, colors, and game settings for Amazfit Balance (480x480)
 */

import { isDevMode } from './storage'

// =============================================================================
// DEVICE
// =============================================================================

export const DEVICE_WIDTH = 480
export const DEVICE_HEIGHT = 480

// =============================================================================
// COLORS
// =============================================================================

export const COLOR = {
  // Base colors
  BG: 0x000000,           // Pure black (OLED power saving)
  WHITE: 0xFFFFFF,
  GRAY: 0x666666,
  DARK_GRAY: 0x333333,
  
  // Game Boy theme
  GREEN: 0x9BBC0F,        // Primary accent
  DARK_GREEN: 0x306230,   // Secondary
  
  // Pokemon theme
  YELLOW: 0xFFCB05,       // Coins, highlights
  RED: 0xEE1515,          // Poke Ball, danger
  BLUE: 0x3B4CCA,         // Water type
  PURPLE: 0x9C27B0        // Ghost type
}

// Pokemon type colors (official palette)
// Keys match PokeAPI type IDs and sprite filenames in raw/types/ folder
export const TYPE_COLOR = {
  1: 0xA8A878,   // Normal
  2: 0xC03028,   // Fighting
  3: 0xA890F0,   // Flying
  4: 0xA040A0,   // Poison
  5: 0xE0C068,   // Ground
  6: 0xB8A038,   // Rock
  7: 0xA8B820,   // Bug
  8: 0x705898,   // Ghost
  9: 0xB8B8D0,   // Steel
  10: 0xF08030,  // Fire
  11: 0x6890F0,  // Water
  12: 0x78C850,  // Grass
  13: 0xF8D030,  // Electric
  14: 0xF85888,  // Psychic
  15: 0x98D8D8,  // Ice
  16: 0x7038F8,  // Dragon
  17: 0x705848,  // Dark
  18: 0xEE99AC   // Fairy
}

/**
 * Get color for a Pokemon type
 * @param {number} typeId - PokeAPI type ID (1-18)
 * @returns {number} Hex color value
 */
export function getTypeColor(typeId) {
  return TYPE_COLOR[typeId] || COLOR.WHITE
}

// =============================================================================
// FLOWMODORO SETTINGS
// =============================================================================

// Available ratio options (focus:break)
export const FLOW_RATIO_OPTIONS = [3, 4, 5, 6]

// Minimum break time in seconds (if calculated break < this, skip break)
export const MIN_BREAK_TIME = 30

// =============================================================================
// GAME SETTINGS
// =============================================================================

// Base game config (shared settings)
const GAME_BASE = {
  // Timing bar catch mechanics
  CATCH_CHANCE_GREEN: 0.9,   // Max catch rate in green zone center
  CATCH_CHANCE_GREEN_EDGE: 0.7, // Catch rate at green zone edges
  CATCH_CHANCE_MISS: 0.3,    // Catch rate outside green zone
  
  // Timing bar dimensions
  TIMING_BAR_WIDTH: 320,
  TIMING_BAR_HEIGHT: 16,
  TIMING_GREEN_WIDTH: 80,    // Width of green zone
  TIMING_CURSOR_WIDTH: 8,
  TIMING_CURSOR_SPEED: 4,    // Pixels per frame
  TIMING_ANIM_INTERVAL: 20,  // ms between cursor updates
  
  // Pokeball animation
  POKEBALL_ANIM_SPEED: 12,   // Pixels per frame when thrown
  POKEBALL_ANIM_INTERVAL: 25, // ms between animation frames
  
  // Shiny chance
  SHINY_BASE: 0.01,          // Base shiny chance (1%)
  SHINY_MAX: 0.25            // Max shiny chance at 100+ seconds
}

// Normal mode config
const GAME_NORMAL = {
  ...GAME_BASE,
  ENCOUNTER_THRESHOLD: 300,  // 5 minutes (300 seconds) to trigger encounter
  COINS_PER_BLOCK: 1,        // 1 coin per 5-minute block completed
}

// Developer mode config (faster testing)
const GAME_DEV = {
  ...GAME_BASE,
  ENCOUNTER_THRESHOLD: 1,    // 1 second for quick testing
  COINS_PER_BLOCK: 1,        // Same coin rate
}

/**
 * Get game configuration based on current mode
 * @returns {Object} Game config object
 */
export function getGameConfig() {
  return isDevMode() ? GAME_DEV : GAME_NORMAL
}

// Legacy export for backwards compatibility (uses normal config)
// NOTE: Prefer getGameConfig() for dynamic mode support
export const GAME = GAME_NORMAL
