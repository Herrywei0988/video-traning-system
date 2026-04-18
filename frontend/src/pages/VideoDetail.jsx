import { useState, useEffect, useCallback, useRef } from 'react'
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

  const mediaRef = useRef(null)
  const [mediaError, setMediaError] = useState(false)

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

   const formatSeconds = (s) => {
    const mm = Math.floor(s / 60)
    const ss = Math.floor(s % 60)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const seekTo = (seconds) => {
    if (!mediaRef.current) return
    mediaRef.current.currentTime = seconds
    mediaRef.current.play().catch(() => {})
    mediaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

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

  const deleteTask = async (taskId) => {
  if (!confirm('確定刪除此任務？')) return
  await api.delete(`/api/tasks/${taskId}`)
  await loadTasks()
  showToast('任務已刪除', 'success')
}

const clearViews = async () => {
  if (!confirm('確定清除所有觀看紀錄？')) return
  await api.delete(`/api/videos/${id}/views`)
  await loadViews()
  showToast('觀看紀錄已清除', 'success')
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

  const exportPDF = (mode = 'full') => {
      if (!video || !analysis) return
      const topics = analysis.topics ?? []
      const keyPoints = analysis.key_points ?? []
      const actionItems = analysis.action_items ?? []
      const faq = analysis.faq ?? []

      const roleTitle = {
        full: '完整分析報告',
        exec: '主管版報告',
        manager: '班主任版報告',
        teacher: '老師版報告',
      }[mode]

      const showRoleSection = (roleKey) => {
        if (mode === 'full') return true
        return mode === roleKey
      }

      const html = `<!DOCTYPE html>
  <html lang="zh-TW">
  <head>
  <meta charset="UTF-8">
  <title>${video.title} — ${roleTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Microsoft JhengHei', Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; line-height: 1.7; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding: 6px 10px; background: #f1f5f9; border-left: 4px solid #3b82f6; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 12px; }
    .role-banner { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1d4ed8; margin-bottom: 12px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1d4ed8; margin: 2px; }
    .summary { font-size: 13px; line-height: 1.9; margin-bottom: 16px; }
    .role-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 8px; }
    .role-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .kp { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .kp-num { width: 22px; height: 22px; border-radius: 50%; background: #3b82f6; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .kp-title { font-weight: 600; font-size: 13px; }
    .kp-detail { font-size: 12px; color: #475569; margin-top: 2px; }
    .action { display: flex; gap: 8px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; align-items: flex-start; }
    .priority { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 2px; flex-shrink: 0; }
    .高 { background: #fee2e2; color: #dc2626; }
    .中 { background: #fef9c3; color: #ca8a04; }
    .低 { background: #dcfce7; color: #16a34a; }
    .faq-q { font-weight: 600; font-size: 13px; margin-bottom: 3px; }
    .faq-a { font-size: 12px; color: #475569; padding-left: 10px; border-left: 3px solid #e2e8f0; }
    .faq-item { margin-bottom: 12px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
  </head>
  <body>
  <div class="role-banner">${roleTitle}</div>
  <h1>${video.title}</h1>
  <div class="meta">
    📅 上傳：${formatDate(video.uploaded_at)}
    ${video.processed_at ? ` ⚙️ 分析完成：${formatDate(video.processed_at)}` : ''}
    ${video.duration ? ` ⏱ 時長：${formatDuration(video.duration)}` : ''}
    　👤 ${video.uploader_name}　📁 ${video.category}
  </div>
  ${topics.length > 0 ? `<div>${topics.map(t => `<span class="tag">${t}</span>`).join('')}</div><br>` : ''}

  ${mode === 'full' ? `
  <h2>📋 整體摘要</h2>
  <div class="summary">${analysis.summary ?? '—'}</div>
  ` : ''}

  ${showRoleSection('exec') ? `
  <h2>👔 主管版摘要</h2>
  <div class="role-box"><div class="role-label">EXECUTIVE SUMMARY</div>${analysis.exec_summary ?? '—'}</div>
  ` : ''}

  ${showRoleSection('manager') ? `
  <h2>🏫 班主任版摘要</h2>
  <div class="role-box"><div class="role-label">MANAGER SUMMARY</div>${analysis.manager_summary ?? '—'}</div>
  ` : ''}

  ${showRoleSection('teacher') ? `
  <h2>👨‍🏫 老師版重點</h2>
  <div class="role-box"><div class="role-label">TEACHER NOTES</div>${analysis.teacher_summary ?? '—'}</div>
  ` : ''}

  ${keyPoints.length > 0 ? `
  <h2>📌 重點整理</h2>
  ${keyPoints.map((kp, i) => `
  <div class="kp">
    <div class="kp-num">${i + 1}</div>
    <div><div class="kp-title">${kp.point ?? ''}</div><div class="kp-detail">${kp.detail ?? ''}</div></div>
  </div>`).join('')}` : ''}

  ${actionItems.length > 0 ? `
  <h2>✅ 待辦事項</h2>
  ${actionItems.map(item => `
  <div class="action">
    <span class="priority ${item.priority ?? '中'}">${item.priority ?? '中'}</span>
    <div><div style="font-weight:600">${item.task}</div><div style="font-size:11px;color:#64748b">負責人：${item.owner ?? '—'}</div></div>
  </div>`).join('')}` : ''}

  ${faq.length > 0 ? `
  <h2>❓ 常見問答</h2>
  ${faq.map(f => `
  <div class="faq-item">
    <div class="faq-q">Q：${f.question}</div>
    <div class="faq-a">A：${f.answer}</div>
  </div>`).join('')}` : ''}

  <div class="footer">長頸鹿培訓知識整理系統 · 此報告由 AI 自動產生，僅供參考</div>
  </body>
  </html>`

      const w = window.open('', '_blank')
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 500)
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
        
        {video.status === 'done' && analysis && (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => exportPDF(role)}>
              📄 匯出{role === 'exec' ? '主管版' : role === 'manager' ? '班主任版' : '老師版'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => exportPDF('full')}>
              🗂 完整版
            </button>
          </>
        )}

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

        {/* Media player: only for video/audio */}
        {video.status === 'done' && (video.file_type === 'video' || video.file_type === 'audio') && !mediaError && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {video.file_type === 'video' ? (
              <video
                ref={mediaRef}
                src={`/api/videos/${id}/file`}
                controls
                onError={() => setMediaError(true)}
                style={{ width: '100%', display: 'block', maxHeight: 480, background: '#000' }}
              />
            ) : (
              <div style={{ padding: 16 }}>
                <audio
                  ref={mediaRef}
                  src={`/api/videos/${id}/file`}
                  controls
                  onError={() => setMediaError(true)}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Fallback when media cannot play */}
        {video.status === 'done' && (video.file_type === 'video' || video.file_type === 'audio') && mediaError && (
          <div className="panel" style={{ background: 'var(--warning-light)', borderLeft: '4px solid var(--warning)' }}>
            <div style={{ fontSize: 13, color: '#92400e' }}>
              ⚠️ 此檔案格式瀏覽器無法直接播放，但 AI 分析已完成。段落跳轉功能需要可播放的格式（建議 MP4 或 MP3）。
            </div>
          </div>
        )}

        {/* Notice for document/pptx file types */}
        {video.status === 'done' && (video.file_type === 'document' || video.file_type === 'pptx') && (
          <div className="panel" style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
            <div style={{ fontSize: 13, color: '#075985', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>
                {video.file_type === 'pptx' ? '📊' : '📄'}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {video.file_type === 'pptx' ? '投影片檔案' : '文件檔案'}已完成 AI 整理
                </div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>
                  {video.file_type === 'pptx'
                    ? '共 ' + (video.page_count ?? '—') + ' 張投影片 · 原始投影片請聯繫總部取得，此處僅顯示 AI 整理後的知識內容'
                    : '文件原始內容請聯繫總部取得，此處僅顯示 AI 整理後的重點'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 本片行動清單 — 根據當前角色過濾 */}
        {video.status === 'done' && analysis && (() => {
          const items = analysis.action_items ?? []
          const orderMap = { '高': 0, '中': 1, '低': 2 }
          
          // 根據當前 role 過濾相關的 owner
          const roleKeywords = {
            exec:    ['主管', '總部', '老闆', '校長'],
            manager: ['班主任', '主任', '教務', '教學主管'],
            teacher: ['老師', '教師', '講師'],
          }
          const keywords = roleKeywords[role] ?? []
          
          const matchRole = (owner) => {
            if (!owner) return false
            return keywords.some(kw => owner.includes(kw))
          }
          
          const filtered = items.filter(item => matchRole(item.owner))
          // 如果篩不到任何該角色的事，顯示全部最高優先級的三件（fallback）
          const pool = filtered.length > 0 ? filtered : items
          const top3 = [...pool]
            .sort((a, b) => (orderMap[a.priority] ?? 1) - (orderMap[b.priority] ?? 1))
            .slice(0, 3)
          
          if (top3.length === 0) return null
          
          const roleLabel = { exec: '主管', manager: '班主任', teacher: '老師' }[role]
          const isFiltered = filtered.length > 0

          return (
            <div className="panel" style={{
              borderLeft: '4px solid var(--primary)',
              background: 'linear-gradient(to right, #eff6ff 0%, transparent 70%)'
            }}>
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-icon">🎯</div>
                  {isFiltered
                    ? `${roleLabel}：看完這支你要做的事`
                    : '看完這支你要做的事（通用）'}
                </div>
              </div>
              {top3.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < top3.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--primary)', color: '#fff',
                    fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.task}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      👤 {item.owner ?? '—'}
                      <span style={{ marginLeft: 8 }}>
                        優先級：<span className={`priority-label ${item.priority ?? '中'}`} style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                          background: item.priority === '高' ? 'var(--error-light)' : item.priority === '低' ? 'var(--success-light)' : 'var(--warning-light)',
                          color: item.priority === '高' ? 'var(--error)' : item.priority === '低' ? 'var(--success)' : 'var(--warning)',
                        }}>{item.priority ?? '中'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

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
              {tab === 'summary' && (
                <TabSummary
                  analysis={analysis}
                  video={video}
                  onSeek={seekTo}
                  formatSeconds={formatSeconds}
                />
              )}
              {tab === 'keypoints' && <TabKeyPoints analysis={analysis} />}
              {tab === 'actions' && (
                <TabActions
                  analysis={analysis}
                  tasks={tasks}
                  onToggle={toggleTask}
                  onAdd={() => setTaskOpen(true)}
                  onDelete={deleteTask}
                />
              )}
              {tab === 'faq' && <TabFAQ analysis={analysis} />}
              {tab === 'content' && <TabContent analysis={analysis} video={video} onCopy={copyContent} />}
            </div>

            {/* Sidebar: views */}
            <div>
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="panel-title">
                    <div className="panel-icon">👁️</div>觀看紀錄
                  </div>
                  {views.length > 0 && (
                    <button className="btn btn-outline btn-sm" onClick={clearViews}>清除全部</button>
                  )}
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

function TabSummary({ analysis, video, onSeek, formatSeconds }) {
  const segments = analysis?.key_segments ?? []
  const canSeek = (video.file_type === 'video' || video.file_type === 'audio')
  
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className={`badge ${s.importance === '高' ? 'badge-error' : s.importance === '中' ? 'badge-processing' : 'badge-done'}`}
                  style={s.importance === '高' ? { background: 'var(--error-light)', color: 'var(--error)' }
                       : s.importance === '中' ? { background: 'var(--warning-light)', color: 'var(--warning)' }
                       : { background: 'var(--success-light)', color: 'var(--success)' }}>
                  {s.importance}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.title}</span>
                {canSeek && typeof s.start_time === 'number' && (
                  <button
                    onClick={() => onSeek(s.start_time)}
                    style={{
                      marginLeft: 'auto',
                      padding: '3px 10px',
                      fontSize: 11,
                      background: 'var(--primary-light, #dbeafe)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ▶ 跳到 {formatSeconds(s.start_time)}
                  </button>
                )}
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

function TabActions({ analysis, tasks, onToggle, onAdd, onDelete }) {
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
              <button
                onClick={() => onDelete(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 14, padding: '0 4px' }}
              >
                🗑️
              </button>
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
