import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const name of ["nginx.conf.template", "nginx.clb.conf.template"]) {
  test(`${name} 访问日志保留统计字段而不展开查询和来源凭据`, () => {
    const source = readFileSync(new URL(`../../docker/nginx/${name}`, import.meta.url), "utf8");
    const format = source.match(/log_format\s+main\s+([\s\S]*?);/)[1];
    assert.doesNotMatch(format, /\$(?:request|request_uri|args|query_string|http_referer)(?![\w])/);
    for (const variable of ["request_method", "privacy_log_path", "server_protocol", "status", "request_time"])
      assert.ok(format.includes(`$${variable}`), `缺少诊断字段 ${variable}`);
    assert.match(source, /map\s+\$request_uri\s+\$privacy_log_path\s*\{/);
    assert.ok(/proxy_pass\s+http:\/\//.test(source), "代理配置仍存在");
  });
}
