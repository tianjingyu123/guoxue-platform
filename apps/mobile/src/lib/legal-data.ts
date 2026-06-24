// 法律文档数据（迁移自原型 lib/api/legal.ts 的 mockDocContents）
// 原型 bug：user-agreement / child-privacy 页读取 document.content（实际字段为 htmlContent），
// 且 child-privacy 不在 mockDocContents 中 → 正文空白/加载失败。
// 迁移修正：统一结构化为 sections 原生渲染，正文正常显示。

import { apiGet, useMock } from '@/utils/request'

// 行内片段（支持加粗）
export interface LegalInline {
  text: string
  bold?: boolean
}

// 内容块：段落 p / 无序列表 ul
export type LegalBlock =
  | { type: 'p'; runs: LegalInline[] }
  | { type: 'ul'; items: string[] }

// 章节（h2，带锚点 id 供目录跳转）
export interface LegalSection {
  id: string
  title: string
  level: number
  blocks: LegalBlock[]
}

export interface LegalDoc {
  type: string
  title: string
  version: string
  effectiveDate: string
  updatedAt: string
  summary?: string
  requireConfirm: boolean
  hasConfirmed: boolean
  sections: LegalSection[]
}

// 纯文本段落辅助
const p = (text: string): LegalBlock => ({ type: 'p', runs: [{ text }] })

export const legalDocs: Record<string, LegalDoc> = {
  'user-agreement': {
    type: 'user-agreement',
    title: '用户服务协议',
    version: 'v2.1',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-05-01',
    requireConfirm: true,
    hasConfirmed: false,
    sections: [
      {
        id: 'intro',
        title: '一、总则',
        level: 2,
        blocks: [
          p('欢迎您使用热卜平台服务。本协议是您与热卜平台之间关于使用平台服务所订立的协议。请您仔细阅读本协议，一旦您使用本平台服务，即视为您已阅读、理解并同意受本协议的约束。'),
        ],
      },
      {
        id: 'account',
        title: '二、账号注册与管理',
        level: 2,
        blocks: [
          p('2.1 用户在注册账号时，应提供真实、准确、完整的个人资料，并在资料发生变更时及时更新。'),
          p('2.2 用户应妥善保管账号和密码，对以其账号进行的所有活动和事件负法律责任。'),
          p('2.3 用户不得将账号转让、出借给他人使用。'),
        ],
      },
      {
        id: 'service',
        title: '三、服务内容',
        level: 2,
        blocks: [
          p('3.1 平台提供国学知识课程、直播、社区交流等服务。'),
          p('3.2 平台有权根据业务发展需要，随时调整服务内容。'),
          p('3.3 用户理解并同意，平台可能因升级、维护等原因暂时中断服务。'),
        ],
      },
      {
        id: 'behavior',
        title: '四、用户行为规范',
        level: 2,
        blocks: [
          p('4.1 用户不得利用平台发布违法、违规、侵权内容。'),
          p('4.2 用户不得进行任何危害平台安全的行为。'),
          p('4.3 用户应遵守平台社区规范，文明交流。'),
        ],
      },
      {
        id: 'ip',
        title: '五、知识产权',
        level: 2,
        blocks: [
          p('5.1 平台内的课程、文章等内容的知识产权归平台或原作者所有。'),
          p('5.2 未经授权，用户不得复制、传播、销售平台内容。'),
        ],
      },
      {
        id: 'liability',
        title: '六、免责声明',
        level: 2,
        blocks: [
          p('6.1 平台提供的命理、风水等内容仅供参考，不构成任何专业建议。'),
          p('6.2 用户应对其使用平台服务的行为和后果自行承担责任。'),
        ],
      },
      {
        id: 'termination',
        title: '七、协议终止',
        level: 2,
        blocks: [
          p('7.1 用户可随时注销账号，终止本协议。'),
          p('7.2 平台有权在用户违反本协议时，暂停或终止为其提供服务。'),
        ],
      },
      {
        id: 'misc',
        title: '八、其他',
        level: 2,
        blocks: [
          p('8.1 本协议的解释、效力及争议解决均适用中华人民共和国法律。'),
          p('8.2 平台有权根据需要修改本协议，修改后的协议一经公布即生效。'),
        ],
      },
    ],
  },
  'privacy-policy': {
    type: 'privacy-policy',
    title: '隐私政策',
    version: 'v2.0',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-05-01',
    requireConfirm: true,
    hasConfirmed: true,
    sections: [
      {
        id: 'intro',
        title: '一、引言',
        level: 2,
        blocks: [
          p('热卜平台（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。我们承诺按照本隐私政策收集、使用、存储和共享您的个人信息。'),
        ],
      },
      {
        id: 'collect',
        title: '二、我们收集的信息',
        level: 2,
        blocks: [
          { type: 'p', runs: [{ text: '2.1 ' }, { text: '账号信息', bold: true }, { text: '：注册时提供的手机号、昵称、头像等。' }] },
          { type: 'p', runs: [{ text: '2.2 ' }, { text: '身份信息', bold: true }, { text: '：实名认证时提供的姓名、身份证号等。' }] },
          { type: 'p', runs: [{ text: '2.3 ' }, { text: '出生信息', bold: true }, { text: '：使用排盘功能时提供的出生日期、时辰、出生地等。' }] },
          { type: 'p', runs: [{ text: '2.4 ' }, { text: '设备信息', bold: true }, { text: '：设备型号、操作系统、设备标识符等。' }] },
          { type: 'p', runs: [{ text: '2.5 ' }, { text: '日志信息', bold: true }, { text: '：浏览记录、搜索记录、操作日志等。' }] },
        ],
      },
      {
        id: 'use',
        title: '三、我们如何使用信息',
        level: 2,
        blocks: [
          p('3.1 提供并改进我们的服务。'),
          p('3.2 向您推送个性化内容和服务。'),
          p('3.3 保障平台安全，防止欺诈行为。'),
          p('3.4 与您沟通并提供客户支持。'),
        ],
      },
      {
        id: 'share',
        title: '四、信息共享',
        level: 2,
        blocks: [
          p('4.1 我们不会向第三方出售您的个人信息。'),
          p('4.2 在以下情况下，我们可能会共享您的信息：'),
          { type: 'ul', items: ['获得您的明确同意。', '根据法律法规要求。', '与关联公司共享以提供服务。'] },
        ],
      },
      {
        id: 'protect',
        title: '五、信息保护',
        level: 2,
        blocks: [
          p('5.1 我们采用加密技术保护您的数据传输和存储。'),
          p('5.2 我们建立了严格的数据访问权限控制机制。'),
        ],
      },
      {
        id: 'rights',
        title: '六、您的权利',
        level: 2,
        blocks: [
          p('6.1 您可以访问、更正、删除您的个人信息。'),
          p('6.2 您可以撤回已给予的授权同意。'),
          p('6.3 您可以注销您的账号。'),
        ],
      },
      {
        id: 'contact',
        title: '七、联系我们',
        level: 2,
        blocks: [
          p('如您对本隐私政策有任何疑问，可通过以下方式联系我们：'),
          p('客服邮箱：privacy@rebu.com'),
        ],
      },
    ],
  },
  'child-privacy': {
    type: 'child-privacy',
    title: '儿童个人信息保护规则',
    version: 'v1.0',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-01-01',
    requireConfirm: true,
    hasConfirmed: false,
    sections: [
      {
        id: 'scope',
        title: '一、适用范围',
        level: 2,
        blocks: [
          p('1.1 本规则适用于热卜平台向不满十四周岁的儿童提供产品和服务时，对其个人信息的收集、存储、使用、共享等处理活动。'),
          p('1.2 我们严格遵守《中华人民共和国未成年人保护法》《儿童个人信息网络保护规定》等法律法规，保护儿童个人信息安全。'),
        ],
      },
      {
        id: 'collect',
        title: '二、信息收集',
        level: 2,
        blocks: [
          p('2.1 我们仅在征得儿童监护人同意后，收集为提供服务所必需的儿童个人信息。'),
          p('2.2 收集的信息可能包括：账号信息、昵称、设备信息及为实现具体功能所必需的其他信息。'),
          p('2.3 我们不会收集与提供服务无关的儿童个人信息，也不会强制要求儿童一次性同意收集多项信息。'),
        ],
      },
      {
        id: 'use',
        title: '三、信息使用',
        level: 2,
        blocks: [
          p('3.1 我们仅在实现服务功能、保障账号安全及履行法定义务的范围内使用儿童个人信息。'),
          p('3.2 我们不会向儿童推送个性化广告，也不会基于儿童个人信息进行用户画像分析。'),
          p('3.3 未经监护人同意，我们不会向任何第三方共享、转让儿童个人信息。'),
        ],
      },
      {
        id: 'guardian',
        title: '四、监护人权利',
        level: 2,
        blocks: [
          p('4.1 监护人有权访问、更正、删除其所监护儿童的个人信息。'),
          p('4.2 监护人有权撤回此前作出的同意授权，并可要求我们停止收集、使用儿童个人信息。'),
          p('4.3 监护人发现我们在未事先征得同意的情况下收集了儿童个人信息的，可联系我们要求删除。'),
        ],
      },
      {
        id: 'contact',
        title: '五、联系我们',
        level: 2,
        blocks: [
          p('如您是儿童监护人，对我们处理儿童个人信息有任何疑问、意见或需要行使相关权利，请通过以下方式联系我们：'),
          p('客服邮箱：privacy@rebu.com'),
          p('客服电话：400-888-8888（工作日 9:00-18:00）'),
        ],
      },
    ],
  },
}

