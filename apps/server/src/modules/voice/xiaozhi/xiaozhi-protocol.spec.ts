import { MockEchoDeviceStream, SILENT_FRAME_BYTES } from "../provider/mock-device-stream";
import { DeviceStreamEvent } from "../provider/voice-provider.types";
import { isActivationCode, normalizeDeviceSerial, packAudio, parseDeviceHello, summarizeDeviceInfo, unpackAudio } from "./xiaozhi-protocol";

describe("小智终端协议纯函数（依据开源固件 main/protocols 与 docs/websocket.md）", () => {
  it("v2 帧头：16 字节、网络字节序、字段顺序 version/type/reserved/timestamp/payload_size", () => {
    const payload = Buffer.from([9, 8, 7]);
    const f = packAudio(payload, 2, 0x01020304);
    expect(f.length).toBe(19);
    expect([...f.subarray(0, 16)]).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 3]);
    expect(unpackAudio(f, 2)).toEqual({ payload, timestamp: 0x01020304 });
  });

  it("v3 帧头：4 字节 type/reserved/payload_size(网络序)；v1 原样", () => {
    const payload = Buffer.alloc(300, 1);
    const f = packAudio(payload, 3);
    expect([...f.subarray(0, 4)]).toEqual([0, 0, 1, 44]);
    expect(unpackAudio(f, 3)!.payload.equals(payload)).toBe(true);
    expect(packAudio(payload, 1)).toBe(payload);
    expect(unpackAudio(payload, 1)!.payload).toBe(payload);
  });

  it("畸形帧不当音频：长度不符、类型为 JSON(1)", () => {
    const f = packAudio(Buffer.from([1, 2, 3]), 2);
    expect(unpackAudio(f.subarray(0, 18), 2)).toBeNull();
    const json = Buffer.from(f);
    json.writeUInt16BE(1, 2);
    expect(unpackAudio(json, 2)).toBeNull();
    expect(unpackAudio(Buffer.from([0, 0]), 3)).toBeNull();
  });

  it("设备 hello：与固件默认一致的报文通过；非 websocket、非 opus、双声道拒绝", () => {
    const fw = { type: "hello", version: 1, features: { mcp: true }, transport: "websocket", audio_params: { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 } };
    expect(parseDeviceHello(fw)).toMatchObject({ ok: true, version: 1, audio: { sample_rate: 16000, frame_duration: 60 } });
    expect(parseDeviceHello({ ...fw, transport: "udp" }).ok).toBe(false);
    expect(parseDeviceHello({ ...fw, audio_params: { format: "pcm" } }).ok).toBe(false);
    expect(parseDeviceHello({ ...fw, audio_params: { ...fw.audio_params, channels: 2 } }).ok).toBe(false);
  });

  it("设备身份：MAC 带冒号/横线/小写均规范为 12 位大写；非 MAC 拒绝", () => {
    expect(normalizeDeviceSerial("aa:bb:cc:dd:ee:0f")).toBe("AABBCCDDEE0F");
    expect(normalizeDeviceSerial("AA-BB-CC-DD-EE-0F")).toBe("AABBCCDDEE0F");
    expect(normalizeDeviceSerial("aabbccddee0f")).toBe("AABBCCDDEE0F");
    expect(normalizeDeviceSerial("aa:bb:cc")).toBeNull();
    expect(normalizeDeviceSerial(undefined)).toBeNull();
  });

  it("激活码：纯数字且位数固定", () => {
    expect(isActivationCode("0123", 4)).toBe(true);
    expect(isActivationCode("12345", 4)).toBe(false);
    expect(isActivationCode("12a4", 4)).toBe(false);
  });

  it("终端核对信息只取型号/芯片/固件，不含网络与位置字段", () => {
    const info = summarizeDeviceInfo({ chip_model_name: "esp32s3", application: { name: "xiaozhi", version: "1.9.2" }, board: { type: "bread-compact-wifi", name: "x", ssid: "家里的WiFi", ip: "192.168.1.9" }, mac_address: "aa" }, "bread/1.9.2");
    expect(info).toMatchObject({ chipModel: "esp32s3", firmwareVersion: "1.9.2", boardType: "bread-compact-wifi" });
    expect(JSON.stringify(info)).not.toMatch(/WiFi|192\.168|ssid/);
  });
});

