import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import {
  Mail, Lock, Eye, EyeOff, User, BookOpen, GraduationCap,
  Sparkles, Phone, MapPin, Calendar, Book
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import api from '../api/axios'

const INPUT_CLASS =
  'w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 rounded-xl pl-10'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, googleLogin, isAuthenticated, user } = useAuth()

  // ── Form state ───────────────────────────────────────────────
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('student')
  const [showPassword, setShowPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [stateName, setStateName] = useState('')
  const [intendedCourse, setIntendedCourse] = useState('')
  const [dob, setDob] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/courses')
      .then(res => setCourses(res.data.data || res.data || []))
      .catch(() => {})
  }, [])

  if (isAuthenticated && user) {
    const dest = user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    navigate(dest, { replace: true })
  }

  // ── Registration submit ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password || !confirmPassword || !phoneNumber) {
      toast.error('Please fill in all required fields')
      return
    }
    if (role === 'teacher' && (!stateName || !intendedCourse || !dob)) {
      toast.error('Please fill in all teacher fields')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const extraData = { phoneNumber, state: stateName, intendedCourse, dob }
      const userData = await register(name, email, password, role, extraData)
      const dest = userData.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'
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
    } catch {}
  }

  const roles = [
    { value: 'student', icon: BookOpen, title: 'I want to learn', desc: 'Enroll in courses and attend live classes' },
    { value: 'teacher', icon: GraduationCap, title: 'I want to teach', desc: 'Create courses and schedule live sessions' },
  ]

  // ════════════════════════════════════════════════════════════
  // REGISTRATION FORM
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-enter relative bg-slate-50">
      <div className="orb orb-primary w-[400px] h-[400px] -top-20 -right-20 animate-float-slow" />
      <div className="orb orb-accent w-[300px] h-[300px] -bottom-10 -left-16 animate-float" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <Sparkles size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
              Create your account
            </h1>
            <p className="text-sm text-slate-600 mt-1">Join SkillWing and start your journey</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((r) => (
              <button key={r.value} type="button" onClick={() => setRole(r.value)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                  role === r.value ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <r.icon size={20} className={role === r.value ? 'text-blue-600' : 'text-slate-500'} />
                <p className={`text-sm font-semibold mt-2 ${role === r.value ? 'text-blue-900' : 'text-slate-700'}`}>{r.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" className={INPUT_CLASS} autoComplete="name" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className={INPUT_CLASS} autoComplete="email" />
              </div>
            </div>

            {/* Phone Number (ALL roles) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210" className={INPUT_CLASS} autoComplete="tel" />
              </div>
            </div>

            {/* Teacher-specific fields */}
            {role === 'teacher' && (
              <div className="space-y-4 pt-2 pb-2 border-y border-slate-200 my-2">
                <p className="text-sm font-semibold text-slate-700">Teacher Information</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">State</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={stateName} onChange={e => setStateName(e.target.value)}
                        placeholder="E.g. Jharkhand" className={INPUT_CLASS} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Date of Birth</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                        className={INPUT_CLASS + ' pr-3'} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Intended Course</label>
                  <div className="relative">
                    <Book size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select value={intendedCourse} onChange={e => setIntendedCourse(e.target.value)}
                      className={INPUT_CLASS + ' appearance-none pr-3'}>
                      <option value="">Select a course...</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                  className={INPUT_CLASS + ' pr-10'} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className={INPUT_CLASS} autoComplete="new-password" />
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg"
              className="!bg-gradient-to-r !from-blue-600 !to-blue-700 !text-white">
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-500 uppercase">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              theme="outline" shape="pill" size="large" text="signup_with" />
          </div>

          <p className="text-center text-sm text-slate-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
