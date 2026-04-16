import { Link } from 'react-router-dom'
import { StatusBadge, CategoryBadge, FileTypePill } from './Badges.jsx'
import { formatDateShort, formatDuration, formatFileSize, getFileTypeMeta } from '../utils/helpers.jsx'

export default function VideoCard({ video }) {
  const meta = getFileTypeMeta(video.file_type)
  const thumbBg = video.status === 'processing'
    ? 'linear-gradient(135deg,#0c4a6e 0%,#0e7490 60%)'
    : meta.bg

  const metaInfo = () => {
    if (video.file_type === 'pptx' && video.page_count)
      return <span>📊 {video.page_count} 張</span>
    if (video.file_type === 'document' && video.page_count)
      return <span>📄 {video.page_count} 頁</span>
    if (video.duration)
      return <span>⏱ {formatDuration(video.duration)}</span>
    if (video.filesize)
      return <span>{formatFileSize(video.filesize)}</span>
    return null
  }

  return (
    <Link to={`/video/${video.id}`} className="video-card">
      <div className="video-card-thumb" style={{ background: thumbBg }}>
        <div className="thumb-icon">
          {video.status === 'processing' ? '⚡' : meta.icon}
        </div>
        <div className="status-badge-pos">
          <StatusBadge status={video.status} />
        </div>
        <div className="type-pill-pos">
          <FileTypePill fileType={video.file_type} />
        </div>
      </div>
      <div className="video-card-body">
        <div className="video-card-title">{video.title}</div>
        <div className="video-card-meta">
          <CategoryBadge category={video.category} />
          <span>📅 {formatDateShort(video.uploaded_at)}</span>
          {metaInfo()}
          {video.uploader_name && <span>👤 {video.uploader_name}</span>}
        </div>
      </div>
    </Link>
  )
}