describe("模拟设备中继（回放）", () => {
  const speech = (i: number) => Buffer.alloc(60, i);
  const silence = () => Buffer.alloc(3, 0);
  let events: DeviceStreamEvent[];
  let s: MockEchoDeviceStream;

  beforeEach(() => {
    jest.useFakeTimers();
    events = [];
    s = new MockEchoDeviceStream({ providerSessionId: "p", correlationId: "c", uplink: { codec: "opus", sampleRate: 16000, channels: 1, frameDurationMs: 60 }, timeoutMs: 1000 });
    s.onEvent((e) => events.push(e));
  });
  afterEach(() => {
    s.close();
    jest.useRealTimers();
  });

  it("auto 模式：说话后静音 ≥700ms 判定说完 → 模拟 stt、tts 开始/字幕、逐帧回放原音频、tts 结束", () => {
    expect(s.downlink).toEqual({ codec: "opus", sampleRate: 16000, channels: 1, frameDurationMs: 60 });
    s.control({ type: "listen_start", mode: "auto" });
    for (let i = 0; i < 10; i++) s.pushAudio(speech(i));
    for (let i = 0; i < 12; i++) s.pushAudio(silence()); // 720ms
    const stt = events.find((e) => e.type === "stt") as any;
    expect(stt).toMatchObject({ isMock: true });
    expect(stt.text).toMatch(/模拟/);
    expect(events.map((e) => e.type).slice(0, 5)).toEqual(["user_activity", "stt", "emotion", "tts_start", "tts_sentence"]);
    // 播放期间的上行音频不收（设备在播放态也不会发）
    s.pushAudio(speech(99));
    jest.advanceTimersByTime(60 * 12);
    const audio = events.filter((e) => e.type === "audio") as any[];
    expect(audio).toHaveLength(10); // 尾部静音被裁掉
    expect(audio.map((a) => a.opus[0])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(events[events.length - 1].type).toBe("tts_stop");
    expect(s.replies).toBe(1);
  });

  it("连续对话：播完后设备重新 listen start，可以再说一轮", () => {
    for (let round = 0; round < 2; round++) {
      s.control({ type: "listen_start", mode: "auto" });
      for (let i = 0; i < 5; i++) s.pushAudio(speech(i));
      for (let i = 0; i < 12; i++) s.pushAudio(silence());
      jest.advanceTimersByTime(60 * 10);
    }
    expect(s.replies).toBe(2);
    expect(events.filter((e) => e.type === "tts_stop")).toHaveLength(2);
  });

  it("打断：播放中收到 abort 立即停止下发并发 tts_stop", () => {
    s.control({ type: "listen_start", mode: "auto" });
    for (let i = 0; i < 20; i++) s.pushAudio(speech(i));
    for (let i = 0; i < 12; i++) s.pushAudio(silence());
    jest.advanceTimersByTime(60 * 3);
    s.control({ type: "abort", reason: "wake_word_detected" });
    const n = events.filter((e) => e.type === "audio").length;
    jest.advanceTimersByTime(60 * 30);
    expect(events.filter((e) => e.type === "audio").length).toBe(n);
    expect(n).toBeLessThan(20);
    expect(events[events.length - 1].type).toBe("tts_stop");
  });

  it("静音：整段都是静音帧不回放（6 秒后丢弃，继续听）", () => {
    s.control({ type: "listen_start", mode: "auto" });
    for (let i = 0; i < 120; i++) s.pushAudio(silence());
    expect(events).toHaveLength(0);
    expect(SILENT_FRAME_BYTES).toBeGreaterThanOrEqual(3);
  });

  it("manual 模式：以 listen stop 为准；没说话就 stop 不回放", () => {
    s.control({ type: "listen_start", mode: "manual" });
    for (let i = 0; i < 30; i++) s.pushAudio(speech(i));
    expect(events.some((e) => e.type === "stt")).toBe(false); // 手动模式不按静音自动截断
    s.control({ type: "listen_stop" });
    expect(events.some((e) => e.type === "stt")).toBe(true);
    events = [];
    s.control({ type: "listen_start", mode: "manual" });
    jest.advanceTimersByTime(60 * 40);
    s.control({ type: "listen_stop" });
    expect(events.some((e) => e.type === "stt")).toBe(false);
  });

  it("未 listen start 的音频忽略；关闭后不再发任何事件", () => {
    s.pushAudio(speech(1));
    expect(events).toHaveLength(0);
    s.control({ type: "listen_start", mode: "auto" });
    s.close();
    s.pushAudio(speech(1));
    expect(events).toHaveLength(0);
  });
});
