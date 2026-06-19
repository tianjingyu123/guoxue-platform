'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function StationAgreementPage() {
  const router = useRouter()

  const sections = [
    {
      title: '第一条 总则',
      content: '本协议是站长与本平台之间的法律文件，规范站长在平台上发布内容和管理社区的权利义务。站长应在同意本协议后才能开始发布活动。',
    },
    {
      title: '第二条 站长定义',
      content: '站长是指在平台上创建并运营专题、栏目或社区的个人或组织。站长应具有完全民事行为能力，且对发布的内容负全责。',
    },
    {
      title: '第三条 站长权利',
      content: '站长有权创建专属社区，发布各类内容，管理粉丝互动。站长可获得平台分配的流量和广告收益。',
    },
    {
      title: '第四条 站长义务',
      content: '站长应确保所有内容合法合规，不得发布虚假或误导性信息。站长需定期维护社区秩序，删除违规内容。',
    },
    {
      title: '第五条 内容审核',
      content: '平台将对所有发布的内容进行审核。站长应配合平台审核工作，及时修改或删除违规内容。',
    },
    {
      title: '第六条 收益分配',
      content: '站长的收益来源包括：直播打赏、商品销售、广告收入等。平台按照不同收益类型进行分成，具体比例见《收益分成协议》。',
    },
    {
      title: '第七条 社区管理',
      content: '站长应维护社区健康环境，禁止骚扰、诋毁等行为。平台有权干预和处理严重违规的社区。',
    },
    {
      title: '第八条 违约处理',
      content: '违反本协议的站长将被暂停发布功能、降低流量或解除合作。严重违规将被永久封禁。',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">站长协议</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        <div className="mx-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">重要提示</h3>
          <p className="text-sm text-blue-800">
            本协议自您注册成为站长时生效。请仔细阅读所有条款，了解您的权利和义务。
          </p>
        </div>

        {/* 协议内容 */}
        <div className="mx-4 mt-4 space-y-3">
          {sections.map((section, idx) => (
            <Card key={idx} className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </Card>
          ))}
        </div>

        {/* 最后更新时间 */}
        <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">最后更新时间：2024年1月1日</p>
          <p className="text-xs text-muted-foreground mt-2">版本号：v1.0</p>
        </div>
      </div>
    </div>
  )
}
