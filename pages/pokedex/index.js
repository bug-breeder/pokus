/**
 * Pokédex Screen - Using SCROLL_LIST for Performance
 * 
 * ZUI Design Philosophy:
 * - Natural, Simple, Symbiotic
 * - Proper typography (min 24px)
 * - Touch-friendly targets
 * - Efficient rendering with SCROLL_LIST virtualization
 * 
 * Features:
 * - Filter tabs: ALL | CAUGHT
 * - 151 Gen 1 Pokemon
 * - Type badges, shiny indicators
 */

import hmUI, { createWidget, widget, prop } from '@zos/ui'
import { push } from '@zos/router'
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../../utils/constants'
import { getCaughtPokemon, getShinyPokemon } from '../../utils/storage'
import { getPokedex, getPokemonById } from '../../utils/pokedex'

// ============================================================================
// ZUI Design Tokens
// ============================================================================

const COLORS = {
  bg: 0x000000,
  card: {
    caught: 0x1C1C1E,
    uncaught: 0x0A0A0A,
  },
  text: {
    primary: 0xFFFFFF,
    secondary: 0xB8B8B8,
    caption: 0x8E8E93,
    uncaught: 0x3A3A3A,
  },
  accent: {
    gold: 0xFFD700,
    green: 0x30D158,
  },
  tab: {
    active: 0x30D158,
    inactive: 0x3A3A3C,
    textActive: 0xFFFFFF,
    textInactive: 0x8E8E93,
  }
}

const TYPOGRAPHY = {
  title: 36,
  tab: 24,
  name: 32,
  number: 28,
  caption: 22,
}

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
}

// ============================================================================
// Layout Constants
// ============================================================================

const CX = DEVICE_WIDTH / 2

// Header with tabs
const HEADER_HEIGHT = 140
const LIST_Y = HEADER_HEIGHT
const LIST_HEIGHT = DEVICE_HEIGHT - HEADER_HEIGHT

// Tab dimensions
const TAB_WIDTH = 120
const TAB_HEIGHT = 40
const TAB_GAP = 10
const TAB_Y = 58

// Item dimensions
const ITEM_HEIGHT = 145
const ITEM_MARGIN = 50
const ITEM_WIDTH = DEVICE_WIDTH - (ITEM_MARGIN * 2)
const ITEM_RADIUS = 24

// Sprite
const SPRITE_SIZE = 96
const SPRITE_X = 12
const SPRITE_Y = 22

// Text area
const TEXT_X = SPRITE_X + SPRITE_SIZE + SPACING.md

// Type badge (3x)
const TYPE_W = 96
const TYPE_H = 36

// ============================================================================
// Page State
// ============================================================================

