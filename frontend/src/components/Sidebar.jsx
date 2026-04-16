import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../utils/api.js'

const NAV = [
  { to: '/',       icon: '🏠', label: '總覽' },
  { to: '/upload', icon: '⬆️', label: '上傳資料' },
  { to: '/search', icon: '🔍', label: '知識庫搜尋' },
]

export default function Sidebar() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/api/stats').then(s => setStats(s)).catch(() => {})
  }, [])

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🎬</div>
        <div className="logo-name">培訓知識整理系統</div>
        <div className="logo-sub">Training Knowledge Platform</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">主要功能</div>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 快速統計 */}
      {stats && (
        <div style={{
          margin: '16px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: 1 }}>
            快速統計
          </div>
          {[
            { label: '資料總數', value: stats.total,       color: '#60a5fa' },
            { label: '已完成',   value: stats.done,        color: '#34d399' },
            { label: '處理中',   value: stats.pending,     color: '#fbbf24' },
            { label: '觀看次數', value: stats.total_views, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 7,
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer">長頸鹿培訓系統 v3.0</div>
    </div>
  )
}