// 消息相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { Message, MessageType, MessageUnreadCounts } from '../types/messages'

// ========== Mock 数据 ==========

const mockMessages: Message[] = [
  // 互动消息
  { id: 1, type: 'interaction', category: '评论', title: '张三清', content: '回复了你的文章《八字入门：如何看懂自己的命盘》：写得太好了，受益匪浅！', avatar: '/avatars/user1.jpg', time: '5分钟前', isRead: false, link: '/article/1' },
  { id: 2, type: 'interaction', category: '点赞', title: '李易道', content: '赞了你的文章《八字入门：如何看懂自己的命盘》', avatar: '/avatars/user2.jpg', time: '15分钟前', isRead: false, link: '/article/1' },
  { id: 3, type: 'interaction', category: '关注', title: '王玄机', content: '关注了你', avatar: '/avatars/user3.jpg', time: '1小时前', isRead: true, link: '/profile/123' },
  { id: 4, type: 'interaction', category: '评论', title: '赵明远', content: '在你的直播间留言：老师讲得很细致，期待下次直播！', avatar: '/avatars/user4.jpg', time: '2小时前', isRead: true, link: '/live/1' },
  { id: 5, type: 'interaction', category: '加入圈子', title: '陈国学', content: '加入了你的圈子「八字命理研习社」', avatar: '/avatars/user5.jpg', time: '3小时前', isRead: true, link: '/circle/1' },
  // 系统通知
  { id: 6, type: 'system', category: '课程上新', title: '新课程上线', content: '您关注的讲师「易学大师」发布了新课程《紫微斗数进阶实战》', time: '30分钟前', isRead: false, link: '/course/2' },
  { id: 7, type: 'system', category: '直播预告', title: '直播即将开始', content: '您预约的直播「八字看财运专题」将在30分钟后开始', time: '1小时前', isRead: false, link: '/live/3' },
  { id: 8, type: 'system', category: '会员到期', title: '会员即将到期', content: '您的VIP会员将于3天后到期，续费可享8折优惠', time: '1天前', isRead: true, link: '/profile' },
  { id: 9, type: 'system', category: '活动通知', title: '限时活动', content: '双十一大促：全场课程5折起，古籍电子书买一送一', time: '2天前', isRead: true, link: '/discover' },
  // 收益提醒
  { id: 10, type: 'income', category: '课程收益', title: '课程销售收入', content: '您的课程《八字入门精讲》被购买，获得收益 ¥89.00', time: '10分钟前', isRead: false, link: '/manage/income' },
  { id: 11, type: 'income', category: '打赏收入', title: '直播打赏', content: '用户「张三清」在直播间打赏了您 66 国学币', time: '2小时前', isRead: false, link: '/manage/income' },
  { id: 12, type: 'income', category: '分销收益', title: '推广佣金到账', content: '您推广的课程产生订单，获得佣金 ¥12.50', time: '5小时前', isRead: true, link: '/manage/income' },
  { id: 13, type: 'income', category: '提现通知', title: '提现成功', content: '您申请的提现 ¥500.00 已到账，请查收', time: '1天前', isRead: true, link: '/profile' },
  // 交易消息
  { id: 14, type: 'transaction', category: '订单', title: '订单支付成功', content: '您已成功购买课程《八字命理精讲》，订单号：2026060312345', time: '20分钟前', isRead: false, link: '/orders/12345' },
  { id: 15, type: 'transaction', category: '订单', title: '订单已发货', content: '您购买的《周易全解》已发货，物流单号：SF1234567890', time: '2小时前', isRead: false, link: '/orders/12346' },
  { id: 16, type: 'transaction', category: '退款', title: '退款成功', content: '您申请的退款已处理完成，¥99.00已原路退回', time: '1天前', isRead: true, link: '/orders/12340' },
  // 客服消息
  { id: 17, type: 'service', category: '客服', title: '客服回复', content: '您咨询的问题已得到回复，请查看详情', time: '10分钟前', isRead: false, link: '/customer-service' },
  { id: 18, type: 'service', category: '工单', title: '工单处理中', content: '您提交的工单【#2026060001】正在处理中，预计24小时内回复', time: '3小时前', isRead: true, link: '/feedback/detail/2026060001' },
]

// ========== API 函数 ==========

// 获取消息列表
export async function getMessages(type?: MessageType, page: number = 1, pageSize: number = 20): Promise<ApiResponse<Message[]>> {
  if (useMock()) {
    const filtered = type ? mockMessages.filter(m => m.type === type) : mockMessages
    return { code: 200, data: filtered, message: 'success' }
  }
  return apiGet<Message[]>('/user/messages', { type, page, pageSize })
}

// 获取未读消息数
export async function getUnreadCounts(): Promise<ApiResponse<MessageUnreadCounts>> {
  if (useMock()) {
    const interaction = mockMessages.filter(m => m.type === 'interaction' && !m.isRead).length
    const system = mockMessages.filter(m => m.type === 'system' && !m.isRead).length
    const income = mockMessages.filter(m => m.type === 'income' && !m.isRead).length
    const transaction = mockMessages.filter(m => m.type === 'transaction' && !m.isRead).length
    const service = mockMessages.filter(m => m.type === 'service' && !m.isRead).length
    return {
      code: 200,
      data: {
        interaction,
        system,
        income,
        transaction,
        service,
        total: interaction + system + income + transaction + service,
      },
      message: 'success',
    }
  }
  return apiGet<MessageUnreadCounts>('/user/messages/unread')
}

// 标记消息已读
export async function markAsRead(messageId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/user/messages/read', { messageId })
}

// 标记全部已读
export async function markAllAsRead(type?: MessageType): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/user/messages/read-all', { type })
}
