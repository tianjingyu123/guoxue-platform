"use client"

import { useState } from "react"
import { MapPin, Search } from "lucide-react"

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (location: { province: string; city: string; district: string; lat?: number; lng?: number }) => void
}

// 简化的省市区数据
const REGIONS = {
  北京市: { cities: { 北京市: ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "房山区", "通州区", "顺义区", "昌平区", "大兴区"] } },
  上海市: { cities: { 上海市: ["黄浦区", "徐汇区", "静安区", "普陀区", "虹口区", "杨浦区", "闵行区", "宝山区", "嘉定区", "浦东新区"] } },
  天津市: { cities: { 天津市: ["和平区", "河东区", "河西区", "南开区", "河北区", "红桥区", "东丽区", "西青区", "津南区", "北辰区"] } },
  广东省: {
    cities: {
      广州市: ["天河区", "越秀区", "海珠区", "荔湾区", "白云区", "番禺区", "黄埔区", "南沙区"],
      深圳市: ["福田区", "罗湖区", "南山区", "宝安区", "龙岗区", "盐田区", "龙华区", "坪山区"],
      东莞市: ["东城街道", "南城街道", "万江街道", "莞城街道"],
    },
  },
  江苏省: {
    cities: {
      南京市: ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区", "栖霞区", "雨花台区", "江宁区"],
      苏州市: ["姑苏区", "虎丘区", "吴中区", "相城区", "吴江区", "昆山市", "太仓市"],
    },
  },
  浙江省: {
    cities: {
      杭州市: ["上城区", "拱墅区", "西湖区", "滨江区", "萧山区", "余杭区", "临平区", "钱塘区"],
      宁波市: ["海曙区", "江北区", "北仑区", "镇海区", "鄞州区", "奉化区"],
    },
  },
  四川省: {
    cities: {
      成都市: ["锦江区", "青羊区", "金牛区", "武侯区", "成华区", "龙泉驿区", "青白江区", "新都区", "温江区", "双流区"],
    },
  },
  湖北省: {
    cities: {
      武汉市: ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "洪山区", "东西湖区", "蔡甸区", "江夏区"],
    },
  },
  山东省: {
    cities: {
      济南市: ["历下区", "市中区", "槐荫区", "天桥区", "历城区", "长清区", "章丘区", "济阳区"],
      青岛市: ["市南区", "市北区", "黄岛区", "崂山区", "李沧区", "城阳区", "即墨区"],
    },
  },
  河南省: {
    cities: {
      郑州市: ["中原区", "二七区", "管城区", "金水区", "上街区", "惠济区", "中牟县", "巩义市"],
    },
  },
}

export function LocationPickerModal({ isOpen, onClose, onConfirm }: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProvince, setSelectedProvince] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")

  if (!isOpen) return null

  const provinces = Object.keys(REGIONS)
  const cities = selectedProvince ? Object.keys((REGIONS as Record<string, { cities: Record<string, string[]> }>)[selectedProvince]?.cities || {}) : []
  const districts = selectedProvince && selectedCity ? (REGIONS as Record<string, { cities: Record<string, string[]> }>)[selectedProvince]?.cities[selectedCity] || [] : []

  const handleConfirm = () => {
    if (selectedProvince && selectedCity && selectedDistrict) {
      onConfirm({
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div className="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <button onClick={onClose} className="text-primary text-sm font-medium">
            取消
          </button>
          <span className="text-base font-semibold text-foreground">选择地点</span>
          <button
            onClick={handleConfirm}
            disabled={!selectedDistrict}
            className={`text-sm font-medium ${selectedDistrict ? "text-primary" : "text-muted-foreground"}`}
          >
            确定
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 py-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索省市区"
              className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* 已选择路径 */}
        {(selectedProvince || selectedCity || selectedDistrict) && (
          <div className="px-4 py-2 bg-secondary/30 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-foreground">
              {selectedProvince}
              {selectedCity && ` > ${selectedCity}`}
              {selectedDistrict && ` > ${selectedDistrict}`}
            </span>
          </div>
        )}

        {/* 三级联动选择 */}
        <div className="grid grid-cols-3 divide-x divide-border/60 h-[40vh] overflow-hidden">
          {/* 省份列表 */}
          <div className="overflow-y-auto scrollbar-hide">
            {provinces.map((province) => (
              <button
                key={province}
                onClick={() => {
                  setSelectedProvince(province)
                  setSelectedCity("")
                  setSelectedDistrict("")
                }}
                className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                  selectedProvince === province ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                }`}
              >
                {province}
              </button>
            ))}
          </div>

          {/* 城市列表 */}
          <div className="overflow-y-auto scrollbar-hide">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => {
                  setSelectedCity(city)
                  setSelectedDistrict("")
                }}
                className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                  selectedCity === city ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* 区县列表 */}
          <div className="overflow-y-auto scrollbar-hide">
            {districts.map((district) => (
              <button
                key={district}
                onClick={() => setSelectedDistrict(district)}
                className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                  selectedDistrict === district ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                }`}
              >
                {district}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
