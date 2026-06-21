/**
 * 结构化数据生成器
 * 用于生成 JSON-LD 格式的结构化数据，提升搜索引擎理解
 */

const siteName = '热卜国学'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rebu.app'

/**
 * 网站组织信息
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: '专注于传统国学文化传承的知识平台',
    sameAs: [
      // 可添加社交媒体链接
    ],
  }
}

/**
 * 网站搜索框
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * 课程结构化数据
 */
export function generateCourseSchema(course: {
  id: string
  title: string
  description?: string
  instructor?: string
  price?: number
  image?: string
  duration?: string
  rating?: number
  ratingCount?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    url: `${siteUrl}/courses/${course.id}`,
    image: course.image,
    provider: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
    instructor: course.instructor
      ? {
          '@type': 'Person',
          name: course.instructor,
        }
      : undefined,
    offers: course.price
      ? {
          '@type': 'Offer',
          price: course.price,
          priceCurrency: 'CNY',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
    aggregateRating: course.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: course.rating,
          reviewCount: course.ratingCount || 0,
        }
      : undefined,
  }
}

/**
 * 文章结构化数据
 */
export function generateArticleSchema(article: {
  id: string
  title: string
  excerpt?: string
  content?: string
  author?: string
  image?: string
  publishedAt?: string
  updatedAt?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    articleBody: article.content,
    url: `${siteUrl}/articles/${article.id}`,
    image: article.image,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: article.author
      ? {
          '@type': 'Person',
          name: article.author,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
  }
}

/**
 * 商品结构化数据
 */
export function generateProductSchema(product: {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  image?: string
  sku?: string
  inStock?: boolean
  rating?: number
  ratingCount?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    url: `${siteUrl}/shop/${product.id}`,
    image: product.image,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'CNY',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.ratingCount || 0,
        }
      : undefined,
  }
}

/**
 * 面包屑结构化数据
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  }
}

/**
 * FAQ 结构化数据
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
