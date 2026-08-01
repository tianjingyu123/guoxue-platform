#!/usr/bin/env python3

"""使用 CVM 实例角色只读审计腾讯云关键资源，不输出临时凭据。"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


METADATA_BASE_URL = (
    "http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials"
)

DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$",
    re.IGNORECASE,
)
REGION_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$")
CLB_ID_RE = re.compile(r"^lb-[A-Za-z0-9]+$")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="使用目标环境显式资源标识，只读审计腾讯云关键资源",
    )
    parser.add_argument("--region", default=os.environ.get("TENCENT_REGION", ""))
    parser.add_argument("--clb-id", default=os.environ.get("TENCENT_CLB_ID", ""))
    parser.add_argument(
        "--cdn-domain",
        default=os.environ.get("TENCENT_CDN_DOMAIN", ""),
    )
    parser.add_argument(
        "--certificate-domain",
        default=os.environ.get("TENCENT_CERTIFICATE_DOMAIN", ""),
    )
    parser.add_argument(
        "--env-file",
        default="",
        help="从生产环境文件读取缺失的腾讯云目标资源绑定",
    )
    parser.add_argument("--release-id", default="")
    parser.add_argument("--report", default="")
    parser.add_argument(
        "--validate-input-only",
        action="store_true",
        help="只校验目标资源绑定，不访问实例元数据或腾讯云 API",
    )
    return parser.parse_args()


def read_environment_file(file_path: str) -> dict[str, str]:
    if not file_path:
        return {}
    path = pathlib.Path(file_path)
    if not path.is_file():
        raise ValueError(f"环境文件不存在：{file_path}")
    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8-sig").splitlines(), start=1
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ValueError(f"环境文件第 {line_number} 行缺少等号")
        key, value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise ValueError(f"环境文件第 {line_number} 行变量名无效")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'\"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def apply_environment_binding(arguments: argparse.Namespace) -> None:
    values = read_environment_file(arguments.env_file)
    field_keys = {
        "region": "TENCENT_REGION",
        "clb_id": "TENCENT_CLB_ID",
        "cdn_domain": "TENCENT_CDN_DOMAIN",
        "certificate_domain": "TENCENT_CERTIFICATE_DOMAIN",
    }
    for field, key in field_keys.items():
        if not str(getattr(arguments, field) or "").strip():
            setattr(arguments, field, values.get(key, ""))


def write_report(report_path: str, report: dict[str, Any]) -> None:
    if not report_path:
        return
    path = pathlib.Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    path.chmod(0o600)


def validate_target_binding(arguments: argparse.Namespace) -> dict[str, str]:
    region = str(arguments.region or "").strip().lower()
    clb_id = str(arguments.clb_id or "").strip()
    cdn_domain = str(arguments.cdn_domain or "").strip().lower().rstrip(".")
    certificate_domain = (
        str(arguments.certificate_domain or "").strip().lower().rstrip(".")
    )

    missing = [
        name
        for name, value in (
            ("--region/TENCENT_REGION", region),
            ("--clb-id/TENCENT_CLB_ID", clb_id),
            ("--cdn-domain/TENCENT_CDN_DOMAIN", cdn_domain),
            (
                "--certificate-domain/TENCENT_CERTIFICATE_DOMAIN",
                certificate_domain,
            ),
        )
        if not value
    ]
    if missing:
        raise ValueError("缺少目标环境资源绑定：" + "、".join(missing))
    if not REGION_RE.fullmatch(region):
        raise ValueError("腾讯云地域格式无效")
    if not CLB_ID_RE.fullmatch(clb_id):
        raise ValueError("CLB 资源 ID 格式无效")

    for label, domain in (
        ("CDN 域名", cdn_domain),
        ("证书检索域名", certificate_domain),
    ):
        if not DOMAIN_RE.fullmatch(domain):
            raise ValueError(f"{label}必须是纯域名，不能包含协议、端口或路径")
        if domain == "example.com" or domain.endswith(".example.com"):
            raise ValueError(f"{label}仍是占位域名")
        if domain == "localhost" or domain.endswith(".localhost"):
            raise ValueError(f"{label}不能指向本机")

    return {
        "region": region,
        "clbId": clb_id,
        "cdnDomain": cdn_domain,
        "certificateDomain": certificate_domain,
    }


def metadata_text(path: str) -> str:
    url = f"http://metadata.tencentyun.com/latest/meta-data/{path}"
    with urllib.request.urlopen(url, timeout=3) as response:
        return response.read().decode("utf-8").strip()


def load_credentials() -> dict[str, Any]:
    role_name = metadata_text("cam/security-credentials/").strip("/")
    if not role_name:
        raise RuntimeError("CVM 未绑定实例角色")
    url = f"{METADATA_BASE_URL}/{urllib.parse.quote(role_name)}"
    with urllib.request.urlopen(url, timeout=3) as response:
        payload = json.load(response)
    if payload.get("Code") != "Success":
        raise RuntimeError("实例角色未返回可用临时凭据")
    required = ("TmpSecretId", "TmpSecretKey", "Token")
    if not all(payload.get(key) for key in required):
        raise RuntimeError("实例角色临时凭据字段不完整")
    return {
        "role_name": role_name,
        "secret_id": payload["TmpSecretId"],
        "secret_key": payload["TmpSecretKey"],
        "token": payload["Token"],
    }


def sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def tc3_request(
    credentials: dict[str, Any],
    *,
    service: str,
    host: str,
    action: str,
    version: str,
    payload: dict[str, Any],
    region: str | None = None,
) -> dict[str, Any]:
    timestamp = int(time.time())
    date = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).strftime("%Y-%m-%d")
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    content_type = "application/json; charset=utf-8"
    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{host}\n"
        f"x-tc-action:{action.lower()}\n"
    )
    signed_headers = "content-type;host;x-tc-action"
    canonical_request = "\n".join(
        [
            "POST",
            "/",
            "",
            canonical_headers,
            signed_headers,
            hashlib.sha256(body.encode("utf-8")).hexdigest(),
        ]
    )
    credential_scope = f"{date}/{service}/tc3_request"
    string_to_sign = "\n".join(
        [
            "TC3-HMAC-SHA256",
            str(timestamp),
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    secret_date = sign(("TC3" + credentials["secret_key"]).encode("utf-8"), date)
    secret_service = sign(secret_date, service)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(
        secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    authorization = (
        "TC3-HMAC-SHA256 "
        f"Credential={credentials['secret_id']}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    headers = {
        "Authorization": authorization,
        "Content-Type": content_type,
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Timestamp": str(timestamp),
        "X-TC-Token": credentials["token"],
    }
    if region:
        headers["X-TC-Region"] = region

    request = urllib.request.Request(
        f"https://{host}", body.encode("utf-8"), headers, method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        try:
            result = json.load(error)
        except Exception:
            raise RuntimeError(f"{action} 返回 HTTP {error.code}") from error

    response = result.get("Response", {})
    api_error = response.get("Error")
    if api_error:
        # 云 API 的原始错误可能携带账号标识、资源 QCS 和请求链路详情；
        # 审计报告只需要稳定错误码，避免把这些信息写入日志或验收材料。
        raise RuntimeError(api_error.get("Code", "UnknownError"))
    return response


def safe_call(name: str, callback) -> dict[str, Any]:
    try:
        return {"status": "ok", "data": callback()}
    except Exception as error:
        return {"status": "denied-or-failed", "error": f"{name}: {error}"}


def evaluate_readiness(result: dict[str, Any]) -> dict[str, Any]:
    failures = []
    for key, label in (
        ("monitor", "云监控策略查询"),
        ("clb", "CLB 监听器查询"),
        ("cdn", "CDN 配置查询"),
        ("ssl", "SSL 证书查询"),
    ):
        call = result.get(key) or {}
        if call.get("status") != "ok":
            failures.append(f"{label}失败")

    monitor_data = (result.get("monitor") or {}).get("data") or {}
    clb_data = (result.get("clb") or {}).get("data") or {}
    cdn_data = (result.get("cdn") or {}).get("data") or {}
    ssl_data = (result.get("ssl") or {}).get("data") or {}
    if (result.get("monitor") or {}).get("status") == "ok" and not monitor_data.get(
        "policies"
    ):
        failures.append("目标地域未找到云监控策略")
    if (result.get("clb") or {}).get("status") == "ok" and not clb_data.get(
        "listeners"
    ):
        failures.append("目标 CLB 未找到监听器")
    if (result.get("cdn") or {}).get("status") == "ok" and not cdn_data.get(
        "targetFound"
    ):
        failures.append("目标 CDN 域名未找到")
    if (result.get("ssl") or {}).get("status") == "ok" and not ssl_data.get(
        "certificates"
    ):
        failures.append("目标域名未找到证书")

    return {
        "success": len(failures) == 0,
        "failures": failures,
    }


def summarize_monitor(credentials: dict[str, Any], region: str) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="monitor",
        host="monitor.tencentcloudapi.com",
        action="DescribeAlarmPolicies",
        version="2018-07-24",
        region=region,
        payload={"Module": "monitor", "PageNumber": 1, "PageSize": 100},
    )
    policies = []
    for policy in response.get("Policies") or []:
        policies.append(
            {
                "policyId": policy.get("PolicyId"),
                "policyName": policy.get("PolicyName"),
                "enable": policy.get("Enable"),
                "monitorType": policy.get("MonitorType"),
                "namespace": policy.get("Namespace"),
                "filterType": (policy.get("Filter") or {}).get("Type"),
                "objectCount": policy.get("ObjectCount"),
                "noticeCount": len(policy.get("NoticeIds") or []),
            }
        )
    return {"totalCount": response.get("TotalCount"), "policies": policies}


def summarize_clb(
    credentials: dict[str, Any], region: str, clb_id: str
) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="clb",
        host="clb.tencentcloudapi.com",
        action="DescribeListeners",
        version="2018-03-17",
        region=region,
        payload={"LoadBalancerId": clb_id},
    )
    listeners = []
    for listener in response.get("Listeners") or []:
        certificate = listener.get("Certificate") or {}
        health_check = listener.get("HealthCheck") or {}
        listeners.append(
            {
                "listenerId": listener.get("ListenerId"),
                "protocol": listener.get("Protocol"),
                "port": listener.get("Port"),
                "certificateId": certificate.get("CertId"),
                "healthSwitch": health_check.get("HealthSwitch"),
                "healthInterval": health_check.get("IntervalTime"),
                "healthyThreshold": health_check.get("HealthNum"),
                "unhealthyThreshold": health_check.get("UnHealthNum"),
            }
        )
    return {"totalCount": response.get("TotalCount"), "listeners": listeners}


def summarize_cdn(credentials: dict[str, Any], cdn_domain: str) -> dict[str, Any]:
    domains = []
    total_number = 0
    offset = 0
    while offset < 1000 and not domains:
        response = tc3_request(
            credentials,
            service="cdn",
            host="cdn.tencentcloudapi.com",
            action="DescribeDomainsConfig",
            version="2018-06-06",
            payload={"Offset": offset, "Limit": 100},
        )
        total_number = int(response.get("TotalNumber") or 0)
        page_domains = response.get("Domains") or []
        for domain in page_domains:
            if str(domain.get("Domain") or "").lower() != cdn_domain:
                continue
            https = domain.get("Https") or {}
            server_cert = https.get("ServerCert") or {}
            domains.append(
                {
                    "domain": domain.get("Domain"),
                    "status": domain.get("Status"),
                    "cname": domain.get("Cname"),
                    "area": domain.get("Area"),
                    "serviceType": domain.get("ServiceType"),
                    "httpsSwitch": https.get("Switch"),
                    "certificateId": server_cert.get("CertId"),
                    "refererSwitch": (domain.get("Referer") or {}).get("Switch"),
                    "ipFilterSwitch": (domain.get("IpFilter") or {}).get("Switch"),
                    "ipFreqLimitSwitch": (domain.get("IpFreqLimit") or {}).get(
                        "Switch"
                    ),
                    "authenticationSwitch": (
                        domain.get("Authentication") or {}
                    ).get("Switch"),
                    "bandwidthAlertSwitch": (
                        domain.get("BandwidthAlert") or {}
                    ).get("Switch"),
                    "accessControlSwitch": (domain.get("AccessControl") or {}).get(
                        "Switch"
                    ),
                }
            )
        offset += len(page_domains)
        if not page_domains or offset >= total_number:
            break
    return {
        "totalNumber": total_number,
        "targetFound": len(domains) == 1,
        "domains": domains,
    }


def summarize_ssl(
    credentials: dict[str, Any], certificate_domain: str
) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="ssl",
        host="ssl.tencentcloudapi.com",
        action="DescribeCertificates",
        version="2019-12-05",
        payload={"Offset": 0, "Limit": 100, "SearchKey": certificate_domain},
    )
    certificates = []
    for certificate in response.get("Certificates") or []:
        certificates.append(
            {
                "certificateId": certificate.get("CertificateId"),
                "domain": certificate.get("Domain"),
                "alias": certificate.get("Alias"),
                "status": certificate.get("Status"),
                "productName": certificate.get("ProductZhName"),
                "beginTime": certificate.get("CertBeginTime"),
                "endTime": certificate.get("CertEndTime"),
                "autoRenew": certificate.get("IsAutoRenew"),
            }
        )
    return {"totalCount": response.get("TotalCount"), "certificates": certificates}


def main() -> None:
    arguments = parse_arguments()
    try:
        apply_environment_binding(arguments)
        target = validate_target_binding(arguments)
    except ValueError as error:
        raise SystemExit(f"目标资源绑定校验失败：{error}") from error

    release_id = str(arguments.release_id or "").strip()
    if arguments.report and not re.fullmatch(r"[A-Za-z0-9._-]{8,80}", release_id):
        raise SystemExit("生成正式证据时必须提供 8-80 位有效 --release-id")

    if arguments.validate_input_only:
        json.dump(
            {"status": "ok", "targetBinding": target},
            sys.stdout,
            ensure_ascii=False,
            indent=2,
        )
        sys.stdout.write("\n")
        return

    credentials = load_credentials()
    result = {
        "roleName": credentials["role_name"],
        "instanceId": metadata_text("instance-id"),
        "region": metadata_text("placement/region"),
        "targetBinding": target,
        "monitor": safe_call(
            "云监控策略查询",
            lambda: summarize_monitor(credentials, target["region"]),
        ),
        "clb": safe_call(
            "CLB 监听器查询",
            lambda: summarize_clb(
                credentials, target["region"], target["clbId"]
            ),
        ),
        "cdn": safe_call(
            "CDN 配置查询",
            lambda: summarize_cdn(credentials, target["cdnDomain"]),
        ),
        "ssl": safe_call(
            "SSL 证书查询",
            lambda: summarize_ssl(credentials, target["certificateDomain"]),
        ),
    }
    readiness = evaluate_readiness(result)
    result["schemaVersion"] = 1
    result["kind"] = "guoxue-tencent-cloud-readiness"
    result["generatedAt"] = dt.datetime.now(dt.timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )
    result["releaseId"] = release_id or None
    result["success"] = readiness["success"]
    result["summary"] = {
        "failed": len(readiness["failures"]),
        "failures": readiness["failures"],
    }
    write_report(arguments.report, result)
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    if not readiness["success"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
