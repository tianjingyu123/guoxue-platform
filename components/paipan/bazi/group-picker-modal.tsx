"use client"

import { useState } from "react"
import { X, Check, Plus } from "lucide-react"

interface GroupPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (group: string) => void
  initialGroup?: string
}

// 模拟分组数据
const groups = [
  { name: "全部", count: 11 },
  { name: "家人", count: 3 },
  { name: "朋友", count: 5 },
  { name: "客户", count: 2 },
]

export function GroupPickerModal({ isOpen, onClose, onConfirm, initialGroup = "全部" }: GroupPickerModalProps) {
  const [selectedGroup, setSelectedGroup] = useState(initialGroup)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedGroup)
    onClose()
  }

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      setSelectedGroup(newGroupName.trim())
      setNewGroupName("")
      setShowAddInput(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 顶部把手 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-2">
          <button 
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">选择分组</h2>
          <button 
            onClick={handleConfirm}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
          >
            确定
          </button>
        </div>

        {/* 分组列表 */}
        <div className="px-4 py-3 max-h-[50vh] overflow-y-auto">
          {groups.map((group) => (
            <button
              key={group.name}
              onClick={() => setSelectedGroup(group.name)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-2 transition-all ${
                selectedGroup === group.name
                  ? "bg-primary/5 border-2 border-primary"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${
                  selectedGroup === group.name ? "text-primary" : "text-gray-700"
                }`}>
                  {group.name}
                </span>
                <span className="text-xs text-gray-400">({group.count})</span>
              </div>
              {selectedGroup === group.name && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}

          {/* 添加新分组 */}
          {showAddInput ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入分组名称"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddGroup()
                  if (e.key === "Escape") setShowAddInput(false)
                }}
              />
              <button
                onClick={handleAddGroup}
                disabled={!newGroupName.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddInput(false)
                  setNewGroupName("")
                }}
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">添加新分组</span>
            </button>
          )}
        </div>

        {/* 底部安全区域 */}
        <div className="h-6" />
      </div>
    </div>
  )
}
