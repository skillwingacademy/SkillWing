import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import SessionTimeline from '../components/sessions/SessionTimeline'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import { ArrowLeft, BookOpen } from 'lucide-react'

export default function StudentCoursePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, sessionsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/sessions/course/${id}`),
        ])
        setCourse(courseRes.data.data || courseRes.data)
        setSessions(sessionsRes.data.data || sessionsRes.data || [])
      } catch {
        setError('Failed to load course data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <LoadingSpinner text="Loading course..." />
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center page-enter">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Course header */}
      <div className="glass-card p-6 mb-8 animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/20 flex items-center justify-center shrink-0 border border-white/5">
            {course?.thumbnailImage ? (
              <img src={course.thumbnailImage} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <BookOpen size={24} className="text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-white">
              {course?.title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {course?.instructors && course.instructors.length > 0
                ? course.instructors.map((i) => (typeof i === 'object' ? i.name : i)).join(', ')
                : typeof course?.educator === 'object'
                  ? course.educator.name
                  : course?.educator || 'Instructor'}
            </p>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h2 className="text-lg font-semibold font-[family-name:var(--font-family-heading)] text-white mb-6">
          Class Schedule
        </h2>
        <SessionTimeline sessions={sessions} />
      </div>
    </div>
  )
}
