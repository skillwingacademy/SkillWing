import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import {
  User, Mail, Phone, MapPin, Calendar, Globe, Clock,
  GraduationCap, BookOpen, Briefcase, Award, PenLine, FileText, ArrowLeft
} from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Determine if viewing own profile
  const isOwnProfile = !id || id === user?._id || id === user?.id

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const endpoint = isOwnProfile ? '/users/profile' : `/users/profile/${id}`
        const res = await api.get(endpoint)
        setProfile(res.data.data || res.data)
      } catch {
        // fall back to auth user if own profile
        if (isOwnProfile) setProfile(user)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [id, user, isOwnProfile])

  if (loading) return <LoadingSpinner text="Loading profile..." />
  if (!profile) return null

  const p = profile.profile || {}
  const addr = p.address || {}
  const fullAddress = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const formattedDob = p.dob
    ? new Date(p.dob).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const avatarUrl = p.avatarUrl || profile.avatar || ''

  // Show email & phone only if it's the user's own profile or the viewer is admin
  const canSeePrivate = isOwnProfile || user?.role === 'admin'

  const infoItems = []

  if (canSeePrivate && profile.email) {
    infoItems.push({ icon: Mail, label: 'Email', value: profile.email })
  }
  if (canSeePrivate) {
    infoItems.push({ icon: Phone, label: 'Phone', value: p.phoneNumber || '—' })
  }

  infoItems.push(
    { icon: Calendar, label: 'Date of Birth', value: formattedDob },
    { icon: User, label: 'Gender', value: p.gender || '—' },
    { icon: MapPin, label: 'Address', value: fullAddress || '—' },
    { icon: Globe, label: 'Timezone', value: p.timezone || 'Asia/Kolkata' },
  )

  const handleBackToStudents = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/admin?tab=students')
    }
  }

  return (
    <div className="page-enter bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Top Back Navigation Button ───────────── */}
        {(user?.role === 'admin' || !isOwnProfile) && (
          <div className="mb-6 flex items-center justify-start">
            <button
              onClick={handleBackToStudents}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm group cursor-pointer"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-slate-500 group-hover:text-blue-600" />
              <span>Back to Students</span>
            </button>
          </div>
        )}

        {/* ── Header Card ──────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 overflow-hidden shadow-lg shadow-blue-500/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                {profile.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                  profile.role === 'teacher'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : profile.role === 'admin'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {profile.role === 'teacher' ? <GraduationCap size={12} /> : <BookOpen size={12} />}
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock size={14} /> Member since {memberSince}
                </span>
              </div>
              {p.bio && (
                <p className="text-slate-600 mt-3 max-w-lg leading-relaxed">{p.bio}</p>
              )}
            </div>

            {/* Edit button — only visible on own profile */}
            {isOwnProfile && (
              <Link to="/profile/edit" className="shrink-0">
                <Button variant="secondary" size="sm" className="!text-black !border-black">
                  <PenLine size={16} />
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Info Grid ────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-5 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {infoItems.map((item) => (
              <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon size={14} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                </div>
                <p className="text-sm text-slate-900 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Role-Specific Section ────────────────── */}
        {profile.role === 'teacher' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-5 flex items-center gap-2">
              <Award size={18} className="text-blue-600" />
              Teaching Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Qualifications</p>
                <p className="text-sm text-slate-900 font-medium">{p.qualifications || '—'}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Years of Experience</p>
                <p className="text-sm text-slate-900 font-medium">{p.yearsOfExperience || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {profile.role === 'student' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-5 flex items-center gap-2">
              <Briefcase size={18} className="text-emerald-600" />
              Academic Details
            </h2>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">School / College</p>
              <p className="text-sm text-slate-900 font-medium">{p.schoolOrCollege || '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
