import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',       icon: '🏠', label: '總覽' },
  { to: '/upload', icon: '⬆️', label: '上傳資料' },
  { to: '/search', icon: '🔍', label: '知識庫搜尋' },
]

export default function Sidebar() {
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

      <div className="sidebar-footer">長頸鹿培訓系統 v3.0</div>
    </div>
  )
}
