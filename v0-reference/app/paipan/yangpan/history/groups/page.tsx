"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Plus, Pencil, Trash2, X } from "lucide-react"

// 模拟分组数据
const initialGroups = [
  { id: "1", name: "客户", count: 12, color: "bg-blue-500" },
  { id: "2", name: "家人", count: 5, color: "bg-green-500" },
  { id: "3", name: "朋友", count: 8, color: "bg-orange-500" },
  { id: "4", name: "未分类", count: 3, color: "bg-gray-500" },
]

export default function YangpanGroupsPage() {
  const [groups, setGroups] = useState(initialGroups)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState("")

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      setGroups(prev => [...prev, {
        id: String(Date.now()),
        name: newGroupName.trim(),
        count: 0,
        color: "bg-purple-500"
      }])
      setNewGroupName("")
      setShowAddModal(false)
    }
  }

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  const handleRenameGroup = (id: string, newName: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName } : g))
    setEditingGroup(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/paipan/yangpan/history" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-bold">分组管理</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-1 -mr-1 text-primary"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 分组列表 */}
      <main className="flex-1 p-3">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {groups.map((group, index) => (
            <div 
              key={group.id}
              className={`flex items-center justify-between px-4 py-3 ${index !== groups.length - 1 ? "border-b border-border/60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${group.color}`} />
                {editingGroup === group.id ? (
                  <input
                    type="text"
                    defaultValue={group.name}
                    autoFocus
                    className="text-sm bg-secondary/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30"
                    onBlur={(e) => handleRenameGroup(group.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameGroup(group.id, e.currentTarget.value)
                      }
                    }}
                  />
                ) : (
                  <span className="text-sm font-medium text-foreground">{group.name}</span>
                )}
                <span className="text-xs text-muted-foreground">({group.count})</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingGroup(group.id)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {group.name !== "未分类" && (
                  <button 
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          删除分组后，该分组下的记录将移动到"未分类"
        </p>
      </main>

      {/* 添加分组弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-medium">添加分组</span>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="请输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 bg-secondary/50 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="p-4 pt-0 flex gap-2">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleAddGroup}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
