import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// 思源黑体（正文）—— globals.css 的 --font-sans 依赖此变量
const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
})

// 思源宋体（标题）—— globals.css 的 --font-serif 依赖此变量
const notoSerifSC = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: '热卜国学 - 国学命理学习平台',
  description: '汇聚八字、紫微、六爻、奇门等易学课程，圈子社区，智能排盘工具，发现国学之美。',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSerifSC.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
