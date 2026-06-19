"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Search, MoreVertical, Users, Star, Trash2, Check, FolderEdit } from "lucide-react"

// 五行颜色映射
const tianGanColors: Record<string, string> = {
  "甲": "text-green-600", "乙": "text-green-600",
  "丙": "text-red-500", "丁": "text-red-500",
  "戊": "text-yellow-600", "己": "text-yellow-600",
  "庚": "text-amber-500", "辛": "text-amber-500",
  "壬": "text-blue-500", "癸": "text-blue-500",
}

const diZhiColors: Record<string, string> = {
  "子": "text-blue-500", "丑": "text-yellow-600",
  "寅": "text-green-600", "卯": "text-green-600",
  "辰": "text-yellow-600", "巳": "text-red-500",
  "午": "text-red-500", "未": "text-yellow-600",
  "申": "text-amber-500", "酉": "text-amber-500",
  "戌": "text-yellow-600", "亥": "text-blue-500",
}

// 模拟数据
const mockRecords = [
  { id: 1, name: "孙哥儿子", gender: "male", date: "05月08日 17:11", analyzed: true, pillars: { yearGan: "辛", yearZhi: "丑", monthGan: "丙", monthZhi: "申", dayGan: "甲", dayZhi: "午", hourGan: "壬", hourZhi: "申" }, group: "家人" },
  { id: 2, name: "未知", gender: "male", date: "04月13日 22:54", analyzed: true, pillars: { yearGan: "癸", yearZhi: "亥", monthGan: "戊", monthZhi: "午", dayGan: "丁", dayZhi: "丑", hourGan: "丁", hourZhi: "未" }, group: "全部" },
  { id: 3, name: "亚楠闺女", gender: "female", date: "02月17日 17:07", analyzed: false, pillars: { yearGan: "丙", yearZhi: "午", monthGan: "庚", monthZhi: "寅", dayGan: "辛", dayZhi: "酉", hourGan: "癸", hourZhi: "巳" }, group: "朋友" },
  { id: 4, name: "王雷", gender: "male", date: "2025年12月26日", analyzed: true, pillars: { yearGan: "甲", yearZhi: "子", monthGan: "乙", monthZhi: "亥", dayGan: "己", dayZhi: "巳", hourGan: "壬", hourZhi: "申" }, group: "客户" },
  { id: 5, name: "老段女儿", gender: "female", date: "2025年07月05日", analyzed: true, pillars: { yearGan: "庚", yearZhi: "子", monthGan: "己", monthZhi: "卯", dayGan: "癸", dayZhi: "酉", hourGan: "乙", hourZhi: "卯" }, group: "朋友" },
  { id: 6, name: "徐哥侄女", gender: "female", date: "2024年12月05日", analyzed: true, pillars: { yearGan: "戊", yearZhi: "寅", monthGan: "己", monthZhi: "未", dayGan: "庚", dayZhi: "辰", hourGan: "癸", hourZhi: "未" }, group: "家人" },
]

const groups = ["全部", "家人", "朋友", "客户"]

type SelectMode = "none" | "delete" | "pin" | "group"

