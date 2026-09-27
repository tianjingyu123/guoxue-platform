const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const cloud = require('../../apps/mobile/uniCloud-aliyun/cloudfunctions/rebu-univerify-login/index.js')

const secret = 'test-only-univerify-bridge-secret-32bytes'
const previous = {
  appid: process.env.REBU_DCLOUD_APPID,
  api: process.env.REBU_API_URL,
  secret: process.env.REBU_UNIVERIFY_SHARED_SECRET,
  cloud: global.uniCloud,
}
after(() => {
  for (const [key, value] of [['REBU_DCLOUD_APPID', previous.appid], ['REBU_API_URL', previous.api], ['REBU_UNIVERIFY_SHARED_SECRET', previous.secret]]) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  global.uniCloud = previous.cloud
})

test('云函数只在运营商验号后把签名手机号送到本站，客户端拿不到明文', async () => {
  process.env.REBU_DCLOUD_APPID = '__UNI__277B108'
  process.env.REBU_API_URL = 'https://api.example.test'
  process.env.REBU_UNIVERIFY_SHARED_SECRET = secret
  let sent
  global.uniCloud = {
    getPhoneNumber: async ({ provider, appid, openid, access_token }) => {
      assert.deepEqual([provider, appid, openid, access_token], ['univerify', '__UNI__277B108', 'grant-openid', 'grant-token'])
      return { code: 0, phoneNumber: '13800138000' }
    },
    httpclient: {
      request: async (url, options) => {
        sent = { url, options }
        return { status: 201, data: { code: 200, data: { accessToken: 'session', refreshToken: 'refresh' } } }
      },
    },
  }
  const result = await cloud.main({ openid: 'grant-openid', access_token: 'grant-token', referrerCode: 'share-1' })
  assert.deepEqual(result, { code: 0, data: { accessToken: 'session', refreshToken: 'refresh' } })
  assert.equal(sent.url, 'https://api.example.test/api/v1/auth/internal/univerify')
  const { phone, timestamp, nonce, signature, referrerCode } = sent.options.data
  assert.equal(phone, '13800138000')
  assert.equal(referrerCode, 'share-1')
  assert.equal(signature, crypto.createHmac('sha256', secret).update(`${phone}\n${timestamp}\n${nonce}\n${referrerCode}`).digest('hex'))
  assert.ok(!JSON.stringify(result).includes(phone))
})

test('没有服务端配置时不消耗取号次数，也不建立会话', async () => {
  delete process.env.REBU_UNIVERIFY_SHARED_SECRET
  global.uniCloud = { getPhoneNumber: () => { throw new Error('不得取号') } }
  const result = await cloud.main({ openid: 'grant-openid', access_token: 'grant-token' })
  assert.equal(result.code, 'CONFIG_UNAVAILABLE')
})
