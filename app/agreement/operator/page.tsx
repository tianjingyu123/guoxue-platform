'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function OperatorAgreementPage() {
  const router = useRouter()

  const sections = [
    {
      title: '第一条 总则',
      content: '本协议是运营商与本平台之间的法律文件，规范双方在平台运营中的权利和义务。运营商应在同意本协议全部条款后才能进行运营活动。',
    },
    {
      title: '第二条 运营商资格',
      content: '运营商必须具有完全民事行为能力，且在相关部门已依法注册。运营商应对其提供的所有信息的真实性负责。',
    },
    {
      title: '第三条 运营商权利',
      content: '运营商有权在平台上发布内容、创建圈子、开设店铺等。运营商获得的收益由平台与运营商按照约定比例分成。',
    },
    {
      title: '第四条 运营商义务',
      content: '运营商不得发布违反法律法规的内容，不得骚扰其他用户，不得从事欺诈活动。运营商应积极配合平台的管理和审查。',
    },
    {
      title: '第五条 内容规范',
      content: '所有发布的内容应符合国家法律法规和平台规范。不得包含色情、暴力、歧视等违法违规内容。',
    },
    {
      title: '第六条 费用结算',
      content: '平台与运营商的收益分成比例为：平台25%，运营商75%。结算周期为自然月，次月1日起可申请提现。',
    },
    {
      title: '第七条 违约处理',
      content: '若运营商违反本协议，平台有权进行警告、限制功能或封禁账户等处理。情节严重的将移交司法部门处理。',
    },
    {
      title: '第八条 协议变更',
      content: '平台保留修改本协议的权利。重大修改会提前30天通知运营商。继续使用平台即视为接受新协议。',
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
          <h1 className="text-lg font-semibold text-foreground">运营商协议</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        <div className="mx-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">重要提示</h3>
          <p className="text-sm text-blue-800">
            本协议自您成为平台运营商时生效。请仔细阅读，如有任何疑问，请联系客服。
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
