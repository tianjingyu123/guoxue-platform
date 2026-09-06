/** 私密咨询不能回退到公共直播应用；本地配置完整不代表云端隐私门禁已验真。 */
export function consultTrtcSettings() {
  const id = (process.env.CONSULT_TRTC_SDK_APP_ID || "").trim();
  const sdkAppId = /^[1-9][0-9]{0,9}$/.test(id) && Number(id) <= 0xffffffff ? Number(id) : 0;
  const secretKey = (process.env.CONSULT_TRTC_SECRET_KEY || "").trim();
  const callbackKey = (process.env.CONSULT_TRTC_CALLBACK_KEY || "").trim();
  const publicCallbackKey = (process.env.TRTC_CALLBACK_KEY || process.env.TENCENT_CALLBACK_KEY || "").trim();
  const isolated = sdkAppId > 0 && sdkAppId !== Number(process.env.TRTC_SDK_APP_ID)
    && !!callbackKey && callbackKey !== publicCallbackKey;
  return { sdkAppId, secretKey, callbackKey, isolated, configured: isolated && !!secretKey };
}
