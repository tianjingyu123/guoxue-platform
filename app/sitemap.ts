import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rebu.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 公开可收录的核心路由
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/discover', priority: 0.9, changeFrequency: 'daily' },
    { path: '/courses', priority: 0.9, changeFrequency: 'daily' },
    { path: '/circle', priority: 0.8, changeFrequency: 'daily' },
    { path: '/paipan', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/institute', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/shop', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/legal/privacy-policy', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/legal/user-agreement', priority: 0.3, changeFrequency: 'monthly' },
  ]

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
