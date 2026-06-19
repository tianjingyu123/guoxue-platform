// 银行卡相关类型定义

// 银行信息
export interface BankInfo {
  code: string           // 银行代码
  name: string           // 银行名称
  icon: string           // 银行图标
  color: string          // 主题色
}

// 银行卡信息
export interface BankCard {
  id: number
  bank: BankInfo
  cardNumber: string     // 完整卡号（脱敏显示）
  cardNumberLast4: string // 后4位
  holderName: string     // 持卡人姓名（脱敏）
  cardType: 'debit' | 'credit'  // 储蓄卡/信用卡
  isDefault: boolean     // 是否默认卡
  bindTime: string       // 绑定时间
}

// 银行卡列表响应
export interface BankCardsResponse {
  list: BankCard[]
  total: number
}

// 添加银行卡请求
export interface AddBankCardRequest {
  cardNumber: string
  holderName: string
  bankCode: string
  idCard: string         // 身份证号（用于验证）
  phone: string          // 预留手机号
  verifyCode: string     // 短信验证码
}

// 支持的银行列表
export const SUPPORTED_BANKS: BankInfo[] = [
  { code: 'ICBC', name: '中国工商银行', icon: '🏦', color: '#C41E3A' },
  { code: 'CCB', name: '中国建设银行', icon: '🏦', color: '#0066B3' },
  { code: 'ABC', name: '中国农业银行', icon: '🏦', color: '#009944' },
  { code: 'BOC', name: '中国银行', icon: '🏦', color: '#C41E3A' },
  { code: 'COMM', name: '交通银行', icon: '🏦', color: '#1E4B9E' },
  { code: 'CMB', name: '招商银行', icon: '🏦', color: '#C41E3A' },
  { code: 'CITIC', name: '中信银行', icon: '🏦', color: '#C41E3A' },
  { code: 'SPDB', name: '浦发银行', icon: '🏦', color: '#0066B3' },
  { code: 'CEB', name: '光大银行', icon: '🏦', color: '#7B0051' },
  { code: 'PAB', name: '平安银行', icon: '🏦', color: '#FF6600' },
]
