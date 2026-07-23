import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  User, Mail, Phone, MapPin, Calendar, Globe, Camera,
  GraduationCap, BookOpen, Briefcase, FileText, ArrowLeft, Save
} from 'lucide-react'

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Other', 'Prefer not to say']
const TIMEZONE_OPTIONS = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export default function ProfileEditPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    createdAt: '',
    profile: {
      phoneNumber: '',
      gender: '',
      dob: '',
      bio: '',
      timezone: 'Asia/Kolkata',
      address: { street: '', city: '', state: '', zipCode: '' },
      qualifications: '',
      yearsOfExperience: 0,
      schoolOrCollege: '',
    },
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile')
        const data = res.data.data || res.data
        const p = data.profile || {}
        const addr = p.address || {}

        setForm({
          name: data.name || '',
          email: data.email || '',
          createdAt: data.createdAt || '',
          profile: {
            phoneNumber: p.phoneNumber || '',
            gender: p.gender || '',
            dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
            bio: p.bio || '',
            timezone: p.timezone || 'Asia/Kolkata',
            address: {
              street: addr.street || '',
              city: addr.city || '',
              state: addr.state || '',
              zipCode: addr.zipCode || '',
            },
            qualifications: p.qualifications || '',
            yearsOfExperience: p.yearsOfExperience || 0,
            schoolOrCollege: p.schoolOrCollege || '',
          },
        })

        setAvatarPreview(p.avatarUrl || data.avatar || '')
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }))
  }

  const handleAddressChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        address: { ...prev.profile.address, [field]: value },
      },
    }))
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await api.post('/users/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data.data?.avatarUrl || res.data.avatarUrl
      setAvatarPreview(url)
      toast.success('Avatar uploaded!')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return
    setUploading(true)
    try {
      await api.delete('/users/profile/avatar')
      setAvatarPreview('')
      await refreshUser()
      toast.success('Avatar removed!')
    } catch {
      toast.error('Failed to remove avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/users/profile', {
        name: form.name,
        profile: form.profile,
      })
      await refreshUser()
      toast.success('Profile updated successfully!')
      navigate('/profile')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading profile..." />

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 px-4 rounded-xl text-sm'
  const disabledInputClass =
    'w-full bg-slate-100 border border-slate-200 text-slate-500 py-2.5 px-4 rounded-xl text-sm cursor-not-allowed'
  const labelClass = 'text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block'

  const formattedDate = form.createdAt
    ? new Date(form.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="page-enter bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Back button */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-8">
          Edit Profile
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Avatar Upload ──────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera size={16} className="text-blue-600" />
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  form.name?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3" >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={uploading}
                    className="!text-black !border-black"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAvatarRemove}
                      disabled={uploading}
                      className="!text-red-600 !hover:text-red-700 !hover:bg-red-50 !border-red-200"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, or WebP. Max 5 MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* ── Read-Only Fields ────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Mail size={16} className="text-slate-400" />
              Account Details (Read-only)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} disabled className={disabledInputClass} />
              </div>
              <div>
                <label className={labelClass}>Date Joined</label>
                <input type="text" value={formattedDate} disabled className={disabledInputClass} />
              </div>
            </div>
          </div>

          {/* ── Basic Info ─────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={form.profile.phoneNumber}
                  onChange={(e) => handleProfileChange('phoneNumber', e.target.value)}
                  className={inputClass}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={form.profile.dob}
                  onChange={(e) => handleProfileChange('dob', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={form.profile.gender}
                  onChange={(e) => handleProfileChange('gender', e.target.value)}
                  className={inputClass}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g || '— Select —'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <select
                  value={form.profile.timezone}
                  onChange={(e) => handleProfileChange('timezone', e.target.value)}
                  className={inputClass}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Bio</label>
              <textarea
                value={form.profile.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                maxLength={500}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Tell us a bit about yourself..."
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{form.profile.bio.length}/500</p>
            </div>
          </div>

          {/* ── Address ────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Street</label>
                <input
                  type="text"
                  value={form.profile.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className={inputClass}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={form.profile.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className={inputClass}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={form.profile.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className={inputClass}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input
                    type="text"
                    value={form.profile.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    className={inputClass}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Teacher-Specific ───────────────────── */}
          {user?.role === 'teacher' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-600" />
                Teaching Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Qualifications</label>
                  <input
                    type="text"
                    value={form.profile.qualifications}
                    onChange={(e) => handleProfileChange('qualifications', e.target.value)}
                    className={inputClass}
                    placeholder="e.g., M.Sc. Computer Science"
                  />
                </div>
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={form.profile.yearsOfExperience}
                    onChange={(e) => handleProfileChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Student-Specific ───────────────────── */}
          {user?.role === 'student' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-emerald-600" />
                Academic Details
              </h2>
              <div>
                <label className={labelClass}>School / College</label>
                <input
                  type="text"
                  value={form.profile.schoolOrCollege}
                  onChange={(e) => handleProfileChange('schoolOrCollege', e.target.value)}
                  className={inputClass}
                  placeholder="e.g., IIT Delhi"
                />
              </div>
            </div>
          )}

          {/* ── Action Buttons ─────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/profile')}
              className="flex-1 sm:flex-none !text-black !border-black"            
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
