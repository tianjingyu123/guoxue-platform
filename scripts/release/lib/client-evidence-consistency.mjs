function summarizeTargets(targets, label, errors) {
  if (!Array.isArray(targets)) {
    errors.push(`${label}缺少目标列表`);
    return new Map();
  }

  const result = new Map();
  for (const target of targets) {
    const directory = String(target?.directory || "").replaceAll("\\", "/");
    if (!directory) {
      errors.push(`${label}存在缺少目录的目标`);
      continue;
    }
    if (result.has(directory)) {
      errors.push(`${label}存在重复目标：${directory}`);
      continue;
    }
    result.set(directory, target);
  }
  return result;
}

function validateAggregateCounts(report, targets, label, errors) {
  const files = targets.reduce((total, target) => total + Number(target?.files || 0), 0);
  const bytes = targets.reduce((total, target) => total + Number(target?.bytes || 0), 0);
  if (report?.counts?.files !== files) {
    errors.push(`${label}文件总数与目标明细不一致`);
  }
  if (report?.counts?.bytes !== bytes) {
    errors.push(`${label}字节总数与目标明细不一致`);
  }
}

export function assertClientEvidenceConsistency(audit, verification) {
  const errors = [];
  const auditTargets = summarizeTargets(audit?.targets, "客户端审计报告", errors);
  const verificationTargets = summarizeTargets(
    verification?.targets,
    "客户端独立验真报告",
    errors,
  );

  validateAggregateCounts(audit, [...auditTargets.values()], "客户端审计报告", errors);
  validateAggregateCounts(
    verification,
    [...verificationTargets.values()],
    "客户端独立验真报告",
    errors,
  );

  for (const [directory, audited] of auditTargets) {
    const verified = verificationTargets.get(directory);
    if (!verified) {
      errors.push(`客户端独立验真报告缺少目标：${directory}`);
      continue;
    }
    if (audited.files !== verified.files) {
      errors.push(`客户端目标文件数不一致：${directory}`);
    }
    if (audited.bytes !== verified.bytes) {
      errors.push(`客户端目标字节数不一致：${directory}`);
    }
    if (audited.contentSha256 !== verified.contentSha256) {
      errors.push(`客户端目标内容指纹不一致：${directory}`);
    }
  }

  for (const directory of verificationTargets.keys()) {
    if (!auditTargets.has(directory)) {
      errors.push(`客户端独立验真报告包含审计范围外目标：${directory}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`客户端审计与独立验真证据不一致：${errors.join("；")}`);
  }
}
