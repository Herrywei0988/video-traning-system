import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'

/**
 * 筆記面板元件
 * - 支援整體筆記（不綁時間戳）跟段落筆記（綁時間戳）
 * - 可新增、編輯、刪除
 * - 段落筆記點擊時間戳可跳轉（需要 onSeek callback）
 */
export default function NotesPanel({ videoId, currentTime = 0, canSeek = false, onSeek }) {
  const { showToast } = useToast()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [bindTimestamp, setBindTimestamp] = useState(false)  // 要不要綁目前時間戳
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/videos/${videoId}/notes`)
      setNotes(res.notes)
    } catch (e) {
      showToast('載入筆記失敗：' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [videoId, showToast])

  useEffect(() => { load() }, [load])

  const formatSec = (s) => {
    if (s === null || s === undefined) return ''
    const mm = Math.floor(s / 60)
    const ss = Math.floor(s % 60)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const create = async () => {
    const content = newContent.trim()
    if (!content) { showToast('請輸入內容', 'error'); return }
    try {
      await api.post(`/api/videos/${videoId}/notes`, {
        content,
        timestamp_sec: bindTimestamp ? currentTime : null,
      })
      setNewContent('')
      setBindTimestamp(false)
      showToast('已新增筆記', 'success')
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const startEdit = (note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const saveEdit = async () => {
    const content = editContent.trim()
    if (!content) { showToast('請輸入內容', 'error'); return }
    try {
      await api.put(`/api/notes/${editingId}`, { content })
      setEditingId(null)
      setEditContent('')
      showToast('已更新', 'success')
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const remove = async (noteId) => {
    if (!confirm('確定刪除此筆記？')) return
    try {
      await api.delete(`/api/notes/${noteId}`)
      showToast('已刪除', 'success')
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="panel-icon">📝</div>我的筆記
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {notes.length} 則
        </div>
      </div>

      {/* 新增筆記輸入區 */}
      <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-secondary, #fffaf5)', borderRadius: 6 }}>
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="寫下你的想法..."
          rows={3}
          style={{
            width: '100%', border: '1px solid var(--border)', borderRadius: 4,
            padding: 8, fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
          {canSeek ? (
            <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bindTimestamp}
                onChange={e => setBindTimestamp(e.target.checked)}
                style={{ margin: 0 }}
              />
              綁定目前時間（{formatSec(currentTime)}）
            </label>
          ) : (
            <div />
          )}
          <button
            onClick={create}
            disabled={!newContent.trim()}
            className="btn btn-primary btn-sm"
            style={{ opacity: newContent.trim() ? 1 : 0.5 }}
          >
            新增
          </button>
        </div>
      </div>

      {/* 筆記列表 */}
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10 }}>載入中...</div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10, textAlign: 'center' }}>
          還沒有任何筆記
        </div>
      ) : (
        notes.map((note, i) => (
          <div key={note.id} style={{
            padding: '10px 0',
            borderBottom: i < notes.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            {/* 時間戳 badge + 編輯/刪除按鈕 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {note.timestamp_sec !== null && note.timestamp_sec !== undefined ? (
                canSeek ? (
                  <button
                    onClick={() => onSeek && onSeek(note.timestamp_sec)}
                    style={{
                      padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                      background: 'var(--primary)', color: '#fff', border: 'none',
                      borderRadius: 4, fontWeight: 600,
                    }}
                  >
                    ▶ {formatSec(note.timestamp_sec)}
                  </button>
                ) : (
                  <span style={{
                    padding: '2px 8px', fontSize: 11,
                    background: 'var(--primary-light, #fed7aa)', color: 'var(--primary)',
                    borderRadius: 4, fontWeight: 600,
                  }}>
                    {formatSec(note.timestamp_sec)}
                  </span>
                )
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>整體筆記</span>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {editingId === note.id ? null : (
                  <>
                    <button
                      onClick={() => startEdit(note)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 4px', color: 'var(--text-secondary)' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 4px', color: 'var(--error)' }}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 內容（顯示或編輯） */}
            {editingId === note.id ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', border: '1px solid var(--border)', borderRadius: 4,
                    padding: 6, fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <button onClick={cancelEdit} className="btn btn-outline btn-sm">取消</button>
                  <button onClick={saveEdit} className="btn btn-primary btn-sm">儲存</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {note.content}
              </div>
            )}

            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {new Date(note.updated_at || note.created_at).toLocaleString('zh-TW', { hour12: false })}
              {note.updated_at && note.updated_at !== note.created_at && ' (編輯過)'}
            </div>
          </div>
        ))
      )}
    </div>
  )
}