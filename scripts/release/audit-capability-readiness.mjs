#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function has(content, pattern) {
  return typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
}

function collectSource(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return collectSource(child);
      return /\.(?:ts|js|vue)$/.test(entry.name) ? [read(child)] : [];
    })
    .join("\n");
}

const pages = readJson("apps/mobile/src/pages.json");
const manifest = readJson("apps/mobile/src/manifest.json");
const rootPackage = readJson("package.json");
const runtime = read("apps/mobile/src/lib/voice-agent-runtime.ts");
const voicePage = read("apps/mobile/src/pkg-agent/agent/voice-call.vue");
const agentData = read("apps/mobile/src/lib/agent-data.ts");
const agentChat = read("apps/mobile/src/pkg-agent/agent/chat.vue");
const botController = read("apps/server/src/modules/bot/bot.controller.ts");
const botService = read("apps/server/src/modules/bot/bot.service.ts");
const cozeService = read("apps/server/src/modules/bot/coze.service.ts");
const ttsController = read("apps/server/src/modules/tts/tts.controller.ts");
const audiobook = read("apps/mobile/src/pkg-classics/audiobooks/player.vue");

const voiceSubPackage = pages.subPackages?.find((item) => item.root === "pkg-agent");
const voiceRoute = voiceSubPackage?.pages?.find((item) => item.path === "agent/voice-call");
const androidPermissions = manifest["app-plus"]?.distribute?.android?.permissions || [];
const iosPrivacy = manifest["app-plus"]?.distribute?.ios?.privacyDescription || {};
const mpPermission = manifest["mp-weixin"]?.permission || {};
const scripts = rootPackage.scripts || {};

const checks = [
  {
    name: "语音通话页已注册且禁用页面级滚动",
    pass: Boolean(voiceRoute && voiceRoute.style?.disableScroll === true),
    file: "apps/mobile/src/pages.json",
  },
  {
    name: "H5、小程序、App 共用稳定语音运行时契约",
    pass:
      has(runtime, "export interface VoiceAgentRuntimeBridge") &&
      has(runtime, "__GUOXUE_VOICE_AGENT_RUNTIME__") &&
      has(runtime, "navigator.mediaDevices?.getUserMedia") &&
      has(runtime, "scope: 'scope.record'") &&
      has(runtime, "#ifdef APP-PLUS"),
    file: "apps/mobile/src/lib/voice-agent-runtime.ts",
  },
  {
    name: "语音样板具备权限、建房、字幕、静音、断开完整状态链",
    pass:
      has(voicePage, "requestMicrophoneAccess()") &&
      has(voicePage, "agentApi.createVoiceRoom") &&
      has(voicePage, "runtime.connect") &&
      has(voicePage, "onTranscript") &&
      has(voicePage, "setMuted") &&
      has(voicePage, "disconnect()"),
    file: "apps/mobile/src/pkg-agent/agent/voice-call.vue",
  },
  {
    name: "图文对话页已接入语音通话入口",
    pass: has(agentChat, "/pkg-agent/agent/voice-call"),
    file: "apps/mobile/src/pkg-agent/agent/chat.vue",
  },
  {
    name: "客户端真实请求语音房间接口",
    pass: has(agentData, "/bots/${agentId}/voice-room"),
    file: "apps/mobile/src/lib/agent-data.ts",
  },
  {
    name: "服务端语音房间路由、资格校验与供应商建房已串联",
    pass:
      has(botController, '@Post(":id/voice-room")') &&
      has(botService, "if (!bot.voiceEnabled)") &&
      has(botService, "this.coze.createVoiceRoom") &&
      has(cozeService, "/v1/audio/rooms") &&
      has(cozeService, 'turn_detection: { type: "server_vad" }'),
    file: "apps/server/src/modules/bot/",
  },
  {
    name: "微信小程序已声明录音用途",
    pass: Boolean(mpPermission["scope.record"]?.desc),
    file: "apps/mobile/src/manifest.json",
  },
  {
    name: "Android 已声明录音和音频设置权限",
    pass:
      androidPermissions.some((item) => item.includes("android.permission.RECORD_AUDIO")) &&
      androidPermissions.some((item) => item.includes("android.permission.MODIFY_AUDIO_SETTINGS")),
    file: "apps/mobile/src/manifest.json",
  },
  {
    name: "iOS 已声明麦克风隐私用途",
    pass: Boolean(iosPrivacy.NSMicrophoneUsageDescription),
    file: "apps/mobile/src/manifest.json",
  },
  {
    name: "古籍听书使用统一后端 TTS 与跨端音频上下文",
    pass:
      has(audiobook, "uni.createInnerAudioContext()") &&
      has(audiobook, "/tts/synthesize") &&
      has(audiobook, "emotion=poetry") &&
      has(audiobook, "function splitSentences"),
    file: "apps/mobile/src/pkg-classics/audiobooks/player.vue",
  },
  {
    name: "TTS 同时支持鉴权 POST、媒体 GET 和 Range 续取",
    pass:
      has(ttsController, '@Post("synthesize")') &&
      has(ttsController, '@Get("synthesize")') &&
      has(ttsController, '"Accept-Ranges": "bytes"') &&
      has(ttsController, "res.status(206)"),
    file: "apps/server/src/modules/tts/tts.controller.ts",
  },
  {
    name: "发布脚本覆盖 H5、微信小程序和 App 三端构建",
    pass:
      Boolean(scripts["build:mobile:h5"]) &&
      Boolean(scripts["build:mobile:mp-weixin"]) &&
      Boolean(scripts["build:mobile:app"]) &&
      has(scripts["build:mobile:all"] || "", "build:mobile:h5") &&
      has(scripts["build:mobile:all"] || "", "build:mobile:mp-weixin") &&
      has(scripts["build:mobile:all"] || "", "build:mobile:app"),
    file: "package.json",
  },
];

const warnings = [];
if (!manifest.appid) {
  warnings.push("App 的 DCloud appid 仍为空；不影响本地编译，但会阻断正式云打包。");
}
if (manifest["mp-weixin"]?.setting?.urlCheck === false) {
  warnings.push("微信小程序仍关闭合法域名校验；提审前必须恢复校验并配置新域名白名单。");
}
if (Object.keys(manifest["app-plus"]?.distribute?.sdkConfigs || {}).length === 0) {
  warnings.push("App 原生 SDK 配置仍为空；TRTC/语音供应商原生插件需在真机基座与正式包中接入。");
}
const bridgeRegistrationPattern =
  /(?:__GUOXUE_VOICE_AGENT_RUNTIME__\s*=|defineProperty\([^)]*__GUOXUE_VOICE_AGENT_RUNTIME__)/;
if (!bridgeRegistrationPattern.test(collectSource("apps/mobile/src"))) {
  warnings.push("仓库内未发现语音运行时 bridge 注册；当前样板会诚实阻断，待供应商 SDK 开通后接入。");
}

const failed = checks.filter((item) => !item.pass);
console.log("多端与智能能力发布审计");
console.log(`代码能力：${checks.length - failed.length}/${checks.length} 通过`);
for (const item of checks) {
  console.log(`${item.pass ? "通过" : "失败"}：${item.name}（${item.file}）`);
}
for (const warning of warnings) console.log(`外部待办：${warning}`);

if (failed.length > 0) {
  console.error(`发布门禁失败：${failed.length} 项代码能力断链。`);
  process.exit(1);
}

console.log("代码门禁通过；外部账号、域名、原生 SDK 与真机事项不伪装为已完成。");
