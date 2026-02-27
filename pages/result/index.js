/**
 * Result Page
 * Emotional storytelling design for catch results
 * 
 * Caught state:
 * - Green border ring (success)
 * - Vibrant Pokemon, type badges
 * - "GOTCHA!" or "★ SHINY! ★" header
 * - "Registered to Pokédex"
 * 
 * Escaped state:
 * - Red border ring
 * - Faded Pokemon (alpha effect via overlay)
 * - "IT GOT AWAY..." header
 * - "Don't give up!" encouragement
 * 
 * Both: "tap to continue" hint
 */

import hmUI from '@zos/ui'
import { replace } from '@zos/router'
import { onGesture, offGesture, GESTURE_RIGHT } from '@zos/interaction'
import { DEVICE_WIDTH, DEVICE_HEIGHT, COLOR, getTypeColor } from '../../utils/constants'
import { getLastResult } from '../../utils/storage'
import { vibrateCatchSuccess, vibrateCatchFail } from '../../utils/vibration'

const CX = DEVICE_WIDTH / 2
const CY = DEVICE_HEIGHT / 2

// =============================================================================
// DESIGN CONSTANTS (ZUI Philosophy)
// =============================================================================

const COLORS = {
  bg: 0x000000,
  ring: {
    caught: 0x30D158,       // ZUI success green
    escaped: 0xFA5151,      // ZUI danger red
    shiny: 0xFFD700,        // Pokemon yellow for shiny
  },
  text: {
    primary: 0xFFFFFF,
    secondary: 0xB8B8B8,
    muted: 0x666666,
    success: 0x30D158,
    danger: 0xFA5151,
    shiny: 0xFFD700,
    encouragement: 0x8E8E93,  // ZUI caption color
  },
  overlay: {
    escaped: 0x000000,      // Dark overlay for faded effect
  }
}

const TYPOGRAPHY = {
  header: 32,               // "GOTCHA!" / "IT GOT AWAY..."
  pokemonName: 28,          // Pokemon name
  registered: 24,           // "Registered to Pokédex"
  pokemonId: 24,            // "#001"
  hint: 24,                 // "tap to continue"
  encouragement: 26,        // "Don't give up!"
}

const SPRITE_SIZE = 300
const SPRITE_Y = 80

// =============================================================================
// PAGE STATE
// =============================================================================

let state = {
  pokemonId: 1,
  pokemonName: 'Bulbasaur',
  typeId: 12,
  typeId2: 4,
  isShiny: false,
  caught: false
}

function goToMenu() {
  replace({ url: 'pages/menu/index' })
}

// =============================================================================
// PAGE
// =============================================================================

