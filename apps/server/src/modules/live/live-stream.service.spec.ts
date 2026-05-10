import { Test } from "@nestjs/testing"
import { LiveStreamService } from "./live-stream.service"

describe("LiveStreamService", () => {
  let svc: LiveStreamService

  beforeAll(async () => {
    process.env.LIVE_PUSH_DOMAIN = "push.example.com"
    process.env.LIVE_PLAY_DOMAIN = "play.example.com"
    process.env.LIVE_PUSH_KEY = "pushkey123"
    process.env.LIVE_PLAY_KEY = "playkey456"
    process.env.LIVE_APP_NAME = "live"

    const mod = await Test.createTestingModule({
      providers: [LiveStreamService],
    }).compile()
    svc = mod.get(LiveStreamService)
  })

  describe("genPushUrl", () => {
    it("生成带防盗链的推流地址", () => {
      const url = svc.genPushUrl("room123")
      expect(url).toContain("rtmp://push.example.com/live/room123")
      expect(url).toContain("txSecret=")
      expect(url).toContain("txTime=")
    })
  })

  describe("genPlayUrls", () => {
    it("生成多格式拉流地址", () => {
      const urls = svc.genPlayUrls("room123")
      expect(urls.flv).toBe("https://play.example.com/live/room123.flv")
      expect(urls.hls).toBe("https://play.example.com/live/room123.m3u8")
      expect(urls.rtmp).toBe("rtmp://play.example.com/live/room123")
    })
  })

  describe("genPlayUrlWithAuth", () => {
    it("生成带防盗链鉴权的播放地址", () => {
      const urls = svc.genPlayUrlWithAuth("room123", "u1")
      expect(urls.flv).toContain("txSecret=")
      expect(urls.hls).toContain("txTime=")
    })
  })

  describe("verifyCallbackSign", () => {
    it("验证回调签名", () => {
      const body = { action: "publish", stream_id: "room123" }
      const receivedSign = "fakesign"
      expect(svc.verifyCallbackSign(body, receivedSign)).toBe(false)
    })
  })

  describe("getCallbackInfo", () => {
    it("返回推拉流域名信息", () => {
      const info = svc.getCallbackInfo()
      expect(info.pushDomain).toBe("push.example.com")
      expect(info.playDomain).toBe("play.example.com")
    })
  })
})
