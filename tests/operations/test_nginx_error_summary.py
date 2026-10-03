"""合成凭据和畸形输入验证，不读取真实业务日志。"""
import importlib.util
import io
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("nginx_summary", Path(__file__).resolve().parents[2] / "scripts/operations/export-nginx-error-summary.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PREFIX = "2026/10/03 10:01:02 [error] 123#456: *789 "
PRIVATE = "synthetic-secret-do-not-export"


class NginxSummaryTests(unittest.TestCase):
    def test_upstream_keeps_only_diagnostic_fields(self):
        line = PREFIX + 'connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, request: "GET /private/' + PRIVATE + '?token=' + PRIVATE + ' HTTP/1.1", upstream: "http://user:' + PRIVATE + '@127.0.0.1/", referrer: "https://example.test/?secret=' + PRIVATE + '"'
        result = module.summarize(line)
        self.assertEqual(result["category"], "upstream_connect")
        self.assertEqual(result["errno"], 111)
        self.assertEqual(result["connectionNumber"], 789)
        self.assertFalse(result["timezoneKnown"])
        self.assertNotIn(PRIVATE, json.dumps(result))

    def test_unknown_message_never_exports_body(self):
        result = module.summarize(PREFIX + PRIVATE)
        self.assertTrue(result["parsed"])
        self.assertEqual(result["category"], "unknown")
        self.assertNotIn(PRIVATE, json.dumps(result))

    def test_all_categories_and_levels(self):
        cases = [("upstream timed out (110: timeout)", "upstream_timeout"), ("upstream sent too big header", "upstream_invalid_header"), ("upstream prematurely closed connection", "upstream_closed"), ('CreateFile() "private" failed (2: missing)', "file_open"), ("SSL_do_handshake() failed", "tls_handshake"), ("limiting requests", "request_rate_limit"), ("limiting connections", "connection_rate_limit"), ("client intended to send too large body", "request_body_too_large")]
        for message, category in cases:
            with self.subTest(category=category):
                self.assertEqual(module.summarize(PREFIX + message)["category"], category)
        for level in ["debug", "info", "notice", "warn", "error", "crit", "alert", "emerg"]:
            with self.subTest(level=level):
                self.assertEqual(module.summarize(PREFIX.replace("[error]", "[" + level + "]") + PRIVATE)["level"], level)

    def test_malformed_and_bad_dates_fail_closed(self):
        for value in [PRIVATE, PREFIX.replace("2026/10/03", "2026/99/99") + PRIVATE, PREFIX.replace("[error]", "[" + PRIVATE + "]"), PREFIX.replace("123#456", PRIVATE)]:
            with self.subTest():
                result = module.summarize(value)
                self.assertFalse(result["parsed"])
                self.assertNotIn(PRIVATE, json.dumps(result))

    def test_context_cannot_forge_category_or_errno(self):
        result = module.summarize(PREFIX + 'unknown message, request: "GET /upstream timed out (999: x) HTTP/1.1"')
        self.assertEqual(result["category"], "unknown")
        self.assertNotIn("errno", result)

    def test_invalid_utf8_and_overlong_stream_preserve_next_line(self):
        input_bytes = b"x" * (module.MAX_LINE_BYTES * 3) + b"\n\xffsynthetic-secret\n" + (PREFIX + "upstream timed out\n").encode()
        output = io.StringIO()
        module.export_stream(io.BytesIO(input_bytes), output)
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(len(rows), 3)
        self.assertTrue(rows[0]["overlong"])
        self.assertFalse(rows[1]["parsed"])
        self.assertEqual(rows[2]["category"], "upstream_timeout")
        self.assertNotIn("synthetic-secret", output.getvalue())


if __name__ == "__main__":
    unittest.main()
