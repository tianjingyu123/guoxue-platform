"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Info, X, ChevronRight } from "lucide-react"

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (location: { province: string; city: string; district: string; timezone: string; convertToBeijing?: boolean }) => void
  initialLocation?: { province: string; city: string; district: string }
}

// 简化的中国省市区数据
const chinaData: Record<string, Record<string, string[]>> = {
  "北京市": {
    "北京市": ["东城区", "西城区", "朝阳区", "丰台区", "石景山区", "海淀区", "顺义区", "通州区", "大兴区", "房山区", "门头沟区", "昌平区", "平谷区", "密云区", "怀柔区", "延庆区"]
  },
  "上海市": {
    "上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区", "闵行区", "宝山区", "嘉定区", "浦东新区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区"]
  },
  "天津市": {
    "天津市": ["和平区", "河东区", "河西区", "南开区", "河北区", "红桥区", "东丽区", "西青区", "津南区", "北辰区", "武清区", "宝坻区", "滨海新区", "宁河区", "静海区", "蓟州区"]
  },
  "重庆市": {
    "重庆市": ["渝中区", "万州区", "涪陵区", "大渡口区", "江北区", "沙坪坝区", "九龙坡区", "南岸区", "北碚区", "渝北区", "巴南区", "黔江区", "长寿区", "江津区", "合川区", "永川区"]
  },
  "广东省": {
    "广州市": ["越秀区", "海珠区", "荔湾区", "天河区", "白云区", "黄埔区", "番禺区", "花都区", "南沙区", "从化区", "增城区"],
    "深圳市": ["福田区", "罗湖区", "南山区", "盐田区", "宝安区", "龙岗区", "龙华区", "坪山区", "光明区"],
    "东莞市": ["东城街道", "南城街道", "万江街道", "莞城街道"],
    "佛山市": ["禅城区", "南海区", "顺德区", "三水区", "高明区"],
  },
  "江苏省": {
    "南京市": ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区", "栖霞区", "雨花台区", "江宁区", "六合区", "溧水区", "高淳区"],
    "苏州市": ["姑苏区", "虎丘区", "吴中区", "相城区", "吴江区", "昆山市", "太仓市", "常熟市", "张家港市"],
  },
  "浙江省": {
    "杭州市": ["上城区", "拱墅区", "西湖区", "滨江区", "萧山区", "余杭区", "临平区", "钱塘区", "富阳区", "临安区"],
    "宁波市": ["海曙区", "江北区", "北仑区", "镇海区", "鄞州区", "奉化区", "余姚市", "慈溪市"],
  },
  "四川省": {
    "成都市": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区", "龙泉驿区", "青白江区", "新都区", "温江区", "双流区", "郫都区"],
  },
  "湖北省": {
    "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "洪山区", "东西湖区", "汉南区", "蔡甸区", "江夏区"],
  },
  "香港": {
    "香港": ["中西区", "湾仔区", "东区", "南区", "油尖旺区", "深水埗区", "九龙城区", "黄大仙区", "观塘区"]
  },
  "澳门": {
    "澳门": ["花地玛堂区", "花王堂区", "望德堂区", "大堂区", "风顺堂区"]
  },
  "台湾省": {
    "台北市": ["中正区", "大同区", "中山区", "松山区", "大安区", "万华区", "信义区", "士林区", "北投区"],
  },
  "未知地": {
    "北京时间": ["--"]
  }
}

