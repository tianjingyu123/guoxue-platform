import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  ToolsDirectoryResponse, 
  InputSchema, 
  CalculateResponse,
  ToolCategory,
  BaziResult
} from '../types/tools'

// ==================== Mock 数据 ====================

const mockToolsDirectory: ToolsDirectoryResponse = {
  categories: [
    {
      name: '命理排盘',
      tools: [
        { toolId: 'bazi', name: '八字排盘', description: '根据出生时间排出四柱八字', badge: '热门', color: 'from-red-500 to-orange-500' },
        { toolId: 'ziwei', name: '紫微斗数', description: '紫微命盘精准排布', badge: '推荐', color: 'from-purple-500 to-pink-500' },
      ]
    },
    {
      name: '占卜预测',
      tools: [
        { toolId: 'liuyao', name: '六爻起卦', description: '铜钱摇卦、时间起卦', badge: null, color: 'from-blue-500 to-cyan-500' },
        { toolId: 'qimen', name: '奇门遁甲', description: '时家奇门排盘', badge: '专业', color: 'from-emerald-500 to-teal-500' },
      ]
    },
    {
      name: '高级术数',
      tools: [
        { toolId: 'liuren', name: '大六壬', description: '六壬课式排盘', badge: null, color: 'from-indigo-500 to-violet-500' },
        { toolId: 'taiyi', name: '太乙神数', description: '太乙数术排盘', badge: null, color: 'from-amber-500 to-yellow-500' },
      ]
    }
  ]
}

const mockInputSchemas: Record<string, InputSchema> = {
  bazi: {
    type: 'object',
    properties: {
      gender: {
        type: 'enum',
        label: '性别',
        required: true,
        values: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ]
      },
      birthDate: {
        type: 'date',
        label: '出生日期（公历）',
        required: true,
        placeholder: '请选择出生日期'
      },
      birthTime: {
        type: 'enum',
        label: '出生时辰',
        required: true,
        values: [
          { value: '子时', label: '子时 (23:00-01:00)' },
          { value: '丑时', label: '丑时 (01:00-03:00)' },
          { value: '寅时', label: '寅时 (03:00-05:00)' },
          { value: '卯时', label: '卯时 (05:00-07:00)' },
          { value: '辰时', label: '辰时 (07:00-09:00)' },
          { value: '巳时', label: '巳时 (09:00-11:00)' },
          { value: '午时', label: '午时 (11:00-13:00)' },
          { value: '未时', label: '未时 (13:00-15:00)' },
          { value: '申时', label: '申时 (15:00-17:00)' },
          { value: '酉时', label: '酉时 (17:00-19:00)' },
          { value: '戌时', label: '戌时 (19:00-21:00)' },
          { value: '亥时', label: '亥时 (21:00-23:00)' },
        ]
      },
      birthPlace: {
        type: 'string',
        label: '出生地点',
        required: false,
        placeholder: '请输入出生城市（可选，用于真太阳时校正）'
      }
    },
    required: ['gender', 'birthDate', 'birthTime']
  },
  ziwei: {
    type: 'object',
    properties: {
      gender: {
        type: 'enum',
        label: '性别',
        required: true,
        values: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ]
      },
      birthDate: {
        type: 'date',
        label: '出生日期（公历）',
        required: true,
        placeholder: '请选择出生日期'
      },
      birthTime: {
        type: 'enum',
        label: '出生时辰',
        required: true,
        values: [
          { value: '子时', label: '子时 (23:00-01:00)' },
          { value: '丑时', label: '丑时 (01:00-03:00)' },
          { value: '寅时', label: '寅时 (03:00-05:00)' },
          { value: '卯时', label: '卯时 (05:00-07:00)' },
          { value: '辰时', label: '辰时 (07:00-09:00)' },
          { value: '巳时', label: '巳时 (09:00-11:00)' },
          { value: '午时', label: '午时 (11:00-13:00)' },
          { value: '未时', label: '未时 (13:00-15:00)' },
          { value: '申时', label: '申时 (15:00-17:00)' },
          { value: '酉时', label: '酉时 (17:00-19:00)' },
          { value: '戌时', label: '戌时 (19:00-21:00)' },
          { value: '亥时', label: '亥时 (21:00-23:00)' },
        ]
      }
    },
    required: ['gender', 'birthDate', 'birthTime']
  },
  liuyao: {
    type: 'object',
    properties: {
      method: {
        type: 'enum',
        label: '起卦方式',
        required: true,
        values: [
          { value: 'coin', label: '铜钱摇卦' },
          { value: 'time', label: '时间起卦' },
          { value: 'number', label: '数字起卦' },
        ]
      },
      question: {
        type: 'string',
        label: '所问之事',
        required: false,
        placeholder: '请简述您想占问的事项'
      }
    },
    required: ['method']
  },
  qimen: {
    type: 'object',
    properties: {
      datetime: {
        type: 'datetime',
        label: '起局时间',
        required: true
      },
      method: {
        type: 'enum',
        label: '排盘方式',
        required: true,
        values: [
          { value: 'shijia', label: '时家奇门' },
          { value: 'rijia', label: '日家奇门' },
        ]
      }
    },
    required: ['datetime', 'method']
  },
  liuren: {
    type: 'object',
    properties: {
      datetime: {
        type: 'datetime',
        label: '占时',
        required: true
      },
      question: {
        type: 'string',
        label: '所占事项',
        required: false,
        placeholder: '请简述占问事项'
      }
    },
    required: ['datetime']
  },
  taiyi: {
    type: 'object',
    properties: {
      datetime: {
        type: 'datetime',
        label: '起局时间',
        required: true
      }
    },
    required: ['datetime']
  }
}

