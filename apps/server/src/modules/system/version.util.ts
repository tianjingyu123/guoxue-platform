const VERSION_PATTERN = /^v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?$/;

interface ParsedVersion {
  core: number[];
  prerelease: string[];
}

function parseVersion(value: string): ParsedVersion | null {
  const normalized = String(value || "").trim();
  if (!VERSION_PATTERN.test(normalized)) return null;

  const withoutPrefix = normalized.replace(/^v/i, "");
  const [corePart, prereleasePart = ""] = withoutPrefix.split("-", 2);
  return {
    core: corePart.split(".").map((part) => Number(part)),
    prerelease: prereleasePart ? prereleasePart.split(".") : [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (!left.length && !right.length) return 0;
  if (!left.length) return 1;
  if (!right.length) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;

    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) return Number(a) > Number(b) ? 1 : -1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a.localeCompare(b) > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * 比较 App 展示版本号。返回 1 表示 left 更新，-1 表示 right 更新。
 * 无法解析时返回 null，调用方必须采用保守策略，不能误推降级包。
 */
export function compareAppVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;

  const length = Math.max(a.core.length, b.core.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.core[index] ?? 0;
    const rightPart = b.core[index] ?? 0;
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

function parseBuildNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * 构建号在两端都合法时具有最高优先级；否则回退比较展示版本号。
 * 这样可防止同版本热修构建漏更，同时避免把测试机上的未来版本错误降级。
 */
export function isAppUpdateAvailable(
  latestVersion: string,
  currentVersion: string,
  latestBuildNumber?: string | number | null,
  currentBuildNumber?: string | number | null,
): boolean {
  const latestBuild = parseBuildNumber(latestBuildNumber);
  const currentBuild = parseBuildNumber(currentBuildNumber);
  if (latestBuild !== null && currentBuild !== null) return latestBuild > currentBuild;

  return compareAppVersions(latestVersion, currentVersion) === 1;
}

export function isValidAppVersion(value: string): boolean {
  return VERSION_PATTERN.test(String(value || "").trim());
}

export function isValidDownloadUrl(value?: string | null): boolean {
  if (!value) return false;
  return /^(?:https?:\/\/|market:\/\/|itms-apps:\/\/)/i.test(value.trim());
}
