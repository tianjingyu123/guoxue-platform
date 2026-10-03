import { isAbsolute, relative, sep } from "node:path";

/** 输入必须是 realpath 结果；包壳和实际生成客户端都在工作树内才算独立。 */
export function isLocalClient(root, packagePath, generatedPath) {
  const inside = (target) => {
    const rel = relative(root, target);
    return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
  };
  return inside(packagePath) && inside(generatedPath);
}
