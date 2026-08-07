import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Plus,
  Save,
  Type,
} from 'lucide-react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function TeacherCoursePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Meet link editing state per session
  const [meetLinks, setMeetLinks] = useState({})
  const [savingLink, setSavingLink] = useState({})

  // New session form
  const [sessionForm, setSessionForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, sessionsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/sessions/course/${id}`),
        ])
        setCourse(courseRes.data.data || courseRes.data)
        const sessionsData = sessionsRes.data.data || sessionsRes.data || []
        setSessions(sessionsData)

        // Initialize meet links
        const links = {}
        sessionsData.forEach((s) => {
          links[s._id] = s.meetLink || ''
        })
        setMeetLinks(links)
      } catch {
        setError('Failed to load course data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleSaveMeetLink = async (sessionId) => {
    setSavingLink((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await api.patch(`/sessions/${sessionId}/meet-link`, {
        meetLink: meetLinks[sessionId],
      })
      toast.success('Meet link saved!')
      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, meetLink: meetLinks[sessionId] } : s
        )
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save link')
    } finally {
      setSavingLink((prev) => ({ ...prev, [sessionId]: false }))
    }
  }

  const handleToggleVisibility = async (sessionId, currentVisible) => {
    try {
      await api.patch(`/sessions/${sessionId}/meet-link`, {
        isLinkVisible: !currentVisible,
      })
      setSessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, isLinkVisible: !currentVisible } : s
        )
      )
      toast.success(currentVisible ? 'Link hidden from students' : 'Link visible to students')
    } catch (err) {
      toast.error('Failed to toggle visibility')
    }
  }

  const handleCreateSession = async (e) => {
    e.preventDefault()
    if (!sessionForm.title || !sessionForm.startTime || !sessionForm.endTime) {
      toast.error('All fields are required')
      return
    }
    setCreating(true)
    try {
      const res = await api.post('/sessions', {
        courseId: id,
        title: sessionForm.title,
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
      })
      const newSession = res.data.data || res.data
      setSessions((prev) => [...prev, newSession])
      setMeetLinks((prev) => ({ ...prev, [newSession._id]: '' }))
      setShowModal(false)
      setSessionForm({ title: '', startTime: '', endTime: '' })
      toast.success('Session created!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading course..." />
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center page-enter">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/teacher/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  )

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/teacher/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Course header */}
      <div className="glass-card p-6 mb-8 animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5">
            {course?.thumbnailImage ? (
              <img src={course.thumbnailImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-blue-500/20 flex items-center justify-center">
                <BookOpen size={24} className="text-blue-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-white">
              {course?.title}
            </h1>
            {course?.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{course.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sessions header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold font-[family-name:var(--font-family-heading)] text-white flex items-center gap-2">
          <CalendarDays size={20} className="text-emerald-400" />
          Sessions ({sessions.length})
        </h2>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add Session
        </Button>
      </div>

      {/* Sessions list */}
      {sortedSessions.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <CalendarDays size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No sessions yet.</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Create your first session to get started.
          </p>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Add Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSessions.map((session, i) => (
            <div
              key={session._id}
              className="glass-card p-5 animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
            >
              {/* Session info */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white font-[family-name:var(--font-family-heading)]">
                    {session.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-blue-400" />
                      {formatDate(session.startTime)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-400" />
                      {formatTime(session.startTime)} – {formatTime(session.endTime)}
                    </span>
                  </div>
                </div>

                {/* Visibility toggle */}
                <button
                  onClick={() => handleToggleVisibility(session._id, session.isLinkVisible !== false)}
                  className={`p-2 rounded-lg transition-colors ${
                    session.isLinkVisible !== false
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-slate-500 hover:bg-white/5'
                  }`}
                  title={session.isLinkVisible !== false ? 'Link visible to students' : 'Link hidden from students'}
                >
                  {session.isLinkVisible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* Meet link input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={meetLinks[session._id] || ''}
                    onChange={(e) =>
                      setMeetLinks((prev) => ({
                        ...prev,
                        [session._id]: e.target.value,
                      }))
                    }
                    placeholder="Paste Zoom link"
                    className="input-dark pl-9 py-2 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={savingLink[session._id]}
                  onClick={() => handleSaveMeetLink(session._id)}
                >
                  <Save size={14} />
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Session Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Session">
        <form onSubmit={handleCreateSession} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Session Title *
            </label>
            <div className="relative">
              <Type size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="e.g., Week 1 — Introduction"
                className="input-dark pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                className="input-dark text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={sessionForm.endTime}
                onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                className="input-dark text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={creating} className="flex-1">
              Create Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
