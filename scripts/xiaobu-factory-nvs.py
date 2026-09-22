#!/usr/bin/env python3
"""
小卜硬件出厂 NVS 工具（小智开源固件 / ESP32 系列）

设备身份 = MAC + 设备 ID（固件 NVS `board/uuid`，请求头 Client-Id）。出厂时由本工具生成设备 ID 并写入设备，
同时记入当批清单（mac,client_id）；清单用热卜后台「登记设备 → 批量」导入即登记时锁定身份，
杜绝有人拿连号 MAC 抢先激活或冒充设备。

三个子命令：
  make     只生成 NVS 镜像文件（不碰设备），用于自检与排查
  station  自检工位：读 MAC → 生成（或沿用清单里已有的）设备 ID → 写「自检 NVS」（设备 ID + 工位 WiFi + 自检服务地址）→ 记入清单
  final    自检通过后：按清单写「出厂 NVS」（只含设备 ID），去掉工位 WiFi 与自检地址，设备回到出厂配网状态、访问编译进固件的正式地址

注意：
  - 最后一步必须用 final 写出厂 NVS，**不能整片擦除 NVS**——擦了设备 ID 会丢，设备重新生成的 ID 与登记时锁定的对不上，到用户手里连不上
  - 工位 WiFi 密码只从环境变量 XIAOBU_QC_WIFI_PASSWORD 读取，不走命令行参数（避免进命令历史），不打印
  - 清单含完整 MAC 与设备 ID，只在内部流转，导入后台后妥善保管
  - 需要能 import esp_idf_nvs_partition_gen 的 Python（ESP-IDF 自带环境即可）；写设备需要 esptool

示例：
  python scripts/xiaobu-factory-nvs.py make --out qc.bin --qc-ssid ReBu-QC-01 --qc-ota-url http://10.0.0.2:3989/api/v1/xiaozhi/ota/
  python scripts/xiaobu-factory-nvs.py station --port COM3 --csv batch-20260922.csv --qc-ssid ReBu-QC-01 --qc-ota-url http://10.0.0.2:3989/api/v1/xiaozhi/ota/
  python scripts/xiaobu-factory-nvs.py final --port COM3 --csv batch-20260922.csv
"""
import argparse
import csv
import os
import re
import shlex
import subprocess
import sys
import tempfile
import uuid as uuidlib

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
MAC_RE = re.compile(r"MAC:\s*([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})")


def norm_mac(s):
    m = re.sub(r"[:\-]", "", (s or "").strip())
    if not re.fullmatch(r"[0-9A-Fa-f]{12}", m):
        raise SystemExit(f"MAC 格式不对：{s!r}")
    m = m.lower()
    return ":".join(m[i:i + 2] for i in range(0, 12, 2))


def new_client_id():
    # 与固件 GenerateUuid 相同：UUID v4、小写
    return str(uuidlib.uuid4())


def nvs_csv_rows(client_id, qc_ssid=None, qc_password=None, qc_ota_url=None):
    if not UUID_RE.match(client_id):
        raise SystemExit(f"设备 ID 不是小写 UUID：{client_id!r}")
    rows = [["key", "type", "encoding", "value"], ["board", "namespace", "", ""], ["uuid", "data", "string", client_id]]
    if qc_ssid or qc_ota_url:
        rows.append(["wifi", "namespace", "", ""])
        if qc_ssid:
            rows.append(["ssid", "data", "string", qc_ssid])
            rows.append(["password", "data", "string", qc_password or ""])
        if qc_ota_url:
            rows.append(["ota_url", "data", "string", qc_ota_url])
    return rows


def build_nvs(out_path, rows, size):
    try:
        import esp_idf_nvs_partition_gen.nvs_partition_gen as gen  # noqa: F401
    except ImportError:
        raise SystemExit("找不到 esp_idf_nvs_partition_gen：请用 ESP-IDF 自带的 Python 运行本脚本")
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "nvs.csv")
        with open(src, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)
        r = subprocess.run(
            [sys.executable, "-m", "esp_idf_nvs_partition_gen", "generate", src, out_path, hex(size)],
            capture_output=True, text=True,
        )
        # 临时 CSV 含工位 WiFi 密码：随临时目录删除；生成器输出里不含值，但失败时也只报退出码
        if r.returncode != 0:
            raise SystemExit(f"NVS 生成失败（退出码 {r.returncode}）")


def esptool(args, cmd):
    # cmd 为空时用当前 Python 的 esptool 模块；自定义命令按空白拆分并去掉两端引号（兼容 Windows 路径）
    # 子命令与参数用下划线写法：esptool 4.x 只认下划线，5.x 两种都认
    base = [sys.executable, "-m", "esptool"] if not cmd else [t.strip("\"'") for t in shlex.split(cmd, posix=False)]
    full = base + args
    r = subprocess.run(full, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"esptool 失败：{' '.join(args[:4])} …\n{r.stdout[-800:]}{r.stderr[-800:]}")
    return r.stdout


