export interface PosterExportState {
  revision: number
  status: 'idle' | 'rendering' | 'ready' | 'failed'
  path: string
  error: string
}

/** 海报绘制/导出是异步的：只有最新一轮的有效文件可以被保存。 */
export function createPosterExportState(onChange: (state: PosterExportState) => void) {
  let state: PosterExportState = { revision: 0, status: 'idle', path: '', error: '' }
  const publish = (next: PosterExportState) => { state = next; onChange({ ...state }) }
  return {
    begin(): number {
      publish({ revision: state.revision + 1, status: 'rendering', path: '', error: '' })
      return state.revision
    },
    isCurrent(revision: number): boolean {
      return state.revision === revision && state.status === 'rendering'
    },
    complete(revision: number, path: string): void {
      if (state.revision !== revision || state.status !== 'rendering') return
      publish({ ...state, status: path ? 'ready' : 'failed', path, error: path ? '' : '海报导出失败，请重试' })
    },
    fail(revision: number, error: string): void {
      if (state.revision !== revision || state.status !== 'rendering') return
      publish({ ...state, status: 'failed', path: '', error })
    },
    invalidate(): void {
      publish({ revision: state.revision + 1, status: 'idle', path: '', error: '' })
    },
    readyPath(): string { return state.status === 'ready' ? state.path : '' },
  }
}
