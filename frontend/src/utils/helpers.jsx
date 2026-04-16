export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
    + ' ' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateShort(iso) {
  return formatDate(iso).split(' ')[0]
}

export function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

export function formatFileSize(bytes) {
  if (!bytes) return '—'
  const mb = bytes / (1024 * 1024)
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
}

export const CATEGORY_COLORS = {
  '招生':   '#f59e0b',
  '續約':   '#3b82f6',
  '教學':   '#10b981',
  '班務':   '#8b5cf6',
  '家長溝通':'#ec4899',
  '培訓':   '#0891b2',
  '行政':   '#64748b',
  '品質管理':'#dc2626',
  '未分類': '#94a3b8',
  '其他':   '#94a3b8',
}

export const FILE_TYPE_META = {
  video:    { icon: '🎬', label: '影片',   bg: 'linear-gradient(135deg,#1e3a6e 0%,#1e2a45 100%)' },
  audio:    { icon: '🎵', label: '音檔',   bg: 'linear-gradient(135deg,#3b0764 0%,#6d28d9 100%)' },
  document: { icon: '📄', label: '文件',   bg: 'linear-gradient(135deg,#0f3460 0%,#16213e 100%)' },
  pptx:     { icon: '📊', label: '投影片', bg: 'linear-gradient(135deg,#7c2d12 0%,#b45309 100%)' },
}

export function getFileTypeMeta(ft) {
  return FILE_TYPE_META[ft] ?? FILE_TYPE_META.document
}

export const CATEGORIES = ['未分類','招生','續約','教學','班務','家長溝通','培訓','行政','品質管理']

export function detectFileTypeName(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    mp4:'影片', mov:'影片', avi:'影片', mkv:'影片', webm:'影片',
    mp3:'音檔', wav:'音檔', m4a:'音檔', aac:'音檔', ogg:'音檔', flac:'音檔',
    pdf:'PDF 文件', docx:'Word 文件', doc:'Word 文件',
    pptx:'PowerPoint 投影片', ppt:'PowerPoint 投影片',
    txt:'文字檔案', md:'文字檔案', csv:'文字檔案',
  }
  return map[ext] ?? '檔案'
}

export function detectFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    mp4:'🎬', mov:'🎬', avi:'🎬', mkv:'🎬', webm:'🎬',
    mp3:'🎵', wav:'🎵', m4a:'🎵', aac:'🎵', ogg:'🎵', flac:'🎵',
    pdf:'📕', docx:'📝', doc:'📝',
    pptx:'📊', ppt:'📊',
    txt:'📄', md:'📄', csv:'📄',
  }
  return map[ext] ?? '📁'
}

export function highlightText(text, query) {
  if (!query || !text) return text ?? ''
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="sr-highlight">{part}</mark>
      : part
  )
}
