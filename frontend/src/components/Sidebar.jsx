import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const MENU = [
  { to: '/',       icon: '📊', label: '總覽' },
  { to: '/upload', icon: '⬆️', label: '上傳資料', adminOnly: true },
  { to: '/search', icon: '🔍', label: '知識庫搜尋' },
]

const ROLE_LABEL = {
  admin: '👑 管理員',
  principal: '🏫 分校主任',
  teacher: '👨‍🏫 老師',
  staff: '📋 行政',
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🦒</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>培訓知識整理系統</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Training Knowledge</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '0 20px', marginBottom: 8, marginTop: 16 }}>
        主要功能
      </div>

      <nav className="sidebar-nav">
        {MENU.filter(m => !m.adminOnly || isAdmin).map(m => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{m.icon}</span>
            <span>{m.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User card at bottom */}
      <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid var(--border)' }}>
        {user && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', background: 'var(--bg-subtle, #f8fafc)',
              borderRadius: 8, marginBottom: 8,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {(user.name?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ROLE_LABEL[user.role] || user.role}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              🚪 登出
            </button>
          </>
        )}
      </div>
    </aside>
  )
}