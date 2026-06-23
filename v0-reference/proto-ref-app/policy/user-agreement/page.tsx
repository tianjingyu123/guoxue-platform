'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const sections = [
  {
    title: '1. 协议接受',
    content: '当您注册、登录或使用儒布国学文化平台（以下简称"本平台"）的任何服务时，即表示您已阅读、理解并同意接受本协议的所有条款。如果您不同意本协议的任何条款，请停止使用本平台。',
  },
  {
    title: '2. 账号注册与安全',
    content: '您需要注册账号才能使用本平台的全部功能。您应当提供真实、准确的注册信息，并及时更新。您有责任保护您的账号密码安全，对账号下的所有活动负责。如发现账号被盗用，请立即联系我们。',
  },
  {
    title: '3. 用户行为规范',
    content: '您在使用本平台时，不得发布违法违规内容；不得发布虚假、诈骗或误导性信息；不得侵犯他人知识产权、隐私权；不得进行商业广告宣传（未经授权）；不得干扰平台正常运营。违反上述规定，我们有权封禁账号并追究法律责任。',
  },
  {
    title: '4. 内容所有权',
    content: '您在本平台发布的原创内容，版权归您所有。您授予本平台在全球范围内免费、非独家使用您发布内容的权利，用于平台运营、推广等目的。本平台原有内容的知识产权归本平台所有。',
  },
  {
    title: '5. 付费服务',
    content: '本平台提供付费课程、VIP会员、咨询服务等收费内容。购买前请仔细阅读商品描述。除法律规定外，虚拟商品一经购买不支持退款。如遇服务故障，我们将根据实际情况予以补偿。',
  },
  {
    title: '6. 免责声明',
    content: '本平台提供的命理、风水等内容仅供参考，不构成投资、医疗、法律等专业建议。用户依据平台内容做出的任何决策，后果由用户自行承担。本平台不对因不可抗力导致的服务中断承担责任。',
  },
  {
    title: '7. 协议变更',
    content: '我们保留随时修改本协议的权利。修改后的协议将在平台上公告，继续使用本平台即视为接受修改后的协议。',
  },
  {
    title: '8. 适用法律',
    content: '本协议的签订、履行和解释均适用中华人民共和国法律。如发生争议，双方应协商解决；协商不成的，提交本平台注册地有管辖权的人民法院诉讼解决。',
  },
]

export default function UserAgreementPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">用户协议</h1>
      </header>
      <div className="px-4 py-6 pb-20 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-1">用户服务协议</h2>
        <p className="text-xs text-muted-foreground mb-6">最后更新：2024年01月01日</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          欢迎您使用儒布国学文化平台的服务。本协议是您与儒布平台之间关于使用本平台服务所订立的协议，请仔细阅读。
        </p>
        <div className="space-y-6">
          {sections.map(s => (
            <section key={s.title}>
              <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
