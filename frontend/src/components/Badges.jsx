import { CATEGORY_COLORS, getFileTypeMeta } from '../utils/helpers.jsx'

export function StatusBadge({ status }) {
  const map = {
    pending:    ['⏳ 待處理', 'badge-pending'],
    processing: ['⚡ 處理中', 'badge-processing'],
    done:       ['✅ 完成',   'badge-done'],
    error:      ['❌ 錯誤',   'badge-error'],
  }
  const [label, cls] = map[status] ?? ['? 未知', 'badge-pending']
  return <span className={`badge ${cls}`}>{label}</span>
}

export function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] ?? '#94a3b8'
  return (
    <span className="badge" style={{ background: `${color}20`, color }}>
      {category}
    </span>
  )
}

export function FileTypePill({ fileType }) {
  const meta = getFileTypeMeta(fileType)
  return (
    <span className="type-pill-label">
      {meta.icon} {meta.label}
    </span>
  )
}
