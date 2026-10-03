import assert from "node:assert/strict";
import test from "node:test";

import { assertClientEvidenceConsistency } from "../../scripts/release/lib/client-evidence-consistency.mjs";

const directories = [
  "apps/admin/dist",
  "apps/mobile/dist/build/h5",
  "apps/mobile/dist/build/mp-weixin",
  "apps/mobile/dist/build/app",
  "apps/mobile/dist/build/app-harmony",
];

function evidence() {
  const targets = directories.map((directory, index) => ({
    directory,
    files: index + 1,
    bytes: (index + 1) * 10,
    contentSha256: String(index + 1).repeat(64),
  }));
  const counts = {
    targets: targets.length,
    files: targets.reduce((total, target) => total + target.files, 0),
    bytes: targets.reduce((total, target) => total + target.bytes, 0),
    errors: 0,
  };
  return {
    audit: {
      counts: { ...counts },
      targets: targets.map((target) => ({ ...target, success: true })),
    },
    verification: {
      counts: { ...counts },
      targets: targets.map((target) => ({ ...target, matches: true })),
    },
  };
}

test("五端审计与独立验真明细完全一致时通过", () => {
  const { audit, verification } = evidence();
  assert.doesNotThrow(() => assertClientEvidenceConsistency(audit, verification));
});

test("同一发布批次混入其他客户端内容指纹时阻断", () => {
  const { audit, verification } = evidence();
  verification.targets[2].contentSha256 = "f".repeat(64);
  assert.throws(
    () => assertClientEvidenceConsistency(audit, verification),
    /内容指纹不一致/u,
  );
});

test("目标缺失、重复或聚合计数漂移时阻断", () => {
  const { audit, verification } = evidence();
  verification.targets.pop();
  verification.targets.push({ ...verification.targets[0] });
  audit.counts.files += 1;
  assert.throws(
    () => assertClientEvidenceConsistency(audit, verification),
    /文件总数与目标明细不一致|重复目标|缺少目标/u,
  );
});
