'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, ChevronRight, MapPin, Camera, Mic, Image, 
  Users, Calendar, Bell, Shield, AlertCircle, CheckCircle,
  Settings, Info
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  purpose: string
  status: 'authorized' | 'denied' | 'always' | 'while_using' | 'not_determined'
  required: boolean
  degradedFeature?: string
}

export default function PrivacyAuthorizationPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'location',
      name: '位置信息',
      icon: <MapPin className="w-5 h-5" />,
      description: '获取您的地理位置',
      purpose: '用于推荐附近驿站、本地化内容推荐、发布位置标记',
      status: 'while_using',
      required: false,
      degradedFeature: '无法使用附近推荐功能'
    },
    {
      id: 'camera',
      name: '相机',
      icon: <Camera className="w-5 h-5" />,
      description: '拍摄照片和视频',
      purpose: '用于拍摄头像、发布图片/视频内容、扫码功能',
      status: 'authorized',
      required: false,
      degradedFeature: '无法拍摄照片和视频'
    },
    {
      id: 'microphone',
      name: '麦克风',
      icon: <Mic className="w-5 h-5" />,
      description: '录制音频',
      purpose: '用于语音搜索、发布语音内容、直播连麦',
      status: 'authorized',
      required: false,
      degradedFeature: '无法使用语音功能'
    },
    {
      id: 'photos',
      name: '相册',
      icon: <Image className="w-5 h-5" />,
      description: '访问您的照片和视频',
      purpose: '用于选择头像、发布图片/视频内容、保存图片',
      status: 'always',
      required: false,
      degradedFeature: '无法选择本地图片'
    },
    {
      id: 'contacts',
      name: '通讯录',
      icon: <Users className="w-5 h-5" />,
      description: '读取联系人信息',
      purpose: '用于发现已注册的朋友、邀请好友',
      status: 'denied',
      required: false,
      degradedFeature: '无法发现通讯录好友'
    },
    {
      id: 'calendar',
      name: '日历',
      icon: <Calendar className="w-5 h-5" />,
      description: '访问日历事件',
      purpose: '用于添加课程提醒、直播预约到日历',
      status: 'not_determined',
      required: false,
      degradedFeature: '无法添加日历提醒'
    },
    {
      id: 'notifications',
      name: '通知',
      icon: <Bell className="w-5 h-5" />,
      description: '发送推送通知',
      purpose: '用于消息提醒、课程提醒、直播开播提醒',
      status: 'authorized',
      required: true
    }
  ])

  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [showDeniedDialog, setShowDeniedDialog] = useState(false)

  const getStatusText = (status: Permission['status']) => {
    switch (status) {
      case 'authorized': return '已授权'
      case 'always': return '始终允许'
      case 'while_using': return '使用时允许'
      case 'denied': return '已拒绝'
      case 'not_determined': return '未设置'
    }
  }

  const getStatusColor = (status: Permission['status']) => {
    switch (status) {
      case 'authorized':
      case 'always':
      case 'while_using':
        return 'text-green-600 bg-green-50'
      case 'denied':
        return 'text-red-500 bg-red-50'
      case 'not_determined':
        return 'text-muted-foreground bg-muted'
    }
  }

  const handlePermissionClick = (permission: Permission) => {
    setSelectedPermission(permission)
    if (permission.status === 'denied' || permission.status === 'not_determined') {
      setShowAuthDialog(true)
    } else {
      // 已授权的跳转系统设置
      setShowDeniedDialog(true)
    }
  }

  const handleAuthorize = (type: 'always' | 'while_using' | 'deny') => {
    if (!selectedPermission) return
    
    setPermissions(prev => prev.map(p => {
      if (p.id === selectedPermission.id) {
        return {
          ...p,
          status: type === 'deny' ? 'denied' : type
        }
      }
      return p
    }))
    setShowAuthDialog(false)
    setSelectedPermission(null)
  }

  const authorizedCount = permissions.filter(p => 
    ['authorized', 'always', 'while_using'].includes(p.status)
  ).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">隐私授权管理</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">隐私保护说明</h3>
              <p className="text-sm text-blue-700 mt-1">
                我们重视您的隐私。以下权限仅在您主动使用相关功能时请求，
                您可以随时在此管理授权状态。
              </p>
            </div>
          </div>
        </div>

        {/* Authorization Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">已授权权限</p>
              <p className="text-2xl font-bold text-foreground">
                {authorizedCount}<span className="text-base font-normal text-muted-foreground">/{permissions.length}</span>
              </p>
            </div>
            <div className="flex -space-x-2">
              {permissions.filter(p => ['authorized', 'always', 'while_using'].includes(p.status)).slice(0, 4).map(p => (
                <div key={p.id} className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border-2 border-white">
                  <div className="text-green-600">{p.icon}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium">权限列表</h3>
          </div>
          <div className="divide-y divide-border">
            {permissions.map(permission => (
              <button
                key={permission.id}
                onClick={() => handlePermissionClick(permission)}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  ['authorized', 'always', 'while_using'].includes(permission.status)
                    ? 'bg-green-100 text-green-600'
                    : permission.status === 'denied'
                    ? 'bg-red-100 text-red-500'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {permission.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{permission.name}</span>
                    {permission.required && (
                      <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">必需</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {permission.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(permission.status)}`}>
                    {getStatusText(permission.status)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 rounded-2xl p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">温馨提示</p>
              <ul className="space-y-1 text-amber-700">
                <li>• 拒绝授权不会影响基础功能使用</li>
                <li>• 部分功能需要对应权限才能正常工作</li>
                <li>• 您可以随时在系统设置中修改权限</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Go to System Settings */}
        <button 
          onClick={() => {
            // 模拟跳转系统设置
            alert('即将跳转到系统设置...')
          }}
          className="w-full p-4 bg-card rounded-2xl shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium">前往系统设置</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Authorization Dialog */}
      {showAuthDialog && selectedPermission && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowAuthDialog(false)}>
          <div 
            className="w-full max-w-lg bg-background rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Permission Icon */}
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="text-primary scale-150">{selectedPermission.icon}</div>
              </div>

              <h3 className="text-xl font-bold text-center mb-2">
                允许访问{selectedPermission.name}？
              </h3>
              <p className="text-center text-muted-foreground mb-4">
                {selectedPermission.purpose}
              </p>

              {/* Purpose Details */}
              <div className="bg-muted rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">数据安全承诺</p>
                    <p className="text-muted-foreground mt-1">
                      我们仅在您使用相关功能时访问此权限，不会在后台收集或上传您的数据。
                    </p>
                  </div>
                </div>
              </div>

              {/* Degraded Feature Warning */}
              {selectedPermission.degradedFeature && (
                <div className="bg-amber-50 rounded-xl p-3 mb-6 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    如果拒绝授权，{selectedPermission.degradedFeature}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {selectedPermission.id === 'location' ? (
                  <>
                    <button
                      onClick={() => handleAuthorize('always')}
                      className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium"
                    >
                      始终允许
                    </button>
                    <button
                      onClick={() => handleAuthorize('while_using')}
                      className="w-full h-12 bg-primary/10 text-primary rounded-xl font-medium"
                    >
                      仅在使用应用期间允许
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAuthorize('authorized')}
                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium"
                  >
                    允许
                  </button>
                )}
                <button
                  onClick={() => handleAuthorize('deny')}
                  className="w-full h-12 text-muted-foreground rounded-xl font-medium"
                >
                  不允许
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already Authorized Dialog */}
      {showDeniedDialog && selectedPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeniedDialog(false)}>
          <div 
            className="w-full max-w-sm bg-background rounded-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">已授权 {selectedPermission.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                如需修改权限状态，请前往系统设置中的应用权限管理进行修改。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeniedDialog(false)}
                  className="flex-1 h-11 bg-muted rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDeniedDialog(false)
                    alert('即将跳转到系统设置...')
                  }}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl font-medium"
                >
                  前往设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