def read_mac(port, cmd):
    out = esptool(["--port", port, "--after", "hard_reset", "read_mac"], cmd)
    m = MAC_RE.search(out)
    if not m:
        raise SystemExit("没读到 MAC")
    return norm_mac(m.group(1))


def write_nvs(port, cmd, path, offset):
    esptool(["--port", port, "write_flash", hex(offset), path], cmd)


def load_list(path):
    if not os.path.exists(path):
        return {}
    out = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if not row or row[0].strip().lower() in ("mac", "serial"):
                continue
            mac, cid = norm_mac(row[0]), row[1].strip().lower()
            if not UUID_RE.match(cid):
                raise SystemExit(f"清单里 {mac} 的设备 ID 格式不对")
            if mac in out and out[mac] != cid:
                raise SystemExit(f"清单里 {mac} 出现两个不同的设备 ID，请人工核对")
            out[mac] = cid
    return out


def append_list(path, mac, cid):
    new = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["mac", "client_id"])
        w.writerow([mac, cid])


def main():
    ap = argparse.ArgumentParser(description="小卜硬件出厂 NVS 工具")
    ap.add_argument("--nvs-offset", type=lambda s: int(s, 0), default=0x9000, help="NVS 分区偏移（按板型分区表，xmini-c3 为 0x9000）")
    ap.add_argument("--nvs-size", type=lambda s: int(s, 0), default=0x4000, help="NVS 分区大小（xmini-c3 为 0x4000）")
    ap.add_argument("--esptool", default="", help="esptool 命令（默认用当前 Python 的 esptool 模块）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    mk = sub.add_parser("make", help="只生成 NVS 镜像")
    mk.add_argument("--out", required=True)
    mk.add_argument("--uuid", help="设备 ID；不填则新生成")
    mk.add_argument("--qc-ssid")
    mk.add_argument("--qc-ota-url")

    st = sub.add_parser("station", help="自检工位：写自检 NVS 并记入清单")
    st.add_argument("--port", required=True)
    st.add_argument("--csv", required=True)
    st.add_argument("--qc-ssid", required=True)
    st.add_argument("--qc-ota-url", required=True)

    fi = sub.add_parser("final", help="自检通过：写出厂 NVS（只含设备 ID）")
    fi.add_argument("--port", required=True)
    fi.add_argument("--csv", required=True)

    a = ap.parse_args()
    qc_pass = os.environ.get("XIAOBU_QC_WIFI_PASSWORD", "")

    if a.cmd == "make":
        cid = (a.uuid or new_client_id()).lower()
        build_nvs(a.out, nvs_csv_rows(cid, a.qc_ssid, qc_pass, a.qc_ota_url), a.nvs_size)
        print(f"已生成 {a.out}  设备 ID {cid}{'（含工位 WiFi 与自检地址）' if a.qc_ssid or a.qc_ota_url else '（出厂：只含设备 ID）'}")
        return

    mac = read_mac(a.port, a.esptool)
    known = load_list(a.csv)
    with tempfile.TemporaryDirectory() as td:
        img = os.path.join(td, "nvs.bin")
        if a.cmd == "station":
            if not qc_pass:
                raise SystemExit("请先设置环境变量 XIAOBU_QC_WIFI_PASSWORD（工位 WiFi 密码）")
            # 返工重测沿用已有设备 ID，保证清单与设备一致
            cid = known.get(mac) or new_client_id()
            build_nvs(img, nvs_csv_rows(cid, a.qc_ssid, qc_pass, a.qc_ota_url), a.nvs_size)
            write_nvs(a.port, a.esptool, img, a.nvs_offset)
            if mac not in known:
                append_list(a.csv, mac, cid)
            print(f"{mac[-5:].replace(':', '').upper()}  已写自检 NVS{'（沿用已有设备 ID）' if mac in known else '，已记入清单'}；请重启设备开始自检")
        else:
            cid = known.get(mac)
            if not cid:
                raise SystemExit(f"清单里没有这台（MAC 末四位 {mac[-5:].replace(':', '').upper()}），不能写出厂 NVS")
            build_nvs(img, nvs_csv_rows(cid), a.nvs_size)
            write_nvs(a.port, a.esptool, img, a.nvs_offset)
            print(f"{mac[-5:].replace(':', '').upper()}  已写出厂 NVS（只含设备 ID），工位 WiFi 与自检地址已清除")


if __name__ == "__main__":
    main()
