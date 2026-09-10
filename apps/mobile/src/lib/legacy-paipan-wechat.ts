/** 微信网页工具入口与 App 签名入口分离，不携带 App 的手机号或签名。 */
export function legacyWechatToolUrl(entryUrl: string): string {
  const source = new URL(entryUrl)
  if (source.protocol !== 'https:' || source.username || source.password ||
      !['www.yrydai.cn', 'yrydai.cn', 'www.yrydai.com', 'yrydai.com'].includes(source.hostname)) {
    throw new Error('排盘工具地址不受信任')
  }
  const target = new URL('https://www.yrydai.com/p1.php')
  const referral = source.searchParams.get('ruid')
  if (referral !== null) {
    if (!/^\d+$/.test(referral)) throw new Error('排盘推荐参数无效')
    target.searchParams.set('ruid', referral)
  }
  return target.toString()
}
