import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { LegalDocument, LegalDocType, LegalDocListItem, LegalDocTocItem } from '../types/legal'

// Mock 文档内容
const mockDocContents: Record<LegalDocType, { title: string; content: string }> = {
  'user-agreement': {
    title: '用户服务协议',
    content: `
      <h2 id="intro">一、总则</h2>
      <p>欢迎您使用热卜平台服务。本协议是您与热卜平台之间关于使用平台服务所订立的协议。请您仔细阅读本协议，一旦您使用本平台服务，即视为您已阅读、理解并同意受本协议的约束。</p>
      
      <h2 id="account">二、账号注册与管理</h2>
      <p>2.1 用户在注册账号时，应提供真实、准确、完整的个人资料，并在资料发生变更时及时更新。</p>
      <p>2.2 用户应妥善保管账号和密码，对以其账号进行的所有活动和事件负法律责任。</p>
      <p>2.3 用户不得将账号转让、出借给他人使用。</p>
      
      <h2 id="service">三、服务内容</h2>
      <p>3.1 平台提供国学知识课程、直播、社区交流等服务。</p>
      <p>3.2 平台有权根据业务发展需要，随时调整服务内容。</p>
      <p>3.3 用户理解并同意，平台可能因升级、维护等原因暂时中断服务。</p>
      
      <h2 id="behavior">四、用户行为规范</h2>
      <p>4.1 用户不得利用平台发布违法、违规、侵权内容。</p>
      <p>4.2 用户不得进行任何危害平台安全的行为。</p>
      <p>4.3 用户应遵守平台社区规范，文明交流。</p>
      
      <h2 id="ip">五、知识产权</h2>
      <p>5.1 平台内的课程、文章等内容的知识产权归平台或原作者所有。</p>
      <p>5.2 未经授权，用户不得复制、传播、销售平台内容。</p>
      
      <h2 id="liability">六、免责声明</h2>
      <p>6.1 平台提供的命理、风水等内容仅供参考，不构成任何专业建议。</p>
      <p>6.2 用户应对其使用平台服务的行为和后果自行承担责任。</p>
      
      <h2 id="termination">七、协议终止</h2>
      <p>7.1 用户可随时注销账号，终止本协议。</p>
      <p>7.2 平台有权在用户违反本协议时，暂停或终止为其提供服务。</p>
      
      <h2 id="misc">八、其他</h2>
      <p>8.1 本协议的解释、效力及争议解决均适用中华人民共和国法律。</p>
      <p>8.2 平台有权根据需要修改本协议，修改后的协议一经公布即生效。</p>
    `,
  },
  'privacy-policy': {
    title: '隐私政策',
    content: `
      <h2 id="intro">一、引言</h2>
      <p>热卜平台（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。我们承诺按照本隐私政策收集、使用、存储和共享您的个人信息。</p>
      
      <h2 id="collect">二、我们收集的信息</h2>
      <p>2.1 <strong>账号信息</strong>：注册时提供的手机号、昵称、头像等。</p>
      <p>2.2 <strong>身份信息</strong>：实名认证时提供的姓名、身份证号等。</p>
      <p>2.3 <strong>出生信息</strong>：使用排盘功能时提供的出生日期、时辰、出生地等。</p>
      <p>2.4 <strong>设备信息</strong>：设备型号、操作系统、设备标识符等。</p>
      <p>2.5 <strong>日志信息</strong>：浏览记录、搜索记录、操作日志等。</p>
      
      <h2 id="use">三、我们如何使用信息</h2>
      <p>3.1 提供并改进我们的服务。</p>
      <p>3.2 向您推送个性化内容和服务。</p>
      <p>3.3 保障平台安全，防止欺诈行为。</p>
      <p>3.4 与您沟通并提供客户支持。</p>
      
      <h2 id="share">四、信息共享</h2>
      <p>4.1 我们不会向第三方出售您的个人信息。</p>
      <p>4.2 在以下情况下，我们可能会共享您的信息：</p>
      <ul>
        <li>获得您的明确同意。</li>
        <li>根据法律法规要求。</li>
        <li>与关联公司共享以提供服务。</li>
      </ul>
      
      <h2 id="protect">五、信息保护</h2>
      <p>5.1 我们采用加密技术保护您的数据传输和存储。</p>
      <p>5.2 我们建立了严格的数据访问权限控制机制。</p>
      
      <h2 id="rights">六、您的权利</h2>
      <p>6.1 您可以访问、更正、删除您的个人信息。</p>
      <p>6.2 您可以撤回已给予的授权同意。</p>
      <p>6.3 您可以注销您的账号。</p>
      
      <h2 id="contact">七、联系我们</h2>
      <p>如您对本隐私政策有任何疑问，可通过以下方式联系我们：</p>
      <p>客服邮箱：privacy@rebu.com</p>
    `,
  },
  'community-rules': {
    title: '社区规范',
    content: `
      <h2 id="intro">一、总则</h2>
      <p>为维护良好的社区氛围，保障用户权益，特制定本规范。所有用户在使用热卜社区服务时，应遵守本规范。</p>
      
      <h2 id="content">二、内容规范</h2>
      <p>2.1 <strong>禁止发布违法内容</strong>：包括但不限于违反国家法律法规、危害国家安全、传播淫秽色情、宣扬封建迷信等内容。</p>
      <p>2.2 <strong>禁止侵权行为</strong>：不得盗用他人作品、侵犯他人知识产权。</p>
      <p>2.3 <strong>禁止虚假信息</strong>：不得发布虚假、误导性信息。</p>
      <p>2.4 <strong>禁止商业广告</strong>：未经许可不得发布商业推广信息。</p>
      
      <h2 id="behavior">三、行为规范</h2>
      <p>3.1 <strong>尊重他人</strong>：不得辱骂、骚扰、威胁其他用户。</p>
      <p>3.2 <strong>诚信交流</strong>：不得冒充他人或虚假宣传。</p>
      <p>3.3 <strong>文明互动</strong>：保持理性、友善的交流态度。</p>
      
      <h2 id="punish">四、违规处理</h2>
      <p>4.1 违反本规范的用户，平台将视情节轻重采取以下措施：</p>
      <ul>
        <li>警告、删除违规内容</li>
        <li>限制部分功能使用</li>
        <li>暂停账号</li>
        <li>永久封禁账号</li>
      </ul>
      
      <h2 id="report">五、举报机制</h2>
      <p>5.1 如发现违规内容或行为，请使用举报功能。</p>
      <p>5.2 平台将在收到举报后24小时内处理。</p>
    `,
  },
  'refund-policy': {
    title: '退款政策',
    content: `
      <h2 id="scope">一、适用范围</h2>
      <p>本政策适用于在热卜平台购买的所有付费商品和服务。</p>
      
      <h2 id="course">二、课程退款</h2>
      <p>2.1 课程购买后7天内，且学习进度不超过30%，可申请全额退款。</p>
      <p>2.2 超过上述期限或进度，一般不予退款。</p>
      <p>2.3 特殊情况可联系客服协商处理。</p>
      
      <h2 id="vip">三、会员退款</h2>
      <p>3.1 会员开通后7天内，未使用任何会员权益，可申请退款。</p>
      <p>3.2 已使用会员权益的，按实际使用天数扣除后退款。</p>
      
      <h2 id="process">四、退款流程</h2>
      <p>4.1 在订单详情页点击"申请退款"。</p>
      <p>4.2 填写退款原因并提交。</p>
      <p>4.3 平台审核通过后，退款将在3-5个工作日内原路返回。</p>
    `,
  },
  'copyright': {
    title: '版权声明',
    content: `
      <h2 id="ownership">一、知识产权归属</h2>
      <p>热卜平台内所有内容，包括但不限于文字、图片、音频、视频、软件、程序、版面设计等，其知识产权归热卜平台或相关权利人所有。</p>
      
      <h2 id="use">二、内容使用</h2>
      <p>2.1 未经授权，任何人不得复制、修改、传播平台内容。</p>
      <p>2.2 个人学习目的可以浏览、下载，但不得用于商业用途。</p>
      
      <h2 id="infringement">三、侵权投诉</h2>
      <p>如您认为平台内容侵犯了您的合法权益，请发送投诉函至：copyright@rebu.com</p>
      <p>投诉函应包含：权利证明、侵权内容链接、联系方式等。</p>
    `,
  },
}

