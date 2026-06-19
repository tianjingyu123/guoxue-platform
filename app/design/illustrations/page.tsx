"use client"

import { Card } from "@/components/ui/card"
import { 
  MaleDefaultAvatar, 
  FemaleDefaultAvatar, 
  NeutralDefaultAvatar, 
  CircleOwnerDefaultAvatar, 
  SystemDefaultAvatar 
} from "@/components/illustrations/default-avatars"
import { 
  EmptyGeneral, 
  EmptyContent, 
  EmptyNetwork, 
  EmptyMessages, 
  EmptySearch, 
  EmptyPaymentSuccess, 
  EmptyPaymentFailed, 
  Empty404 
} from "@/components/illustrations/empty-states"
import { 
  GuidePaipan, 
  GuideJoinCircle, 
  GuideLearnCourse, 
  GuidePublish, 
  GuideVip 
} from "@/components/illustrations/guide-illustrations"
import { 
  PaipanIcon, 
  CircleIcon, 
  CourseIcon, 
  MallIcon, 
  DiscoverIcon, 
  CoverPlaceholder, 
  PlatformLogo 
} from "@/components/illustrations/icons-placeholders"
import { BackButton } from "@/components/common/back-button"
import { } from "lucide-react"
import Link from "next/link"

export default function IllustrationsPage() {
  return (
    <div className="min-h-screen bg-background pb-10">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-14 px-4">
          <BackButton />
          <h1 className="ml-2 font-semibold text-foreground">插画设计资源</h1>
        </div>
      </header>

      <div className="p-4 space-y-8">
        {/* 默认头像 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">默认头像（5款）</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="flex flex-col items-center gap-2">
              <MaleDefaultAvatar size={64} />
              <span className="text-xs text-muted-foreground">男性</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <FemaleDefaultAvatar size={64} />
              <span className="text-xs text-muted-foreground">女性</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NeutralDefaultAvatar size={64} />
              <span className="text-xs text-muted-foreground">通用</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CircleOwnerDefaultAvatar size={64} />
              <span className="text-xs text-muted-foreground">圈主</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <SystemDefaultAvatar size={64} />
              <span className="text-xs text-muted-foreground">系统</span>
            </div>
          </div>
        </section>

        {/* 空状态插画 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">空状态插画（8幅）</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { component: <EmptyGeneral size={120} />, label: "通用空状态", desc: "等待书写" },
              { component: <EmptyContent size={120} />, label: "无内容", desc: "暂无内容" },
              { component: <EmptyNetwork size={120} />, label: "无网络", desc: "网络异常" },
              { component: <EmptyMessages size={120} />, label: "无消息", desc: "消息中心" },
              { component: <EmptySearch size={120} />, label: "搜索无结果", desc: "未找到相关内容" },
              { component: <EmptyPaymentSuccess size={120} />, label: "支付成功", desc: "喜庆祥和" },
              { component: <EmptyPaymentFailed size={120} />, label: "支付失败", desc: "安抚情绪" },
              { component: <Empty404 size={120} />, label: "404错误", desc: "页面不存在" },
            ].map((item, i) => (
              <Card key={i} className="p-4 flex flex-col items-center gap-2 bg-card">
                {item.component}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* 引导插画 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">引导插画（5幅）</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { component: <GuidePaipan size={140} />, label: "排盘引导", desc: "输入生辰，探寻命理" },
              { component: <GuideJoinCircle size={140} />, label: "加入圈子", desc: "加入圈子，结交同好" },
              { component: <GuideLearnCourse size={140} />, label: "学习课程", desc: "名师指路，研习经典" },
              { component: <GuidePublish size={140} />, label: "发布内容", desc: "分享你的国学见解" },
              { component: <GuideVip size={140} />, label: "开通会员", desc: "解锁更多智慧解读" },
            ].map((item, i) => (
              <Card key={i} className="p-4 flex flex-col items-center gap-2 bg-card">
                {item.component}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* 功能图标 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">功能图标</h2>
          <Card className="p-4 bg-card">
            <div className="grid grid-cols-5 gap-6">
              {[
                { icon: <PaipanIcon size={32} />, label: "排盘" },
                { icon: <CircleIcon size={32} />, label: "圈子" },
                { icon: <CourseIcon size={32} />, label: "课程" },
                { icon: <MallIcon size={32} />, label: "商城" },
                { icon: <DiscoverIcon size={32} />, label: "发现" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  {item.icon}
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">填充样式</p>
              <div className="grid grid-cols-5 gap-6">
                {[
                  { icon: <PaipanIcon size={32} variant="fill" />, label: "排盘" },
                  { icon: <CircleIcon size={32} variant="fill" />, label: "圈子" },
                  { icon: <CourseIcon size={32} variant="fill" />, label: "课程" },
                  { icon: <MallIcon size={32} variant="fill" />, label: "商城" },
                  { icon: <DiscoverIcon size={32} variant="fill" />, label: "发现" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    {item.icon}
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* 占位图和Logo */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">占位图与Logo</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col items-center gap-2 bg-card">
              <CoverPlaceholder width={140} height={80} />
              <span className="text-sm text-muted-foreground">封面占位图</span>
            </Card>
            <Card className="p-4 flex flex-col items-center gap-2 bg-card">
              <PlatformLogo size={64} />
              <span className="text-sm text-muted-foreground">平台Logo</span>
            </Card>
          </div>
        </section>

        {/* 配色说明 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">配色方案</h2>
          <Card className="p-4 bg-card">
            <div className="grid grid-cols-4 gap-4">
              {[
                { color: "#C41E3A", name: "故宫红", usage: "主色/强调" },
                { color: "#F5F1EB", name: "宣纸米白", usage: "背景/底色" },
                { color: "#C9A96E", name: "金色", usage: "点缀/装饰" },
                { color: "#2C2C2C", name: "墨色", usage: "文字/线条" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div 
                    className="w-12 h-12 rounded-lg border border-border" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-foreground">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">{item.usage}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
