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
const TOPICS = ['招生','續約','教學','班務','家長溝通','培訓','行政','品質管理','未分類']
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
  const [inProgress, setInProgress] = useState([])  // Sprint 3D: 繼續觀看
  const { showToast } = useToast()

  const loadStats = useCallback(async () => {
    try {
      const s = await api.get('/api/stats')
      setStats(s)
    } catch {}
  }, [])

  // Sprint 3D: 載入「繼續觀看」清單
  const loadInProgress = useCallback(async () => {
    try {
      const res = await api.get('/api/progress/in-progress?limit=6')
      setInProgress(res.in_progress || [])
    } catch {
      /* 失敗就當沒有，不影響主流程 */
    }
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
  useEffect(() => { loadInProgress() }, [loadInProgress])

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

        {/* 繼續觀看（Sprint 3D）— 有未完成影片才顯示 */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>📺 繼續觀看</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {inProgress.length} 支未完成
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {inProgress.map(item => <ContinueCard key={item.video_id} item={item} />)}
            </div>
          </div>
        )}

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

// ── Sprint 3D: Continue Watching Card ──────────────────

const TYPE_ICON = { video: '🎬', audio: '🎵', document: '📄', pptx: '📊' }

function ContinueCard({ item }) {
  const progress = item.duration ? Math.min(100, (item.last_position_sec / item.duration) * 100) : 0
  const icon = TYPE_ICON[item.file_type] || '📁'

  // 格式化位置
  const mm = Math.floor(item.last_position_sec / 60)
  const ss = Math.floor(item.last_position_sec % 60)
  const posStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`

  // 多久前
  const updated = new Date(item.updated_at)
  const diffMin = Math.floor((Date.now() - updated) / 60000)
  const timeAgo = diffMin < 1 ? '剛剛'
    : diffMin < 60 ? `${diffMin} 分鐘前`
    : diffMin < 1440 ? `${Math.floor(diffMin / 60)} 小時前`
    : `${Math.floor(diffMin / 1440)} 天前`

  return (
    <Link
      to={`/video/${item.video_id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 14,
          cursor: 'pointer',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          height: '100%',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.12)'
          e.currentTarget.style.borderColor = 'var(--primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        {/* 標題列：icon + 標題 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--text)',
            }}
            title={item.title}
          >
            {item.title}
          </div>
        </div>

        {/* 進度條 */}
        <div
          style={{
            height: 5,
            background: 'var(--border)',
            borderRadius: 3,
            marginBottom: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--primary)',
              transition: 'width 0.3s',
            }}
          />
        </div>

        {/* 底部：位置 + 時間 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <span>▶ 上次看到 {posStr}</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </Link>
  )
}
