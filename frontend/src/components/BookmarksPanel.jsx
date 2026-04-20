import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'

/**
 * 書籤面板元件
 * - 書籤必綁時間戳（跟筆記不同）
 * - 可新增、刪除，但不能編輯
 * - 外部可透過 refreshToken 強制重新載入（例如關鍵段落加書籤後）
 */
export default function BookmarksPanel({ videoId, currentTime = 0, canSeek = false, onSeek, refreshToken = 0 }) {
  const { showToast } = useToast()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/videos/${videoId}/bookmarks`)
      setBookmarks(res.bookmarks)
    } catch (e) {
      showToast('載入書籤失敗：' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [videoId, showToast])

  useEffect(() => { load() }, [load, refreshToken])

  const formatSec = (s) => {
    const mm = Math.floor(s / 60)
    const ss = Math.floor(s % 60)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const add = async () => {
    if (!canSeek) { showToast('此檔案類型無法加書籤', 'error'); return }
    try {
      await api.post(`/api/videos/${videoId}/bookmarks`, {
        start_time: currentTime,
        note: newNote.trim(),
      })
      setNewNote('')
      setAdding(false)
      showToast(`已在 ${formatSec(currentTime)} 加書籤`, 'success')
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const remove = async (bookmarkId) => {
    if (!confirm('確定刪除此書籤？')) return
    try {
      await api.delete(`/api/bookmarks/${bookmarkId}`)
      showToast('已刪除書籤', 'success')
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  if (!canSeek) {
    // 文件/PPT 不能加書籤，整個面板不顯示
    return null
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="panel-icon">🔖</div>我的書籤
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bookmarks.length} 則</div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="btn btn-outline btn-sm"
              title={`在目前時間 ${formatSec(currentTime)} 加書籤`}
            >
              + 加書籤
            </button>
          )}
        </div>
      </div>

      {/* 新增書籤區（展開才顯示） */}
      {adding && (
        <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-secondary, #fffaf5)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            ⏱ 將在 <strong style={{ color: 'var(--primary)' }}>{formatSec(currentTime)}</strong> 加書籤
          </div>
          <input
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="備註（選填，例如「這段很重要」）"
            maxLength={500}
            style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 4,
              padding: 6, fontSize: 12.5, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setAdding(false); setNewNote('') }}
              className="btn btn-outline btn-sm"
            >取消</button>
            <button onClick={add} className="btn btn-primary btn-sm">加書籤</button>
          </div>
        </div>
      )}

      {/* 書籤列表 */}
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10 }}>載入中...</div>
      ) : bookmarks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10, textAlign: 'center' }}>
          還沒有書籤
        </div>
      ) : (
        bookmarks.map((b, i) => (
          <div key={b.id} style={{
            display: 'flex', gap: 8, padding: '8px 0', alignItems: 'flex-start',
            borderBottom: i < bookmarks.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <button
              onClick={() => onSeek && onSeek(b.start_time)}
              style={{
                padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 4, fontWeight: 600, flexShrink: 0,
              }}
            >
              ▶ {formatSec(b.start_time)}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                {b.note || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>無備註</span>}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(b.created_at).toLocaleString('zh-TW', { hour12: false })}
              </div>
            </div>
            <button
              onClick={() => remove(b.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 4px', color: 'var(--error)' }}
            >
              🗑️
            </button>
          </div>
        ))
      )}
    </div>
  )
}