import type { Metadata } from 'next'

const siteName = '热卜国学'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rebu.app'
const defaultDescription = '探索易学智慧，传承国学文化。八字排盘、紫微斗数、风水命理，AI智能分析助你洞察人生。'

interface GenerateMetadataOptions {
  title: string
  description?: string
  keywords?: string[]
  image?: string
  noIndex?: boolean
  canonical?: string
}

/**
 * 生成页面 Metadata
 * 
 * @example
 * export const metadata = generateMetadata({
 *   title: '精品课程',
 *   description: '国学名师精品课程，传承传统文化智慧',
 *   keywords: ['国学课程', '易学', '八字'],
 * })
 */
export function generateMetadata({
  title,
  description = defaultDescription,
  keywords = [],
  image = '/og-image.png',
  noIndex = false,
  canonical,
}: GenerateMetadataOptions): Metadata {
  const fullTitle = title === siteName ? title : `${title} · ${siteName}`
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`

  return {
    title: fullTitle,
    description,
    keywords: [
      '国学',
      '易学',
      '八字排盘',
      '紫微斗数',
      '风水命理',
      '周易',
      ...keywords,
    ],
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: canonical || siteUrl,
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  }
}

/**
 * 课程页面 Metadata
 */
export function generateCourseMetadata(course: {
  title: string
  description?: string
  instructor?: string
  category?: string
  image?: string
  id: string
}): Metadata {
  return generateMetadata({
    title: course.title,
    description: course.description || `${course.title} - ${course.instructor || '名师'}精讲，传承国学智慧`,
    keywords: [course.category || '课程', course.instructor || '讲师', '在线学习'],
    image: course.image,
    canonical: `/courses/${course.id}`,
  })
}

/**
 * 文章页面 Metadata
 */
export function generateArticleMetadata(article: {
  title: string
  excerpt?: string
  author?: string
  category?: string
  image?: string
  id: string
  publishedAt?: string
}): Metadata {
  const metadata = generateMetadata({
    title: article.title,
    description: article.excerpt || `${article.title} - ${article.author || '作者'}原创`,
    keywords: [article.category || '文章', '国学文化'],
    image: article.image,
    canonical: `/articles/${article.id}`,
  })

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: article.author ? [article.author] : undefined,
    },
  }
}

/**
 * 圈子页面 Metadata
 */
export function generateCircleMetadata(circle: {
  name: string
  description?: string
  memberCount?: number
  image?: string
  id: string
}): Metadata {
  return generateMetadata({
    title: circle.name,
    description: circle.description || `加入${circle.name}，与${circle.memberCount || ''}位同好一起探索国学智慧`,
    keywords: ['国学圈子', '学习社区', circle.name],
    image: circle.image,
    canonical: `/circles/${circle.id}`,
  })
}

/**
 * 商品页面 Metadata
 */
export function generateProductMetadata(product: {
  name: string
  description?: string
  price?: number
  image?: string
  id: string
}): Metadata {
  return generateMetadata({
    title: product.name,
    description: product.description || `${product.name} - 国学文创精品`,
    keywords: ['国学商品', '文创', product.name],
    image: product.image,
    canonical: `/shop/${product.id}`,
  })
}
