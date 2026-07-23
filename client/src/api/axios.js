import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://skill-wing.onrender.com/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('skillsphere_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('skillsphere_token')
      localStorage.removeItem('skillsphere_user')
      // Only redirect if not already on login/register
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
