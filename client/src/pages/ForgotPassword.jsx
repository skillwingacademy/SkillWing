import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../api/axios'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.')
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

          {!submitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                  <Sparkles size={22} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                  Forgot your password?
                </h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  No worries. Enter your email and we'll send you a secure reset link valid for 15 minutes.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 rounded-xl pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button type="submit" fullWidth loading={loading} size="lg">
                  Send Reset Link
                </Button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm !text-blue-500 !hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                If an account with <span className="font-medium text-slate-700">{email}</span> exists,
                a password reset link has been sent. It will expire in 15 minutes.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Try a different email
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
