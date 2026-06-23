'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-lg text-foreground">隐私政策</h1>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1 p-6">
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="text-muted-foreground mb-6">更新日期：2024年1月1日</p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">一、信息收集</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            我们可能收集以下类型的信息：<br/>
            1. 账号信息：手机号、邮箱、昵称、头像等；<br/>
            2. 设备信息：设备型号、操作系统、设备标识符等；<br/>
            3. 使用信息：浏览记录、搜索记录、学习记录等；<br/>
            4. 位置信息：仅在您授权后获取。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">二、信息使用</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            我们收集的信息将用于：<br/>
            1. 提供、维护、改进我们的服务；<br/>
            2. 个性化推荐内容；<br/>
            3. 安全防护和身份验证；<br/>
            4. 与您沟通，包括发送通知和更新。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">三、信息共享</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            我们不会向第三方出售您的个人信息。在以下情况下，我们可能会共享您的信息：<br/>
            1. 获得您的明确同意后；<br/>
            2. 法律法规要求或政府部门要求；<br/>
            3. 与关联公司共享，用于提供服务；<br/>
            4. 与合作伙伴共享，用于提供特定服务（如支付）。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">四、信息存储与安全</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            1. 您的信息将存储在中华人民共和国境内的服务器上；<br/>
            2. 我们采用行业标准的安全措施保护您的信息；<br/>
            3. 我们会定期审查安全措施并及时更新。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">五、您的权利</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            您有权：<br/>
            1. 访问、更正您的个人信息；<br/>
            2. 删除您的账号和相关数据；<br/>
            3. 撤回授权同意；<br/>
            4. 注销账号。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">六、未成年人保护</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            我们重视未成年人的隐私保护。如果您是未满18周岁的未成年人，请在监护人的指导下使用我们的服务。
          </p>
          
          <h2 className="text-lg font-bold mt-6 mb-3">七、联系我们</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            如您对本隐私政策有任何疑问，请联系：<br/>
            客服邮箱：privacy@rebu.com<br/>
            客服电话：400-xxx-xxxx
          </p>
        </div>
      </main>
    </div>
  )
}
