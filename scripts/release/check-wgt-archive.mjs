/** 检查 ZIP 中央目录，不解压，不允许 zip-slip、软链接、加密、ZIP64 或原生代码。 */
export function inspectWgtArchive(bytes) {
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new Error('WGT不是受支持的完整ZIP')
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16)
  if (!count || count === 65535 || count !== bytes.readUInt16LE(end + 8) || start + size !== end) throw new Error('WGT中央目录非法')
  let offset = start, expanded = 0
  const ranges = []
  const files = [], names = new Set()
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('WGT文件条目不完整')
    const flags = bytes.readUInt16LE(offset + 8), length = bytes.readUInt16LE(offset + 28)
    const extra = bytes.readUInt16LE(offset + 30), comment = bytes.readUInt16LE(offset + 32)
    const localOffset = bytes.readUInt32LE(offset + 42), uncompressed = bytes.readUInt32LE(offset + 24)
    const compressed = bytes.readUInt32LE(offset + 20), method = bytes.readUInt16LE(offset + 10)
    if (offset + 46 + length + extra + comment > end || flags & 1 || localOffset + 30 > start ||
        bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('WGT条目非法或加密')
    const name = bytes.subarray(offset + 46, offset + 46 + length).toString('utf8')
    if (!name || name.includes('\\') || name.startsWith('/') || name.includes(':') || name.split('/').includes('..') || names.has(name)) throw new Error('WGT文件路径不安全或重复')
    if (/\.(?:so|dex|jar|aar|apk|ipa|hap|hsp|dll|exe|dylib)$/i.test(name) || /(?:^|\/)(?:AndroidManifest\.xml|nativeplugins)(?:\/|$)/i.test(name)) throw new Error('WGT包含原生输入，必须完整包发布')
    if ((bytes.readUInt32LE(offset + 38) >>> 16 & 0xf000) === 0xa000) throw new Error('WGT不接受软链接')
    const localNameLength = bytes.readUInt16LE(localOffset + 26)
    const dataStart = localOffset + 30 + localNameLength + bytes.readUInt16LE(localOffset + 28)
    const dataEnd = dataStart + compressed
    if (![0, 8].includes(method) || bytes.readUInt16LE(localOffset + 8) !== method ||
        bytes.readUInt16LE(localOffset + 6) !== flags || dataStart > start || dataEnd > start ||
        ranges.some(([a, b]) => localOffset < b && dataEnd > a)) throw new Error('WGT压缩数据越界、重叠或格式不受支持')
    if (!(flags & 8) && (bytes.readUInt32LE(localOffset + 18) !== compressed || bytes.readUInt32LE(localOffset + 22) !== uncompressed)) throw new Error('WGT本地条目大小不一致')
    ranges.push([localOffset, dataEnd])
    if (!bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(bytes.subarray(offset + 46, offset + 46 + length))) throw new Error('WGT中央目录与本地条目名称不一致')
    names.add(name); files.push(name); expanded += uncompressed
    if (expanded > 300 * 1024 * 1024) throw new Error('WGT展开体积超过上限')
    offset += 46 + length + extra + comment
  }
  if (offset !== end || !names.has('manifest.json')) throw new Error('WGT目录或manifest缺失')
  return { files: files.length, expandedBytes: expanded }
}
