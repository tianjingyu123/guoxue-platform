// 智能客服 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  CSConfig, 
  CSMessage, 
  CSSession, 
  RatingRequest,
  KnowledgeReference
} from '../types/customer-service'

// ========== Mock 数据 ==========

const mockConfig: CSConfig = {
  welcomeMessage: '您好！我是热卜智能客服小助手，很高兴为您服务。请问有什么可以帮您的？',
  suggestions: [
    '如何充值国学币？',
    '课程无法播放怎么办？',
    '如何申请退款？',
    '排盘工具使用教程',
    '如何成为讲师？',
    '会员权益介绍',
  ],
  workingHours: '9:00-22:00',
  isHumanAvailable: true,
  currentQueueCount: 3,
}

// ========== API 函数 ==========

/**
 * 获取客服配置
 */
export async function getCSConfig(): Promise<ApiResponse<CSConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: mockConfig, message: 'success' }
  }
  return apiGet<CSConfig>('/customer-service/config')
}

/**
 * 创建或获取客服会话
 */
export async function getOrCreateCSSession(): Promise<ApiResponse<CSSession>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        id: 'cs_session_' + Date.now(),
        status: 'ai',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: 'success',
    }
  }
  return apiGet<CSSession>('/customer-service/session')
}

/**
 * 发送消息（流式）
 */
export async function sendCSMessageStream(
  sessionId: string,
  content: string,
  callbacks: {
    onStart?: () => void
    onToken?: (token: string) => void
    onComplete?: (message: CSMessage) => void
    onError?: (error: Error) => void
  }
): Promise<void> {
  callbacks.onStart?.()

  // Mock 知识库搜索结果
  const mockReferences: KnowledgeReference[] = content.includes('充值') ? [
    { id: 1, title: '国学币充值指南', url: '/help/recharge', snippet: '支持微信、支付宝等多种充值方式...' },
    { id: 2, title: '充值优惠活动', url: '/help/recharge-bonus', snippet: '当前充值满100送10国学币...' },
  ] : content.includes('退款') ? [
    { id: 3, title: '退款政策说明', url: '/help/refund', snippet: '购买后7天内未学习可申请全额退款...' },
  ] : []

  // 根据问题生成回复
  let response = ''
  if (content.includes('充值')) {
    response = '关于国学币充值，您可以按照以下步骤操作：\n\n' +
      '1. 进入【我的钱包】页面\n' +
      '2. 点击【充值】按钮\n' +
      '3. 选择充值金额（支持微信/支付宝支付）\n' +
      '4. 完成支付后国学币即时到账\n\n' +
      '**温馨提示：** 当前充值满100送10国学币哦！\n\n' +
      '如果您在充值过程中遇到问题，可以点击下方"转人工"联系人工客服。'
  } else if (content.includes('退款')) {
    response = '关于退款申请，请参考以下说明：\n\n' +
      '**退款条件：**\n' +
      '- 购买后7天内\n' +
      '- 课程学习进度不超过20%\n' +
      '- 虚拟商品（国学币、会员）购买后不支持退款\n\n' +
      '**申请流程：**\n' +
      '1. 进入【我的订单】\n' +
      '2. 找到需要退款的订单\n' +
      '3. 点击【申请退款】\n' +
      '4. 填写退款原因并提交\n\n' +
      '退款一般1-3个工作日内原路返回。'
  } else if (content.includes('播放') || content.includes('无法')) {
    response = '课程无法播放可能由以下原因导致：\n\n' +
      '1. **网络问题**：请检查网络连接是否正常\n' +
      '2. **缓存问题**：尝试清除APP缓存后重试\n' +
      '3. **版本过旧**：请更新到最新版本APP\n' +
      '4. **设备兼容**：部分老旧设备可能存在兼容问题\n\n' +
      '如果以上方法都无法解决，建议您转人工客服，我们会为您进一步排查。'
  } else if (content.includes('讲师')) {
    response = '感谢您有意成为热卜平台讲师！\n\n' +
      '**申请条件：**\n' +
      '- 在国学相关领域有专业背景或从业经验\n' +
      '- 拥有相关资质证书优先\n' +
      '- 认同平台价值观，遵守平台规范\n\n' +
      '**申请流程：**\n' +
      '1. 进入【个人中心】→【成为讲师】\n' +
      '2. 填写个人信息和专业背景\n' +
      '3. 上传资质证明材料\n' +
      '4. 等待平台审核（1-3个工作日）\n\n' +
      '审核通过后即可开始创建课程。'
  } else if (content.includes('会员')) {
    response = '热卜VIP会员权益包括：\n\n' +
      '**核心权益：**\n' +
      '- 专属会员折扣（课程享8折）\n' +
      '- 每月赠送国学币\n' +
      '- 排盘工具无限使用\n' +
      '- 专属客服优先服务\n\n' +
      '**套餐价格：**\n' +
      '- 月度会员：￥29/月\n' +
      '- 季度会员：￥79/季（省8元）\n' +
      '- 年度会员：￥299/年（省49元）\n\n' +
      '开通入口：【个人中心】→【会员中心】'
  } else {
    response = '感谢您的提问。\n\n' +
      '关于"' + content.slice(0, 20) + (content.length > 20 ? '...' : '') + '"这个问题，' +
      '我需要了解更多具体情况才能为您提供准确的帮助。\n\n' +
      '您可以：\n' +
      '1. 描述更具体的问题场景\n' +
      '2. 上传相关截图\n' +
      '3. 点击"转人工"联系人工客服\n\n' +
      '我会尽力为您解答！'
  }

  // 模拟流式输出
  let currentIndex = 0
  const interval = setInterval(() => {
    if (currentIndex < response.length) {
      const chunk = response.slice(currentIndex, currentIndex + Math.floor(Math.random() * 3) + 1)
      currentIndex += chunk.length
      callbacks.onToken?.(chunk)
    } else {
      clearInterval(interval)
      callbacks.onComplete?.({
        id: 'msg_' + Date.now(),
        role: 'assistant',
        type: 'text',
        content: response,
        references: mockReferences.length > 0 ? mockReferences : undefined,
        createdAt: new Date().toISOString(),
      })
    }
  }, 25)
}

/**
 * 请求转人工
 */
export async function requestTransferToHuman(sessionId: string): Promise<ApiResponse<{
  success: boolean
  queuePosition: number
  estimatedWait: string
}>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        success: true,
        queuePosition: 3,
        estimatedWait: '约5分钟',
      },
      message: '已加入人工客服排队',
    }
  }
  return apiPost(`/customer-service/${sessionId}/transfer`)
}

/**
 * 取消转人工
 */
export async function cancelTransfer(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '已取消排队' }
  }
  return apiPost(`/customer-service/${sessionId}/cancel-transfer`)
}

/**
 * 提交满意度评价
 */
export async function submitRating(request: RatingRequest): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '感谢您的反馈！' }
  }
  return apiPost('/customer-service/rating', request)
}

/**
 * 上传图片
 */
export async function uploadCSImage(file: File): Promise<ApiResponse<{ url: string; thumbnail: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      code: 200,
      data: {
        url: URL.createObjectURL(file),
        thumbnail: URL.createObjectURL(file),
      },
      message: 'success',
    }
  }
  const formData = new FormData()
  formData.append('file', file)
  return apiPost('/customer-service/upload', formData)
}

/**
 * 结束会话
 */
export async function endCSSession(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '会话已结束' }
  }
  return apiPost(`/customer-service/${sessionId}/end`)
}
