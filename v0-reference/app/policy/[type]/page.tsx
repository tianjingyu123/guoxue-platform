"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { BackButton } from "@/components/common/back-button"
import { List, Check, ChevronUp, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

// 协议数据
const policies: Record<string, {
  title: string
  version: string
  effectiveDate: string
  updateDate: string
  sections: {
    id: string
    title: string
    content: string[]
    highlight?: boolean
  }[]
}> = {
  "user-agreement": {
    title: "用户服务协议",
    version: "V3.2",
    effectiveDate: "2026年1月1日",
    updateDate: "2025年12月15日",
    sections: [
      {
        id: "intro",
        title: "一、协议总则",
        content: [
          "欢迎您使用「热卜国学」平台（以下简称「本平台」）。本协议是您与热卜国学平台运营方之间关于使用本平台服务的法律协议。",
          "请您在使用本平台服务前，仔细阅读并充分理解本协议各条款，特别是涉及免除或限制责任的条款、争议解决条款等。",
          "您通过网络页面点击确认或以其他方式选择接受本协议，即表示您已充分阅读、理解并同意接受本协议的全部内容。"
        ]
      },
      {
        id: "service",
        title: "二、服务内容",
        content: [
          "本平台提供的服务包括但不限于：",
          "• 排盘工具：八字、紫微斗数、奇门遁甲等命理排盘服务",
          "• 圈子社区：用户可创建或加入国学交流圈子",
          "• 在线课程：国学相关的视频、音频、图文课程",
          "• 智能体对话：基于AI技术的国学知识问答服务",
          "• 商城服务：国学相关书籍、文创产品的购买",
          "本平台有权根据业务发展需要，调整或变更服务内容，并提前通知用户。"
        ]
      },
      {
        id: "account",
        title: "三、账号注册与管理",
        content: [
          "您在注册账号时应提供真实、准确、完整的个人信息，并在信息变更时及时更新。",
          "您应妥善保管账号及密码，因您保管不善导致的损失由您自行承担。",
          "每位用户仅可注册一个账号，不得将账号转让、出借或以任何方式提供给他人使用。",
          "如发现账号被盗用或存在安全风险，请立即联系客服处理。"
        ]
      },
      {
        id: "behavior",
        title: "四、用户行为规范",
        content: [
          "您在使用本平台服务时，应遵守国家法律法规及本协议约定，不得从事以下行为：",
          "• 发布违反国家法律法规的内容",
          "• 发布封建迷信、低俗色情、虚假宣传等违规内容",
          "• 侵犯他人知识产权、隐私权等合法权益",
          "• 恶意干扰平台正常运营或其他用户的正常使用",
          "• 利用技术手段破坏平台安全或获取不当利益"
        ],
        highlight: true
      },
      {
        id: "intellectual",
        title: "五、知识产权",
        content: [
          "本平台的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、版面设计等，均受知识产权法律保护。",
          "用户在本平台发布的原创内容，知识产权归用户所有，但用户授权本平台在平台内免费使用、展示、传播该内容。",
          "未经本平台书面许可，任何人不得复制、修改、传播本平台内容。"
        ]
      },
      {
        id: "payment",
        title: "六、付费服务",
        content: [
          "本平台提供的付费服务包括会员订阅、课程购买、圈子入驻费等。",
          "用户购买付费服务前，应仔细阅读服务说明、价格、有效期等信息。",
          "虚拟商品（如国学币、会员权益）一经购买，除法律规定的情形外，不支持退款。",
          "因用户自身原因导致无法正常使用付费服务的，本平台不承担退款责任。"
        ],
        highlight: true
      },
      {
        id: "disclaimer",
        title: "七、免责声明",
        content: [
          "本平台提供的排盘、预测等服务仅供参考，不构成任何投资、医疗、法律等专业建议。",
          "用户应理性看待命理学内容，不应将其作为重大人生决策的唯一依据。",
          "因用户违反本协议或相关法律法规导致的任何损失，由用户自行承担。",
          "因不可抗力、系统维护等原因导致服务中断，本平台不承担责任，但会尽快恢复服务。"
        ],
        highlight: true
      },
      {
        id: "privacy",
        title: "八、隐私保护",
        content: [
          "本平台重视用户隐私保护，详细的隐私保护政策请参阅《隐私政策》。",
          "本平台收集的用户信息将用于提供服务、改进用户体验、安全防护等目的。",
          "未经用户同意，本平台不会向第三方披露用户个人信息，法律规定的情形除外。"
        ]
      },
      {
        id: "modify",
        title: "九、协议修改",
        content: [
          "本平台有权根据业务发展需要修改本协议，修改后的协议将在平台公示。",
          "如您不同意修改后的协议，应停止使用本平台服务。",
          "您继续使用本平台服务，视为同意修改后的协议内容。"
        ]
      },
      {
        id: "dispute",
        title: "十、争议解决",
        content: [
          "本协议的订立、执行、解释及争议解决均适用中华人民共和国法律。",
          "因本协议产生的争议，双方应友好协商解决；协商不成的，任何一方均可向本平台运营方所在地有管辖权的人民法院提起诉讼。"
        ]
      }
    ]
  },
  "privacy-policy": {
    title: "隐私政策",
    version: "V2.1",
    effectiveDate: "2026年1月1日",
    updateDate: "2025年12月10日",
    sections: [
      {
        id: "collect",
        title: "一、我们收集的信息",
        content: [
          "为向您提供服务，我们会收集以下类型的信息：",
          "1. 账号信息：手机号码、密码、头像、昵称等",
          "2. 身份信息：实名认证时的姓名、身份证号（加密存储）",
          "3. 排盘信息：出生日期、出生时辰、出生地点",
          "4. 设备信息：设备型号、操作系统、唯一设备标识符",
          "5. 日志信息：浏览记录、搜索记录、操作日志"
        ],
        highlight: true
      },
      {
        id: "use",
        title: "二、信息使用目的",
        content: [
          "我们收集的信息将用于：",
          "• 提供排盘、课程、社区等核心服务",
          "• 保障账号安全，防止欺诈行为",
          "• 改进服务质量，优化用户体验",
          "• 向您推送个性化内容和服务",
          "• 遵守法律法规的要求"
        ]
      },
      {
        id: "share",
        title: "三、信息共享",
        content: [
          "我们不会将您的个人信息出售给第三方。在以下情况下，我们可能会共享您的信息：",
          "• 获得您的明确同意",
          "• 为完成服务需要（如支付、物流）与合作方共享必要信息",
          "• 法律法规要求或政府机关依法要求",
          "• 保护本平台或公众的权益、财产或安全"
        ],
        highlight: true
      },
      {
        id: "protect",
        title: "四、信息安全",
        content: [
          "我们采取以下措施保护您的信息安全：",
          "• 数据加密传输和存储",
          "• 严格的访问控制机制",
          "• 定期安全审计和漏洞扫描",
          "• 员工安全意识培训",
          "如发生信息泄露事件，我们将及时通知您并采取补救措施。"
        ]
      },
      {
        id: "rights",
        title: "五、您的权利",
        content: [
          "您对自己的个人信息享有以下权利：",
          "• 访问权：查看我们收集的您的个人信息",
          "• 更正权：更正不准确的个人信息",
          "• 删除权：要求删除您的个人信息（法律要求保留的除外）",
          "• 撤回同意：撤回此前给予的同意",
          "• 注销账号：申请注销账号及删除相关数据"
        ]
      },
      {
        id: "cookie",
        title: "六、Cookie使用",
        content: [
          "我们使用Cookie和类似技术来：",
          "• 记住您的登录状态",
          "• 分析服务使用情况",
          "• 提供个性化内容",
          "您可以通过浏览器设置管理Cookie偏好。"
        ]
      },
      {
        id: "minor",
        title: "七、未成年人保护",
        content: [
          "本平台主要面向成年用户。如您是未成年人，请在监护人的指导下使用本平台。",
          "我们不会主动收集未成年人的个人信息。如发现误收集了未成年人信息，我们将尽快删除。"
        ],
        highlight: true
      },
      {
        id: "contact",
        title: "八、联系我们",
        content: [
          "如您对本隐私政策有任何疑问，可通过以下方式联系我们：",
          "• 客服邮箱：privacy@rebu.com",
          "• 客服热线：400-888-8888",
          "• 在线客服：App内「我的」→「帮助中心」→「联系客服」"
        ]
      }
    ]
  },
  "circle-agreement": {
    title: "圈子创建协议",
    version: "V1.5",
    effectiveDate: "2026年1月1日",
    updateDate: "2025年11月20日",
    sections: [
      {
        id: "qualification",
        title: "一、创建资质",
        content: [
          "申请创建圈子需满足以下条件：",
          "• 完成实名认证",
          "• 账号注册满30天",
          "• 无违规处罚记录",
          "• 同意并遵守本协议全部条款"
        ]
      },
      {
        id: "responsibility",
        title: "二、圈主责任",
        content: [
          "作为圈主，您需承担以下责任：",
          "• 对圈内发布的内容进行审核管理",
          "• 及时处理圈内违规内容和投诉",
          "• 维护良好的社区氛围",
          "• 确保圈子定位符合国学文化主题",
          "• 不得利用圈子从事违法违规活动"
        ],
        highlight: true
      },
      {
        id: "income",
        title: "三、收益分成",
        content: [
          "圈子收益包括入圈费、课程销售、商品分销、付费问答等。",
          "平台将按照以下比例进行分成：",
          "• 入圈费：圈主获得70%",
          "• 课程销售：讲师/圈主获得60%",
          "• 商品分销：按商品设定的佣金比例",
          "收益满100元可申请提现，T+3个工作日到账。"
        ]
      },
      {
        id: "violation",
        title: "四、违规处理",
        content: [
          "如圈子存在以下情况，平台有权采取警告、限流、封禁等措施：",
          "• 发布违反法律法规的内容",
          "• 发布封建迷信、低俗色情内容",
          "• 虚假宣传或欺诈行为",
          "• 侵犯他人合法权益",
          "• 恶意扰乱平台秩序"
        ],
        highlight: true
      }
    ]
  },
  "instructor-agreement": {
    title: "讲师签约协议",
    version: "V2.0",
    effectiveDate: "2026年1月1日",
    updateDate: "2025年12月1日",
    sections: [
      {
        id: "qualification",
        title: "一、讲师资质",
        content: [
          "申请成为讲师需满足以下条件：",
          "• 完成实名认证",
          "• 具备相关领域的专业知识或从业经验",
          "• 提供学历证明或专业资格证书",
          "• 无违规处罚记录"
        ]
      },
      {
        id: "content",
        title: "二、课程要求",
        content: [
          "讲师发布的课程需满足以下要求：",
          "• 内容原创，不得侵犯他人知识产权",
          "• 内容真实准确，不得虚假宣传",
          "• 符合国学文化主题，弘扬传统文化",
          "• 制作质量达到平台标准",
          "• 不得包含违法违规内容"
        ],
        highlight: true
      },
      {
        id: "income",
        title: "三、收益分成",
        content: [
          "课程销售收益分成规则：",
          "• 讲师自有流量：讲师获得70%",
          "• 平台推荐流量：讲师获得50%",
          "• 推广分销流量：讲师获得40%（推广者获得20%）",
          "收益满100元可申请提现，T+3个工作日到账。"
        ]
      },
      {
        id: "exclusive",
        title: "四、独家与非独家",
        content: [
          "讲师可选择独家或非独家签约：",
          "• 独家签约：课程仅在本平台发布，享受更高分成比例和平台流量扶持",
          "• 非独家签约：课程可同时在其他平台发布，按标准分成比例"
        ]
      }
    ]
  }
}

function PolicyPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const type = params.type as string
  const needSign = searchParams.get("sign") === "true"
  
  const [agreed, setAgreed] = useState(false)
  const [activeSection, setActiveSection] = useState("")
  const [showToc, setShowToc] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const policy = policies[type] || policies["user-agreement"]

  // 监听滚动，更新当前章节和返回顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300)
      
      // 更新当前章节
      const sections = document.querySelectorAll("[data-section-id]")
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i] as HTMLElement
        if (section.offsetTop <= window.scrollY + 100) {
          setActiveSection(section.dataset.sectionId || "")
          break
        }
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-section-id="${sectionId}"]`)
    if (element) {
      const top = (element as HTMLElement).offsetTop - 80
      window.scrollTo({ top, behavior: "smooth" })
    }
    setShowToc(false)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="javascript:history.back()" />
          <h1 className="font-semibold text-base text-foreground">{policy.title}</h1>
          <button 
            onClick={() => setShowToc(!showToc)}
            className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
          >
            <List className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* 目录浮层 */}
      {showToc && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowToc(false)}
          />
          <Card className="fixed top-16 right-4 z-50 w-64 max-h-[60vh] overflow-auto p-3 shadow-lg">
            <h3 className="font-medium text-sm text-foreground mb-2">目录</h3>
            <div className="space-y-1">
              {policy.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      <div ref={contentRef} className={cn("p-4 pb-8", needSign && "pb-32")}>
        {/* 版本信息 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
            <span className="text-xs text-muted-foreground">版本 {policy.version}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">生效日期：{policy.effectiveDate}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">更新日期：{policy.updateDate}</p>
        </div>

        {/* 正文区域 */}
        <div className="space-y-6">
          {policy.sections.map((section) => (
            <div 
              key={section.id} 
              data-section-id={section.id}
              className={cn(
                "rounded-lg transition-colors",
                section.highlight && "bg-accent/5 border border-accent/20 p-4 -mx-2"
              )}
            >
              <h2 className={cn(
                "font-semibold text-base text-foreground mb-3",
                section.highlight && "flex items-center gap-2"
              )}>
                {section.highlight && (
                  <span className="w-1.5 h-4 bg-accent rounded-full" />
                )}
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.content.map((paragraph, idx) => (
                  <p 
                    key={idx} 
                    className={cn(
                      "text-sm leading-relaxed",
                      paragraph.startsWith("•") || paragraph.match(/^\d+\./)
                        ? "text-foreground/80 pl-2"
                        : "text-foreground/90"
                    )}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 结尾声明 */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            如您对本协议有任何疑问，请联系客服咨询
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            客服邮箱：support@rebu.com
          </p>
        </div>
      </div>

      {/* 返回顶部按钮 */}
      {showBackTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 w-10 h-10 bg-card border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-secondary transition-colors z-30"
        >
          <ChevronUp className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* 签署场景底部操作栏 */}
      {needSign && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-pb z-40">
          <div className="max-w-lg mx-auto px-4 py-3">
            <label className="flex items-start gap-2 mb-3 cursor-pointer">
              <button
                onClick={() => setAgreed(!agreed)}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                  agreed 
                    ? "bg-primary border-primary" 
                    : "border-muted-foreground/50"
                )}
              >
                {agreed && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <span className="text-sm text-foreground/80 leading-relaxed">
                我已阅读并同意《{policy.title}》的全部条款
              </span>
            </label>
            <button
              disabled={!agreed}
              className={cn(
                "w-full py-3 rounded-xl font-medium text-sm transition-colors",
                agreed
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              同意并继续
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PolicyPageContent />
    </Suspense>
  )
}
