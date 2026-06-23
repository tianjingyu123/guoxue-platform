'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Phone, Shield, CheckCircle, ArrowRight } from 'lucide-react'

export default function ChangePhonePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [currentPhone] = useState('138****8888')
  const [verifyCode, setVerifyCode] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCode, setNewCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [newCountdown, setNewCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  useEffect(() => {
    if (newCountdown > 0) {
      const timer = setTimeout(() => setNewCountdown(newCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [newCountdown])

  const sendVerifyCode = () => {
    if (countdown > 0) return
    setCountdown(60)
  }

  const sendNewCode = () => {
    if (newCountdown > 0 || !newPhone || newPhone.length !== 11) return
    setNewCountdown(60)
  }

  const verifyCurrentPhone = async () => {
    if (verifyCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    setStep(2)
  }

  const submitNewPhone = async () => {
    if (!newPhone || newPhone.length !== 11) {
      setError('请输入正确的手机号')
      return
    }
    if (newCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setStep(3)
    setTimeout(() => router.back(), 2000)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">修改手机号</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: '验证身份' },
            { num: 2, label: '绑定新号' },
            { num: 3, label: '完成' }
          ].map((item, index) => (
            <div key={item.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= item.num 
                    ? 'bg-[#C41E3A] text-white' 
                    : 'bg-[#E8E3DB] text-[#999999]'
                }`}>
                  {step > item.num ? <CheckCircle className="w-5 h-5" /> : item.num}
                </div>
                <span className={`text-xs mt-2 ${
                  step >= item.num ? 'text-[#C41E3A]' : 'text-[#999999]'
                }`}>{item.label}</span>
              </div>
              {index < 2 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                  step > item.num ? 'bg-[#C41E3A]' : 'bg-[#E8E3DB]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤1：验证当前手机号 */}
      {step === 1 && (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#C41E3A]" />
              </div>
              <div>
                <h3 className="font-medium text-[#2C2C2C]">验证当前手机号</h3>
                <p className="text-sm text-[#999999]">为保障账号安全，请先验证身份</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#666666]" />
                <span className="text-[#2C2C2C] font-medium">{currentPhone}</span>
                <span className="text-xs text-[#999999] ml-auto">当前绑定</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#666666] mb-2 block">短信验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => {
                      setVerifyCode(e.target.value.replace(/\D/g, ''))
                      setError('')
                    }}
                    placeholder="请输入验证码"
                    className="flex-1 h-12 px-4 bg-[#FAF8F5] rounded-xl border-0 text-[#2C2C2C] placeholder:text-[#CCCCCC] focus:ring-2 focus:ring-[#C41E3A]/20"
                  />
                  <button
                    onClick={sendVerifyCode}
                    disabled={countdown > 0}
                    className={`px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap ${
                      countdown > 0
                        ? 'bg-[#E8E3DB] text-[#999999]'
                        : 'bg-[#C41E3A] text-white'
                    }`}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={verifyCurrentPhone}
                disabled={loading || verifyCode.length !== 6}
                className="w-full h-12 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    下一步
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 步骤2：输入新手机号 */}
      {step === 2 && (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-[#2C2C2C]">绑定新手机号</h3>
                <p className="text-sm text-[#999999]">请输入新的手机号并验证</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#666666] mb-2 block">新手机号</label>
                <input
                  type="tel"
                  maxLength={11}
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value.replace(/\D/g, ''))
                    setError('')
                  }}
                  placeholder="请输入新手机号"
                  className="w-full h-12 px-4 bg-[#FAF8F5] rounded-xl border-0 text-[#2C2C2C] placeholder:text-[#CCCCCC] focus:ring-2 focus:ring-[#C41E3A]/20"
                />
              </div>

              <div>
                <label className="text-sm text-[#666666] mb-2 block">短信验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={newCode}
                    onChange={(e) => {
                      setNewCode(e.target.value.replace(/\D/g, ''))
                      setError('')
                    }}
                    placeholder="请输入验证码"
                    className="flex-1 h-12 px-4 bg-[#FAF8F5] rounded-xl border-0 text-[#2C2C2C] placeholder:text-[#CCCCCC] focus:ring-2 focus:ring-[#C41E3A]/20"
                  />
                  <button
                    onClick={sendNewCode}
                    disabled={newCountdown > 0 || newPhone.length !== 11}
                    className={`px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap ${
                      newCountdown > 0 || newPhone.length !== 11
                        ? 'bg-[#E8E3DB] text-[#999999]'
                        : 'bg-[#C41E3A] text-white'
                    }`}
                  >
                    {newCountdown > 0 ? `${newCountdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={submitNewPhone}
                disabled={loading || newPhone.length !== 11 || newCode.length !== 6}
                className="w-full h-12 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '确认绑定'
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full h-12 text-[#666666] text-sm"
              >
                返回上一步
              </button>
            </div>
          </div>

          <div className="mt-4 px-2">
            <p className="text-xs text-[#999999]">
              温馨提示：更换手机号后，原手机号将无法用于登录和找回密码
            </p>
          </div>
        </div>
      )}

      {/* 步骤3：完成 */}
      {step === 3 && (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">绑定成功</h3>
            <p className="text-[#666666] mb-2">新手机号已绑定</p>
            <p className="text-lg font-medium text-[#C41E3A]">
              {newPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </p>
            <p className="text-sm text-[#999999] mt-6">页面即将自动返回...</p>
          </div>
        </div>
      )}
    </div>
  )
}
