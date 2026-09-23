import { DeviceStream, DeviceStreamControl, DeviceStreamEvent, DeviceStreamRequest, StreamAudioParams } from "./voice-provider.types";

/**
 * 模拟设备音频中继——**回放**：把用户刚说的那段 Opus 原样送回设备播放。
 *
 * 只用来验证「协议握手、音频上行、音频下行、连续对话、打断、静音超时、断线重连」这些链路，
 * 不做任何识别与合成：stt 文本、字幕都显式标注「模拟」，isMock=true。
 * 回放要求下行参数与上行一致（同采样率、同帧长），所以 downlink = uplink。
 *
 * 说完判断（仅模拟器用的粗略规则，真实服务由供应商做 VAD）：
 * - manual 模式：以设备的 listen stop 为准
 * - auto / realtime：帧很小（≤ SILENT_FRAME_BYTES，Opus 静音/DTX 帧）连续达到 END_SILENCE_MS 视为说完；
 *   或累计到 MAX_UTTERANCE_MS 强制截断；整段都是静音则丢弃、继续听
 */
export const SILENT_FRAME_BYTES = 10;
export const END_SILENCE_MS = 540;
export const MAX_UTTERANCE_MS = 6000;

export class MockEchoDeviceStream implements DeviceStream {
  readonly downlink: StreamAudioParams;
  private listeners: ((e: DeviceStreamEvent) => void)[] = [];
  private listening = false;
  private mode: "auto" | "manual" | "realtime" = "auto";
  private frames: Buffer[] = [];
  private heardSpeech = false;
  private silentMs = 0;
  private playTimer: NodeJS.Timeout | null = null;
  private closed = false;
  /** 测试可读：回放了几段 */
  replies = 0;

  constructor(private readonly req: DeviceStreamRequest) {
    this.downlink = { ...req.uplink };
  }

  private get frameMs() {
    return this.req.uplink.frameDurationMs;
  }

  onEvent(listener: (e: DeviceStreamEvent) => void) {
    this.listeners.push(listener);
  }

  private emit(e: DeviceStreamEvent) {
    if (this.closed) return;
    for (const l of this.listeners) l(e);
  }

  get speaking() {
    return this.playTimer !== null;
  }

  control(c: DeviceStreamControl) {
    if (this.closed) return;
    if (c.type === "listen_start") {
      this.mode = c.mode;
      this.listening = true;
      this.resetUtterance();
    } else if (c.type === "listen_stop") {
      this.listening = false;
      if (this.heardSpeech) this.reply();
      else this.resetUtterance();
    } else if (c.type === "abort") {
      this.stopPlayback();
    }
    // wake：模拟器无需处理
  }

  pushAudio(opus: Buffer) {
    if (this.closed || !this.listening || this.speaking) return;
    this.frames.push(opus);
    if (opus.length > SILENT_FRAME_BYTES) {
      if (!this.heardSpeech) this.emit({ type: "user_activity" });
      this.heardSpeech = true;
      this.silentMs = 0;
    } else if (this.heardSpeech) {
      this.silentMs += this.frameMs;
    }
    if (this.mode === "manual") {
      if (this.frames.length * this.frameMs >= MAX_UTTERANCE_MS * 2) this.frames.shift(); // 手动模式只防无限增长
      return;
    }
    const total = this.frames.length * this.frameMs;
    if (this.heardSpeech && this.silentMs >= END_SILENCE_MS) this.reply();
    else if (total >= MAX_UTTERANCE_MS) {
      if (this.heardSpeech) this.reply();
      else this.resetUtterance();
    }
  }

  private resetUtterance() {
    this.frames = [];
    this.heardSpeech = false;
    this.silentMs = 0;
  }

  private reply() {
    // 去掉尾部静音再回放
    let frames = this.frames;
    while (frames.length && frames[frames.length - 1].length <= SILENT_FRAME_BYTES) frames = frames.slice(0, -1);
    this.resetUtterance();
    if (!frames.length) return;
    this.listening = false; // 设备收到 tts start 进入播放态，播完后会重新发 listen start
    this.replies++;
    const seconds = ((frames.length * this.frameMs) / 1000).toFixed(1);
    this.emit({ type: "stt", text: `【模拟识别】收到约 ${seconds} 秒语音（非真实语音服务）`, isMock: true });
    this.emit({ type: "emotion", emotion: "neutral" });
    let i = 0;
    // 先送最多 3 帧，给设备约 180ms 的解码余量；其余仍按帧长下发。
    // stop 保持在原音频时长之后，避免设备还没播完就切回聆听。
    let ticks = 0;
    this.playTimer = setInterval(() => {
      ticks++;
      if (i < frames.length) {
        this.emit({ type: "audio", opus: frames[i++] });
      }
      if (ticks >= frames.length) this.stopPlayback();
    }, this.frameMs);
    this.emit({ type: "tts_start" });
    this.emit({ type: "tts_sentence", text: "【模拟】回放你刚才说的话" });
    for (; i < Math.min(3, frames.length) && this.playTimer; i++) this.emit({ type: "audio", opus: frames[i] });
  }

  private stopPlayback() {
    if (!this.playTimer) return;
    clearInterval(this.playTimer);
    this.playTimer = null;
    this.emit({ type: "tts_stop" });
  }

  close() {
    if (this.playTimer) clearInterval(this.playTimer);
    this.playTimer = null;
    this.closed = true;
    this.listeners = [];
  }
}
