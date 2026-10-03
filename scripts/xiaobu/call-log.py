# 小智测试客户端真机日志采集与分析（脱敏）
#   采集：python call-log.py capture <输出文件>        （Ctrl+C 或另开窗口 stop 结束）
#   分析：python call-log.py analyze <日志文件>
# 只保留 flutter 日志；Token、Authorization、MAC/设备 ID 形态的内容一律打码后再落盘。
import re
import subprocess
import sys
import json

ADB = r"D:\gx-deploy-91\.tools\android-platform-tools-20260910\platform-tools\adb.exe"
SERIAL = "a07f9db3"
REDACT = [
    (re.compile(r"(Bearer\s+)\S+", re.I), r"\1***"),
    (re.compile(r"(Token[^:：]*[:：]\s*)\S+", re.I), r"\1***"),
    (re.compile(r"(Authorization[^:：]*[:：]\s*)\S+.*", re.I), r"\1***"),
    (re.compile(r"\b([0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b", re.I), "**:**:**:**:**:**"),
    (re.compile(r"(设备ID[:：]\s*)\S+"), r"\1***"),
    (re.compile(r'("?(?:device-id|client-id)"?\s*[:=]\s*)"?[^",}\s]+', re.I), r"\1***"),
]


def redact(line: str) -> str:
    for pat, rep in REDACT:
        line = pat.sub(rep, line)
    return line


def capture(out_path: str):
    subprocess.run([ADB, "-s", SERIAL, "logcat", "-c"], check=False)
    proc = subprocess.Popen(
        [ADB, "-s", SERIAL, "logcat", "-v", "epoch", "-s", "flutter:I"],
        stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
    )
    with open(out_path, "w", encoding="utf-8") as f:
        try:
            for line in proc.stdout:
                f.write(redact(line))
                f.flush()
        except KeyboardInterrupt:
            pass
        finally:
            proc.terminate()


def analyze(path: str):
    events = []
    legacy = {"stt": 0, "tts_start": 0, "tts_stop": 0, "listen_sent": 0}
    for line in open(path, encoding="utf-8", errors="replace"):
        m = re.search(r"XZCALL ts=(\d+) turn=(\d+) phase=(\w+) (\w+)(.*)", line)
        if m:
            events.append({"ts": int(m.group(1)), "turn": int(m.group(2)), "phase": m.group(3), "event": m.group(4), "extra": m.group(5).strip()})
            continue
        # 原版客户端没有 XZCALL，按原始协议日志统计
        if '"type":"stt"' in line:
            legacy["stt"] += 1
        if '"type":"tts","state":"start"' in line:
            legacy["tts_start"] += 1
        if '"type":"tts","state":"stop"' in line:
            legacy["tts_stop"] += 1
        if "已发送开始监听消息" in line:
            legacy["listen_sent"] += 1

    summary = {"legacy_protocol_counts": legacy, "xzcall_events": len(events)}
    if events:
        stt = [e for e in events if e["event"] == "stt_received"]
        first = [e for e in events if e["event"] == "first_audio_frame"]
        lat = []
        for e in first:
            m = re.search(r"since_stt_ms=(-?\d+)", e["extra"])
            if m and int(m.group(1)) >= 0:
                lat.append(int(m.group(1)))
        lat.sort()
        pct = lambda p: lat[min(len(lat) - 1, int(round(p * (len(lat) - 1))))] if lat else None
        summary.update({
            "listen_start_sent": sum(1 for e in events if e["event"] == "listen_start_sent"),
            "stt_received": len(stt),
            "tts_start": sum(1 for e in events if e["event"] == "tts_start"),
            "tts_stop": sum(1 for e in events if e["event"] == "tts_stop"),
            "abort_sent": sum(1 for e in events if e["event"] == "abort_sent"),
            "mute_changed": sum(1 for e in events if e["event"] == "mute_changed"),
            "no_reply_timeout": sum(1 for e in events if e["event"] == "no_reply_timeout"),
            "reconnected_hello": sum(1 for e in events if e["event"] == "hello_during_call"),
            "stt_to_first_audio_ms": {"n": len(lat), "p50": pct(0.5), "p95": pct(0.95), "all": lat},
        })
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if sys.argv[1] == "capture":
        capture(sys.argv[2])
    elif sys.argv[1] == "analyze":
        analyze(sys.argv[2])