// Mock 文档列表
const mockDocList: LegalDocListItem[] = [
  { type: 'user-agreement', title: '用户服务协议', version: 'v2.1', updatedAt: '2026-05-01', requireConfirm: true, hasConfirmed: true },
  { type: 'privacy-policy', title: '隐私政策', version: 'v2.0', updatedAt: '2026-05-01', requireConfirm: true, hasConfirmed: true },
  { type: 'community-rules', title: '社区规范', version: 'v1.5', updatedAt: '2026-04-15', requireConfirm: false, hasConfirmed: false },
  { type: 'refund-policy', title: '退款政策', version: 'v1.2', updatedAt: '2026-03-01', requireConfirm: false, hasConfirmed: false },
  { type: 'copyright', title: '版权声明', version: 'v1.0', updatedAt: '2026-01-01', requireConfirm: false, hasConfirmed: false },
]

/**
 * 获取法律文档列表
 */
export async function getLegalDocList(): Promise<ApiResponse<LegalDocListItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: mockDocList, message: 'success' }
  }
  return apiGet<LegalDocListItem[]>('/system/legal')
}

/**
 * 获取法律文档详情
 */
export async function getLegalDocument(type: LegalDocType): Promise<ApiResponse<LegalDocument>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const mockContent = mockDocContents[type]
    const listItem = mockDocList.find(d => d.type === type)
    return {
      code: 200,
      data: {
        id: mockDocList.findIndex(d => d.type === type) + 1,
        type,
        title: mockContent.title,
        version: listItem?.version || 'v1.0',
        effectiveDate: '2026-01-01',
        updatedAt: listItem?.updatedAt || '2026-01-01',
        htmlContent: mockContent.content,
        requireConfirm: listItem?.requireConfirm || false,
        hasConfirmed: listItem?.hasConfirmed,
      },
      message: 'success',
    }
  }
  return apiGet<LegalDocument>(`/system/legal/${type}`)
}

/**
 * 确认已阅读文档
 */
export async function confirmLegalDocument(type: LegalDocType): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '已确认' }
  }
  return apiPost<{ success: boolean }>(`/system/legal/${type}/confirm`)
}

/**
 * 获取文档类型标签
 */
export function getLegalDocTypeLabel(type: LegalDocType): string {
  const labels: Record<LegalDocType, string> = {
    'user-agreement': '用户协议',
    'privacy-policy': '隐私政策',
    'community-rules': '社区规范',
    'refund-policy': '退款政策',
    'copyright': '版权声明',
  }
  return labels[type]
}

/**
 * 从 HTML 内容提取目录
 */
export function extractTocFromHtml(html: string): LegalDocTocItem[] {
  const toc: LegalDocTocItem[] = []
  const regex = /<h([2-4])\s+id="([^"]+)"[^>]*>([^<]+)<\/h[2-4]>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    toc.push({
      id: match[2],
      title: match[3],
      level: parseInt(match[1], 10),
    })
  }
  return toc
}
