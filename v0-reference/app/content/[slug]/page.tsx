"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Share2, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 模拟内容数据
const contentData: Record<string, {
  title: string
  type: "notice" | "agreement" | "rule" | "guide"
  updatedAt: string
  hasAction?: boolean
  actionText?: string
  content: Array<{
    type: "heading" | "paragraph" | "image" | "list" | "quote" | "divider"
    level?: number
    text?: string
    items?: string[]
    src?: string
    caption?: string
  }>
}> = {
  "user-agreement": {
    title: "用户协议",
    type: "agreement",
    updatedAt: "2026-01-01",
    hasAction: true,
    actionText: "我已阅读并同意",
    content: [
      { type: "heading", level: 2, text: "一、总则" },
      { type: "paragraph", text: "欢迎您使用「热卜国学」平台服务。本协议是您与热卜国学平台之间关于使用平台服务所订立的协议。请您仔细阅读本协议的全部内容。" },
      { type: "paragraph", text: "如果您不同意本协议的任意内容，请您立即停止使用本平台服务。当您注册成功或以其他方式开始使用本平台服务时，即视为您已充分阅读、理解并同意接受本协议的全部内容。" },
      { type: "divider" },
      { type: "heading", level: 2, text: "二、服务内容" },
      { type: "paragraph", text: "热卜国学平台为用户提供以下服务：" },
      { type: "list", items: [
        "排盘工具：提供八字、紫微斗数、风水等专业排盘服务",
        "知识社区：圈子、文章、短视频等内容服务",
        "在线课程：视频课程、直播课程等教育服务",
        "电商服务：书籍、文创、饰品等商品销售",
        "智能体服务：AI辅助分析和问答服务",
      ]},
      { type: "divider" },
      { type: "heading", level: 2, text: "三、用户注册与账号管理" },
      { type: "paragraph", text: "用户在注册时应提供真实、准确、完整的个人资料，并在资料发生变更时及时更新。用户应妥善保管账号和密码，因用户保管不善造成的损失由用户自行承担。" },
      { type: "quote", text: "特别提示：一个手机号仅可注册一个账号，账号一经注册不可转让或赠与他人使用。" },
      { type: "divider" },
      { type: "heading", level: 2, text: "四、用户行为规范" },
      { type: "paragraph", text: "用户在使用本平台服务时，应遵守国家法律法规，不得利用本平台从事违法违规活动。" },
      { type: "list", items: [
        "不得发布违反国家法律法规的内容",
        "不得发布虚假、欺诈性内容",
        "不得侵犯他人知识产权",
        "不得进行人身攻击或骚扰他人",
        "不得从事任何可能损害平台利益的行为",
      ]},
      { type: "divider" },
      { type: "heading", level: 2, text: "五、知识产权" },
      { type: "paragraph", text: "平台上所有内容（包括但不限于文字、图片、音频、视频、软件等）的知识产权归热卜国学平台或相关权利人所有。未经授权，任何人不得擅自使用。" },
      { type: "divider" },
      { type: "heading", level: 2, text: "六、免责声明" },
      { type: "paragraph", text: "本平台提供的命理分析、风水建议等内容仅供参考，不构成任何专业建议。用户应理性看待相关内容，自行承担使用风险。" },
      { type: "quote", text: "重要提示：国学命理仅供娱乐参考，请勿过度迷信。重大人生决策请结合实际情况谨慎考虑。" },
    ]
  },
  "privacy-policy": {
    title: "隐私政策",
    type: "agreement",
    updatedAt: "2026-01-01",
    hasAction: true,
    actionText: "我已阅读并同意",
    content: [
      { type: "heading", level: 2, text: "引言" },
      { type: "paragraph", text: "热卜国学平台非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。" },
      { type: "divider" },
      { type: "heading", level: 2, text: "一、信息收集" },
      { type: "paragraph", text: "我们可能收集以下类型的信息：" },
      { type: "list", items: [
        "注册信息：手机号、昵称、头像等",
        "身份信息：实名认证时的姓名、身份证号",
        "设备信息：设备型号、操作系统、唯一设备标识符",
        "位置信息：仅在您授权时收集",
        "使用记录：浏览、搜索、购买等行为数据",
      ]},
      { type: "divider" },
      { type: "heading", level: 2, text: "二、信息使用" },
      { type: "paragraph", text: "我们使用收集的信息用于：" },
      { type: "list", items: [
        "提供、维护和改进我们的服务",
        "个性化内容推荐",
        "安全保障和风险控制",
        "客户服务和沟通",
      ]},
      { type: "divider" },
      { type: "heading", level: 2, text: "三、信息安全" },
      { type: "paragraph", text: "我们采用业界标准的安全技术和程序来保护您的个人信息，包括数据加密、访问控制、安全审计等措施。" },
    ]
  },
  "platform-notice": {
    title: "平台公告",
    type: "notice",
    updatedAt: "2026-05-01",
    content: [
      { type: "heading", level: 2, text: "关于平台服务升级的通知" },
      { type: "paragraph", text: "尊敬的热卜国学用户：" },
      { type: "paragraph", text: "为提供更优质的服务体验，我们将于2026年5月15日进行系统升级维护。届时部分功能可能暂时无法使用，预计维护时间为4小时（00:00-04:00）。" },
      { type: "image", src: "", caption: "升级内容示意图" },
      { type: "heading", level: 3, text: "本次升级内容：" },
      { type: "list", items: [
        "排盘工具性能优化，响应速度提升50%",
        "新增紫微斗数流年分析功能",
        "智能体对话能力升级，支持多轮深度问答",
        "修复已知问题，提升系统稳定性",
      ]},
      { type: "paragraph", text: "感谢您的理解与支持！如有疑问，请联系客服。" },
      { type: "quote", text: "热卜国学运营团队\n2026年5月1日" },
    ]
  },
  "vip-rights": {
    title: "会员权益说明",
    type: "guide",
    updatedAt: "2026-03-01",
    content: [
      { type: "heading", level: 2, text: "热卜国学VIP会员权益" },
      { type: "paragraph", text: "成为热卜国学VIP会员，解锁更多专属权益，开启国学学习之旅。" },
      { type: "divider" },
      { type: "heading", level: 3, text: "核心权益" },
      { type: "list", items: [
        "排盘工具无限使用：八字、紫微、风水等全部排盘功能免费",
        "专属AI分析：每月赠送100次智能体深度分析",
        "课程折扣：全平台课程享8折优惠",
        "圈子特权：免费加入10个付费圈子",
        "专属客服：VIP专属客服通道，优先响应",
      ]},
      { type: "divider" },
      { type: "heading", level: 3, text: "会员等级" },
      { type: "paragraph", text: "根据会员时长和消费金额，会员分为以下等级：" },
      { type: "list", items: [
        "普通会员：基础会员权益",
        "黄金会员：额外享受课程7折优惠",
        "钻石会员：额外享受课程6折优惠，每月赠送200国学币",
        "至尊会员：最高权益，专属定制服务",
      ]},
      { type: "image", src: "", caption: "会员等级权益对比" },
    ]
  },
}

