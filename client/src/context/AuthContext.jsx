import { createContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('skillsphere_token'))
  const [loading, setLoading] = useState(true)

  // On mount — verify token by calling /auth/me
  useEffect(() => {
    const verifyAuth = async () => {
      const savedToken = localStorage.getItem('skillsphere_token')
      if (!savedToken) {
        setLoading(false)
        return
      }
      try {
        const res = await api.get('/auth/me')
        const payload = res.data.data || res.data
        setUser(payload)
        setToken(savedToken)
      } catch {
        localStorage.removeItem('skillsphere_token')
        localStorage.removeItem('skillsphere_user')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    verifyAuth()
  }, [])

  const login = useCallback(async (emailOrPhone, password) => {
    try {
      const res = await api.post('/auth/login', { emailOrPhone, password })
      const payload = res.data.data || res.data
      const { token: newToken, user: userData } = payload
      localStorage.setItem('skillsphere_token', newToken)
      localStorage.setItem('skillsphere_user', JSON.stringify(userData))
      setToken(newToken)
      setUser(userData)
      toast.success(`Welcome back, ${userData.name}!`)
      return userData
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      toast.error(msg)
      throw err
    }
  }, [])

  const register = useCallback(async (name, email, password, role = 'student', extraData = {}) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, role, ...extraData })
      const payload = res.data.data || res.data
      const { token: newToken, user: userData } = payload
      localStorage.setItem('skillsphere_token', newToken)
      localStorage.setItem('skillsphere_user', JSON.stringify(userData))
      setToken(newToken)
      setUser(userData)
      toast.success('Account created successfully!')
      return userData
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      toast.error(msg)
      throw err
    }
  }, [])

  const googleLogin = useCallback(async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential })
      const payload = res.data.data || res.data
      const { token: newToken, user: userData } = payload
      localStorage.setItem('skillsphere_token', newToken)
      localStorage.setItem('skillsphere_user', JSON.stringify(userData))
      setToken(newToken)
      setUser(userData)
      toast.success(`Welcome, ${userData.name}!`)
      return userData
    } catch (err) {
      const msg = err.response?.data?.message || 'Google sign-in failed'
      toast.error(msg)
      throw err
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      const payload = res.data.data || res.data
      setUser(payload)
      localStorage.setItem('skillsphere_user', JSON.stringify(payload))
    } catch {
      // silently fail — user stays as-is
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('skillsphere_token')
    localStorage.removeItem('skillsphere_user')
    setToken(null)
    setUser(null)
    toast.success('Logged out successfully')
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    googleLogin,
    logout,
    refreshUser,
    isAuthenticated: !!token && !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
