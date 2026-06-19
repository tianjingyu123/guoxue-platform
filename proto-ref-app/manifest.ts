import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '热卜国学 - 易学传统文化知识平台',
    short_name: '热卜国学',
    description:
      '探索易学智慧，传承国学文化。八字排盘、紫微斗数、风水命理，AI智能分析助你洞察人生。',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F5',
    theme_color: '#C41E3A',
    orientation: 'portrait',
    lang: 'zh-CN',
    categories: ['education', 'lifestyle', 'books'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
