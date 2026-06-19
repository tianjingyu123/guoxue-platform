// API转换层统一导出

export * from "./bazi"
export * from "./qimen"

// 通用转换工具
export function transformApiResult<T>(toolId: string, apiResult: unknown): T {
  // 根据工具ID选择对应的转换函数
  switch (toolId) {
    case "bazi":
      // 动态导入避免循环依赖
      const { transformBaziResult } = require("./bazi")
      return transformBaziResult(apiResult) as T
    case "qimen":
    case "qimen-yang":
    case "qimen-yang-mingli":
    case "qimen-yin":
    case "qimen-yin-mingli":
      const { transformQimenResult } = require("./qimen")
      return transformQimenResult(apiResult) as T
    default:
      // 其他工具暂时直接返回，后续添加对应转换
      return apiResult as T
  }
}
