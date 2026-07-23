import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import {
  GraduationCap, Calendar, CalendarDays, BookOpen, Clock, ShieldAlert,
  Users, Plus, Edit2, CheckCircle2, ExternalLink, Video,
  LayoutDashboard, History, ArrowLeft, User, XCircle, Menu, X,
  FileText, PlayCircle, DollarSign, Loader2
} from 'lucide-react'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeClassroomId = searchParams.get('classroomId')
  const setActiveClassroomId = (id) => {
    if (id) {
      setSearchParams({ classroomId: id })
    } else {
      setSearchParams({})
    }
  }
  const [classrooms, setClassrooms] = useState([])
  const [allSessions, setAllSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Earnings
  const [earningsData, setEarningsData] = useState(null)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [earningsMonth, setEarningsMonth] = useState(new Date().getMonth() + 1)
  const [earningsYear, setEarningsYear] = useState(new Date().getFullYear())

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', date: '', startTime: '', endTime: '', meetLink: '', homework: '', teacherNotes: '' })
  const [editLoading, setEditLoading] = useState(false)

  // Cancel modal
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelSessionItem, setCancelSessionItem] = useState(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const [completingId, setCompletingId] = useState(null)
  const [generatingZoomId, setGeneratingZoomId] = useState(null)

  const generateZoomLink = async (sessionId) => {
    setGeneratingZoomId(sessionId)
    try {
      const res = await api.post(`/classrooms/sessions/${sessionId}/generate-zoom-link`)
      toast.success(res.data.message || 'Zoom link generated!')
      // Refresh data to pick up the new link
      setLoading(true); fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate Zoom link')
    } finally {
      setGeneratingZoomId(null)
    }
  }

  const isPending = user?.approvalStatus !== 'approved'

  const fetchData = async () => {
    try {
      const crRes = await api.get('/classrooms/teacher')
      const rooms = crRes.data.data || []
      setClassrooms(rooms)

      const detailResults = await Promise.allSettled(
        rooms.filter((r) => r.status === 'active').map((r) => api.get(`/classrooms/${r._id}`))
      )

      const sessions = []
      detailResults.forEach((res) => {
        if (res.status === 'fulfilled') {
          const data = res.value.data.data
          const roomSessions = data.sessions || []
          roomSessions.forEach((s) => { s._classroom = data.classroom; sessions.push(s) })
        }
      })
      setAllSessions(sessions)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPending) { setLoading(false); return }
    fetchData()
  }, [isPending])

  const fetchEarnings = async () => {
    setEarningsLoading(true)
    try {
      const res = await api.get(`/teacher/payouts?month=${earningsMonth}&year=${earningsYear}`)
      setEarningsData(res.data.data)
    } catch (err) {
      console.error('Error fetching earnings:', err)
      toast.error('Failed to load earnings data')
    } finally {
      setEarningsLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'earnings' && !isPending) {
      fetchEarnings()
    }
  }, [tab, earningsMonth, earningsYear])

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // Filter sessions
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todaySessions = allSessions.filter((s) => {
    const d = new Date(s.scheduledDate)
    return d >= todayStart && d <= todayEnd && s.status === 'scheduled'
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  const upcomingSessions = allSessions.filter((s) =>
    new Date(s.startTime) > new Date() && s.status === 'scheduled'
  ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 10)

  const completedSessions = allSessions.filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)).slice(0, 15)

  // Stats
  const activeRooms = classrooms.filter((c) => c.status === 'active')
  const completedRooms = classrooms.filter((c) => c.status === 'completed')
  const totalStudents = new Set(classrooms.flatMap((c) => (c.enrolledStudents || []).map(s => s?._id || s))).size


  // ── Edit handlers ──
  const openEditModal = (session) => {
    setEditSession(session)
    const dateStr = new Date(session.scheduledDate).toISOString().split('T')[0]
    setEditForm({
      title: session.title || '', date: dateStr,
      startTime: new Date(session.startTime).toTimeString().slice(0, 5),
      endTime: new Date(session.endTime).toTimeString().slice(0, 5),
      meetLink: session.googleMeetLink || '', homework: session.homework || '', teacherNotes: session.teacherNotes || '',
    })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      await api.put(`/classrooms/sessions/${editSession._id}`, {
        googleMeetLink: editForm.meetLink, 
        homework: editForm.homework, 
        teacherNotes: editForm.teacherNotes,
      })
      toast.success('Session updated!')
      setEditModal(false)
      window.dispatchEvent(new Event('refreshClassroomDetails'))
      setLoading(true); fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally { setEditLoading(false) }
  }

  const handleComplete = async (sessionId) => {
    setCompletingId(sessionId)
    try {
      await api.patch(`/classrooms/sessions/${sessionId}/complete`, { teacherAttendance: 'present' })
      toast.success('Session marked complete!')
      window.dispatchEvent(new Event('refreshClassroomDetails'))
      setLoading(true); fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete')
    } finally { setCompletingId(null) }
  }

  // ── Cancel handlers ──
  const openCancelModal = (session) => {
    setCancelSessionItem(session)
    setCancellationReason('')
    setCancelModal(true)
  }

  const handleCancel = async (e) => {
    e.preventDefault()
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason'); return
    }
    setCancelLoading(true)
    try {
      await api.patch(`/classrooms/sessions/${cancelSessionItem._id}/cancel`, { cancellationReason: cancellationReason.trim() })
      toast.success('Session cancelled!')
      setCancelModal(false)
      window.dispatchEvent(new Event('refreshClassroomDetails'))
      setLoading(true)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel session')
    } finally { setCancelLoading(false) }
  }

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />

  const firstName = user?.name?.split(' ')[0] || 'Teacher'

  // ── Pending Approval ──
  if (isPending) {
    return (
      <div className="page-enter min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-amber-200 rounded-2xl p-10 max-w-lg text-center shadow-sm">
          <ShieldAlert size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-2">Approval Pending</h2>
          <p className="text-slate-500">Your teacher account is under review. You'll be notified once an admin approves your application.</p>
          <div className="mt-6 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium inline-block">
            Status: {user?.approvalStatus || 'pending'}
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'today', label: 'Today', icon: CalendarDays, badge: todaySessions.length },
    { id: 'classrooms', label: 'Classrooms', icon: BookOpen, badge: activeRooms.length },
    { id: 'students', label: 'Students', icon: Users, badge: totalStudents },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, badge: upcomingSessions.length },
    { id: 'history', label: 'History', icon: History, badge: completedSessions.length },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ]

  return (
    <div className="page-enter bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Welcome ─────────────────────────── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow active:scale-95"
            >
              <Menu size={18} className="text-white" />
            </button>
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap size={18} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
              Welcome, <span className="text-blue-600">{firstName}</span>
            </h1>
          </div>
          <p className="text-slate-500 ml-[52px]">Manage your classrooms, sessions, and students.</p>
        </div>

        {/* Sidebar + Content Layout */}
        <div className="flex flex-col md:flex-row gap-6 relative">
          
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" 
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Vertical Sidebar Tabs */}
          <nav className={`fixed md:relative top-0 left-0 h-full md:h-auto w-64 md:w-56 bg-white md:bg-transparent shadow-2xl md:shadow-none z-50 p-4 md:p-0 transition-transform duration-300 self-start ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } shrink-0`}>
            <div className="bg-white border-0 md:border border-slate-200 md:rounded-2xl md:p-2 shadow-none md:shadow-sm md:sticky md:top-24 h-full md:h-auto overflow-y-auto md:overflow-visible">
              <div className="flex md:hidden items-center justify-between mb-6 px-2">
                 <span className="font-bold text-slate-900 text-lg">Menu</span>
                 <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-slate-500 hover:text-slate-800 transition-colors">
                   <X size={20} />
                 </button>
              </div>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveClassroomId(null); setTab(t.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 last:mb-0 ${
                    !activeClassroomId && tab === t.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <t.icon size={18} className="shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {t.badge > 0 && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      !activeClassroomId && tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {activeClassroomId ? (
              <TeacherClassroomDeepDive id={activeClassroomId} onBack={() => setActiveClassroomId(null)} openEditModal={openEditModal} openCancelModal={openCancelModal} handleComplete={handleComplete} completingId={completingId} generateZoomLink={generateZoomLink} generatingZoomId={generatingZoomId} />
            ) : (
              <>
                {/* ── OVERVIEW TAB ───────────────── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
                  {[
                    { label: 'Active Students', value: totalStudents, icon: Users, color: 'text-blue-600' },
                    { label: 'Active Classrooms', value: activeRooms.length, icon: BookOpen, color: 'text-blue-600' },
                    { label: 'Completed', value: completedRooms.length, icon: CheckCircle2, color: 'text-emerald-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <s.icon size={20} className={s.color} />
                        <span className="text-2xl font-bold text-slate-900">{s.value}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Today's Sessions preview */}
                {todaySessions.length > 0 && (
                  <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
                    <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-4 flex items-center gap-2">
                      <CalendarDays size={18} className="text-amber-600" />
                      Today's Sessions
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{todaySessions.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {todaySessions.slice(0, 4).map((s) => (
                        <SessionActionCard key={s._id} s={s} fmtTime={fmtTime} openEditModal={openEditModal} openCancelModal={openCancelModal} handleComplete={handleComplete} completingId={completingId} generateZoomLink={generateZoomLink} generatingZoomId={generatingZoomId} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Classrooms preview */}
                {activeRooms.length > 0 && (
                  <div className="animate-slide-up" style={{ animationDelay: '160ms' }}>
                    <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-4 flex items-center gap-2">
                      <BookOpen size={18} className="text-blue-600" />
                      Active Classrooms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {activeRooms.slice(0, 3).map((cr) => (
                        <ClassroomTeacherCard key={cr._id} cr={cr} onClick={() => setActiveClassroomId(cr._id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TODAY'S SESSIONS TAB ────────── */}
            {tab === 'today' && (
              <>
                {todaySessions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <CalendarDays size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No sessions scheduled for today.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {todaySessions.map((s) => (
                      <SessionActionCard key={s._id} s={s} fmtTime={fmtTime} openEditModal={openEditModal} openCancelModal={openCancelModal} handleComplete={handleComplete} completingId={completingId} generateZoomLink={generateZoomLink} generatingZoomId={generatingZoomId} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── CLASSROOMS TAB ──────────────── */}
            {tab === 'classrooms' && (
              <>
                {activeRooms.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Users size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No active classrooms yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {activeRooms.map((cr) => (
                      <ClassroomTeacherCard key={cr._id} cr={cr} onClick={() => setActiveClassroomId(cr._id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── MY STUDENTS TAB ──────────────── */}
            {tab === 'students' && (() => {
              // Flatten all enrolled students across active classrooms
              const allStudents = [];
              const seen = new Set();
              activeRooms.forEach((cr) => {
                (cr.enrolledStudents || []).forEach((st) => {
                  const id = st?._id || st;
                  if (!seen.has(id?.toString())) {
                    seen.add(id?.toString());
                    allStudents.push({ student: st, classroom: cr });
                  }
                });
              });
              return (
                <>
                  {allStudents.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                      <Users size={40} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No active students yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                      {allStudents.map(({ student: st, classroom: cr }) => (
                        <div key={st?._id || st} onClick={() => window.open(`/profile/${st?._id || st}`, '_blank')} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4">
                          <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                            {st?.profile?.avatarUrl ? (
                              <img src={st.profile.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                              st?.name?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{st?.name}</h3>
                            <p className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center w-max mt-1 mb-2 truncate max-w-full">
                              <BookOpen size={10} className="mr-1 shrink-0" /> <span className="truncate">{cr.course?.title}</span>
                            </p>
                            {st?.profile?.schoolOrCollege && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 truncate mb-1.5">
                                <GraduationCap size={12} className="shrink-0" /> <span className="truncate">{st.profile.schoolOrCollege}</span>
                              </p>
                            )}
                            {st?.profile?.bio && (
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{st.profile.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── UPCOMING TAB ───────────────── */}
            {tab === 'upcoming' && (
              <>
                {upcomingSessions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Clock size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No upcoming sessions.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {upcomingSessions.map((s) => (
                        <div key={s._id} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                              #{s.sessionNumber}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{s.title}</p>
                              <p className="text-sm text-slate-500">{(s._classroom?.enrolledStudents || []).map(st => st?.name).filter(Boolean).join(', ') || 'No students'} • {s._classroom?.course?.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                            <div className="text-left md:text-right">
                              <p className="text-sm font-medium text-slate-900">{fmtDate(s.scheduledDate)}</p>
                              <p className="text-xs text-slate-500">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</p>
                            </div>
                            <button onClick={() => openCancelModal(s)} className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── HISTORY TAB ────────────────── */}
            {tab === 'history' && (
              <>
                {completedSessions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <History size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No completed sessions yet.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {completedSessions.map((s) => (
                        <div key={s._id} className="px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">Session #{s.sessionNumber}: {s.title}</p>
                            <p className="text-sm text-slate-500">{(s._classroom?.enrolledStudents || []).map(st => st?.name).filter(Boolean).join(', ') || 'No students'} • {s._classroom?.course?.title} • {fmtDate(s.scheduledDate)}</p>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Completed</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── EARNINGS TAB ────────────────── */}
            {tab === 'earnings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)]">My Earnings</h2>
                  <Link
                    to="/teacher/payouts"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-[1.02]"
                  >
                    <DollarSign size={16} />
                    Open Payout Dashboard
                  </Link>
                </div>

                {/* Month/Year Selector */}
                <div className="flex gap-3 items-center">
                  <select
                    value={earningsMonth}
                    onChange={(e) => setEarningsMonth(parseInt(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={earningsYear}
                    onChange={(e) => setEarningsYear(parseInt(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - 2 + i
                      return <option key={y} value={y}>{y}</option>
                    })}
                  </select>
                </div>

                {earningsLoading ? (
                  <div className="flex justify-center py-12"><LoadingSpinner /></div>
                ) : earningsData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
                        <p className="text-sm text-slate-500 mb-1">Completed Classes</p>
                        <p className="text-3xl font-bold text-slate-900">{earningsData.completedSessions || 0}</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
                        <p className="text-sm text-slate-500 mb-1">Gross Earnings</p>
                        <p className="text-3xl font-bold text-emerald-600">₹{(earningsData.grossEarnings || earningsData.totalPayout || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
                        <p className="text-sm text-slate-500 mb-1">Deductions</p>
                        <p className="text-3xl font-bold text-red-500">₹{(earningsData.totalPenalty || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-center text-white">
                        <p className="text-sm text-blue-100 mb-1">Net Payout</p>
                        <p className="text-3xl font-bold">₹{(earningsData.netPayout || earningsData.totalPayout || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    {earningsData.deductions && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Deduction Breakdown</h3>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 bg-red-50 rounded-xl">
                            <p className="text-xs text-slate-500">No Show</p>
                            <p className="text-lg font-bold text-red-600">{earningsData.deductions.noShow?.count || 0}</p>
                            <p className="text-xs text-red-500">-₹{(earningsData.deductions.noShow?.amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-xl">
                            <p className="text-xs text-slate-500">Late Entry</p>
                            <p className="text-lg font-bold text-amber-600">{earningsData.deductions.late?.count || 0}</p>
                            <p className="text-xs text-amber-500">-₹{(earningsData.deductions.late?.amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-xl">
                            <p className="text-xs text-slate-500">LMC</p>
                            <p className="text-lg font-bold text-orange-600">{earningsData.deductions.lmc?.count || 0}</p>
                            <p className="text-xs text-orange-500">-₹{(earningsData.deductions.lmc?.amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">No earnings data available for this period.</p>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </main>
        </div>
      </div>


      {/* ── Add Meeting Link Modal ────────────────── */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Upload Meeting Link">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="bg-white/10 p-4 rounded-xl mb-4">
            <p className="text-white text-sm font-medium">Session: {editSession?.title}</p>
            <p className="text-white/70 text-xs mt-1">Date: {editSession?.scheduledDate && new Date(editSession.scheduledDate).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Google Meet Link</label>
            <input type="url" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white/80" placeholder="https://meet.google.com/..." value={editForm.meetLink} onChange={(e) => setEditForm({ ...editForm, meetLink: e.target.value })} />
          </div>
          <Button type="submit" fullWidth loading={editLoading}>Save Changes</Button>
        </form>
      </Modal>

      {/* ── Cancel Session Modal ──────────────── */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Session">
        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <p className="text-sm text-white mb-4">
              Are you sure you want to cancel this session? Please provide a reason for the student.
            </p>
            <label className="block text-sm font-medium text-white mb-1">Reason for Cancellation *</label>
            <textarea required rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white resize-none" placeholder="e.g. Unavoidable personal emergency..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="secondary"  className="text-white" fullWidth onClick={() => setCancelModal(false)}>Keep Session</Button>
            <Button type="submit" fullWidth loading={cancelLoading} className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20">Cancel Session</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ── Session Action Card (reusable) ── */
function SessionActionCard({ s, fmtTime, openEditModal, openCancelModal, handleComplete, completingId, generateZoomLink, generatingZoomId }) {
  const students = s._classroom?.enrolledStudents || [];
  const firstStudent = students[0];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {students.slice(0, 3).map((st) => (
              <div key={st?._id || st} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-white">
                {st?.profile?.avatarUrl ? (
                  <img src={st.profile.avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  st?.name?.charAt(0).toUpperCase() || '?'
                )}
              </div>
            ))}
            {students.length === 0 && (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold">?</div>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{students.length === 1 ? firstStudent?.name : `${students.length} students`}</p>
            <p className="text-sm text-slate-500">{s._classroom?.course?.title}</p>
          </div>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">#{s.sessionNumber}</span>
      </div>
      <p className="font-medium text-slate-800 mb-1">{s.title}</p>
      <p className="text-sm text-slate-500 mb-3 flex items-center gap-1"><Clock size={14} /> {fmtTime(s.startTime)} – {fmtTime(s.endTime)}</p>
      <div className="flex items-center justify-between">
        {s.googleMeetLink ? (
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Video size={12} /> Link Ready</span>
        ) : (() => {
          const minutesBefore = (new Date(s.startTime).getTime() - Date.now()) / (1000 * 60);
          const canGenerate = minutesBefore <= 15;
          return canGenerate ? (
            <button
              onClick={() => generateZoomLink(s._id)}
              disabled={generatingZoomId === s._id}
              className="cursor-pointer text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 hover:bg-blue-100 transition-colors disabled:opacity-60"
            >
              {generatingZoomId === s._id ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
              {generatingZoomId === s._id ? 'Generating...' : 'Generate Zoom Link'}
            </button>
          ) : (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium cursor-default" title="Link generation unlocks 15 minutes before class">Unlocks 15m before</span>
          );
        })()}
        <div className="flex items-center gap-2">
          {s.googleMeetLink && (
            <button
              onClick={() => window.open(s.googleMeetLink, '_blank')}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Launch Meeting"
            >
              <Video size={14} /> Launch
            </button>
          )}
          <button onClick={() => openEditModal(s)} className="cursor-pointer p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Edit"><Edit2 size={16} /></button>
          <button onClick={() => openCancelModal(s)} className="cursor-pointer p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Cancel Class"><XCircle size={16} /></button>
          <button onClick={() => handleComplete(s._id)} disabled={completingId === s._id} className="cursor-pointer p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50" title="Mark Complete"><CheckCircle2 size={16} /></button>
        </div>
      </div>
    </div>
  )
}

/* ── Classroom Teacher Card (reusable) ── */
function ClassroomTeacherCard({ cr, onClick }) {
  const students = cr.enrolledStudents || [];
  const firstStudent = students[0];
  return (
    <div onClick={onClick} className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {cr.classroomType && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
            {cr.classroomType}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
          cr.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {cr.status || 'active'}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-4 pr-24">
        <div className="flex -space-x-2">
          {students.slice(0, 3).map((st) => (
            <div key={st?._id || st} className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base overflow-hidden ring-2 ring-white">
              {st?.profile?.avatarUrl ? (
                <img src={st.profile.avatarUrl} className="w-full h-full object-cover" />
              ) : (
                st?.name?.charAt(0).toUpperCase() || '?'
              )}
            </div>
          ))}
          {students.length > 3 && (
            <div className="w-11 h-11 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm ring-2 ring-white">
              +{students.length - 3}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            {students.length === 1 ? firstStudent?.name : `${students.length} Students`}
          </p>
          <p className="text-sm text-slate-500 truncate">{cr.course?.title}</p>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{cr.completedSessions}/{cr.totalSessions} sessions</span>
          <span className="font-semibold text-blue-600">{cr.progressPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-500 to-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${cr.progressPercentage}%` }} />
        </div>
      </div>
    </div>
  )
}

/* ── Deep Dive Component ── */
function TeacherClassroomDeepDive({ id, onBack, openEditModal, openCancelModal, handleComplete, completingId, generateZoomLink, generatingZoomId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/classrooms/${id}/details`);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classroom details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    
    const handleRefresh = () => fetchDetails();
    window.addEventListener('refreshClassroomDetails', handleRefresh);
    return () => window.removeEventListener('refreshClassroomDetails', handleRefresh);
  }, [id]);

  const markAttendance = async (sessionId, studentId, attendanceStatus) => {
    try {
      await api.patch(`/classrooms/sessions/${sessionId}/attendance`, { studentId, attendanceStatus });
      toast.success('Attendance updated');
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 flex justify-center items-center h-64 shadow-sm">
        <LoadingSpinner text="Loading classroom details..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <p className="text-slate-500">Failed to load classroom data.</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  const { classroom, sessions } = data;
  const enrolledStudents = classroom.enrolledStudents || [];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  // Count total present marks across all completed sessions and all students
  const presentCount = classroom.studentAttendanceStats && classroom.studentAttendanceStats.length > 0
    ? classroom.studentAttendanceStats.reduce((sum, s) => sum + (s.presentCount || 0), 0)
    : completedSessions.reduce((sum, s) => {
        const arr = s.studentAttendance || [];
        return sum + arr.filter(a => a.attendanceStatus === 'present').length;
      }, 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                {classroom.course?.title}
              </h2>
              {classroom.classroomType && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                  {classroom.classroomType}
                </span>
              )}
            </div>
            <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {classroom.progressPercentage}% Completed
            </span>
          </div>

          {/* Attendance Summary */}
          <div className="flex gap-4 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Classes</p>
              <p className="text-xl font-bold text-slate-900">{classroom.completedSessions} <span className="text-sm text-slate-400 font-medium">/ {classroom.totalSessions}</span></p>
            </div>
            <div className="w-px bg-slate-200 mx-2"></div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Present Marks</p>
              <p className="text-xl font-bold text-blue-600">{presentCount} <span className="text-sm text-slate-400 font-medium">total</span></p>
            </div>
          </div>
        </div>

        {/* Enrolled Students */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Enrolled Students ({enrolledStudents.length}/{classroom.maxCapacity || '?'})</p>
          <div className="flex flex-wrap gap-2">
            {enrolledStudents.map((st) => (
              <div key={st?._id || st} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {st?.profile?.avatarUrl ? <img src={st.profile.avatarUrl} className="w-full h-full object-cover" /> : st?.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">{st?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><History size={18} className="text-blue-600" /> Session Management Timeline</h3>
          <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">{sessions.length} scheduled</span>
        </div>
        
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sessions have been scheduled yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...sessions].sort((a, b) => new Date(a.startTime || a.scheduledDate || 0) - new Date(b.startTime || b.scheduledDate || 0) || (a.sessionNumber || 0) - (b.sessionNumber || 0)).map(s => {
              const isPast = new Date(s.endTime) < new Date();
              const canMarkAttendance = s.status === 'completed' || (isPast && s.status !== 'cancelled');
              
              // We need to pass the complete session object, but s here doesn't have populated _classroom. 
              // We will augment it for the openEditModal/handleComplete functions.
              const sForActions = { ...s, _classroom: classroom };

              return (
                <Link to={`/classrooms/${id}/sessions/${s._id}`} className="hover:text-blue-600 transition-colors">
                <div key={s._id} className="p-6 flex flex-col xl:flex-row gap-6 justify-between xl:items-center hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border ${
                      s.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      s.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      #{s.sessionNumber}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">                        
                        {s.title}                      
                        {(s.homework?.content || s.homework?.files?.length > 0) && <FileText size={13} className="text-blue-400" title="Homework" />}
                        {s.recordingLink && <PlayCircle size={13} className="text-emerald-400" title="Recording" />}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                          s.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          s.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {s.status}
                        </span>
                      </h4>
                      {/* {s.status === 'cancelled' && s.cancellationReason && (
                        <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                          <XCircle size={12} /> Reason: {s.cancellationReason}
                        </p>
                      )} */}
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {fmtDate(s.scheduledDate)}</span>
                        <span className="flex items-center gap-1"><Clock size={14}/> {fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4 shrink-0 w-full xl:w-auto">
                    {/* Multi-Student Attendance Control */}
                    {canMarkAttendance && enrolledStudents.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attendance</p>
                        <div className="space-y-2">
                          {enrolledStudents.map((st) => {
                            const studentId = st?._id || st;
                            const attendanceEntry = (s.studentAttendance || []).find(
                              (a) => (a.studentId?._id || a.studentId)?.toString() === studentId?.toString()
                            );
                            const currentStatus = attendanceEntry?.attendanceStatus || 'pending';
                            return (
                              <div key={studentId} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {st?.profile?.avatarUrl ? <img src={st.profile.avatarUrl} className="w-full h-full object-cover" /> : st?.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-slate-700 min-w-[60px] truncate">{st?.name?.split(' ')[0]}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAttendance(s._id, studentId, 'present') }}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                                      currentStatus === 'present'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
                                    }`}
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAttendance(s._id, studentId, 'absent') }}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                                      currentStatus === 'absent'
                                        ? 'bg-red-600 text-white shadow-sm'
                                        : 'bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                                    }`}
                                  >
                                    A
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.status !== 'completed' && s.status !== 'cancelled' && (
                        s.googleMeetLink ? (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(s.googleMeetLink, '_blank') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                            title="Launch Meeting"
                          >
                            <Video size={14} /> Launch
                          </button>
                        ) : (() => {
                          const minutesBefore = (new Date(s.startTime).getTime() - Date.now()) / (1000 * 60);
                          const canGenerate = minutesBefore <= 15;
                          return canGenerate ? (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); generateZoomLink(s._id) }}
                              disabled={generatingZoomId === s._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                              title="Generate Zoom Link"
                            >
                              {generatingZoomId === s._id ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                              {generatingZoomId === s._id ? 'Generating...' : 'Generate Zoom'}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium cursor-default" title="Link generation unlocks 15 minutes before class">
                              <Video size={14} /> Unlocks 15m before
                            </span>
                          );
                        })()
                      )}
                      {s.status === 'scheduled' && (
                        <>
                          {/* <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(sForActions) }} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCancelModal(sForActions) }} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Cancel Class"><XCircle size={16} /></button> */}
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleComplete(s._id) }} 
                            disabled={completingId === s._id} 
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50" 
                            title="Mark Complete"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
