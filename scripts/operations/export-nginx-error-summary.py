"""将标准输入的Nginx错误日志导出为固定字段JSON，不输出原始上下文。"""
import datetime
import json
import re
import sys

MAX_LINE_BYTES = 65536
HEADER = re.compile(r"^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(debug|info|notice|warn|error|crit|alert|emerg)\] (\d{1,20})#(\d{1,20}):(?: \*(\d{1,20}))? ")
# 分类值均为常量，绝不拼接消息、请求路径或任意匹配组。
CATEGORIES = [
    ("upstream_connect", re.compile(r"connect\(\) failed.*while connecting to upstream")),
    ("upstream_timeout", re.compile(r"upstream timed out")),
    ("upstream_invalid_header", re.compile(r"upstream sent (?:too big header|invalid header)")),
    ("upstream_closed", re.compile(r"upstream prematurely closed connection")),
    ("file_open", re.compile(r'(?:open|CreateFile)\(.*(?:failed|not found)')),
    ("tls_handshake", re.compile(r"SSL_do_handshake\(\) failed")),
    ("request_rate_limit", re.compile(r"limiting requests")),
    ("connection_rate_limit", re.compile(r"limiting connections")),
    ("request_body_too_large", re.compile(r"client intended to send too large body")),
]


def summarize(line: str) -> dict:
    result = {"source": "nginx_error", "parsed": False, "level": "unknown", "category": "unknown"}
    if len(line.encode("utf-8", errors="replace")) > MAX_LINE_BYTES:
        return {**result, "overlong": True}
    match = HEADER.match(line)
    if not match:
        return result
    try:
        datetime.datetime.strptime(match[1], "%Y/%m/%d %H:%M:%S")
    except ValueError:
        return result
    result.update(parsed=True, localTimestamp=match[1], timezoneKnown=False, level=match[2], pid=int(match[3]), tid=int(match[4]))
    if match[5]:
        result["connectionNumber"] = int(match[5])
    # 请求/上游/Referer上下文不参与诊断分类，避免其内容伪造类别和错误码。
    message = re.split(r", (?:client|server|request|upstream|host|referrer):", line[match.end():], maxsplit=1)[0]
    for category, pattern in CATEGORIES:
        if pattern.search(message):
            result["category"] = category
            break
    errno = re.search(r"\((\d{1,6}): [^)]*\)", message)
    if errno:
        result["errno"] = int(errno[1])
    return result


def export_stream(source, destination):
    while True:
        chunk = source.readline(MAX_LINE_BYTES + 1)
        if not chunk:
            break
        if len(chunk) > MAX_LINE_BYTES:
            # 超长行只输出一个失败闭合摘要；丢弃剩余片段，不当作另一条消息。
            while chunk and not chunk.endswith(b"\n"):
                chunk = source.readline(MAX_LINE_BYTES + 1)
            result = {"source": "nginx_error", "parsed": False, "level": "unknown", "category": "unknown", "overlong": True}
        else:
            result = summarize(chunk.decode("utf-8", errors="replace"))
        destination.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    export_stream(sys.stdin.buffer, sys.stdout)
