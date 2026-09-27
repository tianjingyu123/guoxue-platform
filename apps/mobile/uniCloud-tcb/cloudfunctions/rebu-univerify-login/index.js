'use strict'

const crypto = require('crypto')

/** 不做 URL 化：仅由本 App 的 uniCloud.callFunction 调用。云端不得记录明文手机号或凭据。 */
exports.main = async (event) => {
  const appid = process.env.REBU_DCLOUD_APPID || ''
  const apiBase = process.env.REBU_API_URL || ''
  const secret = process.env.REBU_UNIVERIFY_SHARED_SECRET || ''
  if (!appid || !/^https:\/\//.test(apiBase) || secret.length < 32) {
    return { code: 'CONFIG_UNAVAILABLE', message: '快捷登录暂不可用，请使用验证码登录' }
  }
  const openid = String(event?.openid || '')
  const accessToken = String(event?.access_token || '')
  const referrerCode = String(event?.referrerCode || '')
  if (referrerCode.length > 128 || !/^[A-Za-z0-9_-]*$/.test(referrerCode)) {
    return { code: 'INVALID_REFERRER', message: '分享信息无效，请使用验证码登录' }
  }
  if (!openid || !accessToken || openid.length > 2048 || accessToken.length > 4096) {
    return { code: 'INVALID_GRANT', message: '授权失效，请重新授权' }
  }
  try {
    const verified = await uniCloud.getPhoneNumber({
      provider: 'univerify',
      appid,
      openid,
      access_token: accessToken,
    })
    const phone = String(verified?.phoneNumber || '')
    if (verified?.code !== 0 || !/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 'VERIFY_FAILED', message: '手机号验证失败，请使用验证码登录' }
    }
    const timestamp = Date.now()
    const nonce = crypto.randomBytes(16).toString('hex')
    const signature = crypto.createHmac('sha256', secret)
      .update(`${phone}\n${timestamp}\n${nonce}\n${referrerCode}`).digest('hex')
    const response = await uniCloud.httpclient.request(`${apiBase.replace(/\/$/, '')}/api/v1/auth/internal/univerify`, {
      method: 'POST',
      contentType: 'json',
      dataType: 'json',
      timeout: 10000,
      data: { phone, timestamp, nonce, signature, referrerCode },
    })
    const payload = response?.data
    if (response?.status !== 201 || payload?.code !== 200 || !payload?.data?.accessToken) {
      return { code: 'LOGIN_FAILED', message: '登录暂不可用，请使用验证码登录' }
    }
    return { code: 0, data: payload.data }
  } catch {
    return { code: 'LOGIN_FAILED', message: '快捷登录暂不可用，请使用验证码登录' }
  }
}
