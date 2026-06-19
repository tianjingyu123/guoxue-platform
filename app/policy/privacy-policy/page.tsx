'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const sections = [
  {
    title: '1. 信息收集',
    content: '我们收集您在注册、使用服务过程中主动提供的信息，包括：姓名、手机号码、电子邮箱、出生日期等基本信息；您在使用排盘、咨询等功能时输入的信息；您与客服沟通时产生的记录。',
  },
  {
    title: '2. 信息使用',
    content: '我们使用所收集的信息用于：提供、维护和改进我们的服务；个性化您的使用体验；向您发送服务通知、活动信息；进行数据分析以改善产品功能。我们不会将您的个人信息出售给第三方。',
  },
  {
    title: '3. 信息存储与保护',
    content: '我们采用行业标准的安全技术保护您的个人信息，包括 SSL 加密传输、数据库加密存储等措施。您的数据存储于中国境内的服务器，我们将采取合理措施防止未授权访问、泄露或篡改。',
  },
  {
    title: '4. Cookie 使用',
    content: '我们使用 Cookie 和类似技术来记录您的偏好设置、分析使用模式并提供个性化体验。您可以通过浏览器设置拒绝 Cookie，但这可能影响部分功能的正常使用。',
  },
  {
    title: '5. 信息共享',
    content: '在以下情况下，我们可能与第三方共享您的信息：获得您的明确同意；依据法律法规要求；与我们的合作服务商共享必要信息以提供服务（如支付机构）；在合并、收购或资产出售时进行必要转移。',
  },
  {
    title: '6. 您的权利',
    content: '您对您的个人信息享有以下权利：访问权（查阅我们持有的您的信息）；更正权（更正不准确的信息）；删除权（在特定情况下要求删除）；撤回同意权。如需行使上述权利，请通过设置页面或联系客服。',
  },
  {
    title: '7. 未成年人保护',
    content: '我们的服务不针对 14 周岁以下的未成年人。如果您是未成年人的父母或监护人，并发现未成年人向我们提供了个人信息，请立即联系我们，我们将采取措施删除相关信息。',
  },
  {
    title: '8. 政策更新',
    content: '我们可能不时更新本隐私政策。重大变更发生时，我们将通过应用内通知或电子邮件告知您。继续使用我们的服务即表示您接受更新后的政策。',
  },
]

export default function PrivacyPolicyPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">隐私政策</h1>
      </header>
      <div className="px-4 py-6 pb-20 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-1">隐私政策</h2>
        <p className="text-xs text-muted-foreground mb-6">最后更新：2024年01月01日</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          欢迎使用儒布（REBU）国学文化平台。我们非常重视您的隐私保护，本政策说明了我们如何收集、使用和保护您的个人信息。请您仔细阅读以下内容。
        </p>
        <div className="space-y-6">
          {sections.map(s => (
            <section key={s.title}>
              <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 p-4 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">
            如果您对本隐私政策有任何疑问，请通过以下方式联系我们：
          </p>
          <p className="text-xs text-foreground font-medium mt-1">客服邮箱：privacy@rebu.com</p>
        </div>
      </div>
    </div>
  )
}
