import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { CATEGORIES, detectFileIcon, detectFileTypeName, formatFileSize } from '../utils/helpers.jsx'

const FORMAT_CARDS = [
  { icon: '🎬', label: '影片',        exts: 'MP4 · MOV · AVI · MKV', accept: 'video/*' },
  { icon: '🎵', label: '音檔',        exts: 'MP3 · WAV · M4A · AAC', accept: 'audio/*' },
  { icon: '📕', label: 'PDF',         exts: '.pdf',                   accept: '.pdf' },
  { icon: '📝', label: 'Word 文件',   exts: '.docx · .doc',           accept: '.docx,.doc' },
  { icon: '📊', label: '投影片',      exts: '.pptx · .ppt',           accept: '.pptx,.ppt' },
  { icon: '📄', label: '文字檔',      exts: '.txt · .md · .csv',      accept: '.txt,.md,.csv' },
]

export default function Upload() {
  const [file,        setFile]        = useState(null)
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState('未分類')
  const [dragging,    setDragging]    = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef = useRef()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const triggerInput = (accept) => {
    if (accept) fileInputRef.current.accept = accept
    fileInputRef.current.click()
  }

  const handleFile = (f) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const submit = () => {
    if (!file)  { showToast('請先選擇檔案', 'error'); return }
    if (!title) { showToast('請填寫標題', 'error'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title)
    fd.append('description', description)
    fd.append('category', category)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/videos/upload')

    // 帶上登入 token（後端需要 admin 身份）
    const token = localStorage.getItem('giraffe_token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        showToast('上傳成功！AI 分析已開始', 'success')
        setTimeout(() => navigate(`/video/${data.video.id}`), 1000)
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          showToast(`上傳失敗：${err.detail ?? xhr.status}`, 'error')
        } catch { showToast(`上傳失敗：HTTP ${xhr.status}`, 'error') }
        setUploading(false)
      }
    })
    xhr.addEventListener('error', () => {
      showToast('網路錯誤，請再試一次', 'error')
      setUploading(false)
    })
    xhr.send(fd)
  }

  return (
    <>
      <div className="topbar">
        <Link to="/" className="btn btn-outline btn-sm">← 返回</Link>
        <div className="topbar-title">上傳培訓資料</div>
      </div>

      <div className="page-content" style={{ maxWidth: 720 }}>
        {/* Format guide */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-icon">📋</div>支援的格式</div>
          </div>
          <div className="format-grid">
            {FORMAT_CARDS.map(fc => (
              <div key={fc.label} className="format-card" onClick={() => triggerInput(fc.accept)}>
                <div className="fc-icon">{fc.icon}</div>
                <div className="fc-label">{fc.label}</div>
                <div className="fc-exts">{fc.exts}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-icon">⬆️</div>選擇檔案</div>
          </div>
          <div
            className={`upload-zone${dragging ? ' drag-over' : ''}`}
            onClick={() => triggerInput()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="up-icon">{file ? detectFileIcon(file.name) : '📂'}</div>
            <div className="up-title">{file ? file.name : '點擊或拖曳檔案到這裡'}</div>
            <div className="up-sub">
              {file
                ? `${detectFileTypeName(file.name)} · ${formatFileSize(file.size)}`
                : '影片、音檔、PDF、Word、PPT、TXT — 最大 500MB'}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept="video/*,audio/*,.pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv"
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
          />

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>{progress < 100 ? '上傳中...' : 'AI 分析排程中...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-icon">📝</div>資料資訊</div>
          </div>
          <div className="form-group">
            <label className="form-label">標題 <span style={{ color: 'var(--error)' }}>*</span></label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例如：2024年Q1招生培訓簡報" />
          </div>
          <div className="form-group">
            <label className="form-label">說明（選填）</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="簡單說明資料主題、目標對象或重點..." />
          </div>
          <div className="form-group">
            <label className="form-label">分類</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Link to="/" className="btn btn-outline">取消</Link>
            <button className="btn btn-primary" onClick={submit} disabled={uploading}>
              {uploading ? '上傳中...' : '🚀 開始上傳與分析'}
            </button>
          </div>
        </div>

        {/* Note */}
        <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', fontSize: 13, color: '#92400e' }}>
          ⚠️ 影片/音檔使用 Whisper 語音辨識。文件/投影片直接擷取文字，速度更快。
          請確認 <code>backend/.env</code> 已填入 <strong>OPENAI_API_KEY</strong>。
        </div>
      </div>
    </>
  )
}
