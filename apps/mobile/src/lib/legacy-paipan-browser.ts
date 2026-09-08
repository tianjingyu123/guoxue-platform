/** 仅微信普通网页的工具入口使用已验证的网页版，不传递签名或手机号。 */
export function wechatLegacyToolUrl(entryUrl: string, userAgent: string): string | null {
  if (!/MicroMessenger/i.test(userAgent) || /miniProgram/i.test(userAgent)) return null;
  try {
    const url = new URL(entryUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!['www.yrydai.cn', 'yrydai.cn', 'www.yrydai.com', 'yrydai.com'].includes(url.hostname)) return null;
    if (url.pathname !== '/guoxueApp.php' || url.searchParams.get('go') !== 'tool') return null;
    return 'https://www.yrydai.com/p1.php';
  } catch {
    return null;
  }
}
