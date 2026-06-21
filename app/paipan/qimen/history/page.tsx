"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Search, MoreVertical, Trash2, Check, Star, Users, FolderEdit, Pin } from "lucide-react"

// 分组数据
const groups = ["全部", "工作事业", "财运投资", "感情婚姻", "健康出行", "其他"]

// 模拟历史记录数据
const mockRecords = [
  { id: 1, dateTime: "2026-05-17 13:38", matter: "求财运势", ju: "阳遁3局", panMethod: "飞盘", createdAt: "2026-05-17", group: "财运投资", pinned: false },
  { id: 2, dateTime: "2026-05-16 09:20", matter: "出行吉凶", ju: "阴遁5局", panMethod: "转盘", createdAt: "2026-05-16", group: "健康出行", pinned: true },
  { id: 3, dateTime: "2026-05-15 15:45", matter: "合作洽谈", ju: "阳遁7局", panMethod: "飞盘", createdAt: "2026-05-15", group: "工作事业", pinned: false },
  { id: 4, dateTime: "2026-05-14 11:00", matter: "", ju: "阴遁2局", panMethod: "飞盘", createdAt: "2026-05-14", group: "其他", pinned: false },
  { id: 5, dateTime: "2026-05-13 08:30", matter: "面试求职", ju: "阳遁1局", panMethod: "转盘", createdAt: "2026-05-13", group: "工作事业", pinned: true },
]

type SelectMode = "none" | "delete" | "pin" | "group"

export default function QimenHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeGroup, setActiveGroup] = useState("全部")
  const [showMenu, setShowMenu] = useState(false)
  const [selectMode, setSelectMode] = useState<SelectMode>("none")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [records, setRecords] = useState(mockRecords)
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  // 筛选记录
  const filteredRecords = records
    .filter(record => 
      (activeGroup === "全部" || record.group === activeGroup) &&
      (record.matter.includes(searchQuery) || 
       record.dateTime.includes(searchQuery) ||
       record.ju.includes(searchQuery))
    )
    .sort((a, b) => {
      // 置顶的排在前面
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
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

  const handleDelete = () => {
    setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)))
    setSelectMode("none")
    setSelectedIds([])
  }

  const handlePin = () => {
    setRecords(prev => prev.map(r => 
      selectedIds.includes(r.id) ? { ...r, pinned: true } : r
    ))
    setSelectMode("none")
    setSelectedIds([])
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
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/paipan/qimen" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Link>
          <h1 className="text-base font-bold text-foreground">排盘记录</h1>
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 -mr-1 relative">
            <MoreVertical className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* 下拉菜单 */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-3 top-12 bg-card rounded-xl shadow-xl z-20 py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
              <Link 
                href="/paipan/qimen/history/groups"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">分组管理</span>
              </Link>
              <button 
                onClick={() => { setSelectMode("group"); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <FolderEdit className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">修改分组</span>
              </button>
              <button 
                onClick={() => { setSelectMode("pin"); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Pin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">批量置顶</span>
              </button>
              <button 
                onClick={() => { setSelectMode("delete"); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">批量删除</span>
              </button>
            </div>
          </>
        )}
      </header>

      {/* 分组标签 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeGroup === group
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索事项、时间、局数..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* 记录列表 */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <span className="text-lg mb-2">暂无记录</span>
            <span className="text-sm">开始排盘后，记录��显示在这���</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <div 
                key={record.id}
                className={`bg-card rounded-xl border border-border overflow-hidden transition-all ${
                  selectMode !== "none" ? "cursor-pointer" : ""
                } ${selectedIds.includes(record.id) ? "ring-2 ring-primary" : ""} ${record.pinned ? "bg-amber-50/30" : ""}`}
                onClick={() => { if (selectMode !== "none") toggleSelect(record.id) }}
              >
                <div className="flex">
                  {/* 左侧色条 - 奇门用蓝色 */}
                  <div className="w-1 bg-gradient-to-b from-blue-400 to-indigo-500 shrink-0" />
                  <div className="p-4 flex-1">
                    <div className="flex items-start gap-3">
                      {/* 选择模式下显示复选框 */}
                      {selectMode !== "none" && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          selectedIds.includes(record.id)
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}>
                          {selectedIds.includes(record.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      )}

                      {/* 记录内容 */}
                      <Link 
                        href={`/paipan/qimen/result?matter=${encodeURIComponent(record.matter)}&ju=${encodeURIComponent(record.ju)}`}
                        className={`flex-1 ${selectMode !== "none" ? "pointer-events-none" : ""}`}
                        onClick={(e) => selectMode !== "none" && e.preventDefault()}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {record.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="text-base font-semibold text-foreground">
                              {record.matter || "未命名事项"}
                            </span>
                          </div>
                          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{record.group}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{record.dateTime}</span>
                          <span className="text-primary font-semibold bg-primary/5 px-2 py-0.5 rounded">{record.ju}</span>
                          <span className="text-muted-foreground text-xs">{record.panMethod}</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 批量操作栏 - 删除模式 */}
      {selectMode === "delete" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          <button onClick={selectAll} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
            }`}>
              {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-foreground/80">全选</span>
          </button>
          <div className="flex-1 flex gap-3 justify-end">
            <button onClick={() => { setSelectMode("none"); setSelectedIds([]) }} className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</button>
            <button disabled={selectedIds.length === 0} onClick={handleDelete} className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 rounded-full disabled:opacity-40">删除 {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</button>
          </div>
        </div>
      )}

      {/* 批量操作栏 - 置顶模式 */}
      {selectMode === "pin" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          <button onClick={selectAll} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
            }`}>
              {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-foreground/80">全选</span>
          </button>
          <div className="flex-1 flex gap-3 justify-end">
            <button onClick={() => { setSelectMode("none"); setSelectedIds([]) }} className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</button>
            <button disabled={selectedIds.length === 0} onClick={handlePin} className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full disabled:opacity-40">置顶 {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</button>
          </div>
        </div>
      )}

      {/* 批量操作栏 - 修改分组模式 */}
      {selectMode === "group" && (
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
          <button onClick={selectAll} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
            }`}>
              {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-foreground/80">全选</span>
          </button>
          <div className="flex-1 flex gap-2 justify-end">
            <button onClick={() => { setSelectMode("none"); setSelectedIds([]) }} className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</button>
            <button disabled={selectedIds.length === 0} onClick={() => setShowGroupPicker(true)} className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full disabled:opacity-40">移动到分组</button>
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
                <button key={group} onClick={() => handleChangeGroup(group)} className="w-full px-4 py-4 text-left text-foreground hover:bg-secondary/50 transition-colors border-b border-border/60 last:border-b-0">
                  {group}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button onClick={() => setShowGroupPicker(false)} className="w-full py-3 bg-secondary text-muted-foreground rounded-full font-medium">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
