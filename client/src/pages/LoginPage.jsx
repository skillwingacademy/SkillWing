import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Mail, Lock, Eye, EyeOff, Sparkles, Phone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, googleLogin, isAuthenticated, user } = useAuth()
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  if (isAuthenticated && user) {
    const dest = user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    navigate(dest, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!emailOrPhone || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const userData = await login(emailOrPhone, password)
      const dest = userData.role === 'teacher' ? '/teacher/dashboard' : userData.role === 'admin' ? '/admin/dashboard' : '/dashboard'
      navigate(dest)
    } catch {
      // toast handled in context
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const userData = await googleLogin(credentialResponse.credential)
      const dest = userData.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'
      navigate(dest)
    } catch {
      // toast handled in context
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 page-enter relative bg-slate-50">
      {/* Background orbs */}
      <div className="orb orb-primary w-[400px] h-[400px] -top-20 -left-20 animate-float-slow" />
      <div className="orb orb-secondary w-[300px] h-[300px] -bottom-10 -right-16 animate-float" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <Sparkles size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
              Welcome back
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Sign in to your SkillWing account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email or Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Email or Phone Number
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Email or phone number"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 rounded-xl pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 rounded-xl pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="text-right -mt-2">
              <Link
                to="/forgot-password"
                className="text-sm !text-red-500 hover:text-red-600 transition-colors font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <Button type="submit" fullWidth loading={loading} size="lg">
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-500 uppercase">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              theme="outline"
              shape="pill"
              size="large"
              width="100%"
              text="continue_with"
            />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-slate-600 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
