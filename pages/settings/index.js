/**
 * Settings Page
 * Redesigned using ZUI Design Philosophy for ZeppOS
 * - Natural, Simple, Symbiotic
 * - Proper watch typography (minimum 24px)
 * - Touch-friendly targets (48px minimum)
 */

import hmUI from '@zos/ui'
import { push } from '@zos/router'
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../../utils/constants'
import {
  getFocusGoal,
  setFocusGoal,
  isNudgeEnabled,
  setNudgeEnabled,
  getNudgeInterval,
  setNudgeInterval,
  getFlowRatio,
  setFlowRatio,
  isDevMode,
  setDevMode
} from '../../utils/storage'
import { FLOW_RATIO_OPTIONS } from '../../utils/constants'

// ============================================================================
// ZUI Design Tokens for ZeppOS (480x480 display)
// ============================================================================

const COLORS = {
  bg: {
    primary: 0x000000,
    elevated: 0x1C1C1E,
    secondary: 0x2C2C2E,
    tertiary: 0x3A3A3C,
  },
  text: {
    primary: 0xFFFFFF,
    secondary: 0xB8B8B8,
    caption: 0x8E8E93,
  },
  accent: {
    blue: 0x0986D4,
    green: 0x2DC84D,
    red: 0xFA5151,
  },
}

const TYPOGRAPHY = {
  caption: { size: 24, lineHeight: 30 },
  body: { size: 28, lineHeight: 35 },
  title: { size: 32, lineHeight: 40 },
  largeTitle: { size: 36, lineHeight: 45 },
}

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
}

const RADIUS = {
  card: 24,
}

// Layout
const CX = DEVICE_WIDTH / 2
const CONTENT_WIDTH = 380
const ROW_HEIGHT = 80  // Higher buttons
const CARD_PADDING = 20

// Options
const FOCUS_GOAL_OPTIONS = [5, 10, 15, 20, 25, 30]
const NUDGE_INTERVAL_OPTIONS = [3, 5, 10, 15]

// State
let state = {
  focusGoal: 5,
  nudgeEnabled: true,
  nudgeInterval: 5,
  flowRatio: 4,
  devMode: false,
  widgets: {
    focusGoalValue: null,
    intervalValue: null,
    flowRatioValue: null,
    toggleTrack: null,
    toggleKnob: null,
    devToggleTrack: null,
    devToggleKnob: null,
  },
}

function getNextOption(options, current) {
  const idx = options.indexOf(current)
  return options[(idx + 1) % options.length]
}

// ============================================================================
// Page Definition
// ============================================================================