// 海外地区数据（仅北半球）
const overseasData: Record<string, Record<string, string[]>> = {
  "美国": {
    "纽约州": ["纽约市", "布法罗", "罗切斯特"],
    "加利福尼亚州": ["洛杉矶", "旧金山", "圣地亚哥"],
    "德克萨斯州": ["休斯顿", "达拉斯", "奥斯汀"],
    "华盛顿州": ["西雅图", "塔科马"],
    "伊利诺伊州": ["芝加哥"],
  },
  "日本": {
    "东京都": ["千代田区", "中央区", "港区", "新宿区", "�的谷区", "品川区"],
    "大阪府": ["大阪市", "堺市"],
    "京都府": ["京都市"],
  },
  "韩国": {
    "首尔": ["钟路区", "中区", "龙山区", "城东区", "江南区"],
    "釜山": ["中区", "海云台区"],
  },
  "英国": {
    "英格兰": ["伦敦", "曼彻斯特", "伯明翰", "利物浦"],
    "苏格兰": ["爱丁堡", "格拉斯哥"],
  },
  "加拿大": {
    "安大略省": ["多伦多", "渥太华"],
    "不列颠哥伦比亚省": ["温哥华", "维多利亚"],
  },
  "法国": {
    "法兰西岛": ["巴黎"],
    "普罗旺斯": ["马赛", "尼斯"],
  },
  "德国": {
    "柏林": ["柏林"],
    "巴伐利亚": ["慕尼黑"],
  },
  "新加坡": {
    "新加坡": ["中区", "东区", "西区", "南区", "北区"],
  },
  "泰国": {
    "曼谷": ["曼谷"],
    "清迈府": ["清迈"],
  },
  "马来西亚": {
    "吉隆坡": ["吉隆坡"],
    "槟城": ["乔治市"],
  },
}

// 滚轮选择器
function WheelPicker({ 
  items, 
  selectedIndex, 
  onSelect 
}: { 
  items: string[]
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemHeight = 50

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selectedIndex * itemHeight
    }
  }, [selectedIndex])

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const newIndex = Math.round(scrollTop / itemHeight)
      if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < items.length) {
        onSelect(newIndex)
      }
    }
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 h-[150px] overflow-y-auto scrollbar-hide"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div className="h-[50px]" />
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => {
            onSelect(index)
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
            }
          }}
          className={`h-[50px] flex items-center justify-center cursor-pointer transition-all duration-150 px-2 ${
            index === selectedIndex 
              ? "text-xl font-bold text-gray-900" 
              : Math.abs(index - selectedIndex) === 1
                ? "text-base text-gray-300"
                : "text-sm text-gray-200"
          }`}
          style={{ scrollSnapAlign: 'center' }}
        >
          <span className="truncate">{item}</span>
        </div>
      ))}
      <div className="h-[50px]" />
    </div>
  )
}

// 北京时间说明弹窗
function BeijingTimeExplainModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">换算北京时间设置</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 leading-relaxed space-y-4">
          <p className="text-gray-500 text-xs">（默认关闭）</p>
          
          <p>四柱八字是基于中国传统文化和历法所形成的一套体系，它主要依据中国的干支纪年法来推算。</p>
          
          <p>然而，对于在国外出生的人来说，如何排盘，是一个需要仔细探索的问题，因为这不仅涉及到时差带来的时间换算问题，还关乎地理纬度（真太阳时）、节气转换等多个方面。</p>
          
          <p>目前学术界存在两种不同的观点：</p>
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-gray-900">第一种观点：使用当地真太阳时</p>
            <p className="text-gray-600">认为古人利用太阳的投影来测定并划分时刻，��没有时区和统一时区的概念，而在运用四柱等术数时，都是以太阳定时。所以�����出生在国外，也应当沿用地方真太阳时合理。</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-gray-900">第二种观点：换算成北京时间</p>
            <p className="text-gray-600">因为四柱干支是中国人发明的，所以不管是国内还是国外，一律以北京时间为准，换算成北京时间后（已获取了当地真太阳时）排盘。</p>
          </div>
          
          <p>这里为了配合易学爱好者的使用，我们在开发国外出生排盘功能时，采用的是当地时间，也就是<span className="font-medium text-gray-900">默认"关闭"换算北京时间按钮</span>。</p>
          
          <p>当然，如果有部分爱好者是遵循第二种观点，可以"打开"换算北京时间按钮，即是将国外出生时间换算成北京时间进行排盘。</p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-800 text-xs">
              <span className="font-medium">注意：</span>目前暂不支持南半球国家，如澳大利亚、新西兰等。由于南半球和北半球存在时间和空间的不同，历法和季节相反，对于南半球出生者的排盘问题，需要加以考究和验证。
            </p>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}

