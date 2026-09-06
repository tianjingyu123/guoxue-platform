import { createHistory, createGroupNames, type HistoryStore, type GroupNameStore } from './history-core'
import { nativeHistoryKey } from './native-history-scope'

/** 每次调用重新解析账号，不把首次访问者的存储句柄缓存在模块中。 */
export function createPrivateHistory<T extends object>(
  key: string, opts: Parameters<typeof createHistory<T>>[1] = {},
): HistoryStore<T> {
  function store() {
    const scoped = nativeHistoryKey(key)
    if (!scoped) throw new Error('请重新核验预览资格')
    return createHistory<T>(scoped, opts)
  }
  return {
    load: () => nativeHistoryKey(key) ? store().load() : [],
    save: item => store().save(item),
    remove: ids => store().remove(ids),
    togglePin: ids => store().togglePin(ids),
    setGroup: (ids, group) => store().setGroup(ids, group),
    clear: () => store().clear(),
  }
}

export function createPrivateGroupNames(key: string, defaults: string[]): GroupNameStore {
  function store() {
    const scoped = nativeHistoryKey(key)
    if (!scoped) throw new Error('请重新核验预览资格')
    return createGroupNames(scoped, [...defaults])
  }
  return {
    load: () => nativeHistoryKey(key) ? store().load() : [],
    save: names => store().save(names),
  }
}

export type PrivateGroupChange = { type: 'add'; name: string }
  | { type: 'rename'; old: string; name: string }
  | { type: 'remove'; old: string }

/** 核验通过后基于当前存储重做校验，不能信任弹窗打开时的过期快照。 */
export function changePrivateHistoryGroup<T extends object>(
  groups: GroupNameStore, records: HistoryStore<T>, change: PrivateGroupChange,
): void {
  const current = groups.load()
  if (!current.length) throw new Error('请重新核验预览资格')
  const name = change.type === 'remove' ? '' : change.name.trim()
  if (change.type !== 'remove' && (!name || name.length > 10 || name === '全部')) throw new Error('分组名称无效')
  if (change.type !== 'add' && (change.old === '全部' || !current.includes(change.old))) throw new Error('分组已变化，请刷新')
  if (change.type !== 'remove' && current.includes(name) && !(change.type === 'rename' && name === change.old)) throw new Error('该分组已存在')
  if (change.type === 'add') { groups.save([...current, name]); return }
  const ids = records.load().filter(record => record.group === change.old).map(record => record.id)
  groups.save(change.type === 'remove' ? current.filter(group => group !== change.old)
    : current.map(group => group === change.old ? name : group))
  if (ids.length) records.setGroup(ids, change.type === 'remove' ? '全部' : name)
}