let state = {
  caughtIds: [],
  shinyIds: [],
  filterMode: 'all', // 'all' | 'caught'
  scrollList: null,
  filteredData: [],
  filteredPokemonIds: [], // Track Pokemon IDs in current filter for click handling
  tabAll: null,
  tabCaught: null,
  tabAllBg: null,
  tabCaughtBg: null,
  countText: null,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build data array for SCROLL_LIST
 */
function buildDataArray(caughtIds, shinyIds, filterMode) {
  const pokedex = getPokedex()  // Respects dev mode (20 vs 151 Pokemon)
  let pokemonList = pokedex
  
  // Filter to only caught if in 'caught' mode
  if (filterMode === 'caught') {
    pokemonList = pokedex.filter(p => caughtIds.includes(p.id))
  }
  
  return pokemonList.map(pokemon => {
    const isCaught = caughtIds.includes(pokemon.id)
    const isShiny = shinyIds.includes(pokemon.id)
    const numStr = '#' + String(pokemon.id).padStart(3, '0')
    const hasDualType = pokemon.typeId2 > 0
    
    return {
      id: pokemon.id,
      name: isCaught ? pokemon.name : '???',
      number: numStr,
      sprite: isCaught ? `raw/pokemon/${pokemon.id}.png` : 'raw/pokemon/0.png',
      typeImg1: `raw/types/3x/${pokemon.typeId}.png`,
      typeImg2: hasDualType ? `raw/types/3x/${pokemon.typeId2}.png` : '',
      caught: isCaught,
      shiny: isShiny,
      shinyText: isShiny ? '★' : '',
      hasDualType: hasDualType,
    }
  })
}

/**
 * Get Pokemon IDs from filtered list
 */
function getFilteredPokemonIds(caughtIds, filterMode) {
  const pokedex = getPokedex()
  if (filterMode === 'caught') {
    return pokedex.filter(p => caughtIds.includes(p.id)).map(p => p.id)
  }
  return pokedex.map(p => p.id)
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit() {
    console.log('[Pokedex] onInit')
    state.caughtIds = getCaughtPokemon()
    state.shinyIds = getShinyPokemon()
    state.filterMode = 'all'
    console.log('[Pokedex] Caught:', state.caughtIds.length, 'Shiny:', state.shinyIds.length)
  },

  build() {
    console.log('[Pokedex] build')

    const pokedex = getPokedex()
    const totalPokemon = pokedex.length
    const caughtCount = state.caughtIds.filter(id => pokedex.some(p => p.id === id)).length

    // ========== BACKGROUND ==========
    createWidget(widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg
    })

    // ========== HEADER ==========
    // Title
    createWidget(widget.TEXT, {
      x: 0,
      y: 8,
      w: DEVICE_WIDTH,
      h: 44,
      text: 'Pokédex',
      text_size: TYPOGRAPHY.title,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })

    // ========== FILTER TABS ==========
    const tabAllX = CX - TAB_WIDTH - TAB_GAP / 2
    const tabCaughtX = CX + TAB_GAP / 2

    // ALL tab background
    state.tabAllBg = createWidget(widget.FILL_RECT, {
      x: tabAllX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      radius: TAB_HEIGHT / 2,
      color: COLORS.tab.active
    })

    // ALL tab text
    state.tabAll = createWidget(widget.TEXT, {
      x: tabAllX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      text: 'ALL',
      text_size: TYPOGRAPHY.tab,
      color: COLORS.tab.textActive,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    // ALL tab touch area
    createWidget(widget.FILL_RECT, {
      x: tabAllX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      radius: TAB_HEIGHT / 2,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      this.setFilter('all')
    })

    // CAUGHT tab background
    state.tabCaughtBg = createWidget(widget.FILL_RECT, {
      x: tabCaughtX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      radius: TAB_HEIGHT / 2,
      color: COLORS.tab.inactive
    })

    // CAUGHT tab text
    state.tabCaught = createWidget(widget.TEXT, {
      x: tabCaughtX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      text: 'CAUGHT',
      text_size: TYPOGRAPHY.tab,
      color: COLORS.tab.textInactive,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    // CAUGHT tab touch area
    createWidget(widget.FILL_RECT, {
      x: tabCaughtX,
      y: TAB_Y,
      w: TAB_WIDTH,
      h: TAB_HEIGHT,
      radius: TAB_HEIGHT / 2,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      this.setFilter('caught')
    })

    // Count text (below tabs)
    state.countText = createWidget(widget.TEXT, {
      x: 0,
      y: TAB_Y + TAB_HEIGHT + 6,
      w: DEVICE_WIDTH,
      h: 24,
      text: `${caughtCount} / ${totalPokemon}`,
      text_size: TYPOGRAPHY.caption,
      color: COLORS.text.caption,
      align_h: hmUI.align.CENTER_H
    })

    // ========== SCROLL_LIST ==========
    this.buildScrollList()
  },

  /**
   * Build or rebuild the scroll list with current filter
   */
  buildScrollList() {
    const dataList = buildDataArray(state.caughtIds, state.shinyIds, state.filterMode)
    state.filteredData = dataList
    state.filteredPokemonIds = getFilteredPokemonIds(state.caughtIds, state.filterMode)

    // If scroll list exists, update data
    if (state.scrollList) {
      state.scrollList.setProperty(prop.UPDATE_DATA, {
        data_type_config: this.buildTypeConfig(dataList),
        data_type_config_count: this.buildTypeConfig(dataList).length,
        data_array: dataList,
        data_count: dataList.length,
        on_page: 0 // Return to top
      })
      return
    }

    // Create new scroll list
    state.scrollList = createWidget(widget.SCROLL_LIST, {
      x: ITEM_MARGIN,
      y: LIST_Y,
      w: ITEM_WIDTH,
      h: LIST_HEIGHT,
      item_space: SPACING.sm,
      snap_to_center: true,
      
      item_config: [
        // Type 1: Caught Pokemon
        {
          type_id: 1,
          item_height: ITEM_HEIGHT,
          item_bg_color: COLORS.card.caught,
          item_bg_radius: ITEM_RADIUS,
          
          image_view: [
            {
              x: SPRITE_X,
              y: SPRITE_Y,
              w: SPRITE_SIZE,
              h: SPRITE_SIZE,
              key: 'sprite',
              action: true
            },
            {
              x: TEXT_X,
              y: 24,
              w: TYPE_W,
              h: TYPE_H,
              key: 'typeImg1',
            },
            {
              x: TEXT_X + TYPE_W + 6,
              y: 24,
              w: TYPE_W,
              h: TYPE_H,
              key: 'typeImg2',
            }
          ],
          image_view_count: 3,
          
          text_view: [
            {
              x: TEXT_X,
              y: 80,
              w: 70,
              h: 40,
              key: 'number',
              color: COLORS.text.caption,
              text_size: TYPOGRAPHY.number,
            },
            {
              x: TEXT_X + 65,
              y: 80,
              w: ITEM_WIDTH - TEXT_X - 80,
              h: 40,
              key: 'name',
              color: COLORS.text.primary,
              text_size: TYPOGRAPHY.name,
              action: true
            },
            {
              x: ITEM_WIDTH - 30,
              y: 80,
              w: 28,
              h: 40,
              key: 'shinyText',
              color: COLORS.accent.gold,
              text_size: TYPOGRAPHY.name,
            }
          ],
          text_view_count: 3,
        },
        
        // Type 2: Uncaught Pokemon
        {
          type_id: 2,
          item_height: ITEM_HEIGHT,
          item_bg_color: COLORS.card.uncaught,
          item_bg_radius: ITEM_RADIUS,
          
          image_view: [
            {
              x: SPRITE_X,
              y: SPRITE_Y,
              w: SPRITE_SIZE,
              h: SPRITE_SIZE,
              key: 'sprite',
            },
            {
              x: TEXT_X,
              y: 24,
              w: TYPE_W,
              h: TYPE_H,
              key: 'typeImg1',
            },
            {
              x: TEXT_X + TYPE_W + 6,
              y: 24,
              w: TYPE_W,
              h: TYPE_H,
              key: 'typeImg2',
            }
          ],
          image_view_count: 3,
          
          text_view: [
            {
              x: TEXT_X,
              y: 80,
              w: 70,
              h: 40,
              key: 'number',
              color: COLORS.text.uncaught,
              text_size: TYPOGRAPHY.number,
            },
            {
              x: TEXT_X + 65,
              y: 80,
              w: ITEM_WIDTH - TEXT_X - 80,
              h: 40,
              key: 'name',
              color: COLORS.text.uncaught,
              text_size: TYPOGRAPHY.name,
            },
            {
              x: ITEM_WIDTH - 30,
              y: 80,
              w: 28,
              h: 40,
              key: 'shinyText',
              color: COLORS.card.uncaught,
              text_size: TYPOGRAPHY.name,
            }
          ],
          text_view_count: 3,
        }
      ],
      item_config_count: 2,
      
      data_type_config: this.buildTypeConfig(dataList),
      data_type_config_count: this.buildTypeConfig(dataList).length,
      
      data_array: dataList,
      data_count: dataList.length,
      
      item_click_func: (list, index, data_key) => {
        console.log('[Pokedex] Click:', index, data_key)
        const pokemonId = state.filteredPokemonIds[index]
        if (pokemonId && state.caughtIds.includes(pokemonId)) {
          this.navigateToDetail(pokemonId)
        }
      },
      
      item_focus_change_func: (list, index, focus) => {
        if (focus) {
          console.log('[Pokedex] Focus:', index)
        }
      }
    })
  },

  /**
   * Set filter mode and update UI
   */
  setFilter(mode) {
    if (state.filterMode === mode) return
    
    console.log('[Pokedex] Filter:', mode)
    state.filterMode = mode

    // Update tab styles
    const pokedex = getPokedex()
    const caughtInDex = state.caughtIds.filter(id => pokedex.some(p => p.id === id)).length
    if (mode === 'all') {
      state.tabAllBg.setProperty(prop.COLOR, COLORS.tab.active)
      state.tabAll.setProperty(prop.COLOR, COLORS.tab.textActive)
      state.tabCaughtBg.setProperty(prop.COLOR, COLORS.tab.inactive)
      state.tabCaught.setProperty(prop.COLOR, COLORS.tab.textInactive)
      state.countText.setProperty(prop.TEXT, `${caughtInDex} / ${pokedex.length}`)
    } else {
      state.tabAllBg.setProperty(prop.COLOR, COLORS.tab.inactive)
      state.tabAll.setProperty(prop.COLOR, COLORS.tab.textInactive)
      state.tabCaughtBg.setProperty(prop.COLOR, COLORS.tab.active)
      state.tabCaught.setProperty(prop.COLOR, COLORS.tab.textActive)
      state.countText.setProperty(prop.TEXT, `${caughtInDex} caught`)
    }

    // Rebuild list with new filter
    this.buildScrollList()
  },

  /**
   * Build type configuration for caught/uncaught states
   */
  buildTypeConfig(dataList) {
    if (dataList.length === 0) return []
    
    const configs = []
    let currentType = dataList[0]?.caught ? 1 : 2
    let startIdx = 0

    for (let i = 1; i <= dataList.length; i++) {
      const itemType = (i < dataList.length && dataList[i].caught) ? 1 : 2
      
      if (i === dataList.length || itemType !== currentType) {
        configs.push({
          start: startIdx,
          end: i - 1,
          type_id: currentType
        })
        startIdx = i
        currentType = itemType
      }
    }

    return configs
  },

  navigateToDetail(pokemonId) {
    console.log('[Pokedex] Navigate to detail:', pokemonId)
    push({ 
      url: 'pages/pokedex-detail/index',
      params: JSON.stringify({ id: pokemonId })
    })
  },

  onDestroy() {
    console.log('[Pokedex] onDestroy')
    state = {
      caughtIds: [],
      shinyIds: [],
      filterMode: 'all',
      scrollList: null,
      filteredData: [],
      filteredPokemonIds: [],
      tabAll: null,
      tabCaught: null,
      tabAllBg: null,
      tabCaughtBg: null,
      countText: null,
    }
  }
})