export default function ContentPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [agreed, setAgreed] = useState(false)
  
  const content = contentData[slug] || {
    title: "内容不存在",
    type: "notice",
    updatedAt: "",
    content: [
      { type: "paragraph", text: "抱歉，您访问的内容不存在或已被删除。" }
    ]
  }
  
  const typeLabels = {
    notice: "公告",
    agreement: "协议",
    rule: "规则",
    guide: "指南",
  }
  
  const typeColors = {
    notice: "bg-primary/10 text-primary",
    agreement: "bg-blue-500/10 text-blue-500",
    rule: "bg-orange-500/10 text-orange-500",
    guide: "bg-accent/10 text-accent",
  }

  const renderContent = (item: typeof content.content[0], index: number) => {
    switch (item.type) {
      case "heading":
        if (item.level === 2) {
          return (
            <h2 key={index} className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">
              {item.text}
            </h2>
          )
        }
        return (
          <h3 key={index} className="text-base font-semibold text-foreground mt-4 mb-2">
            {item.text}
          </h3>
        )
      
      case "paragraph":
        return (
          <p key={index} className="text-sm text-muted-foreground leading-relaxed mb-3">
            {item.text}
          </p>
        )
      
      case "list":
        return (
          <ul key={index} className="space-y-2 mb-4 pl-4">
            {item.items?.map((li, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        )
      
      case "quote":
        return (
          <Card key={index} className="p-4 bg-secondary/50 border-l-4 border-accent mb-4">
            <p className="text-sm text-foreground whitespace-pre-line">{item.text}</p>
          </Card>
        )
      
      case "image":
        return (
          <div key={index} className="mb-4">
            <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground text-sm">图片加载区域</span>
            </div>
            {item.caption && (
              <p className="text-xs text-muted-foreground text-center mt-2">{item.caption}</p>
            )}
          </div>
        )
      
      case "divider":
        return <hr key={index} className="border-border my-4" />
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">{content.title}</h1>
          <button className="p-2 -mr-2 rounded-full hover:bg-secondary">
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* 内容区 */}
      <main className={cn("px-4 py-6", content.hasAction && "pb-24")}>
        {/* 类型标签和更新时间 */}
        <div className="flex items-center gap-2 mb-4">
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", typeColors[content.type])}>
            {typeLabels[content.type]}
          </span>
          {content.updatedAt && (
            <span className="text-xs text-muted-foreground">
              更新于 {content.updatedAt}
            </span>
          )}
        </div>

        {/* 富文本内容 */}
        <article className="prose prose-sm max-w-none">
          {content.content.map((item, index) => renderContent(item, index))}
        </article>
      </main>

      {/* 底部操作栏 */}
      {content.hasAction && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <div className="px-4 py-3">
            <button
              onClick={() => {
                if (!agreed) {
                  setAgreed(true)
                } else {
                  router.back()
                }
              }}
              className={cn(
                "w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors",
                agreed 
                  ? "bg-green-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {agreed ? (
                <>
                  <Check className="w-4 h-4" />
                  已同意，点击返回
                </>
              ) : (
                content.actionText
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
