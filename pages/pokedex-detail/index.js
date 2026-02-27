/**
 * Pokémon Detail Page
 * Full-screen view of a single Pokémon (matches Result page style)
 * Following ZUI Design Philosophy and ZeppOS principles
 */

import hmUI from '@zos/ui'
import { DEVICE_WIDTH, DEVICE_HEIGHT, COLOR, getTypeColor } from '../../utils/constants'
import { getCaughtPokemon, getShinyPokemon } from '../../utils/storage'
import { getPokedex, getPokemonById } from '../../utils/pokedex'

const CX = DEVICE_WIDTH / 2

// ============================================================================
// Page State
// ============================================================================

let state = {
  pokemon: null,
  pokemonIndex: -1,
  isShiny: false,
  caughtIds: [],
  shinyIds: [],
  widgets: [],  // Track widgets for cleanup
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit(params) {
    console.log('[PokedexDetail] onInit, params:', params, 'type:', typeof params)
    
    // Load caught data
    state.caughtIds = getCaughtPokemon()
    state.shinyIds = getShinyPokemon()
    
    // Parse params if it's a string (ZeppOS quirk)
    let parsedParams = params
    if (typeof params === 'string') {
      try {
        parsedParams = JSON.parse(params)
        console.log('[PokedexDetail] Parsed params:', parsedParams)
      } catch (e) {
        console.log('[PokedexDetail] Failed to parse params:', e)
      }
    }
    
    // Get Pokemon ID from URL params
    if (parsedParams && parsedParams.id !== undefined) {
      const pokemonId = parsedParams.id
      const pokedex = getPokedex()
      state.pokemon = getPokemonById(pokemonId)
      state.pokemonIndex = pokedex.findIndex(p => p.id === pokemonId)
      state.isShiny = state.shinyIds.includes(pokemonId)
      console.log('[PokedexDetail] Pokemon:', state.pokemon?.name, 'Index:', state.pokemonIndex)
    } else {
      console.log('[PokedexDetail] No id in params')
    }
  },

  build() {
    console.log('[PokedexDetail] build')
    this.renderPokemon()
  },

  /**
   * Render the current Pokemon (can be called multiple times)
   */
  renderPokemon() {
    // Clear existing widgets
    this.clearWidgets()

    if (!state.pokemon) {
      this.buildErrorState()
      return
    }

    const pokemon = state.pokemon
    const typeColor = getTypeColor(pokemon.typeId)
    const hasDualType = pokemon.typeId2 > 0

    // Black background
    state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLOR.BG
    }))

    // Border ring (type color) - at screen edge
    state.widgets.push(hmUI.createWidget(hmUI.widget.ARC, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: 0,
      end_angle: 360,
      color: typeColor,
      line_width: 5
    }))

    // Header - Shiny indicator or Pokemon number
    state.widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 22,
      w: DEVICE_WIDTH,
      h: 32,
      text: state.isShiny ? '★ SHINY ★' : '#' + String(pokemon.id).padStart(3, '0'),
      text_size: 26,
      color: state.isShiny ? COLOR.YELLOW : COLOR.GRAY,
      align_h: hmUI.align.CENTER_H
    }))

    // Pokemon name
    state.widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 52,
      w: DEVICE_WIDTH,
      h: 36,
      text: pokemon.name.toUpperCase(),
      text_size: 30,
      color: COLOR.WHITE,
      align_h: hmUI.align.CENTER_H
    }))

    // Pokemon sprite (300x300)
    state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
      x: CX - 150,
      y: 85,
      w: 300,
      h: 300,
      src: 'raw/pokemon/' + pokemon.id + '.png',
      auto_scale: true,
      auto_scale_obj_fit: 1
    }))

    // Type sprites
    if (hasDualType) {
      state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - 80,
        y: 385,
        w: 75,
        h: 30,
        src: 'raw/types/' + pokemon.typeId + '.png',
        auto_scale: true
      }))
      state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: CX + 5,
        y: 385,
        w: 75,
        h: 30,
        src: 'raw/types/' + pokemon.typeId2 + '.png',
        auto_scale: true
      }))
    } else {
      state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - 38,
        y: 385,
        w: 75,
        h: 30,
        src: 'raw/types/' + pokemon.typeId + '.png',
        auto_scale: true
      }))
    }

    // Position indicator
    const caughtCount = state.caughtIds.length
    const currentCaughtIndex = state.caughtIds.indexOf(state.pokemon.id) + 1
    
    state.widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 420,
      w: DEVICE_WIDTH,
      h: 26,
      text: `${currentCaughtIndex} of ${caughtCount}`,
      text_size: 22,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H
    }))

    // Navigation buttons
    this.buildNavigation()
  },

  /**
   * Clear all widgets
   */
  clearWidgets() {
    state.widgets.forEach(w => {
      hmUI.deleteWidget(w)
    })
    state.widgets = []
  },

  /**
   * Build previous/next navigation buttons
   */
  buildNavigation() {
    const btnSize = 64
    const iconSize = 32
    const btnY = DEVICE_HEIGHT / 2 - btnSize / 2

    // Get adjacent caught Pokemon
    const prevPokemon = this.getAdjacentCaughtPokemon(-1)
    const nextPokemon = this.getAdjacentCaughtPokemon(1)

    // Previous button (left side) - inside the ring
    if (prevPokemon) {
      const prevX = 22
      
      state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: prevX,
        y: btnY,
        w: btnSize,
        h: btnSize,
        radius: btnSize / 2,
        color: COLOR.DARK_GRAY
      }))
      
      state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: prevX + (btnSize - iconSize) / 2,
        y: btnY + (btnSize - iconSize) / 2,
        w: iconSize,
        h: iconSize,
        src: 'raw/icons/chevron-left.png',
        auto_scale: true
      }))

      // Touch area
      state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: prevX - 10,
        y: btnY - 10,
        w: btnSize + 20,
        h: btnSize + 20,
        color: 0x000000,
        alpha: 0
      }).addEventListener(hmUI.event.CLICK_UP, () => {
        this.navigateToPokemon(prevPokemon)
      }))
    }

    // Next button (right side) - inside the ring
    if (nextPokemon) {
      const nextX = DEVICE_WIDTH - 22 - btnSize
      
      state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: nextX,
        y: btnY,
        w: btnSize,
        h: btnSize,
        radius: btnSize / 2,
        color: COLOR.DARK_GRAY
      }))
      
      state.widgets.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: nextX + (btnSize - iconSize) / 2,
        y: btnY + (btnSize - iconSize) / 2,
        w: iconSize,
        h: iconSize,
        src: 'raw/icons/chevron-right.png',
        auto_scale: true
      }))

      // Touch area
      state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: nextX - 10,
        y: btnY - 10,
        w: btnSize + 20,
        h: btnSize + 20,
        color: 0x000000,
        alpha: 0
      }).addEventListener(hmUI.event.CLICK_UP, () => {
        this.navigateToPokemon(nextPokemon)
      }))
    }
  },

  /**
   * Get adjacent caught Pokemon (for prev/next navigation)
   */
  getAdjacentCaughtPokemon(direction) {
    if (!state.pokemon) return null
    
    const currentId = state.pokemon.id
    const caughtIndex = state.caughtIds.indexOf(currentId)
    
    if (caughtIndex === -1) return null
    
    const newIndex = caughtIndex + direction
    if (newIndex < 0 || newIndex >= state.caughtIds.length) return null
    
    const newId = state.caughtIds[newIndex]
    return getPokemonById(newId)
  },

  /**
   * Navigate to another Pokemon (no page transition, just redraw)
   */
  navigateToPokemon(pokemon) {
    console.log('[PokedexDetail] Switch to:', pokemon.name)
    
    // Update state
    const pokedex = getPokedex()
    state.pokemon = pokemon
    state.pokemonIndex = pokedex.findIndex(p => p.id === pokemon.id)
    state.isShiny = state.shinyIds.includes(pokemon.id)
    
    // Redraw the page
    this.renderPokemon()
  },

  /**
   * Build error state when no Pokemon data
   */
  buildErrorState() {
    state.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLOR.BG
    }))

    state.widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: DEVICE_HEIGHT / 2 - 20,
      w: DEVICE_WIDTH,
      h: 40,
      text: 'Pokémon not found',
      text_size: 28,
      color: COLOR.GRAY,
      align_h: hmUI.align.CENTER_H
    }))
  },

  onDestroy() {
    console.log('[PokedexDetail] onDestroy')
    this.clearWidgets()
    state = {
      pokemon: null,
      pokemonIndex: -1,
      isShiny: false,
      caughtIds: [],
      shinyIds: [],
      widgets: [],
    }
  }
})
