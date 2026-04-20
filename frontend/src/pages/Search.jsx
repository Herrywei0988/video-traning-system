import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api.js'
import { CategoryBadge } from '../components/Badges.jsx'
import { formatDateShort, highlightText } from '../utils/helpers.jsx'

export default function Search() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [history, setHistory] = useState([])  // Sprint 3D: 個人搜尋歷史

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/search/history?limit=10')
      setHistory(res.history || [])
    } catch {
      /* 失敗就當沒歷史 */
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const { results } = await api.get(`/api/search?q=${encodeURIComponent(trimmed)}`)
      setResults(results)
      // 搜尋完重新載入歷史（因為這次搜尋會寫進 history）
      loadHistory()
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [loadHistory])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => doSearch(val), 400)
  }

  const applyHistory = (q) => {
    setQuery(q)
    doSearch(q)
  }

  const clearHistory = async () => {
    if (!confirm('確定清除所有搜尋歷史？')) return
    try {
      await api.delete('/api/search/history')
      setHistory([])
    } catch (e) {
      alert('清除失敗：' + e.message)
    }
  }

  // Sprint 3D: 刪除搜尋歷史中的單一 query
  const removeHistoryItem = async (e, q) => {
    e.stopPropagation()  // 避免點到 × 時也觸發外層 chip 的 onClick 去搜尋
    try {
      await api.delete('/api/search/history/item', { query: q })
      setHistory(prev => prev.filter(h => h.query !== q))
    } catch (err) {
      alert('刪除失敗：' + err.message)
    }
  }

  const getSnippet = (result, q) => {
    const texts = [result.summary, result.transcript].filter(Boolean)
    for (const t of texts) {
      const idx = t.toLowerCase().indexOf(q.toLowerCase())
      if (idx !== -1) {
        const start = Math.max(0, idx - 60)
        const end   = Math.min(t.length, idx + 120)
        return (start > 0 ? '...' : '') + t.slice(start, end) + (end < t.length ? '...' : '')
      }
    }
    return result.summary ? result.summary.slice(0, 150) + '...' : ''
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">知識庫搜尋</div>
      </div>

      <div className="page-content">
        {/* Hero search bar */}
        <div style={{
          background: 'linear-gradient(135deg,#141929 0%,#1e3a6e 100%)',
          padding: 36, borderRadius: 'var(--radius)', marginBottom: 24,
          textAlign: 'center', color: '#fff'
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>🔍 搜尋培訓知識庫</h1>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
            從所有已分析的培訓資料中，快速找到你需要的知識與重點
          </p>
          <div style={{
            display: 'flex', maxWidth: 560, margin: '0 auto',
            background: 'rgba(255,255,255,.1)',
            border: '1.5px solid rgba(255,255,255,.25)',
            borderRadius: 8, overflow: 'hidden'
          }}>
            <input
              value={query}
              onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && doSearch(query)}
              placeholder="輸入關鍵字，例如：招生話術、家長溝通..."
              autoFocus
              style={{
                flex: 1, padding: '13px 18px',
                background: 'transparent', border: 'none',
                color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none'
              }}
            />
            <button
              onClick={() => doSearch(query)}
              style={{
                padding: '0 20px', background: 'var(--primary)',
                border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer'
              }}
            >
              🔍
            </button>
          </div>
        </div>

        {/* 最近搜尋（Sprint 3D）— 有歷史才顯示 */}
        {history.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>🕐 最近搜尋</span>
            {history.map(h => (
              <span
                key={h.query}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <button
                  onClick={() => applyHistory(h.query)}
                  title={`上次找到 ${h.result_count} 筆結果`}
                  style={{
                    padding: '4px 4px 4px 10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  {h.query}
                  {h.result_count > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>
                      ·{h.result_count}
                    </span>
                  )}
                </button>
                <button
                  onClick={(e) => removeHistoryItem(e, h.query)}
                  title="移除這筆歷史"
                  style={{
                    padding: '4px 8px 4px 4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    opacity: 0.5,
                    transition: 'opacity 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = 1
                    e.currentTarget.style.color = 'var(--error)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = 0.5
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              onClick={clearHistory}
              style={{
                padding: '4px 10px', fontSize: 11, background: 'transparent',
                border: 'none', cursor: 'pointer', color: 'var(--error)',
                fontFamily: 'inherit',
              }}
            >
              ✕ 清除
            </button>
          </div>
        )}

        {/* Results */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2.5, margin: '0 auto' }} />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">找不到相關結果</div>
            <div className="empty-sub">試試其他關鍵字，或確認資料是否已完成 AI 分析</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              找到 <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> 個相關結果
            </div>
            {results.map(r => {
              const snippet = getSnippet(r, query)
              return (
                <Link key={r.id} to={`/video/${r.id}`} className="search-result-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <CategoryBadge category={r.category ?? '未分類'} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      📅 {formatDateShort(r.uploaded_at)}
                    </span>
                  </div>
                  <div className="sr-title">{highlightText(r.title, query)}</div>
                  <div className="sr-snippet">{highlightText(snippet, query)}</div>
                </Link>
              )
            })}
          </>
        )}

        {!loading && !searched && history.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" style={{ opacity: 0.3 }}>📚</div>
            <div className="empty-title" style={{ color: 'var(--text-muted)' }}>輸入關鍵字開始搜尋</div>
          </div>
        )}
      </div>
    </>
  )
}