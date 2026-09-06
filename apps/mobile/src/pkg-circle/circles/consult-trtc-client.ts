import type { ConsultRtcTicket } from '@/lib/consult-call-data'
import { claimNativeRtc, releaseNativeRtc, ownsNativeRtc } from '@/lib/native-rtc-owner'
import { ensureLiveCapturePermissions, ensureLiveAudioPermission } from '@/pkg-live/app-capture-permissions'

type NativeModule = Record<string, (...args: any[]) => any>
type CallType = 'VOICE' | 'VIDEO'

/** 使用现有原生插件协议；每个页面实例独立清理，不共享通话凭据。 */
export function createConsultTrtcClient(options: {
  localViewId: string
  remoteViewId: string
  onPeer: (userId: string, videoAvailable: boolean) => void
  onConnection: (state: 'connected' | 'reconnecting' | 'lost') => void
}) {
  const token = Symbol('consult')
  let trtc: NativeModule | null = null, events: NativeModule | null = null
  let generation = 0, joined = false, preview = false
  let pendingReject: ((error: Error) => void) | null = null
  const listeners = new Map<string, (payload: any) => void>()
  const remoteUsers = new Set<string>()
  const on = (name: string, callback: (data: any[]) => void) => {
    const listenerGeneration = generation
    const listener = (payload: any) => {
      // 原生事件可能已排入队列；移除监听后到达的旧事件不得影响新通话。
      if (generation !== listenerGeneration || !ownsNativeRtc(token)) return
      callback(Array.isArray(payload?.data) ? payload.data : [])
    }
    listeners.set(name, listener); events!.addEventListener(name, listener)
  }
  const disconnect = () => {
    generation++
    const reject = pendingReject; pendingReject = null
    reject?.(new Error('连接已取消'))
    if (!ownsNativeRtc(token)) return
    for (const [name, listener] of listeners) { try { events?.removeEventListener(name, listener) } catch {} }
    listeners.clear()
    for (const userId of remoteUsers) { try { trtc?.stopRemoteView({ userId, streamType: 0 }) } catch {} }
    remoteUsers.clear()
    try { if (preview) trtc?.stopLocalPreview() } catch {}
    try { trtc?.stopLocalAudio() } catch {}
    try { trtc?.exitRoom() } catch {}
    try { trtc?.destroySharedInstance() } catch {}
    preview = false; joined = false; trtc = null; events = null
    releaseNativeRtc(token)
  }
  return {
    async prepare(type: CallType) {
      claimNativeRtc(token)
      const current = ++generation
      try {
        const loader = (uni as any).requireNativePlugin
        if (typeof loader !== 'function') throw new Error('请使用包含音视频能力的 App')
        trtc = loader('TRTCCloudUniPlugin-TRTCCloudImpl'); events = loader('globalEvent')
        const methods = ['sharedInstance', 'enterRoom', 'exitRoom', 'startLocalAudio', 'stopLocalAudio', 'muteLocalAudio', 'destroySharedInstance']
        if (type === 'VIDEO') methods.push('startLocalPreview', 'stopLocalPreview', 'startRemoteView', 'stopRemoteView', 'switchCamera', 'muteLocalVideo')
        if (!trtc || methods.some(name => typeof trtc?.[name] !== 'function')
          || !events || typeof events.addEventListener !== 'function' || typeof events.removeEventListener !== 'function') throw new Error('当前安装包音视频组件不完整')
        if (type === 'VIDEO') await ensureLiveCapturePermissions()
        else await ensureLiveAudioPermission()
        if (generation !== current) throw new Error('页面已离开')
        trtc.sharedInstance()
        // iOS 首次授权必须实际触发采集；只开本机设备，不进房、不上传、不预扣。
        trtc.startLocalAudio(1)
        if (type === 'VIDEO') {
          if (!options.localViewId) throw new Error('本机预览尚未就绪')
          trtc.startLocalPreview({ isFrontCamera: true, userId: options.localViewId }); preview = true
        }
        const getSetting = (uni as any).getAppAuthorizeSetting
        if (typeof getSetting !== 'function') throw new Error('无法核验设备授权')
        let allowed = false
        for (let attempt = 0; attempt < 90; attempt++) {
          if (generation !== current) throw new Error('页面已离开')
          const settings = getSetting()
          const values = [settings.microphoneAuthorized, ...(type === 'VIDEO' ? [settings.cameraAuthorized] : [])]
          if (values.every(value => value === 'authorized')) { allowed = true; break }
          if (values.some(value => value !== 'authorized' && value !== 'not determined')) break
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        if (!allowed) throw new Error('请允许麦克风及所需摄像头权限后重试')
        trtc.stopLocalAudio()
      } catch (error) { disconnect(); throw error }
    },
    async connect(ticket: ConsultRtcTicket, type: CallType) {
      if (!ownsNativeRtc(token) || !trtc || !events || joined) throw new Error('音视频设备未准备完成')
      const current = generation
      try { await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = (error?: Error) => {
          if (settled) return
          settled = true; clearTimeout(timer); pendingReject = null
          if (error) reject(error); else resolve()
        }
        const timer = setTimeout(() => finish(new Error('进入通话超时')), 12000)
        pendingReject = error => finish(error)
        on('onEnterRoom', data => {
          if (settled || generation !== current) return
          if (!(Number(data[0]) > 0)) { finish(new Error('未能进入通话')); return }
          try { trtc!.startLocalAudio(1); joined = true; finish() }
          catch { finish(new Error('麦克风启动失败')) }
        })
        const failMedia = (message: string) => {
          const entering = !settled
          finish(new Error(message))
          disconnect()
          if (!entering) options.onConnection('lost')
        }
        on('onError', () => failMedia('音视频连接失败'))
        on('onExitRoom', () => {
          if (generation !== current) return
          const entering = !settled
          finish(new Error('通话房间已退出'))
          // 服务端移出/解散同样必须关闭采集并释放单例；本机主动退出前已移除监听。
          disconnect()
          if (!entering) options.onConnection('lost')
        })
        on('onConnectionLost', () => failMedia('音视频连接已断开'))
        on('onTryToReconnect', () => options.onConnection('reconnecting'))
        on('onConnectionRecovery', () => options.onConnection('connected'))
        on('onRemoteUserLeaveRoom', data => options.onPeer(String(data[0] || ''), false))
        on('onRemoteUserEnterRoom', data => options.onPeer(String(data[0] || ''), false))
        on('onUserVideoAvailable', data => {
          const userId = String(data[0] || ''), available = data[1] === true || data[1] === 1 || data[1] === 'true'
          if (!/^c_[a-f0-9]{30}$/.test(userId) || type !== 'VIDEO') return
          options.onPeer(userId, available)
        })
        try { trtc!.enterRoom({ sdkAppId: ticket.sdkAppId, userId: ticket.userId, userSig: ticket.userSig,
          strRoomId: ticket.strRoomId, privateMapKey: ticket.privateMapKey, role: 20, appScene: 1 }) }
        catch { finish(new Error('发起音视频连接失败')) }
      }) } catch (error) { if (generation === current) disconnect(); throw error }
    },
    attachRemote(userId: string) {
      if (!joined || !trtc || !/^c_[a-f0-9]{30}$/.test(userId)) return
      trtc.startRemoteView({ userId, streamType: 0, viewId: options.remoteViewId }); remoteUsers.add(userId)
    },
    muteAudio(mute: boolean) { if (joined) trtc?.muteLocalAudio(mute) },
    muteVideo(mute: boolean) { if (joined) trtc?.muteLocalVideo({ streamType: 0, mute }) },
    switchCamera(front: boolean) { if (preview) trtc?.switchCamera(front) },
    disconnect,
  }
}
