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

  describe("运行时配置热更新", () => {
    it("单例创建后保存的第三方配置可立即生效", () => {
      const originalPushDomain = process.env.LIVE_PUSH_DOMAIN
      const originalPlayDomain = process.env.LIVE_PLAY_DOMAIN
      const originalAppName = process.env.LIVE_APP_NAME

      try {
        process.env.LIVE_PUSH_DOMAIN = "hot-push.example.com"
        process.env.LIVE_PLAY_DOMAIN = "hot-play.example.com"
        process.env.LIVE_APP_NAME = "hot-live"

        expect(svc.genPushUrl("room-hot")).toContain(
          "rtmp://hot-push.example.com/hot-live/room-hot",
        )
        expect(svc.genPlayUrls("room-hot").hls).toBe(
          "https://hot-play.example.com/hot-live/room-hot.m3u8",
        )
        expect(svc.getCallbackInfo()).toEqual({
          pushDomain: "hot-push.example.com",
          playDomain: "hot-play.example.com",
        })
      } finally {
        process.env.LIVE_PUSH_DOMAIN = originalPushDomain
        process.env.LIVE_PLAY_DOMAIN = originalPlayDomain
        process.env.LIVE_APP_NAME = originalAppName
      }
    })
  })

  describe("密钥缺失保护", () => {
    it("缺少密钥时拒绝生成鉴权地址并拒绝回调", () => {
      const originalPushKey = process.env.LIVE_PUSH_KEY
      const originalPlayKey = process.env.LIVE_PLAY_KEY

      try {
        process.env.LIVE_PUSH_KEY = ""
        process.env.LIVE_PLAY_KEY = ""

        expect(svc.genPushUrl("room-no-key")).toBe("")
        expect(svc.genPlayUrlWithAuth("room-no-key", "u1")).toEqual({
          flv: "",
          hls: "",
        })
        expect(svc.verifyCallbackSign({ action: "publish" }, "anything")).toBe(false)
      } finally {
        process.env.LIVE_PUSH_KEY = originalPushKey
        process.env.LIVE_PLAY_KEY = originalPlayKey
      }
    })
  })

  describe("就绪状态", () => {
    it("要求推拉流域名和两项鉴权密钥全部存在", () => {
      expect(svc.isReady()).toBe(true)
      const originalPlayKey = process.env.LIVE_PLAY_KEY
      try {
        process.env.LIVE_PLAY_KEY = ""
        expect(svc.isReady()).toBe(false)
      } finally {
        process.env.LIVE_PLAY_KEY = originalPlayKey
      }
    })
  })
})