export default function BaziHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeGroup, setActiveGroup] = useState("全部")
  const [showMenu, setShowMenu] = useState(false)
  const [selectMode, setSelectMode] = useState<SelectMode>("none")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [records, setRecords] = useState(mockRecords)
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.name.includes(searchQuery)
    const matchesGroup = activeGroup === "全部" || record.group === activeGroup
    return matchesSearch && matchesGroup
  })

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRecords.map(r => r.id))
    }
  }

  const handleChangeGroup = (newGroup: string) => {
    setRecords(prev => prev.map(r => 
      selectedIds.includes(r.id) ? { ...r, group: newGroup } : r
    ))
    setShowGroupPicker(false)
    setSelectMode("none")
    setSelectedIds([])
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/bazi" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          
          {/* 切换标签 */}
          <div className="flex bg-secondary rounded-full p-0.5">
            <button className="px-5 py-1.5 text-sm font-medium rounded-full bg-card text-foreground shadow-sm">
              用户列表
            </button>
            <Link
              href="/bazi/history/celebrities"
              className="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground relative"
            >
              案例库
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium text-bronze bg-bronze-light rounded">VIP</span>
            </Link>
          </div>

          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-secondary transition-colors relative"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 下拉菜单 */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-3 top-12 bg-card rounded-xl shadow-xl z-20 py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
              <Link 
                href="/bazi/history/groups"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">分组编辑</span>
              </Link>
              <button 
                onClick={() => {
                  setSelectMode("group")
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <FolderEdit className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">修改分组</span>
              </button>
              <button 
                onClick={() => {
                  setSelectMode("pin")
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">星标置顶</span>
              </button>
              <button 
                onClick={() => {
                  setSelectMode("delete")
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">批量删除</span>
              </button>
            </div>
          </>
        )}
      </header>

      {/* 搜索栏 */}
      <div className="bg-card px-4 py-3 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索客户名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card border border-transparent focus:border-primary/20"
          />
        </div>
      </div>

      {/* 分组标签 */}
      <div className="bg-card px-4 py-2 border-b border-border/60 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                activeGroup === group
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 bg-card">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p>暂无记录</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRecords.map(record => (
              <div 
                key={record.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                {/* 选择模式下的复选框 */}
                {selectMode !== "none" && (
                  <button
                    onClick={() => toggleSelect(record.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.includes(record.id)
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {selectedIds.includes(record.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                )}

                {/* 性别头像 */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  record.gender === "male" ? "bg-blue-50" : "bg-pink-50"
                }`}>
                  <svg 
                    className={`w-6 h-6 ${record.gender === "male" ? "text-blue-400" : "text-pink-400"}`}
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {record.gender === "male" ? (
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    ) : (
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    )}
                  </svg>
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{record.name}</span>
                    {record.analyzed && (
                      <span className="px-1.5 py-0.5 text-xs text-bronze bg-bronze-light rounded">已解析</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{record.date}</div>
                </div>

                {/* 四柱八字 */}
                <div className="text-right">
                  <div className="flex gap-0.5 text-sm font-medium justify-end">
                    <span className={tianGanColors[record.pillars.yearGan]}>{record.pillars.yearGan}</span>
                    <span className={tianGanColors[record.pillars.monthGan]}>{record.pillars.monthGan}</span>
                    <span className={tianGanColors[record.pillars.dayGan]}>{record.pillars.dayGan}</span>
                    <span className={tianGanColors[record.pillars.hourGan]}>{record.pillars.hourGan}</span>
                  </div>
                  <div className="flex gap-0.5 text-sm font-medium justify-end mt-0.5">
                    <span className={diZhiColors[record.pillars.yearZhi]}>{record.pillars.yearZhi}</span>
                    <span className={diZhiColors[record.pillars.monthZhi]}>{record.pillars.monthZhi}</span>
                    <span className={diZhiColors[record.pillars.dayZhi]}>{record.pillars.dayZhi}</span>
                    <span className={diZhiColors[record.pillars.hourZhi]}>{record.pillars.hourZhi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 批量操作栏 - 删除模式 */}
      {selectMode === "delete" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          {/* 全选 */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedIds.length === filteredRecords.length && filteredRecords.length > 0
                ? "border-primary bg-primary"
                : "border-border"
            }`}>
              {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm text-foreground/80">全选</span>
          </button>

          {/* 按钮组 */}
          <div className="flex-1 flex gap-2 justify-end">
            <button
              onClick={() => {
                setSelectMode("none")
                setSelectedIds([])
              }}
              className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              disabled={selectedIds.length === 0}
              className="px-6 py-2.5 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedIds.length > 0 ? '#f87171' : '#fca5a5' }}
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 批量操作栏 - 置顶模式 */}
      {selectMode === "pin" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          {/* 按钮组 */}
          <div className="flex-1 flex gap-3">
            <button
              onClick={() => {
                setSelectMode("none")
                setSelectedIds([])
              }}
              className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              disabled={selectedIds.length === 0}
              className="flex-1 py-2.5 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedIds.length > 0 ? '#6b7280' : '#9ca3af' }}
            >
              置顶
            </button>
          </div>
        </div>
      )}

      {/* 批量操作栏 - 修改分组模式 */}
      {selectMode === "group" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          {/* 全选 */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedIds.length === filteredRecords.length && filteredRecords.length > 0
                ? "border-primary bg-primary"
                : "border-border"
            }`}>
              {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm text-foreground/80">全选</span>
          </button>

          {/* 按钮组 */}
          <div className="flex-1 flex gap-2 justify-end">
            <button
              onClick={() => {
                setSelectMode("none")
                setSelectedIds([])
              }}
              className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              disabled={selectedIds.length === 0}
              onClick={() => setShowGroupPicker(true)}
              className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              移动到分组
            </button>
          </div>
        </div>
      )}

      {/* 分组选择弹窗 */}
      {showGroupPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowGroupPicker(false)}>
          <div className="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-border text-center">
              <span className="text-base font-semibold text-foreground">选择分组</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {groups.filter(g => g !== "全部").map(group => (
                <button
                  key={group}
                  onClick={() => handleChangeGroup(group)}
                  className="w-full px-4 py-4 text-left text-foreground hover:bg-secondary/50 transition-colors border-b border-border/60 last:border-b-0"
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowGroupPicker(false)}
                className="w-full py-3 bg-secondary text-muted-foreground rounded-full font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
