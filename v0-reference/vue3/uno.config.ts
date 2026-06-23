import { defineConfig, presetWind } from 'unocss'

/**
 * UnoCSS 配置：还原原型 Tailwind 工具类口径。
 * 颜色统一指向 CSS 自定义属性（tokens.scss），保证主题切换与暗色一致。
 * 注意：uni-app 小程序端需配合 unocss 的 presetWind + 选择器转换处理。
 */
export default defineConfig({
  presets: [presetWind()],
  theme: {
    colors: {
      brand: 'var(--brand)',
      'brand-soft': 'var(--brand-soft)',
      gold: 'var(--gold)',
      ink: 'var(--text-ink)',
      'ink-2': 'var(--text)',
      'ink-3': 'var(--text-soft)',
      paper: 'var(--bg-paper)',
      card: 'var(--card)',
      operator: 'var(--operator)',
      institute: 'var(--institute)',
      live: 'var(--live)',
      station: 'var(--station)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      indigo: 'var(--indigo)',
      'indigo-light': 'var(--indigo-light)',
      'wuxing-wood': 'var(--wuxing-wood)',
      'wuxing-fire': 'var(--wuxing-fire)',
      'wuxing-earth': 'var(--wuxing-earth)',
      'wuxing-metal': 'var(--wuxing-metal)',
      'wuxing-water': 'var(--wuxing-water)',
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
    },
    borderRadius: {
      DEFAULT: 'var(--radius)',
    },
  },
  shortcuts: {
    'text-balance': 'leading-relaxed',
  },
})
