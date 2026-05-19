// ── Mock 数据中心 ──
// 前端预览/演示场景使用

const mockData: Record<string, unknown> = {};

/** 注册 mock 数据（按需加载） */
function loadMock(toolId: string): unknown {
  // 预定义的 mock 数据 key → 懒加载文件
  return mockData[toolId] ?? null;
}

export function getMockByToolId(toolId: string): unknown {
  return loadMock(toolId);
}
