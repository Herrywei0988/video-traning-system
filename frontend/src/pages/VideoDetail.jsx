import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { usePoll } from '../hooks/useApi.js'
import Modal from '../components/Modal.jsx'
import { StatusBadge, CategoryBadge, FileTypePill } from '../components/Badges.jsx'
import {
  CATEGORIES, CATEGORY_COLORS, getFileTypeMeta,
  formatDate, formatDuration, formatFileSize
} from '../utils/helpers.jsx'

const TABS = ['summary', 'keypoints', 'actions', 'faq', 'content']
const ROLES = [
  { key: 'exec',    label: '👔 主管版',    cls: 'active-exec' },
  { key: 'manager', label: '🏫 班主任版',  cls: 'active-manager' },
  { key: 'teacher', label: '👨‍🏫 老師版',  cls: 'active-teacher' },
]

export default function VideoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [video,    setVideo]    = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [views,    setViews]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('summary')
  const [role,     setRole]     = useState('exec')

  // Modals
  const [editOpen,     setEditOpen]     = useState(false)
  const [taskOpen,     setTaskOpen]     = useState(false)
  const [viewOpen,     setViewOpen]     = useState(false)
  const [editTitle,    setEditTitle]    = useState('')
  const [editDesc,     setEditDesc]     = useState('')
  const [editCat,      setEditCat]      = useState('未分類')
  const [taskText,     setTaskText]     = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskDue,      setTaskDue]      = useState('')
  const [viewName,     setViewName]     = useState('')
  const [viewRole,     setViewRole]     = useState('老師')
  const [viewDone,     setViewDone]     = useState('0')

  const loadAnalysis = useCallback(async () => {
    const { analysis } = await api.get(`/api/videos/${id}/analysis`)
    setAnalysis(analysis)
  }, [id])

  const loadTasks = useCallback(async () => {
    const { tasks } = await api.get(`/api/videos/${id}/tasks`)
    setTasks(tasks)
  }, [id])

  const loadViews = useCallback(async () => {
    const { views } = await api.get(`/api/videos/${id}/views`)
    setViews(views)
  }, [id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [vRes, aRes, tRes, vwRes] = await Promise.all([
          api.get(`/api/videos/${id}`),
          api.get(`/api/videos/${id}/analysis`),
          api.get(`/api/videos/${id}/tasks`),
          api.get(`/api/videos/${id}/views`),
        ])
        setVideo(vRes.video)
        setAnalysis(aRes.analysis)
        setTasks(tRes.tasks)
        setViews(vwRes.views)
        setEditTitle(vRes.video.title)
        setEditDesc(vRes.video.description ?? '')
        setEditCat(vRes.video.category ?? '未分類')
      } catch (e) {
        showToast('載入失敗：' + e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, showToast])

  // Poll when processing
  usePoll(id, video?.status, async (updated) => {
    setVideo(updated)
    if (updated.status === 'done') await loadAnalysis()
  })

  // ── Actions ───────────────────────────────────────────

  const saveEdit = async () => {
    if (!editTitle.trim()) { showToast('標題不可空白', 'error'); return }
    try {
      const { video: v } = await api.put(`/api/videos/${id}`, {
        title: editTitle, description: editDesc, category: editCat
      })
      setVideo(v)
      setEditOpen(false)
      showToast('已儲存', 'success')
    } catch (e) { showToast(e.message, 'error') }
  }

  const addTask = async () => {
    if (!taskText.trim()) { showToast('請填寫任務內容', 'error'); return }
    try {
      await api.post(`/api/videos/${id}/tasks`, {
        task_text: taskText, assignee: taskAssignee, due_date: taskDue
      })
      setTaskOpen(false)
      setTaskText(''); setTaskAssignee(''); setTaskDue('')
      showToast('任務已新增', 'success')
      await loadTasks()
    } catch (e) { showToast(e.message, 'error') }
  }

  const toggleTask = async (taskId) => {
    await api.patch(`/api/tasks/${taskId}/toggle`)
    await loadTasks()
  }

  const submitView = async () => {
    try {
      await api.post(`/api/videos/${id}/views`, {
        viewer_name: viewName || '匿名',
        viewer_role: viewRole,
        completed: viewDone === '1'
      })
      setViewOpen(false)
      setViewName('')
      showToast('觀看紀錄已儲存', 'success')
      await loadViews()
    } catch (e) { showToast(e.message, 'error') }
  }

  const deleteVideo = async () => {
    if (!confirm('確定刪除此資料？此操作無法復原。')) return
    await api.delete(`/api/videos/${id}`)
    navigate('/')
  }

  const reprocess = async () => {
    try {
      await api.post(`/api/videos/${id}/reprocess`, {})
      setVideo(v => ({ ...v, status: 'processing' }))
      showToast('重新分析已開始', 'success')
    } catch (e) { showToast(e.message, 'error') }
  }

  const copyContent = () => {
    navigator.clipboard.writeText(analysis?.transcript ?? '').then(() =>
      showToast('已複製到剪貼板', 'success')
    )
  }

  // ── Render helpers ────────────────────────────────────

  if (loading) return (
    <>
      <div className="topbar"><Link to="/" className="btn btn-outline btn-sm">← 返回</Link></div>
      <div className="page-content">
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 12px' }} />
          <div>載入中...</div>
        </div>
      </div>
    </>
  )

  if (!video) return (
    <>
      <div className="topbar"><Link to="/" className="btn btn-outline btn-sm">← 返回</Link></div>
      <div className="page-content">
        <div className="empty-state"><div className="empty-icon">❌</div><div>找不到資料</div></div>
      </div>
    </>
  )

  const topics = analysis?.topics ?? []
  const ftMeta = getFileTypeMeta(video.file_type)

  const tabLabel = (t) => {
    if (t === 'content') {
      return video.file_type === 'pptx' ? '📊 逐頁內容' : video.file_type === 'document' ? '📄 文件內容' : '📝 逐字稿'
    }
    return { summary: '📋 整體摘要', keypoints: '📌 重點整理', actions: '✅ 待辦事項', faq: '❓ 常見問答' }[t]
  }

  const roleSummary = {
    exec:    analysis?.exec_summary,
    manager: analysis?.manager_summary,
    teacher: analysis?.teacher_summary,
  }[role]

  const roleLabel = {
    exec: '主管版摘要', manager: '班主任版摘要', teacher: '老師版重點'
  }[role]

  return (
    <>
      <div className="topbar">
        <Link to="/" className="btn btn-outline btn-sm">← 返回列表</Link>
        <div className="topbar-title" style={{ flex: 1 }}>{video.title}</div>
        <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>✏️ 編輯</button>
        <button className="btn btn-outline btn-sm" onClick={() => setViewOpen(true)}>👁️ 記錄觀看</button>
        {video.status === 'done' && (
          <button className="btn btn-outline btn-sm" onClick={() => setTaskOpen(true)}>➕ 任務</button>
        )}
        <button className="btn btn-danger btn-sm" onClick={deleteVideo}>🗑️</button>
      </div>

      <div className="page-content">
        {/* Hero */}
        <div className="video-hero">
          <div className="hero-badges">
            <StatusBadge status={video.status} />
            <CategoryBadge category={video.category} />
            <FileTypePill fileType={video.file_type} />
          </div>
          <div className="hero-title">{video.title}</div>
          {video.description && (
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>{video.description}</div>
          )}
          <div className="hero-meta">
            <span>📅 上傳：{formatDate(video.uploaded_at)}</span>
            {video.processed_at && <span>⚙️ 完成：{formatDate(video.processed_at)}</span>}
            {(video.file_type === 'video' || video.file_type === 'audio')
              ? video.duration && <span>⏱ 時長：{formatDuration(video.duration)}</span>
              : video.page_count && (
                  <span>{video.file_type === 'pptx'
                    ? `📊 ${video.page_count} 張投影片`
                    : `📄 ${video.page_count} 頁`}
                  </span>
                )
            }
            {video.filesize && <span>📦 {formatFileSize(video.filesize)}</span>}
            <span>👤 {video.uploader_name}</span>
          </div>
          {topics.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {topics.map(t => {
                const color = CATEGORY_COLORS[t] ?? '#94a3b8'
                return (
                  <span key={t} style={{ display: 'inline-block', margin: 2, padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: `${color}30`, color }}>
                    {t}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Status states */}
        {video.status === 'pending' && (
          <div className="panel">
            <div className="processing-anim">
              <div className="spinner" style={{ width: 18, height: 18 }} />
              資料已上傳，正在等待 AI 分析...
            </div>
          </div>
        )}
        {video.status === 'processing' && (
          <div className="panel">
            <div className="processing-anim">
              <div className="spinner" style={{ width: 18, height: 18 }} />
              AI 正在分析中，請稍候（文件約 10–30 秒，影片約 2–5 分鐘）...
            </div>
          </div>
        )}
        {video.status === 'error' && (
          <div className="panel">
            <div style={{ color: 'var(--error)', fontWeight: 600, marginBottom: 6 }}>⚠️ 分析失敗</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{video.error_message ?? '未知錯誤'}</div>
            <button className="btn btn-outline btn-sm" onClick={reprocess}>🔄 重新分析</button>
          </div>
        )}

        {/* Main content */}
        {video.status === 'done' && analysis && (
          <div className="content-grid">
            <div>
              {/* Role switcher */}
              <div className="role-switcher">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: '32px', marginRight: 4 }}>角色視角：</div>
                {ROLES.map(r => (
                  <button
                    key={r.key}
                    className={`role-btn${role === r.key ? ` ${r.cls}` : ''}`}
                    onClick={() => setRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Role summary */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <div className="panel-icon">{role === 'exec' ? '👔' : role === 'manager' ? '🏫' : '👨‍🏫'}</div>
                    {roleLabel}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                  {roleSummary ?? '—'}
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                {TABS.map(t => (
                  <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                    {tabLabel(t)}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              {tab === 'summary' && <TabSummary analysis={analysis} />}
              {tab === 'keypoints' && <TabKeyPoints analysis={analysis} />}
              {tab === 'actions' && (
                <TabActions
                  analysis={analysis}
                  tasks={tasks}
                  onToggle={toggleTask}
                  onAdd={() => setTaskOpen(true)}
                />
              )}
              {tab === 'faq' && <TabFAQ analysis={analysis} />}
              {tab === 'content' && <TabContent analysis={analysis} video={video} onCopy={copyContent} />}
            </div>

            {/* Sidebar: views */}
            <div>
              <div className="panel">
                <div className="panel-title" style={{ marginBottom: 14 }}>
                  <div className="panel-icon">👁️</div>觀看紀錄
                </div>
                {views.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>尚無觀看紀錄</div>
                ) : views.slice(0, 20).map((v, i) => (
                  <div key={i} className="view-item">
                    <div className="view-avatar">{(v.viewer_name?.[0] ?? '?').toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{v.viewer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {v.viewer_role} · {formatDate(v.viewed_at)}
                      </div>
                    </div>
                    {v.completed && <span className="badge badge-done">✅</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="✏️ 編輯資料資訊"
        footer={<>
          <button className="btn btn-outline" onClick={() => setEditOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={saveEdit}>儲存</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">標題</label>
          <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">說明</label>
          <textarea className="form-textarea" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">分類</label>
          <select className="form-select" value={editCat} onChange={e => setEditCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </Modal>

      {/* Add task modal */}
      <Modal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="➕ 新增追蹤任務"
        footer={<>
          <button className="btn btn-outline" onClick={() => setTaskOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={addTask}>新增</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">任務內容</label>
          <textarea className="form-textarea" value={taskText} onChange={e => setTaskText(e.target.value)}
            placeholder="例如：本月內向分校傳達招生話術調整..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">負責人</label>
            <input className="form-input" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
              placeholder="班主任 / 老師 / 主管" />
          </div>
          <div className="form-group">
            <label className="form-label">期限</label>
            <input type="date" className="form-input" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* View record modal */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="👁️ 記錄觀看"
        footer={<>
          <button className="btn btn-outline" onClick={() => setViewOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={submitView}>確認記錄</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">觀看者姓名</label>
          <input className="form-input" value={viewName} onChange={e => setViewName(e.target.value)} placeholder="姓名" />
        </div>
        <div className="form-group">
          <label className="form-label">角色</label>
          <select className="form-select" value={viewRole} onChange={e => setViewRole(e.target.value)}>
            {['老師','班主任','主管','教務','行政','其他'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">是否完整觀看？</label>
          <select className="form-select" value={viewDone} onChange={e => setViewDone(e.target.value)}>
            <option value="0">僅部分觀看</option>
            <option value="1">完整觀看</option>
          </select>
        </div>
      </Modal>
    </>
  )
}

// ── Tab sub-components ────────────────────────────────────

function TabSummary({ analysis }) {
  const segments = analysis?.key_segments ?? []
  return (
    <>
      <div className="panel">
        <div style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
          {analysis.summary ?? '—'}
        </div>
      </div>
      {segments.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-icon">🎯</div>關鍵段落</div>
          </div>
          {segments.map((s, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < segments.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge ${s.importance === '高' ? 'badge-error' : s.importance === '中' ? 'badge-processing' : 'badge-done'}`}
                  style={s.importance === '高' ? { background: 'var(--error-light)', color: 'var(--error)' }
                       : s.importance === '中' ? { background: 'var(--warning-light)', color: 'var(--warning)' }
                       : { background: 'var(--success-light)', color: 'var(--success)' }}>
                  {s.importance}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.content}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function TabKeyPoints({ analysis }) {
  const kps = analysis?.key_points ?? []
  return (
    <div className="panel">
      {kps.length === 0
        ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>無重點整理</div>
        : kps.map((kp, i) => (
          <div key={i} className="key-point-item">
            <div className="kp-num">{i + 1}</div>
            <div>
              <div className="kp-title">{kp.point ?? kp.title ?? ''}</div>
              <div className="kp-detail">{kp.detail ?? kp.description ?? ''}</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

function TabActions({ analysis, tasks, onToggle, onAdd }) {
  const items = analysis?.action_items ?? []
  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title"><div className="panel-icon">✅</div>AI 建議待辦</div>
        </div>
        {items.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>無待辦事項</div>
          : items.map((item, i) => (
            <div key={i} className="action-item">
              <div className={`action-dot ${item.priority ?? '中'}`} />
              <div style={{ flex: 1 }}>
                <div className="a-task">{item.task}</div>
                <div className="a-owner">負責人建議：{item.owner ?? '—'}</div>
              </div>
              <span className={`priority-label ${item.priority ?? '中'}`}>{item.priority ?? '中'}</span>
            </div>
          ))
        }
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title"><div className="panel-icon">📋</div>自訂追蹤任務</div>
          <button className="btn btn-outline btn-sm" onClick={onAdd}>+ 新增</button>
        </div>
        {tasks.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>尚無任務，點擊「新增」建立</div>
          : tasks.map(t => (
            <div key={t.id} className={`task-item${t.completed ? ' done' : ''}`}>
              <button
                className={`task-check${t.completed ? ' checked' : ''}`}
                onClick={() => onToggle(t.id)}
              >
                {t.completed ? '✓' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <div className={t.completed ? 'task-text-done' : ''} style={{ fontSize: 13, fontWeight: 500 }}>
                  {t.task_text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t.assignee && `👤 ${t.assignee}`}
                  {t.due_date && ` 📅 ${t.due_date}`}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}

function TabFAQ({ analysis }) {
  const faqs = analysis?.faq ?? []
  return (
    <div className="panel">
      {faqs.length === 0
        ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>無常見問答</div>
        : faqs.map((f, i) => (
          <div key={i} className="faq-item">
            <div className="faq-q">{f.question}</div>
            <div className="faq-a">{f.answer}</div>
          </div>
        ))
      }
    </div>
  )
}

function TabContent({ analysis, video, onCopy }) {
  const label = video.file_type === 'pptx'
    ? '投影片完整內容（逐頁）'
    : video.file_type === 'document'
    ? '文件原始內容'
    : '完整逐字稿'

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title"><div className="panel-icon">📄</div>{label}</div>
        <button className="btn btn-outline btn-sm" onClick={onCopy}>複製</button>
      </div>
      <div className="transcript-box">
        {analysis?.transcript ?? '（無內容）'}
      </div>
    </div>
  )
}
