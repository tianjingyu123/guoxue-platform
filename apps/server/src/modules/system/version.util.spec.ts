import { isValidPlatformDownloadUrl } from "./version.util";

describe("版本下载地址安全校验", () => {
  it("接受 HTTPS 和平台匹配的官方市场协议", () => {
    expect(isValidPlatformDownloadUrl("ios", "https://apps.apple.com/cn/app/id123")).toBe(true);
    expect(isValidPlatformDownloadUrl("ios", "itms-apps://itunes.apple.com/app/id123")).toBe(true);
    expect(isValidPlatformDownloadUrl("android", "market://details?id=com.rebu.app")).toBe(true);
    expect(isValidPlatformDownloadUrl("harmony", "appmarket://details?id=com.rebu.app")).toBe(true);
  });

  it("拒绝 HTTP、内网地址和错平台市场协议", () => {
    expect(isValidPlatformDownloadUrl("android", "http://download.example.com/app.apk")).toBe(false);
    expect(isValidPlatformDownloadUrl("android", "https://127.0.0.1/app.apk")).toBe(false);
    expect(isValidPlatformDownloadUrl("ios", "market://details?id=com.rebu.app")).toBe(false);
    expect(isValidPlatformDownloadUrl("harmony", "itms-apps://itunes.apple.com/app/id123")).toBe(false);
  });
});
