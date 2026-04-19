import { useAuth } from '../context/AuthContext.jsx'

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

export default function ViewAsBanner() {
  const { isViewingAs, viewAsRole, setViewAsRole, realRole } = useAuth()
  if (!isViewingAs) return null

  return (
    <div style={{
      padding: '10px 28px',
      background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
      color: '#fff',
      fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
      position: 'sticky', top: 0, zIndex: 60,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🎭</span>
        <span>
          目前以 <strong>{ROLE_ICON[viewAsRole]} {ROLE_LABEL[viewAsRole]}</strong> 視角查看，這是預覽模式（你的真實身份仍是 {ROLE_LABEL[realRole]}）
        </span>
      </div>
      <button
        onClick={() => setViewAsRole(null)}
        style={{
          padding: '5px 14px',
          background: 'rgba(255,255,255,.22)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,.35)',
          borderRadius: 6,
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ← 回到真實身份
      </button>
    </div>
  )
}