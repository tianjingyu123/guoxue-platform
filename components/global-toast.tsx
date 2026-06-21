"use client"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Toast 类型
type ToastType = "success" | "error" | "warning" | "info" | "loading"

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (type: ToastType, message: string, duration?: number) => string
  hideToast: (id: string) => void
  success: (message: string, duration?: number) => string
  error: (message: string, duration?: number) => string
  warning: (message: string, duration?: number) => string
  info: (message: string, duration?: number) => string
  loading: (message: string) => string
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
}

const styles = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
  loading: "bg-slate-800 text-white",
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = icons[toast.type]

  useEffect(() => {
    if (toast.type !== "loading" && toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(onClose, 200)
      }, toast.duration || 3000)
      return () => clearTimeout(timer)
    }
  }, [toast, onClose])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200",
        styles[toast.type],
        isExiting ? "opacity-0 translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", toast.type === "loading" && "animate-spin")} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      {toast.type !== "loading" && (
        <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration?: number): string => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, duration }])
    return id
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => showToast("success", message, duration), [showToast])
  const error = useCallback((message: string, duration?: number) => showToast("error", message, duration), [showToast])
  const warning = useCallback((message: string, duration?: number) => showToast("warning", message, duration), [showToast])
  const info = useCallback((message: string, duration?: number) => showToast("info", message, duration), [showToast])
  const loading = useCallback((message: string) => showToast("loading", message, 0), [showToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, success, error, warning, info, loading }}>
      {children}
      
      {/* Toast 容器 */}
      <div className="fixed top-16 left-0 right-0 z-[100] pointer-events-none safe-area-pt">
        <div className="max-w-sm mx-auto px-4 space-y-2 pointer-events-auto">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
