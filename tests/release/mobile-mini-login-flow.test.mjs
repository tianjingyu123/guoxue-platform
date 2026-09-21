import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const login = fs.readFileSync('apps/mobile/src/pkg-auth/login/index.vue', 'utf8')
const auth = fs.readFileSync('apps/mobile/src/lib/auth-data.ts', 'utf8')

test('小程序进入登录页立即展示真实的一键手机号授权层，并保留原登录页', () => {
  assert.match(login, /open-type="getPhoneNumber"/u)
  assert.match(login, /@getphonenumber="handleMiniPhoneLogin"/u)
  assert.match(login, /:disabled="!agreedTerms \|\| isLoading"/u)
  assert.match(login, /v-if="showMiniQuickSheet" class="mini-auth-mask"/u)
  assert.match(login, /showMiniQuickSheet\.value = true/u)
  assert.match(login, /手机号一键登录/u)
  assert.match(login, /class="form"/u)
  assert.match(login, /使用其他登录方式/u)
  assert.match(login, /if \(!agreedTerms\.value\)[\s\S]*请先阅读并同意用户协议和隐私政策/u)
})

test('手机号授权结果接入现有后端接口并沿用统一登录回跳', () => {
  assert.match(auth, /async miniPhoneLogin\(wxCode: string, phoneCode: string\)/u)
  assert.match(auth, /apiPost<RawAuthData>\('\/auth\/login\/mini-phone'/u)
  assert.match(login, /authApi\.miniPhoneLogin\(wxCode, phoneCode\)/u)
  assert.match(login, /setToken\(loginData\.token\)[\s\S]*await goAfterLogin\(\)/u)
})

test('微信快捷登录逻辑不会被小程序预处理错误裁掉', () => {
  assert.doesNotMatch(login, /#if defined\(MP-WEIXIN\)/u)
  assert.match(login, /const code = await requestWechatLoginCode\(\)[\s\S]*authApi\.wechatLogin\(code, channel/u)
})
