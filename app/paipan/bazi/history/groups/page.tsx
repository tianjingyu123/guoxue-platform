"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Trash2 } from "lucide-react"

interface Group {
  id: number
  name: string
  count: number
  isDefault?: boolean
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([
    { id: 0, name: "全部", count: 11, isDefault: true },
    { id: 1, name: "家人", count: 3 },
    { id: 2, name: "朋友", count: 5 },
    { id: 3, name: "客户", count: 3 },
  ])
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const totalGroups = groups.filter(g => !g.isDefault).length

  const handleEditGroup = (group: Group) => {
    if (group.isDefault) return
    setEditingGroup(group)
    setNewGroupName(group.name)
  }

  const handleSaveEdit = () => {
    if (!editingGroup || !newGroupName.trim()) return
    setGroups(groups.map(g => 
      g.id === editingGroup.id ? { ...g, name: newGroupName.trim() } : g
    ))
    setEditingGroup(null)
    setNewGroupName("")
  }

  const handleDeleteGroup = () => {
    if (!editingGroup) return
    setGroups(groups.filter(g => g.id !== editingGroup.id))
    setEditingGroup(null)
    setNewGroupName("")
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    const newId = Math.max(...groups.map(g => g.id)) + 1
    setGroups([...groups, { id: newId, name: newGroupName.trim(), count: 0 }])
    setNewGroupName("")
    setIsAdding(false)
  }

  // 编辑分组视图
  if (editingGroup) {
    return (
      <div className="min-h-screen bg-card flex flex-col">
        {/* 顶部导航 */}
        <div className="bg-primary text-white px-4 py-3 flex items-center">
          <button 
            onClick={() => {
              setEditingGroup(null)
              setNewGroupName("")
            }}
            className="p-1 -ml-1"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="flex-1 text-center text-base font-medium pr-6">编辑分组</h1>
        </div>

        {/* 编辑内容 */}
        <div className="flex-1 p-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-base outline-none focus:ring-2 focus:ring-primary"
            placeholder="分组名称"
          />
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 flex gap-3">
          <button
            onClick={handleDeleteGroup}
            className="flex flex-col items-center justify-center px-4 py-2 bg-secondary rounded-2xl text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            <Trash2 className="w-5 h-5 mb-0.5" />
            <span className="text-xs">删除分组</span>
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={!newGroupName.trim()}
            className="flex-1 py-3 bg-primary text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            完成
          </button>
        </div>
      </div>
    )
  }

  // 添加分组视图
  if (isAdding) {
    return (
      <div className="min-h-screen bg-card flex flex-col">
        {/* 顶部导航 */}
        <div className="bg-primary text-white px-4 py-3 flex items-center">
          <button 
            onClick={() => {
              setIsAdding(false)
              setNewGroupName("")
            }}
            className="p-1 -ml-1"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="flex-1 text-center text-base font-medium pr-6">添加分组</h1>
        </div>

        {/* 添加内容 */}
        <div className="flex-1 p-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-base outline-none focus:ring-2 focus:ring-primary"
            placeholder="输入分组名称"
            autoFocus
          />
        </div>

        {/* 底部操作栏 */}
        <div className="p-4">
          <button
            onClick={handleAddGroup}
            disabled={!newGroupName.trim()}
            className="w-full py-3 bg-primary text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确定
          </button>
        </div>
      </div>
    )
  }

  // 分组列表视图
  return (
      <div className="min-h-screen bg-card flex flex-col">
        {/* 顶部导航 */}
        <div className="bg-primary text-white px-4 py-3 flex items-center">
        <Link href="/bazi/history" className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-base font-medium pr-6">全部分组</h1>
      </div>

      {/* 分组统计 */}
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
        所有分组（{totalGroups}）
      </div>

      {/* 分组列表 */}
      <div className="flex-1">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleEditGroup(group)}
            className={`w-full px-4 py-3.5 text-left border-b border-gray-100 flex items-center justify-between ${
              group.isDefault ? "cursor-default" : "hover:bg-gray-50"
            }`}
          >
            <span className="text-base text-gray-900">{group.name}</span>
            <span className="text-gray-400">（{group.count}）</span>
          </button>
        ))}
      </div>

      {/* 底部添加按钮 */}
      <div className="p-4">
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 bg-primary text-white rounded-full font-medium"
        >
          添加
        </button>
      </div>
    </div>
  )
}
