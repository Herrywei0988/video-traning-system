import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'giraffe_token'
const USER_KEY = 'giraffe_user'
const VIEW_AS_KEY = 'giraffe_view_as'

// User role → VideoDetail 內容版本 (exec/manager/teacher) 映射
export const ROLE_TO_CONTENT = {
  admin: 'exec',
  principal: 'manager',
  teacher: 'teacher',
  staff: 'teacher',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  // viewAsRole: admin 預覽用，存 sessionStorage（tab 關了就失效）
  const [viewAsRole, setViewAsRoleState] = useState(() => {
    try {
      return sessionStorage.getItem(VIEW_AS_KEY) || null
    } catch {
      return null
    }
  })

  const setViewAsRole = useCallback((role) => {
    setViewAsRoleState(role)
    try {
      if (role) sessionStorage.setItem(VIEW_AS_KEY, role)
      else sessionStorage.removeItem(VIEW_AS_KEY)
    } catch {}
  }, [])

  // On mount, verify token
  useEffect(() => {
    async function verify() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        } else {
          setToken(null)
          setUser(null)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      } catch {
        // Network error — keep cached user
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || '登入失敗')
    }
    const data = await res.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    // 新登入清掉預覽視角，避免跨帳號殘留
    setViewAsRole(null)
    return data.user
  }, [setViewAsRole])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setViewAsRole(null)
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }, [token, setViewAsRole])

  // ── Derived values ──
  const realRole = user?.role || null
  const isRealAdmin = realRole === 'admin'

  // effectiveRole: 所有 UI 過濾都該用這個（不是 user.role）
  const effectiveRole = viewAsRole || realRole
  const effectiveContentRole = ROLE_TO_CONTENT[effectiveRole] || 'teacher'
  const isViewingAs = !!viewAsRole && viewAsRole !== realRole

  const isAdmin = effectiveRole === 'admin'
  const isPrincipal = effectiveRole === 'principal'

  return (
    <AuthContext.Provider
      value={{
        user, token, login, logout, loading,
        // 原有
        isAdmin, isPrincipal,
        // 新增
        realRole, isRealAdmin,
        effectiveRole, effectiveContentRole,
        viewAsRole, setViewAsRole, isViewingAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}