Page({
  onInit() {
    console.log('[Result] onInit')

    const result = getLastResult()
    if (result) {
      state.pokemonId = result.id
      state.pokemonName = result.name
      state.typeId = result.typeId || 1
      state.typeId2 = result.typeId2 || 0
      state.isShiny = result.shiny || false
      state.caught = result.caught || false
    }

    console.log('[Result] Pokemon:', state.pokemonName, 'Caught:', state.caught, 'Shiny:', state.isShiny)
  },

  build() {
    console.log('[Result] build')

    const { pokemonId, pokemonName, typeId, typeId2, isShiny, caught } = state
    const hasDualType = typeId2 > 0
    const typeColor = getTypeColor(typeId)

    // Vibrate based on catch outcome
    if (caught) {
      vibrateCatchSuccess()
    } else {
      vibrateCatchFail()
    }

    // === Black background ===
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: COLORS.bg
    })

    // === Border ring ===
    let ringColor = COLORS.ring.escaped
    if (caught) {
      ringColor = isShiny ? COLORS.ring.shiny : COLORS.ring.caught
    }

    hmUI.createWidget(hmUI.widget.ARC, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      start_angle: 0,
      end_angle: 360,
      color: ringColor,
      line_width: 6
    })

    if (caught) {
      // =====================================================================
      // CAUGHT STATE - Celebration!
      // =====================================================================

      // Header
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 22,
        w: DEVICE_WIDTH,
        h: 40,
        text: isShiny ? '★ SHINY! ★' : 'GOTCHA!',
        text_size: TYPOGRAPHY.header,
        color: isShiny ? COLORS.text.shiny : COLORS.text.success,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })

      // Pokemon name
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 58,
        w: DEVICE_WIDTH,
        h: 32,
        text: pokemonName.toUpperCase(),
        text_size: TYPOGRAPHY.pokemonName,
        color: COLORS.text.primary,
        align_h: hmUI.align.CENTER_H
      })

      // Pokemon sprite (full vibrant)
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - SPRITE_SIZE / 2,
        y: SPRITE_Y,
        w: SPRITE_SIZE,
        h: SPRITE_SIZE,
        src: 'raw/pokemon/' + pokemonId + '.png',
        auto_scale: true,
        auto_scale_obj_fit: 1
      })

      // Type badges (moved down for balance)
      const typeY = 390
      if (hasDualType) {
        hmUI.createWidget(hmUI.widget.IMG, {
          x: CX - 80,
          y: typeY,
          w: 75,
          h: 30,
          src: 'raw/types/' + typeId + '.png',
          auto_scale: true
        })
        hmUI.createWidget(hmUI.widget.IMG, {
          x: CX + 5,
          y: typeY,
          w: 75,
          h: 30,
          src: 'raw/types/' + typeId2 + '.png',
          auto_scale: true
        })
      } else {
        hmUI.createWidget(hmUI.widget.IMG, {
          x: CX - 38,
          y: typeY,
          w: 75,
          h: 30,
          src: 'raw/types/' + typeId + '.png',
          auto_scale: true
        })
      }

      // Pokemon ID (moved down)
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 428,
        w: DEVICE_WIDTH,
        h: 28,
        text: `#${String(pokemonId).padStart(3, '0')}`,
        text_size: TYPOGRAPHY.pokemonId,
        color: COLORS.text.secondary,
        align_h: hmUI.align.CENTER_H
      })

    } else {
      // =====================================================================
      // ESCAPED STATE - Encouragement
      // =====================================================================

      // Header
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 22,
        w: DEVICE_WIDTH,
        h: 40,
        text: 'ESCAPED!',
        text_size: TYPOGRAPHY.header,
        color: COLORS.text.danger,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })

       // Pokemon name
       hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 58,
        w: DEVICE_WIDTH,
        h: 32,
        text: pokemonName.toUpperCase(),
        text_size: TYPOGRAPHY.pokemonName,
        color: COLORS.text.muted,
        align_h: hmUI.align.CENTER_H
      })

      // Pokemon sprite (will be faded with overlay)
      hmUI.createWidget(hmUI.widget.IMG, {
        x: CX - SPRITE_SIZE / 2,
        y: SPRITE_Y,
        w: SPRITE_SIZE,
        h: SPRITE_SIZE,
        src: 'raw/pokemon/' + pokemonId + '.png',
        auto_scale: true,
        auto_scale_obj_fit: 1
      })

      // Dark overlay to fade the Pokemon (simulating alpha)
      // hmUI.createWidget(hmUI.widget.FILL_RECT, {
      //   x: CX - SPRITE_SIZE / 2,
      //   y: SPRITE_Y,
      //   w: SPRITE_SIZE,
      //   h: SPRITE_SIZE,
      //   radius: 20,
      //   color: COLORS.overlay.escaped,
      //   alpha: 150  // ~60% opacity to dim the sprite
      // })

      // Pokemon ID (muted, moved down)
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 400,
        w: DEVICE_WIDTH,
        h: 28,
        text: '#' + String(pokemonId).padStart(3, '0'),
        text_size: TYPOGRAPHY.pokemonId,
        color: COLORS.text.muted,
        align_h: hmUI.align.CENTER_H
      })

    }

    // === Tap anywhere overlay ===
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, goToMenu)

    // === Back gesture handler ===
    onGesture({
      callback: (gesture) => {
        if (gesture === GESTURE_RIGHT) {
          console.log('[Result] Back gesture -> Home')
          goToMenu()
          return true
        }
        return false
      }
    })
  },

  onDestroy() {
    console.log('[Result] onDestroy')
    offGesture()
  }
})