Page({
  onInit() {
    console.log('[Settings] onInit')
    state.focusGoal = getFocusGoal()
    state.nudgeEnabled = isNudgeEnabled()
    state.nudgeInterval = getNudgeInterval()
    state.flowRatio = getFlowRatio()
    state.devMode = isDevMode()
  },

  build() {
    console.log('[Settings] build')
    
    // Background (extended for scroll margin)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT + 150,  // Extra space for bottom margin
      color: COLORS.bg.primary
    })

    let currentY = 35  // Reduced top margin

    // Page title
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: currentY,
      w: DEVICE_WIDTH,
      h: TYPOGRAPHY.largeTitle.lineHeight,
      text: 'Settings',
      text_size: TYPOGRAPHY.largeTitle.size,
      color: COLORS.text.primary,
      align_h: hmUI.align.CENTER_H
    })
    currentY += TYPOGRAPHY.largeTitle.lineHeight + SPACING.md

    // FOCUS section
    currentY = this.createSectionHeader(currentY, 'FOCUS')
    currentY = this.createValuePickerRow(
      currentY, 'Focus Goal', state.focusGoal, 'min', FOCUS_GOAL_OPTIONS,
      (val) => {
        state.focusGoal = val
        setFocusGoal(val)
        state.widgets.focusGoalValue?.setProperty(hmUI.prop.TEXT, `${val} min`)
      },
      (w) => state.widgets.focusGoalValue = w
    )
    currentY += SPACING.sm
    currentY = this.createRatioPickerRow(
      currentY, 'Break Ratio', state.flowRatio,
      (val) => {
        state.flowRatio = val
        setFlowRatio(val)
        state.widgets.flowRatioValue?.setProperty(hmUI.prop.TEXT, `${val}:1`)
      },
      (w) => state.widgets.flowRatioValue = w
    )

    currentY += SPACING.xl  // More margin between sections

    // REMINDERS section
    currentY = this.createSectionHeader(currentY, 'REMINDERS')
    currentY = this.createToggleRow(currentY, 'Vibration', state.nudgeEnabled, (val) => {
      state.nudgeEnabled = val
      setNudgeEnabled(val)
    })
    currentY += SPACING.sm  // More margin between items
    currentY = this.createValuePickerRow(
      currentY, 'Remind Every', state.nudgeInterval, 'min', NUDGE_INTERVAL_OPTIONS,
      (val) => {
        state.nudgeInterval = val
        setNudgeInterval(val)
        state.widgets.intervalValue?.setProperty(hmUI.prop.TEXT, `${val} min`)
      },
      (w) => state.widgets.intervalValue = w
    )

    currentY += SPACING.xl  // More margin between sections

    // DATA section
    currentY = this.createSectionHeader(currentY, 'DATA')
    currentY = this.createDangerButton(currentY, 'Reset Progress', () => this.showResetConfirm())
    
    currentY += SPACING.xl

    // DEVELOPER section
    currentY = this.createSectionHeader(currentY, 'DEVELOPER')
    currentY = this.createDevModeToggle(currentY, 'Developer Mode', state.devMode, (val) => {
      state.devMode = val
      setDevMode(val)
    })
    
    // Dev mode info text
    if (state.devMode) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: CX - CONTENT_WIDTH / 2 + CARD_PADDING,
        y: currentY + SPACING.xs,
        w: CONTENT_WIDTH - CARD_PADDING * 2,
        h: TYPOGRAPHY.caption.lineHeight * 2,
        text: '⚡ 1s encounter, 20 Pokémon\nSeparate save data',
        text_size: TYPOGRAPHY.caption.size,
        color: COLORS.accent.blue,
        align_h: hmUI.align.LEFT,
        text_style: hmUI.text_style.WRAP
      })
      currentY += TYPOGRAPHY.caption.lineHeight * 2 + SPACING.sm
    }
    
    // Version info
    currentY += SPACING.xl
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: currentY,
      w: DEVICE_WIDTH,
      h: 32,
      text: 'v1.0.0',
      text_size: TYPOGRAPHY.caption.size,
      color: COLORS.text.caption,
      align_h: hmUI.align.CENTER_H
    })
    
    // Bottom margin spacer (much larger for round display)
    currentY += 80
  },

  createSectionHeader(y, label) {
    const x = CX - CONTENT_WIDTH / 2 + CARD_PADDING
    hmUI.createWidget(hmUI.widget.TEXT, {
      x, y,
      w: 200,
      h: TYPOGRAPHY.caption.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.caption.size,
      color: COLORS.text.caption,
      align_h: hmUI.align.LEFT
    })
    return y + TYPOGRAPHY.caption.lineHeight + SPACING.sm
  },

  createValuePickerRow(y, label, initialValue, unit, options, onChange, onWidgetRef) {
    const cardX = CX - CONTENT_WIDTH / 2
    let currentValue = initialValue

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: COLORS.bg.elevated
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CARD_PADDING,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 200,
      h: TYPOGRAPHY.title.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.text.primary,
      align_h: hmUI.align.LEFT
    })

    const valueWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CONTENT_WIDTH - CARD_PADDING - 120,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 120,
      h: TYPOGRAPHY.title.lineHeight,
      text: `${initialValue} ${unit}`,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.accent.blue,
      align_h: hmUI.align.RIGHT
    })

    if (onWidgetRef) onWidgetRef(valueWidget)

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      currentValue = getNextOption(options, currentValue)
      onChange(currentValue)
    })

    return y + ROW_HEIGHT
  },

  createRatioPickerRow(y, label, initialValue, onChange, onWidgetRef) {
    const cardX = CX - CONTENT_WIDTH / 2
    let currentValue = initialValue

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: COLORS.bg.elevated
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CARD_PADDING,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 200,
      h: TYPOGRAPHY.title.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.text.primary,
      align_h: hmUI.align.LEFT
    })

    const valueWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CONTENT_WIDTH - CARD_PADDING - 80,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 80,
      h: TYPOGRAPHY.title.lineHeight,
      text: `${initialValue}:1`,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.accent.blue,
      align_h: hmUI.align.RIGHT
    })

    if (onWidgetRef) onWidgetRef(valueWidget)

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      currentValue = getNextOption(FLOW_RATIO_OPTIONS, currentValue)
      onChange(currentValue)
    })

    return y + ROW_HEIGHT
  },

  createToggleRow(y, label, initialValue, onChange) {
    const cardX = CX - CONTENT_WIDTH / 2
    const TOGGLE = { width: 64, height: 38, knobSize: 32, knobMargin: 3 }
    const toggleX = cardX + CONTENT_WIDTH - CARD_PADDING - TOGGLE.width
    const toggleY = y + (ROW_HEIGHT - TOGGLE.height) / 2

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: COLORS.bg.elevated
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CARD_PADDING,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 200,
      h: TYPOGRAPHY.title.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.text.primary,
      align_h: hmUI.align.LEFT
    })

    state.widgets.toggleTrack = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: toggleX,
      y: toggleY,
      w: TOGGLE.width,
      h: TOGGLE.height,
      radius: TOGGLE.height / 2,
      color: initialValue ? COLORS.accent.green : COLORS.bg.tertiary
    })

    const knobOffX = toggleX + TOGGLE.knobMargin
    const knobOnX = toggleX + TOGGLE.width - TOGGLE.knobSize - TOGGLE.knobMargin
    const knobY = toggleY + (TOGGLE.height - TOGGLE.knobSize) / 2

    state.widgets.toggleKnob = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: initialValue ? knobOnX : knobOffX,
      y: knobY,
      w: TOGGLE.knobSize,
      h: TOGGLE.knobSize,
      radius: TOGGLE.knobSize / 2,
      color: COLORS.text.primary
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: toggleX - 16,
      y: toggleY - 16,
      w: TOGGLE.width + 32,
      h: TOGGLE.height + 32,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      const newValue = !state.nudgeEnabled
      state.widgets.toggleTrack?.setProperty(hmUI.prop.COLOR, newValue ? COLORS.accent.green : COLORS.bg.tertiary)
      state.widgets.toggleKnob?.setProperty(hmUI.prop.X, newValue ? knobOnX : knobOffX)
      onChange(newValue)
    })

    return y + ROW_HEIGHT
  },

  createDevModeToggle(y, label, initialValue, onChange) {
    const cardX = CX - CONTENT_WIDTH / 2
    const TOGGLE = { width: 64, height: 38, knobSize: 32, knobMargin: 3 }
    const toggleX = cardX + CONTENT_WIDTH - CARD_PADDING - TOGGLE.width
    const toggleY = y + (ROW_HEIGHT - TOGGLE.height) / 2
    const DEV_COLOR = 0xFF9500  // Orange for dev mode

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: COLORS.bg.elevated
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX + CARD_PADDING,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: 220,
      h: TYPOGRAPHY.title.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.title.size,
      color: initialValue ? DEV_COLOR : COLORS.text.primary,
      align_h: hmUI.align.LEFT
    })

    state.widgets.devToggleTrack = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: toggleX,
      y: toggleY,
      w: TOGGLE.width,
      h: TOGGLE.height,
      radius: TOGGLE.height / 2,
      color: initialValue ? DEV_COLOR : COLORS.bg.tertiary
    })

    const knobOffX = toggleX + TOGGLE.knobMargin
    const knobOnX = toggleX + TOGGLE.width - TOGGLE.knobSize - TOGGLE.knobMargin
    const knobY = toggleY + (TOGGLE.height - TOGGLE.knobSize) / 2

    state.widgets.devToggleKnob = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: initialValue ? knobOnX : knobOffX,
      y: knobY,
      w: TOGGLE.knobSize,
      h: TOGGLE.knobSize,
      radius: TOGGLE.knobSize / 2,
      color: COLORS.text.primary
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: toggleX - 16,
      y: toggleY - 16,
      w: TOGGLE.width + 32,
      h: TOGGLE.height + 32,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      const newValue = !state.devMode
      state.widgets.devToggleTrack?.setProperty(hmUI.prop.COLOR, newValue ? DEV_COLOR : COLORS.bg.tertiary)
      state.widgets.devToggleKnob?.setProperty(hmUI.prop.X, newValue ? knobOnX : knobOffX)
      onChange(newValue)
    })

    return y + ROW_HEIGHT
  },

  createDangerButton(y, label, onPress) {
    const cardX = CX - CONTENT_WIDTH / 2

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: COLORS.bg.elevated
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: cardX,
      y: y + (ROW_HEIGHT - TYPOGRAPHY.title.lineHeight) / 2,
      w: CONTENT_WIDTH,
      h: TYPOGRAPHY.title.lineHeight,
      text: label,
      text_size: TYPOGRAPHY.title.size,
      color: COLORS.accent.red,
      align_h: hmUI.align.CENTER_H
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX, y,
      w: CONTENT_WIDTH,
      h: ROW_HEIGHT,
      radius: RADIUS.card,
      color: 0x000000,
      alpha: 0
    }).addEventListener(hmUI.event.CLICK_UP, onPress)

    return y + ROW_HEIGHT
  },

  /**
   * Navigate to reusable confirmation page using URL params
   */
  showResetConfirm() {
    const confirmParams = {
      title: 'Reset Progress?',
      message: 'All data will be deleted.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirmAction: 'reset_progress'
    }
    
    push({
      url: 'pages/confirm/index',
      params: JSON.stringify(confirmParams)
    })
  },

  onDestroy() {
    console.log('[Settings] onDestroy')
    state.widgets = {
      focusGoalValue: null,
      intervalValue: null,
      flowRatioValue: null,
      toggleTrack: null,
      toggleKnob: null,
      devToggleTrack: null,
      devToggleKnob: null,
    }
  }
})
