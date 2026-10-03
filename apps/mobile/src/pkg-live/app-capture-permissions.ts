const ANDROID_CAPTURE_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
]
const ANDROID_AUDIO_PERMISSIONS = ['android.permission.RECORD_AUDIO']

interface AndroidPermissionResult {
  deniedAlways?: string[]
  deniedPresent?: string[]
}

async function ensureAndroidPermissions(
  permissions: string[],
  deniedAlwaysMessage: string,
  deniedPresentMessage: string,
): Promise<void> {
  const platform = String(uni.getSystemInfoSync().platform || '').toLowerCase()
  if (platform !== 'android') return

  const android = (globalThis as any)?.plus?.android
  if (typeof android?.requestPermissions !== 'function') {
    throw new Error('无法申请系统权限，请重启 App 后重试')
  }

  await new Promise<void>((resolve, reject) => {
    android.requestPermissions(
      permissions,
      (result: AndroidPermissionResult = {}) => {
        if (result.deniedAlways?.length) {
          reject(new Error(deniedAlwaysMessage))
          return
        }
        if (result.deniedPresent?.length) {
          reject(new Error(deniedPresentMessage))
          return
        }
        resolve()
      },
      () => reject(new Error('系统权限申请失败，请到系统设置中允许后重试')),
    )
  })
}

/** 在启动原生 TRTC 采集前完成 Android 运行时授权。 */
export async function ensureLiveCapturePermissions(): Promise<void> {
  // #ifdef APP-PLUS
  await ensureAndroidPermissions(
    ANDROID_CAPTURE_PERMISSIONS,
    '相机或麦克风权限已被禁止，请到系统设置中允许后重新连接',
    '直播需要相机和麦克风权限，请允许后重新连接',
  )
  // #endif
}

/** 观众申请语音连麦前只申请麦克风权限，不额外请求相机。 */
export async function ensureLiveAudioPermission(): Promise<void> {
  // #ifdef APP-PLUS
  await ensureAndroidPermissions(
    ANDROID_AUDIO_PERMISSIONS,
    '麦克风权限已被禁止，请到系统设置中允许后重新申请连麦',
    '语音连麦需要麦克风权限，请允许后重新申请',
  )
  // #endif
}
