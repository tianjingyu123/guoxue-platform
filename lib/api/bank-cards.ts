// 银行卡相关 API
import { apiGet, apiPost, apiDelete, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { BankCard, BankCardsResponse, AddBankCardRequest, SUPPORTED_BANKS } from '../types/bank-cards'

// ========== Mock 数据 ==========

const mockBankCards: BankCard[] = [
  {
    id: 1,
    bank: { code: 'ICBC', name: '中国工商银行', icon: '🏦', color: '#C41E3A' },
    cardNumber: '6222 **** **** 1234',
    cardNumberLast4: '1234',
    holderName: '张*明',
    cardType: 'debit',
    isDefault: true,
    bindTime: '2025-08-15',
  },
  {
    id: 2,
    bank: { code: 'CMB', name: '招商银行', icon: '🏦', color: '#C41E3A' },
    cardNumber: '6225 **** **** 5678',
    cardNumberLast4: '5678',
    holderName: '张*明',
    cardType: 'debit',
    isDefault: false,
    bindTime: '2026-01-20',
  },
  {
    id: 3,
    bank: { code: 'ABC', name: '中国农业银行', icon: '🏦', color: '#009944' },
    cardNumber: '6228 **** **** 9012',
    cardNumberLast4: '9012',
    holderName: '张*明',
    cardType: 'debit',
    isDefault: false,
    bindTime: '2026-03-10',
  },
]

// ========== API 函数 ==========

/**
 * 获取银行卡列表
 */
export async function getBankCards(): Promise<ApiResponse<BankCardsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: {
        list: mockBankCards,
        total: mockBankCards.length,
      },
      message: 'success',
    }
  }
  return apiGet<BankCardsResponse>('/wallet/bank-cards')
}

/**
 * 添加银行卡
 */
export async function addBankCard(request: AddBankCardRequest): Promise<ApiResponse<BankCard>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    const newCard: BankCard = {
      id: Date.now(),
      bank: { code: request.bankCode, name: '银行', icon: '🏦', color: '#C41E3A' },
      cardNumber: request.cardNumber.replace(/(\d{4})(\d{4,})(\d{4})/, '$1 **** **** $3'),
      cardNumberLast4: request.cardNumber.slice(-4),
      holderName: request.holderName.replace(/^(.)(.*)$/, '$1*'),
      cardType: 'debit',
      isDefault: mockBankCards.length === 0,
      bindTime: new Date().toISOString().split('T')[0],
    }
    return {
      code: 200,
      data: newCard,
      message: '添加成功',
    }
  }
  return apiPost<BankCard>('/wallet/bank-cards', request)
}

/**
 * 删除银行卡
 */
export async function deleteBankCard(cardId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: { success: true },
      message: '删除成功',
    }
  }
  return apiDelete<{ success: boolean }>(`/wallet/bank-cards/${cardId}`)
}

/**
 * 设置默认银行卡
 */
export async function setDefaultBankCard(cardId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { success: true },
      message: '设置成功',
    }
  }
  return apiPost<{ success: boolean }>(`/wallet/bank-cards/${cardId}/set-default`)
}

/**
 * 发送银行卡绑定验证码
 */
export async function sendBankCardVerifyCode(phone: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: { success: true },
      message: '验证码已发送',
    }
  }
  return apiPost<{ success: boolean }>('/wallet/bank-cards/send-code', { phone })
}

/**
 * 识别银行卡（根据卡号前6位）
 */
export async function recognizeBankCard(cardNumber: string): Promise<ApiResponse<{ bankCode: string; bankName: string; cardType: string } | null>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    // Mock: 根据卡号前缀简单判断
    const prefix = cardNumber.replace(/\s/g, '').substring(0, 6)
    const bankMap: Record<string, { bankCode: string; bankName: string }> = {
      '622202': { bankCode: 'ICBC', bankName: '中国工商银行' },
      '621700': { bankCode: 'CCB', bankName: '中国建设银行' },
      '622848': { bankCode: 'ABC', bankName: '中国农业银行' },
      '621661': { bankCode: 'BOC', bankName: '中国银行' },
      '622580': { bankCode: 'CMB', bankName: '招商银行' },
    }
    const found = Object.entries(bankMap).find(([p]) => prefix.startsWith(p.substring(0, 4)))
    if (found) {
      return {
        code: 200,
        data: { ...found[1], cardType: 'debit' },
        message: 'success',
      }
    }
    return { code: 200, data: null, message: '未识别' }
  }
  return apiGet<{ bankCode: string; bankName: string; cardType: string } | null>('/wallet/bank-cards/recognize', { cardNumber })
}