export function LocationPickerModal({ isOpen, onClose, onConfirm, initialLocation }: LocationPickerModalProps) {
  const [region, setRegion] = useState<"domestic" | "overseas">("domestic")
  const [searchQuery, setSearchQuery] = useState("")
  const [province, setProvince] = useState(initialLocation?.province || "未知地")
  const [city, setCity] = useState(initialLocation?.city || "北京时间")
  const [district, setDistrict] = useState(initialLocation?.district || "--")
  const [convertToBeijing, setConvertToBeijing] = useState(false)
  const [showExplain, setShowExplain] = useState(false)

  const data = region === "domestic" ? chinaData : overseasData
  const provinces = Object.keys(data)
  const cities = data[province] ? Object.keys(data[province]) : []
  const districts = data[province]?.[city] || []

  // 当省份变化时重置城市和区县
  useEffect(() => {
    if (data[province]) {
      const firstCity = Object.keys(data[province])[0]
      setCity(firstCity)
      setDistrict(data[province][firstCity]?.[0] || "")
    }
  }, [province, data])

  // 当城市变化时重置区县
  useEffect(() => {
    if (data[province]?.[city]) {
      setDistrict(data[province][city][0] || "")
    }
  }, [city, province, data])

  // 切换国内/海外时重置选择
  useEffect(() => {
    const firstProvince = Object.keys(data)[0]
    setProvince(firstProvince)
    const firstCity = Object.keys(data[firstProvince])[0]
    setCity(firstCity)
    setDistrict(data[firstProvince][firstCity]?.[0] || "")
  }, [region])

  const handleConfirm = () => {
    onConfirm({
      province,
      city,
      district,
      timezone: "北京时间",
      convertToBeijing: region === "overseas" ? convertToBeijing : undefined
    })
    onClose()
  }

  // 搜索过滤
  const filteredProvinces = searchQuery 
    ? provinces.filter(p => p.includes(searchQuery))
    : provinces

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        
        {/* 选择器面板 */}
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl overflow-hidden animate-slide-up">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            {/* 国内/海外切换 */}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setRegion("domestic")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  region === "domestic"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                国内
              </button>
              <button
                onClick={() => setRegion("overseas")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  region === "overseas"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                海外
              </button>
            </div>
            
            <button
              onClick={handleConfirm}
              className="px-5 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              确定
            </button>
          </div>

          {/* 搜索框 */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={region === "domestic" ? "搜索全国城市及地区" : "搜索海外城市及地区"}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 当前选中显示 */}
          <div className="flex px-5 py-3 bg-primary/5 border-b border-primary/10">
            <div className="flex-1 text-center text-base font-bold text-primary truncate">{province}</div>
            <div className="flex-1 text-center text-base font-bold text-primary truncate">{city}</div>
            <div className="flex-1 text-center text-base font-bold text-primary truncate">{district || "--"}</div>
          </div>

          {/* 滚轮选择区域 */}
          <div className="relative flex border-b border-gray-100 py-2">
            {/* 选中行高亮 */}
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[50px] bg-gray-50/70 rounded-xl pointer-events-none" />
            
            <WheelPicker
              items={searchQuery ? filteredProvinces : provinces}
              selectedIndex={Math.max(0, (searchQuery ? filteredProvinces : provinces).indexOf(province))}
              onSelect={(index) => setProvince((searchQuery ? filteredProvinces : provinces)[index])}
            />
            <WheelPicker
              items={cities}
              selectedIndex={Math.max(0, cities.indexOf(city))}
              onSelect={(index) => setCity(cities[index])}
            />
            <WheelPicker
              items={districts}
              selectedIndex={Math.max(0, districts.indexOf(district))}
              onSelect={(index) => setDistrict(districts[index])}
            />
          </div>

          {/* 海外地区显示换算北京时间选项 */}
          {region === "overseas" && (
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">换算北京时间</span>
                  <button 
                    onClick={() => setShowExplain(true)}
                    className="p-0.5 text-gray-400 hover:text-primary"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setConvertToBeijing(!convertToBeijing)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    convertToBeijing ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    convertToBeijing ? "translate-x-5.5 left-0.5" : "left-0.5"
                  }`} style={{ transform: convertToBeijing ? 'translateX(22px)' : 'translateX(0)' }} />
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                仅支持北半球地区
              </p>
            </div>
          )}

          {/* 底部取消按钮 */}
          <div className="px-5 py-3">
            <button 
              onClick={onClose}
              className="w-full text-center text-gray-500 text-sm py-1"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      {/* 北京时间说明弹窗 */}
      <BeijingTimeExplainModal isOpen={showExplain} onClose={() => setShowExplain(false)} />
    </>
  )
}
