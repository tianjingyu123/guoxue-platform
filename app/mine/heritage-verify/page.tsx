'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, Upload, CheckCircle, Clock, AlertCircle, Award, X, FileText, Users, BookOpen } from 'lucide-react'

interface VerifyStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  submittedAt?: string
  reviewedAt?: string
  rejectReason?: string
  certificateNo?: string
  verifiedAt?: string
}

export default function HeritageVerifyPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'apply' | 'status'>('apply')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    idCard: '',
    phone: '',
    projectName: '',
    projectLevel: '',
    lineage: '',
    skillDescription: '',
    experience: '',
  })
  const [certificates, setCertificates] = useState<string[]>([])
  const [works, setWorks] = useState<string[]>([])
  
  // 模拟认证状态
  const [verifyStatus] = useState<VerifyStatus>({
    status: 'none',
  })
  
  const projectLevels = [
    { value: 'national', label: '国家级' },
    { value: 'provincial', label: '省级' },
    { value: 'municipal', label: '市级' },
    { value: 'county', label: '县级' },
  ]
  
  const handleImageUpload = (type: 'certificate' | 'work') => {
    // 模拟上传
    const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`
    if (type === 'certificate') {
      if (certificates.length < 5) {
        setCertificates([...certificates, mockUrl])
      }
    } else {
      if (works.length < 9) {
        setWorks([...works, mockUrl])
      }
    }
  }
  
  const removeImage = (type: 'certificate' | 'work', index: number) => {
    if (type === 'certificate') {
      setCertificates(certificates.filter((_, i) => i !== index))
    } else {
      setWorks(works.filter((_, i) => i !== index))
    }
  }
  
  const handleSubmit = async () => {
    if (!formData.name || !formData.projectName || !formData.lineage || certificates.length === 0) {
      return
    }
    
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setActiveTab('status')
  }
  
  const renderApplyForm = () => (
    <div className="space-y-6 pb-24">
      {/* 说明卡片 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-amber-900">非遗传承人认证</h3>
            <p className="text-sm text-amber-700 mt-1">
              通过认证后，您将获得平台官方传承人标识，享受专属权益和流量扶持
            </p>
          </div>
        </div>
      </div>
      
      {/* 基本信息 */}
      <div className="bg-card rounded-2xl p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          基本信息
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">真实姓名 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入真实姓名"
              className="w-full h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">身份证号 *</label>
            <input
              type="text"
              value={formData.idCard}
              onChange={e => setFormData({ ...formData, idCard: e.target.value })}
              placeholder="请输入身份证号"
              className="w-full h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">联系电话 *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入联系电话"
              className="w-full h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
      
      {/* 传承项目信息 */}
      <div className="bg-card rounded-2xl p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          传承项目信息
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">传承项目名称 *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={e => setFormData({ ...formData, projectName: e.target.value })}
              placeholder="如：苏绣、景德镇手工制瓷技艺"
              className="w-full h-12 px-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">项目级别 *</label>
            <div className="grid grid-cols-4 gap-2">
              {projectLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, projectLevel: level.value })}
                  className={`h-10 rounded-xl text-sm font-medium transition-all ${
                    formData.projectLevel === level.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">传承谱系 *</label>
            <textarea
              value={formData.lineage}
              onChange={e => setFormData({ ...formData, lineage: e.target.value })}
              placeholder="请描述您的传承谱系，如：师承某某大师，为第几代传人"
              rows={3}
              className="w-full p-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">技艺描述</label>
            <textarea
              value={formData.skillDescription}
              onChange={e => setFormData({ ...formData, skillDescription: e.target.value })}
              placeholder="请详细描述您的技艺特点、创作风格等"
              rows={4}
              className="w-full p-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">从业经历</label>
            <textarea
              value={formData.experience}
              onChange={e => setFormData({ ...formData, experience: e.target.value })}
              placeholder="请描述您的从业年限、获得的荣誉等"
              rows={3}
              className="w-full p-4 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </div>
      
      {/* 证书上传 */}
      <div className="bg-card rounded-2xl p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          资质证书
          <span className="text-xs text-muted-foreground font-normal">（最多5张）</span>
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3">
          请上传传承人证书、获奖证书、相关资质证明等
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          {certificates.map((url, index) => (
            <div key={index} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage('certificate', index)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
          {certificates.length < 5 && (
            <button
              onClick={() => handleImageUpload('certificate')}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">上传证书</span>
            </button>
          )}
        </div>
      </div>
      
      {/* 作品上传 */}
      <div className="bg-card rounded-2xl p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          代表作品
          <span className="text-xs text-muted-foreground font-normal">（最多9张）</span>
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3">
          请上传您的代表作品照片，展示您的技艺水平
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          {works.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage('work', index)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
          {works.length < 9 && (
            <button
              onClick={() => handleImageUpload('work')}
              className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">上传作品</span>
            </button>
          )}
        </div>
      </div>
      
      {/* 认证权益 */}
      <div className="bg-card rounded-2xl p-4">
        <h3 className="font-medium mb-3">认证后您将获得</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🏅', text: '官方传承人标识' },
            { icon: '📈', text: '专属流量扶持' },
            { icon: '🎓', text: '开设付费课程' },
            { icon: '🛒', text: '开设非遗商城' },
            { icon: '📺', text: '直播带货权限' },
            { icon: '💰', text: '平台补贴政策' },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-xl">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  
  const renderStatus = () => {
    if (verifyStatus.status === 'none') {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">暂无认证记录</p>
          <button
            onClick={() => setActiveTab('apply')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
          >
            立即申请认证
          </button>
        </div>
      )
    }
    
    return (
      <div className="space-y-4 pb-6">
        {/* 状态卡片 */}
        <div className={`rounded-2xl p-6 ${
          verifyStatus.status === 'approved'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100'
            : verifyStatus.status === 'pending'
            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100'
            : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-100'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              verifyStatus.status === 'approved'
                ? 'bg-green-100'
                : verifyStatus.status === 'pending'
                ? 'bg-amber-100'
                : 'bg-red-100'
            }`}>
              {verifyStatus.status === 'approved' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : verifyStatus.status === 'pending' ? (
                <Clock className="w-8 h-8 text-amber-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                verifyStatus.status === 'approved'
                  ? 'text-green-900'
                  : verifyStatus.status === 'pending'
                  ? 'text-amber-900'
                  : 'text-red-900'
              }`}>
                {verifyStatus.status === 'approved' && '认证已通过'}
                {verifyStatus.status === 'pending' && '认证审核中'}
                {verifyStatus.status === 'rejected' && '认证未通过'}
              </h3>
              <p className={`text-sm mt-1 ${
                verifyStatus.status === 'approved'
                  ? 'text-green-700'
                  : verifyStatus.status === 'pending'
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {verifyStatus.status === 'approved' && '恭喜您成为平台认证非遗传承人'}
                {verifyStatus.status === 'pending' && '预计3-5个工作日完成审核'}
                {verifyStatus.status === 'rejected' && verifyStatus.rejectReason}
              </p>
            </div>
          </div>
          
          {verifyStatus.status === 'approved' && verifyStatus.certificateNo && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">证书编号</span>
                <span className="text-green-900 font-medium">{verifyStatus.certificateNo}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-green-700">认证时间</span>
                <span className="text-green-900">{verifyStatus.verifiedAt}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 审核进度 */}
        {verifyStatus.status === 'pending' && (
          <div className="bg-card rounded-2xl p-4">
            <h3 className="font-medium mb-4">审核进度</h3>
            <div className="space-y-4">
              {[
                { step: '提交申请', done: true, time: verifyStatus.submittedAt },
                { step: '资料审核', done: false, time: null },
                { step: '认证完成', done: false, time: null },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={item.done ? 'font-medium' : 'text-muted-foreground'}>{item.step}</p>
                    {item.time && <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 认证标识预览 */}
        {verifyStatus.status === 'approved' && (
          <div className="bg-card rounded-2xl p-4">
            <h3 className="font-medium mb-4">您的认证标识</h3>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">非遗传承人</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">官方认证</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">苏绣 · 省级传承人</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 重新申请 */}
        {verifyStatus.status === 'rejected' && (
          <button
            onClick={() => setActiveTab('apply')}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            重新提交申请
          </button>
        )}
      </div>
    )
  }
  
  const isFormValid = formData.name && formData.idCard && formData.phone && formData.projectName && formData.projectLevel && formData.lineage && certificates.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">非遗传承人认证</h1>
          <div className="w-9" />
        </div>
        
        {/* Tab */}
        <div className="flex px-4 pb-3">
          {[
            { key: 'apply', label: '申请认证' },
            { key: 'status', label: '认证进度' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'apply' | 'status')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 内容 */}
      <div className="p-4">
        {activeTab === 'apply' ? renderApplyForm() : renderStatus()}
      </div>
      
      {/* 底部提交按钮 */}
      {activeTab === 'apply' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                提交中...
              </>
            ) : (
              '提交认证申请'
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            提交即表示您同意《非遗传承人认证协议》
          </p>
        </div>
      )}
    </div>
  )
}
