import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import VideoCard from '../components/VideoCard.jsx'

const TYPE_PILLS = [
  { value: 'all',      label: '全部' },
  { value: 'video',    label: '🎬 影片' },
  { value: 'audio',    label: '🎵 音檔' },
  { value: 'document', label: '📄 文件' },
  { value: 'pptx',     label: '📊 投影片' },
]

const CATEGORIES = ['all','招生','續約','教學','班務','家長溝通','培訓','行政','品質管理','未分類']
const TOPICS = ['招生','續約','教學','班務','家長溝通','培訓','行政','品質管理']
const STATUSES   = [
  { value: 'all', label: '所有狀態' },
  { value: 'done', label: '已完成' },
  { value: 'processing', label: '處理中' },
  { value: 'pending', label: '待處理' },
  { value: 'error', label: '錯誤' },
]

export default function Dashboard() {
  const [videos,   setVideos]   = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('all')
  const [status,   setStatus]   = useState('all')
  const [fileType, setFileType] = useState('all')
  const [topics, setTopics] = useState([])
  const { showToast } = useToast()

  const loadStats = useCallback(async () => {
    try {
      const s = await api.get('/api/stats')
      setStats(s)
    } catch {}
  }, [])

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)             params.set('search', search)
      if (status !== 'all')   params.set('status', status)
      if (fileType !== 'all') params.set('file_type', fileType)

      if (topics.length > 0) {
        params.set('category', topics.join(','))
      } else if (category !== 'all') {
        params.set('category', category)
      }
      const { videos } = await api.get(`/api/videos?${params}`)
      setVideos(videos)
    } catch (e) {
      showToast('載入失敗：' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, category, status, fileType, topics, showToast])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(loadVideos, 350)
    return () => clearTimeout(t)
  }, [loadVideos])

  useEffect(() => { loadStats() }, [loadStats])

  // Poll processing videos
  useEffect(() => {
    const processing = videos.filter(v => v.status === 'pending' || v.status === 'processing')
    if (!processing.length) return
    const timers = processing.map(v => setInterval(async () => {
      try {
        const { video } = await api.get(`/api/videos/${v.id}`)
        if (video.status === 'done' || video.status === 'error') {
          setVideos(prev => prev.map(p => p.id === video.id ? video : p))
          loadStats()
        }
      } catch {}
    }, 3000))
    return () => timers.forEach(clearInterval)
  }, [videos.map(v => v.id + v.status).join(','), loadStats])

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">培訓資料總覽</div>
        <Link to="/upload" className="btn btn-primary">⬆️ 上傳資料</Link>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: '資料總數',   value: stats?.total      ?? '—', sub: '所有上傳資料',   cls: 'primary' },
            { label: '已完成分析', value: stats?.done       ?? '—', sub: '可查看知識整理', cls: 'success' },
            { label: '處理中',     value: stats?.pending    ?? '—', sub: '等待或分析中',   cls: 'warning' },
            { label: '觀看次數',   value: stats?.total_views ?? '—', sub: '累計觀看紀錄',  cls: 'info'    },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Type pills */}
        <div className="type-pills">
          {TYPE_PILLS.map(p => (
            <button
              key={p.value}
              className={`type-pill-btn${fileType === p.value ? ' active' : ''}`}
              onClick={() => setFileType(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Topic tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TOPICS.map(t => {
            const active = topics.includes(t)
            return (
              <button
                key={t}
                onClick={() => setTopics(prev =>
                  prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                )}
                style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            )
          })}
          {topics.length > 0 && (
            <button
              onClick={() => setTopics([])}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12,
                cursor: 'pointer', border: '1.5px solid var(--error)',
                background: 'transparent', color: 'var(--error)', fontWeight: 600,
              }}
            >
              ✕ 清除
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="🔍 搜尋標題..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'all' ? '所有分類' : c}</option>
            ))}
          </select>
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={loadVideos}>重新整理</button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 12px' }} />
            <div>載入中...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">還沒有資料</div>
            <div className="empty-sub">點擊右上角「上傳資料」開始使用</div>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
      </div>
    </>
  )
}
