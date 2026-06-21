"use client"

import { useState } from "react"
import { 
  ListItem, 
  ListItemSwitch, 
  ListItemSelect, 
  ListGroupTitle, 
  ListContainer 
} from "@/components/common/list-item"
import { 
  User, Bell, Lock, Shield, Moon, Globe, 
  CreditCard, HelpCircle, Info, LogOut,
  MessageCircle, Heart, Eye, Volume2
} from "lucide-react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ListDemoPage() {
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [sound, setSound] = useState(true)
  
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/help/guoxue-design" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">列表组件演示</h1>
          <div className="w-5" />
        </div>
      </header>
      
      <div className="p-4 space-y-6">
        {/* 基础列表项 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">基础列表项</h2>
          <ListContainer>
            <ListItem 
              icon={<User className="w-5 h-5 text-primary" />}
              title="个人资料"
              subtitle="修改头像、昵称、简介"
              href="/profile/edit"
            />
            <ListItem 
              icon={<Shield className="w-5 h-5 text-success" />}
              title="账号安全"
              subtitle="密码、手机号、登录设备"
              href="/mine/security"
              badge="2"
              badgeType="danger"
            />
            <ListItem 
              icon={<CreditCard className="w-5 h-5 text-gold" />}
              title="我的钱包"
              rightText="¥1,280.00"
              rightTextColor="primary"
              href="/wallet"
            />
            <ListItem 
              icon={<HelpCircle className="w-5 h-5 text-info" />}
              title="帮助中心"
              href="/help"
              showBorder={false}
            />
          </ListContainer>
        </div>
        
        {/* 开关型列表项 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">开关型列表项</h2>
          <ListContainer>
            <ListItemSwitch
              icon={<Bell className="w-5 h-5 text-warning" />}
              title="消息通知"
              subtitle="接收系统通知和互动消息"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
            <ListItemSwitch
              icon={<Moon className="w-5 h-5 text-operator" />}
              title="深色模式"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
            <ListItemSwitch
              icon={<Volume2 className="w-5 h-5 text-info" />}
              title="声音"
              subtitle="播放提示音效"
              checked={sound}
              onCheckedChange={setSound}
              showBorder={false}
            />
          </ListContainer>
        </div>
        
        {/* 选择型列表项 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">选择型列表项</h2>
          <ListContainer>
            <ListItemSelect
              icon={<Globe className="w-5 h-5 text-info" />}
              title="语言"
              value="简体中文"
              onClick={() => {}}
            />
            <ListItemSelect
              icon={<Lock className="w-5 h-5 text-muted-foreground" />}
              title="隐私设置"
              placeholder="请选择"
              onClick={() => {}}
              showBorder={false}
            />
          </ListContainer>
        </div>
        
        {/* 分组列表 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">分组列表</h2>
          <ListContainer>
            <ListGroupTitle title="消息设置" />
            <ListItemSwitch
              icon={<MessageCircle className="w-5 h-5 text-info" />}
              title="评论通知"
              checked={true}
              onCheckedChange={() => {}}
            />
            <ListItemSwitch
              icon={<Heart className="w-5 h-5 text-primary" />}
              title="点赞通知"
              checked={true}
              onCheckedChange={() => {}}
            />
            <ListGroupTitle title="隐私设置" />
            <ListItemSwitch
              icon={<Eye className="w-5 h-5 text-muted-foreground" />}
              title="显示在线状态"
              checked={false}
              onCheckedChange={() => {}}
              showBorder={false}
            />
          </ListContainer>
        </div>
        
        {/* 不同尺寸 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">不同尺寸</h2>
          <ListContainer>
            <ListItem 
              icon={<Info className="w-4 h-4 text-muted-foreground" />}
              title="小尺寸列表项"
              subtitle="适合紧凑布局"
              size="sm"
            />
            <ListItem 
              icon={<Info className="w-5 h-5 text-muted-foreground" />}
              title="中等尺寸列表项"
              subtitle="默认尺寸，适合大多数场景"
              size="md"
            />
            <ListItem 
              icon={<Info className="w-6 h-6 text-muted-foreground" />}
              title="大尺寸列表项"
              subtitle="适合重要入口或强调展示"
              size="lg"
              showBorder={false}
            />
          </ListContainer>
        </div>
        
        {/* 危险操作 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">危险操作</h2>
          <ListContainer>
            <ListItem 
              icon={<LogOut className="w-5 h-5 text-danger" />}
              title="退出登录"
              rightText=""
              showArrow={false}
              onClick={() => {}}
              showBorder={false}
              className="text-danger"
            />
          </ListContainer>
        </div>
      </div>
    </div>
  )
}
