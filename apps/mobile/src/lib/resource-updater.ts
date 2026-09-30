import {
  assertResourceManifest,
  canonicalManifest,
  ResourceManifest,
  SignedResourceManifest,
} from '@guoxue/shared'

export interface NativeResourceIdentity {
  applicationId: string
  productId: string
  platform: string
  channelId: string
  packageName: string
  runtimeAppId: string
  nativeBuild: number
  resourceVersion: number
  nativeFingerprint: string
}
export interface ResourceJournal {
  state: 'STAGED' | 'PENDING_HEALTH' | 'HEALTHY'
  release: SignedResourceManifest
  localPath: string
}
/**
 * 实现必须随完整包交付。恢复、签名公钥、原子切换与下载文件验证在原生层运行；
 * 普通 plus.runtime.install 不满足此接口。当前项目没有生产实现，不能伪造桥接器启用。
 */
export interface NativeResourceBridge {
  identity(): Promise<NativeResourceIdentity>
  recoveryContract(): Promise<{
    beforeJavascript: boolean
    atomicSwitch: boolean
    verifiedBuild: string
  }>
  verifySignature(canonical: string, signature: string, keyId: string): Promise<boolean>
  downloadToTemporary(url: string, expectedBytes: number, releaseId: string): Promise<string>
  verifyFile(path: string, sha256: string, bytes: number): Promise<boolean>
  stageAtomically(path: string, manifest: ResourceManifest): Promise<string>
  discardTemporary(path: string): Promise<void>
  readJournal(): Promise<ResourceJournal | null>
  writeJournal(journal: ResourceJournal): Promise<void>
  activateAtomically(journal: ResourceJournal): Promise<void>
  confirmHealthy(releaseId: string): Promise<void>
  criticalActivities(): Promise<Array<'payment' | 'live' | 'recording' | 'upload'>>
}
export class ResourceUpdater {
  private running = false
  constructor(
    private readonly bridge: NativeResourceBridge,
    private readonly stillOffered: (releaseId: string) => Promise<boolean>,
  ) {}

  private async validate(release: SignedResourceManifest) {
    assertResourceManifest(release.manifest)
    const [identity, recovery] = await Promise.all([
      this.bridge.identity(),
      this.bridge.recoveryContract(),
    ])
    if (
      !recovery.beforeJavascript ||
      !recovery.atomicSwitch ||
      recovery.verifiedBuild !== identity.nativeFingerprint
    )
      throw new Error('未验证原生启动前恢复，禁止资源更新')
    const m = release.manifest
    for (const key of [
      'applicationId',
      'productId',
      'platform',
      'channelId',
      'packageName',
      'runtimeAppId',
      'nativeFingerprint',
    ] as const) {
      if (m[key] !== identity[key]) throw new Error('资源包与安装渠道或原生基座不匹配')
    }
    if (
      identity.nativeBuild < m.minNativeBuild ||
      identity.nativeBuild > m.maxNativeBuild ||
      m.resourceVersion <= identity.resourceVersion
    )
      throw new Error('资源包不兼容或版本不递增')
    if (!(await this.bridge.verifySignature(canonicalManifest(m), release.signature, m.keyId)))
      throw new Error('资源包签名不可信')
    if (!(await this.stillOffered(m.releaseId))) throw new Error('资源包已停发或退出灰度')
  }

  async downloadAndStage(release: SignedResourceManifest): Promise<void> {
    if (this.running) return
    this.running = true
    let path = ''
    try {
      await this.validate(release)
      path = await this.bridge.downloadToTemporary(
        release.manifest.downloadUrl,
        release.manifest.byteLength,
        release.manifest.releaseId,
      )
      if (
        !(await this.bridge.verifyFile(path, release.manifest.sha256, release.manifest.byteLength))
      )
        throw new Error('资源包被篡改或下载不完整')
      await this.validate(release)
      const localPath = await this.bridge.stageAtomically(path, release.manifest)
      await this.bridge.writeJournal({ state: 'STAGED', release, localPath })
    } finally {
      if (path) await this.bridge.discardTemporary(path).catch(() => {})
      this.running = false
    }
  }

  /** 仅完整包的冷启动协调器可调用；热启动/前台业务从不自动重启。 */
  async activateAtColdLaunch(safePoint: 'cold-launch' | 'foreground'): Promise<boolean> {
    if (safePoint !== 'cold-launch' || this.running) return false
    this.running = true
    try {
      const journal = await this.bridge.readJournal()
      if (!journal || journal.state !== 'STAGED') return false
      await this.validate(journal.release)
      if (
        !(await this.bridge.verifyFile(
          journal.localPath,
          journal.release.manifest.sha256,
          journal.release.manifest.byteLength,
        ))
      )
        throw new Error('暂存文件校验失败')
      if ((await this.bridge.criticalActivities()).length > 0) return false
      // 原生层还必须在切换前再次检查关键活动，并原子持久化 PENDING_HEALTH。
      await this.bridge.activateAtomically({ ...journal, state: 'PENDING_HEALTH' })
      return true
    } finally {
      this.running = false
    }
  }

  async confirmHealthy(releaseId: string): Promise<void> {
    const journal = await this.bridge.readJournal()
    if (journal?.state !== 'PENDING_HEALTH' || journal.release.manifest.releaseId !== releaseId)
      return
    await this.bridge.confirmHealthy(releaseId)
  }
}
