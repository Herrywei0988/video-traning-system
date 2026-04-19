import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const MENU = [
  { to: '/',       icon: '📊', label: '總覽' },
  { to: '/upload', icon: '⬆️', label: '上傳資料', adminOnly: true },
  { to: '/search', icon: '🔍', label: '知識庫搜尋' },
]

const ROLE_LABEL = {
  admin: '總部管理員',
  principal: '分校主任',
  teacher: '分校老師',
  staff: '分校行政',
}

const ROLE_ICON = {
  admin: '👑',
  principal: '🏫',
  teacher: '👨‍🏫',
  staff: '📋',
}

const VIEW_AS_OPTIONS = ['admin', 'principal', 'teacher', 'staff']

export default function Sidebar() {
  const {
    user, logout, isAdmin, isRealAdmin,
    realRole, effectiveRole, viewAsRole, setViewAsRole,
  } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  // 點外部 / ESC 關閉
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleViewAs = (role) => {
    if (role === realRole) setViewAsRole(null)
    else setViewAsRole(role)
    setMenuOpen(false)
  }

  return (
    <aside
      className="sidebar"
      style={{
        width: 240, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: '#fff',
        borderRight: '1px solid var(--border, #e5e7eb)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 20, borderBottom: '1px solid var(--border, #e5e7eb)',
      }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>🦒</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
            培訓知識整理系統
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
            Training Knowledge
          </div>
        </div>
      </div>

      <div style={{
        fontSize: 11, color: 'var(--text-muted, #6b7280)',
        fontWeight: 600, padding: '0 20px', marginBottom: 8, marginTop: 16,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        主要功能
      </div>

      {/* Nav — 用 effectiveRole 過濾 */}
      <nav style={{
        display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px',
      }}>
        {MENU.filter(m => !m.adminOnly || isAdmin).map(m => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            className="sidebar-link"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              color: isActive ? 'var(--primary)' : 'var(--text-primary, #1f2937)',
              background: isActive ? 'var(--primary-light)' : 'transparent',
              textDecoration: 'none',
            })}
          >
            <span style={{ fontSize: 18, flexShrink: 0, width: 20, textAlign: 'center' }}>
              {m.icon}
            </span>
            <span>{m.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User menu */}
      <div style={{
        marginTop: 'auto', padding: 12,
        borderTop: '1px solid var(--border, #e5e7eb)',
        position: 'relative',
      }}>
        {user && (
          <>
            <button
              ref={buttonRef}
              onClick={() => setMenuOpen(v => !v)}
              aria-expanded={menuOpen}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: 10,
                background: menuOpen ? 'var(--primary-light)' : 'var(--bg-subtle, #f8fafc)',
                border: `1px solid ${menuOpen ? 'var(--primary)' : 'transparent'}`,
                borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {(user.name?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: 10.5, color: 'var(--text-muted, #6b7280)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ROLE_ICON[effectiveRole]} {ROLE_LABEL[effectiveRole] || effectiveRole}
                  {viewAsRole && (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}> · 預覽中</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', flexShrink: 0 }}>
                {menuOpen ? '▾' : '▸'}
              </span>
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% - 8px)',
                  left: 12, right: 12,
                  background: '#fff',
                  border: '1px solid var(--border, #e5e7eb)',
                  borderRadius: 10,
                  boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,.14))',
                  padding: 6,
                  zIndex: 200,
                }}
              >
                <div style={{
                  padding: '10px 12px 8px', fontSize: 11,
                  color: 'var(--text-muted, #6b7280)',
                  wordBreak: 'break-all',
                }}>
                  {user.email}
                </div>
                <div style={{ height: 1, background: 'var(--border, #e5e7eb)', margin: '4px 0' }} />

                {isRealAdmin && (
                  <>
                    <div style={{
                      padding: '8px 12px 6px', fontSize: 10.5, fontWeight: 600,
                      color: 'var(--text-muted, #6b7280)',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      🎭 以其他視角查看
                    </div>
                    {VIEW_AS_OPTIONS.map(r => {
                      const isCurrent = effectiveRole === r
                      const isReal = r === realRole
                      return (
                        <button
                          key={r}
                          onClick={() => handleViewAs(r)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', border: 'none', borderRadius: 6,
                            background: isCurrent ? 'var(--primary-light)' : 'transparent',
                            color: isCurrent ? 'var(--primary-text)' : 'var(--text-primary, #1f2937)',
                            fontSize: 13, fontWeight: isCurrent ? 600 : 500,
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 15, width: 18 }}>{ROLE_ICON[r]}</span>
                          <span style={{ flex: 1 }}>{ROLE_LABEL[r]}</span>
                          {isReal && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>
                              （本人）
                            </span>
                          )}
                          {isCurrent && !isReal && (
                            <span style={{ fontSize: 12, color: 'var(--primary)' }}>✓</span>
                          )}
                        </button>
                      )
                    })}
                    <div style={{ height: 1, background: 'var(--border, #e5e7eb)', margin: '6px 0' }} />
                  </>
                )}

                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', border: 'none', borderRadius: 6,
                    background: 'transparent', color: 'var(--error, #dc2626)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 15, width: 18 }}>🚪</span>
                  <span>登出</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}