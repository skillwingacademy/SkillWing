import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import api from '../api/axios'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both fields')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.put(`/auth/reset-password/${token}`, { newPassword })
      setSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative bg-slate-50">
      {/* Background orbs */}
      <div className="orb orb-primary w-[400px] h-[400px] -top-20 -left-20 animate-float-slow" />
      <div className="orb orb-secondary w-[300px] h-[300px] -bottom-10 -right-16 animate-float" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 animate-scale-in">

          {!success ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                {/* <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"> */}
                  {/* <Sparkles size={22} className="text-white" />
                </div> */}
                <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                  Reset your password
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Choose a strong new password for your account.
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
                  <XCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2 rounded-xl pl-10 pr-10"
                      autoComplete="new-password"
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className={`w-full bg-slate-50 border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all py-2 rounded-xl pl-10 pr-10 ${
                        passwordsDontMatch
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : passwordsMatch
                          ? 'border-emerald-300 focus:ring-emerald-400 focus:border-emerald-400'
                          : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Live match indicator */}
                  {passwordsDontMatch && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <XCircle size={12} /> Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={12} /> Passwords match
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth loading={loading} size="lg" disabled={passwordsDontMatch}>
                  Reset Password
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Remember it now?{' '}
                <Link to="/login" className="!text-blue-600 !hover:text-blue-700 font-medium transition-colors">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset!</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                Go to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
