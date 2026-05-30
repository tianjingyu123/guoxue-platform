# 🚀 排盘工具 API — V0 前端对接

## 连接信息

| 项目 | 值 |
|------|-----|
| 基础路径 | `/api/v1` |
| 计算端点 | `POST /api/v1/tools/:toolId/calculate` |
| 工具目录 | `GET /api/v1/tools/directory` |
| Mock数据 | `GET /api/v1/tools/:toolId/mock` |
| 输入Schema | `GET /api/v1/tools/:toolId/input-schema` |
| AI分析 | `POST /api/v1/tools/:toolId/analyze`（需登录） |

## 请求/响应格式

```
POST /api/v1/tools/bazi/calculate
Body: { "input": { "gender": "男", "year": 1984, "month": 3, "day": 15, "hour": 8 } }

Response:
{
  "code": 200,
  "data": {
    "toolId": "bazi",
    "result": { ... 排盘数据 ... },
    "durationMs": 42
  },
  "message": "ok"
}
```

**UI 数据从 `res.data.result` 取。**

---

## 全部工具清单（32个，全部算法就绪）

### 八字紫微
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `bazi` | 八字排盘 | gender, year, month, day, hour |
| `ziwei` | 紫微斗数 | gender, year, month, day, hour |

### 奇门遁甲
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `qimen-yang` | 阳盘奇门 | datetime(默认now) |
| `qimen-yang-mingli` | 阳盘命理奇门 | birthTime, gender |
| `qimen-yin` | 阴盘奇门 | datetime |
| `qimen-yin-mingli` | 阴盘命理奇门 | birthTime, gender |
| `shanxiang-qimen` | 山向奇门 | zuoShan, xiang, duShu |
| `qimen-chuanren` | 奇门穿壬 | datetime |

### 占卜
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `liuyao` | 六爻 | method（9种起卦方式） |
| `meihua` | 梅花易数 | method |
| `xiaochengtu` | 小成图 | method |
| `jinqianke` | 金钱课 | method |
| `zhugeshenshu` | 诸葛神数 | method |
| `kongmingshengua` | 孔明神卦 | method |

### 六壬神课
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `daliuren` | 大六壬 | datetime, birthYear, gender, liveTime |
| `xiaoliuren` | 小六壬 | datetime, type, method |
| `jinkoujue` | 金口诀 | datetime, diFen, diFenMethod |

### 风水
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `xuankong-feixing` | 玄空飞星 | shan, xiang, year |
| `bazhai` | 八宅风水 | birthYear, gender, zuoShan |
| `dianzi-luopan` | 电子罗盘 | type |
| `liji-chi` | 立极尺 | chiType, lengthCm |
| `shanxiang-ditu` | 山向地图 | longitude, latitude, direction |

### 星命
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `taiyi` | 太乙神数 | datetime, shiType |
| `qizheng-siyu` | 七政四余 | datetime, gender |
| `wuyun-liuqi` | 五运六气 | year |

### 起名
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `qiming` | 起名工具 | surname, gender, datetime |
| `xingming-jiexi` | 姓名解析 | surname, givenName |

### 工具字典
| toolId | 名称 | 必填参数 |
|--------|------|---------|
| `feigong-xiaoqimen` | 飞宫小奇门 | method |
| `shoujihao-fenxi` | 手机号分析 | phone |
| `wannianli` | 万年历择吉 | date |
| `kangxi-zidian` | 康熙字典 | queryType, query |
| `hanzi-shaixuan` | 汉字筛选 | 无必填 |

---

## 前端开发要点

### 1. 动态表单
调用 `GET /api/v1/tools/:toolId/input-schema` 获取每个工具的输入定义：
```json
{
  "type": "object",
  "properties": {
    "gender": { "type": "enum", "label": "性别", "values": ["男", "女"] },
    "year": { "type": "number", "label": "出生年", "min": 1900, "max": 2100 }
  },
  "required": ["gender", "year"]
}
```
根据 `type` 渲染对应控件：`string→输入框`、`number→数字`、`enum→下拉`、`datetime→日期选择器`、`boolean→开关`、`array→多选`

### 2. 工具目录页
`GET /api/v1/tools/directory` 返回按分类分组的工具列表，直接渲染首页导航。

### 3. 开发阶段用 Mock
`GET /api/v1/tools/bazi/mock` 返回预设数据，无需传参即可拿到完整排盘结果，先联调 UI 再对接真实计算。

### 4. 核心工具的 result 结构要点

**八字** `res.data.result`
- `.siZhu` — 四柱 {nian, yue, ri, shi}
- `.geJu` — 格局 {name, type, yongShen, xiShen, jiShen}
- `.qiYun` — 起运 {startAge, startYear, daYun[]}

**奇门** `res.data.result`
- `.juNumber` — 局数 1-9
- `.gongs` — 九宫数组 [坎1...离9]，每宫含 star/men/shen/diPan/tianPan/isRuMu/isJiXing/isMenPo
- `.zhiFu` / `.zhiShiMen` — 值符/值使门

**六爻** `res.data.result`
- `.benGua` / `.bianGua` / `.huGua` — 本卦/变卦/互卦
- `.yaoEntries[]` — 六爻纳甲装卦

**大六壬** `res.data.result`
- `.siKe[]` — 四课
- `.sanChuan` — 三传 {chu, zhong, mo}
- `.keJing[]` — 课经

### 5. 建议开发优先级
1. **首页工具目录** — `GET /tools/directory`
2. **八字排盘** — 用户量最大，最核心
3. **紫微斗数** — 第二大需求
4. **阳盘奇门** — 奇门入口
5. **六爻** — 占卜入口
6. **万年历** — 工具类最高频
7. 其余工具按分类逐批上线

---

## 完整文档
详细字段说明见 `docs/v0-api-integration.md`（每个工具的入参、返回结构、枚举值全部标注）。