const mockBaziResult: CalculateResponse<BaziResult> = {
  toolId: 'bazi',
  input: { gender: 'male', birthDate: '1990-01-15', birthTime: '午时' },
  result: {
    fourPillars: [
      { pillar: '年柱', heavenlyStem: '甲', earthlyBranch: '子', element: '木', animal: '鼠' },
      { pillar: '月柱', heavenlyStem: '丙', earthlyBranch: '寅', element: '火', animal: '虎' },
      { pillar: '日柱', heavenlyStem: '戊', earthlyBranch: '辰', element: '土', animal: '龙' },
      { pillar: '时柱', heavenlyStem: '庚', earthlyBranch: '午', element: '金', animal: '马' },
    ],
    fiveElements: { wood: 2, fire: 2, earth: 2, metal: 1, water: 1 },
    dayMaster: '戊土',
    pattern: '食神格',
    strength: '身旺',
  },
  calculatedAt: new Date().toISOString()
}

// ==================== API 函数 ====================

/**
 * 获取工具分类目录
 */
export async function getToolsDirectory(): Promise<ApiResponse<ToolsDirectoryResponse>> {
  if (useMock()) {
    return {
      code: 0,
      data: mockToolsDirectory,
      message: 'success'
    }
  }
  return apiGet<ToolsDirectoryResponse>('/tools/directory')
}

/**
 * 获取工具输入 Schema
 */
export async function getInputSchema(toolId: string): Promise<ApiResponse<InputSchema>> {
  if (useMock()) {
    const schema = mockInputSchemas[toolId]
    if (schema) {
      return { code: 0, data: schema, message: 'success' }
    }
    return { code: 404, data: null as unknown as InputSchema, message: '未找到该工具的输入定义' }
  }
  return apiGet<InputSchema>(`/tools/${toolId}/input-schema`)
}

/**
 * 执行排盘计算
 */
export async function calculateTool<T = unknown>(
  toolId: string, 
  input: Record<string, unknown>
): Promise<ApiResponse<CalculateResponse<T>>> {
  if (useMock()) {
    // 模拟计算延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据工具ID返回对应的mock数据
    if (toolId === 'bazi') {
      return {
        code: 0,
        data: { ...mockBaziResult, input } as unknown as CalculateResponse<T>,
        message: 'success'
      }
    }
    
    // 通用mock返回
    return {
      code: 0,
      data: {
        toolId,
        input,
        result: { message: '计算完成（Mock数据）' },
        calculatedAt: new Date().toISOString()
      } as unknown as CalculateResponse<T>,
      message: 'success'
    }
  }
  
  return apiPost<CalculateResponse<T>>(`/tools/${toolId}/calculate`, { input })
}

/**
 * 获取工具 Mock 数据（调试用）
 */
export async function getToolMock(toolId: string): Promise<ApiResponse<unknown>> {
  if (useMock()) {
    if (toolId === 'bazi') {
      return { code: 0, data: mockBaziResult, message: 'success' }
    }
    return { code: 404, data: null, message: '未找到该工具的Mock数据' }
  }
  return apiGet(`/tools/${toolId}/mock`)
}

/**
 * 获取所有工具（扁平列表）
 */
export async function getAllTools(): Promise<ApiResponse<ToolCategory['tools']>> {
  const response = await getToolsDirectory()
  if (response.code !== 0) {
    return { code: response.code, data: [], message: response.message }
  }
  
  const tools = response.data.categories.flatMap(cat => cat.tools)
  return { code: 0, data: tools, message: 'success' }
}