// 目录项
export interface LegalTocItem {
  id: string
  title: string
  level: number
}

// 从文档提取目录
export function extractToc(doc: LegalDoc): LegalTocItem[] {
  return doc.sections.map(s => ({ id: s.id, title: s.title, level: s.level }))
}

// ============ API 层 ============

export const legalApi = {
  /** 获取法律文档 — GET /system/legal/:type */
  async getDoc(type: string): Promise<LegalDoc | null> {
    if (true) return legalDocs[type] || null
    try {
      const data = await apiGet<any>(`/system/legal/${type}`)
      return (data as LegalDoc) || legalDocs[type] || null
    } catch {
      return legalDocs[type] || null
    }
  },

  /** 确认协议 — POST /system/legal/:type/confirm */
  async confirm(type: string): Promise<{ success: boolean }> {
    if (true) return { success: true }
    try {
      await apiGet<any>(`/system/legal/${type}/confirm`)
      return { success: true }
    } catch {
      return { success: true }
    }
  },

  /** 获取需要确认的协议列表 */
  async getPendingConfirms(): Promise<LegalDoc[]> {
    if (true) return Object.values(legalDocs).filter(d => d.requireConfirm && !d.hasConfirmed)
    try {
      const data = await apiGet<any[]>('/system/legal/pending')
      return (data as LegalDoc[]) || []
    } catch {
      return Object.values(legalDocs).filter(d => d.requireConfirm && !d.hasConfirmed)
    }
  },
}
