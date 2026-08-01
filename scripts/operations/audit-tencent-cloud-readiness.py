#!/usr/bin/env python3

"""使用 CVM 实例角色只读审计腾讯云关键资源，不输出临时凭据。"""

from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


METADATA_BASE_URL = (
    "http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials"
)


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


def summarize_monitor(credentials: dict[str, Any]) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="monitor",
        host="monitor.tencentcloudapi.com",
        action="DescribeAlarmPolicies",
        version="2018-07-24",
        region="ap-beijing",
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


def summarize_clb(credentials: dict[str, Any]) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="clb",
        host="clb.tencentcloudapi.com",
        action="DescribeListeners",
        version="2018-03-17",
        region="ap-beijing",
        payload={"LoadBalancerId": "lb-kifcf99d"},
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


def summarize_cdn(credentials: dict[str, Any]) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="cdn",
        host="cdn.tencentcloudapi.com",
        action="DescribeDomainsConfig",
        version="2018-06-06",
        payload={"Offset": 0, "Limit": 100},
    )
    domains = []
    for domain in response.get("Domains") or []:
        if domain.get("Domain") != "pre-static.rebugx.cn":
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
                "ipFreqLimitSwitch": (domain.get("IpFreqLimit") or {}).get("Switch"),
                "authenticationSwitch": (domain.get("Authentication") or {}).get(
                    "Switch"
                ),
                "bandwidthAlertSwitch": (domain.get("BandwidthAlert") or {}).get(
                    "Switch"
                ),
                "accessControlSwitch": (domain.get("AccessControl") or {}).get(
                    "Switch"
                ),
            }
        )
    return {"totalNumber": response.get("TotalNumber"), "domains": domains}


def summarize_ssl(credentials: dict[str, Any]) -> dict[str, Any]:
    response = tc3_request(
        credentials,
        service="ssl",
        host="ssl.tencentcloudapi.com",
        action="DescribeCertificates",
        version="2019-12-05",
        payload={"Offset": 0, "Limit": 100, "SearchKey": "rebugx.cn"},
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
    credentials = load_credentials()
    result = {
        "roleName": credentials["role_name"],
        "instanceId": metadata_text("instance-id"),
        "region": metadata_text("placement/region"),
        "monitor": safe_call("云监控策略查询", lambda: summarize_monitor(credentials)),
        "clb": safe_call("CLB 监听器查询", lambda: summarize_clb(credentials)),
        "cdn": safe_call("CDN 配置查询", lambda: summarize_cdn(credentials)),
        "ssl": safe_call("SSL 证书查询", lambda: summarize_ssl(credentials)),
    }
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
