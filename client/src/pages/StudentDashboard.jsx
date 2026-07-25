import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import {
  Sparkles, BookOpen, Calendar, Clock, Video, ArrowRight, ArrowLeft,
  CheckCircle2, BarChart3, LayoutDashboard, History, User, Users, GraduationCap, Award, Menu, X,
  FileText, PlayCircle, Hourglass, MessageSquare
} from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [upcoming, setUpcoming] = useState(null)
  const [todayClasses, setTodayClasses] = useState([])
  const [pastClasses, setPastClasses] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [demoRequests, setDemoRequests] = useState([])

  useEffect(() => {
    const fetchAll = async () => {
      const [crRes, upRes, todayRes, pastRes, progRes] = await Promise.allSettled([
        api.get('/student/classrooms'),
        api.get('/student/upcoming-class'),
        api.get('/student/today-class'),
        api.get('/student/past-classes'),
        api.get('/student/progress'),
      ])
      if (crRes.status === 'fulfilled') setClassrooms(crRes.value.data.data || [])
      if (upRes.status === 'fulfilled') setUpcoming(upRes.value.data.data || null)
      if (todayRes.status === 'fulfilled') setTodayClasses(todayRes.value.data.data || [])
      if (pastRes.status === 'fulfilled') setPastClasses(pastRes.value.data.data || [])
      if (progRes.status === 'fulfilled') setStats(progRes.value.data.data?.stats || {})
      // Fetch demo requests
      try {
        const demoRes = await api.get('/demo/my-requests')
        setDemoRequests(demoRes.data.data || [])
      } catch {}
      setLoading(false)
    }
    fetchAll()
  }, [])

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />

  const firstName = user?.name?.split(' ')[0] || 'Student'
  const pendingClassrooms = classrooms.filter(c => c.status === 'pending_assignment')
  const activeClassrooms = classrooms.filter(c => c.status !== 'pending_assignment')
  const totalTeachers = new Set(activeClassrooms.map(c => c.teacher?._id)).size

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'classrooms', label: 'My Classrooms', icon: BookOpen, badge: classrooms.length },
    { id: 'teachers', label: 'My Teachers', icon: Users, badge: totalTeachers },
    { id: 'today', label: "Today's Classes", icon: Calendar, badge: todayClasses.length },
    { id: 'history', label: 'Past Classes', icon: History, badge: pastClasses.length },
    { id: 'demos', label: 'Demo Classes', icon: Video, badge: demoRequests.filter(d => d.status === 'pending' || d.status === 'scheduled').length || undefined },
    { id: 'messages', label: 'Messages', icon: MessageSquare, navigate: '/chat' },
  ]

  return (
    <div className="page-enter bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Welcome ──────────────────────────────── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow active:scale-95"
            >
              <Menu size={18} className="text-white" />
            </button>
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
              Welcome back, <span className="text-blue-600">{firstName}</span>
            </h1>
          </div>
          <p className="text-slate-500 ml-[52px]">Here's what's happening with your courses.</p>
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
                  onClick={() => { if (t.navigate) { navigate(t.navigate); return; } setActiveClassroomId(null); setTab(t.id); setIsSidebarOpen(false); }}
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
              <ClassroomDeepDive id={activeClassroomId} onBack={() => setActiveClassroomId(null)} />
            ) : (
              <>
                {/* ── OVERVIEW TAB ──────────────────────── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
                  {[
                    { label: 'Active Courses', value: stats.activeClassrooms || 0, icon: BookOpen, color: 'text-blue-600' },
                    { label: 'Completed Sessions', value: stats.totalSessionsCompleted || 0, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Overall Progress', value: `${stats.overallProgress || 0}%`, icon: BarChart3, color: 'text-blue-600' },
                    { label: 'Today\'s Classes', value: todayClasses.length, icon: Calendar, color: 'text-amber-600' },
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

                {/* Pending Assignment Banner */}
                {pendingClassrooms.length > 0 && (
                  <div className="animate-slide-up" style={{ animationDelay: '60ms' }}>
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Hourglass size={20} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1">
                            {pendingClassrooms.length === 1 ? '1 Course Awaiting Classroom Assignment' : `${pendingClassrooms.length} Courses Awaiting Assignment`}
                          </h3>
                          <p className="text-sm text-slate-600 mb-3">
                            Your payment was successful! Our team is reviewing your enrollment and will assign you a teacher and classroom <span className="font-semibold text-amber-700">within 6 hours</span>. You'll receive a notification once it's ready.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {pendingClassrooms.map(cr => (
                              <div key={cr._id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2">
                                {cr.course?.thumbnailImage ? (
                                  <img src={cr.course.thumbnailImage} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <BookOpen size={14} className="text-amber-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 leading-tight">{cr.course?.title}</p>
                                  <p className="text-xs text-amber-600 font-medium">Pending assignment</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Class Card */}
                {upcoming && (
                  <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
                    <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-blue-600" />
                      Next Upcoming Class
                    </h2>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
                            #{upcoming.sessionNumber}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{upcoming.title}</h3>
                            <p className="text-sm text-blue-700 font-medium">{upcoming.classroom?.course?.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                              <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(upcoming.scheduledDate)}</span>
                              <span className="flex items-center gap-1"><Clock size={14} /> {fmtTime(upcoming.startTime)} – {fmtTime(upcoming.endTime)}</span>
                            </div>
                            {upcoming.classroom?.teacher && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                                  {upcoming.classroom.teacher.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-700">{upcoming.classroom.teacher.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {upcoming.googleMeetLink && upcoming.joinEnabled ? (
                            <Button size="md" onClick={() => window.open(upcoming.googleMeetLink, '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                              <Video size={16} /> Join Meeting
                            </Button>
                          ) : (
                            <p className="text-sm text-slate-500 italic bg-white px-4 py-2 rounded-lg border border-slate-200">
                              Meeting link will be available soon
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick glance: Active classrooms */}
                {activeClassrooms.length > 0 && (
                  <div className="animate-slide-up" style={{ animationDelay: '160ms' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-600" />
                        Active Classrooms
                      </h2>
                      <button onClick={() => setTab('classrooms')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        View All <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {activeClassrooms.slice(0, 3).map((cr) => (
                        <ClassroomCard key={cr._id} cr={cr} onClick={() => setActiveClassroomId(cr._id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CLASSROOMS TAB ─────────────────────── */}
            {tab === 'classrooms' && (
              <>
                {/* Pending classrooms section */}
                {pendingClassrooms.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <Hourglass size={16} className="text-amber-500" />
                      Awaiting Classroom Assignment
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {pendingClassrooms.map((cr) => (
                        <div key={cr._id} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="aspect-video bg-amber-100 flex items-center justify-center overflow-hidden relative">
                            {cr.course?.thumbnailImage ? (
                              <img src={cr.course.thumbnailImage} alt={cr.course?.title} className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <BookOpen size={36} className="text-amber-300" />
                            )}
                            <div className="absolute inset-0 bg-amber-900/20" />
                            <div className="absolute top-3 right-3">
                              <span className="text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm border bg-amber-500/90 text-white border-amber-400/50">
                                Pending
                              </span>
                            </div>
                          </div>
                          <div className="p-5">
                            <h3 className="font-bold text-slate-900 text-base mb-1 truncate">{cr.course?.title}</h3>
                            <div className="flex items-start gap-2 mt-3 bg-white rounded-xl p-3 border border-amber-200">
                              <Hourglass size={16} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Payment confirmed! You will be assigned a teacher and classroom <span className="font-semibold text-amber-700">within 6 hours</span>.
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active classrooms section */}
                {activeClassrooms.length === 0 && pendingClassrooms.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">You haven't enrolled in any courses yet.</p>
                    <Link to="/courses">
                      <Button variant="secondary" className="!text-black !bg-gray-200 hover:!bg-gray-300">
                        Browse Courses <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                ) : activeClassrooms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeClassrooms.map((cr) => (
                      <ClassroomCard key={cr._id} cr={cr} onClick={() => setActiveClassroomId(cr._id)} />
                    ))}
                  </div>
                ) : null}
              </>
            )}

            {/* ── MY TEACHERS TAB ────────────────────── */}
            {tab === 'teachers' && (
              <>
                {classrooms.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Users size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">You haven't enrolled in any courses yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
                    {classrooms.map((cr) => (
                      <div key={cr._id} onClick={() => window.open(`/profile/${cr.teacher?._id}`, '_blank')} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4">
                        <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                          {cr.teacher?.profile?.avatarUrl ? (
                            <img src={cr.teacher.profile.avatarUrl} className="w-full h-full object-cover" />
                          ) : (
                            cr.teacher?.name?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{cr.teacher?.name}</h3>
                          <p className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center w-max mt-1 mb-2 truncate max-w-full">
                            <BookOpen size={10} className="mr-1 shrink-0" /> <span className="truncate">{cr.course?.title}</span>
                          </p>
                          {cr.teacher?.profile?.qualifications && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate mb-1">
                              <Award size={12} className="shrink-0" /> <span className="truncate">{cr.teacher.profile.qualifications}</span>
                            </p>
                          )}
                          {cr.teacher?.profile?.yearsOfExperience > 0 && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate mb-1.5">
                              <Clock size={12} className="shrink-0" /> <span className="truncate">{cr.teacher.profile.yearsOfExperience} Years Experience</span>
                            </p>
                          )}
                          {cr.teacher?.profile?.bio && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cr.teacher.profile.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {/* ── TODAY'S CLASSES TAB ─────────────────── */}
            {tab === 'today' && (
              <>
                {todayClasses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Calendar size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No classes scheduled for today. Enjoy your free time!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {todayClasses.map((s) => (
                      <div key={s._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">Session #{s.sessionNumber}: {s.title}</p>
                          <p className="text-sm text-slate-500">{s.classroom?.course?.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</p>
                        </div>
                        {s.googleMeetLink && s.joinEnabled ? (
                          <Button size="sm" onClick={() => window.open(s.googleMeetLink, '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shrink-0">
                            <Video size={14} /> Join
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic shrink-0">No link yet</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
              </>
            )}

            {/* ── HISTORY TAB ─────────────────── */}
            {tab === 'history' && (
              <>
                {pastClasses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <History size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No past classes found.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {pastClasses.map((s) => (
                        <div key={s._id} className="px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">Session #{s.sessionNumber}: {s.title}</p>
                            <p className="text-sm text-slate-500">{s.classroom?.teacher?.name} • {s.classroom?.course?.title} • {fmtDate(s.scheduledDate)}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            s.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── DEMO CLASSES TAB ──────────────────── */}
            {tab === 'demos' && (
              <div className="space-y-4 animate-slide-up">
                <h2 className="text-lg font-bold text-slate-900">My Demo Classes</h2>
                {demoRequests.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-3 text-slate-400">
                    <Video size={36} className="opacity-40" />
                    <p className="font-medium">No demo requests yet</p>
                    <p className="text-sm text-center">Visit a course page and click "Request Free Demo Class" to get started.</p>
                  </div>
                ) : (
                  demoRequests.map((demo) => {
                    const STATUS_STYLES = {
                      pending:   { bg: 'bg-amber-50 border-amber-200',  chip: 'bg-amber-100 text-amber-700',   label: 'Pending' },
                      scheduled: { bg: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-100 text-emerald-700', label: 'Scheduled' },
                      completed: { bg: 'bg-slate-50 border-slate-200',  chip: 'bg-slate-100 text-slate-600',   label: 'Completed' },
                      cancelled: { bg: 'bg-red-50 border-red-200',      chip: 'bg-red-100 text-red-600',       label: 'Cancelled' },
                    }
                    const s = STATUS_STYLES[demo.status] || STATUS_STYLES.pending
                    return (
                      <div key={demo._id} className={`rounded-2xl border p-5 ${s.bg}`}>
                        <div className="flex items-start gap-4">
                          {demo.course?.thumbnailImage && (
                            <img src={demo.course.thumbnailImage} alt={demo.course.title}
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white shadow-sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-800 text-sm">{demo.course?.title}</h3>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.chip}`}>{s.label}</span>
                            </div>
                            {demo.status === 'scheduled' && demo.scheduledAt && (
                              <p className="text-xs text-emerald-700 mt-1">
                                📅 {new Date(demo.scheduledAt).toLocaleString('en-IN', {
                                  weekday: 'short', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                })}
                                {demo.instructor?.name && ` · with ${demo.instructor.name}`}
                              </p>
                            )}
                            {demo.status === 'pending' && (
                              <p className="text-xs text-amber-600 mt-1">
                                Payment confirmed ({demo.paymentCurrency === 'USD' ? `$${demo.paymentAmount}` : `₹${demo.paymentAmount}`}) · Admin will schedule your demo soon.
                              </p>
                            )}
                            {demo.status === 'cancelled' && demo.cancellationReason && (
                              <p className="text-xs text-red-500 mt-1">Reason: {demo.cancellationReason}</p>
                            )}
                          </div>
                        </div>
                        {demo.status === 'scheduled' && demo.meetLink && (
                          <a href={demo.meetLink} target="_blank" rel="noreferrer"
                            className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl py-2.5 transition-colors">
                            <Video size={15} /> Join Demo Class
                          </a>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ── Reusable Classroom Card ── */
function ClassroomCard({ cr, onClick }) {
  const { user } = useAuth();
  const myStats = (cr.studentAttendance || []).find(s => (s.studentId || s.studentId?._id)?.toString() === user?.id?.toString());
  const presentCount = myStats?.presentCount || 0;

  return (
    <div onClick={onClick} className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center overflow-hidden relative">
        {cr.course?.thumbnailImage ? (
          <img src={cr.course.thumbnailImage} alt={cr.course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={36} className="text-blue-300" />
        )}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm border backdrop-blur-md ${
            cr.status === 'active' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-slate-800/80 text-white border-slate-600/50'
          }`}>
            {cr.status || 'active'}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-900 text-lg mb-1 truncate">{cr.course?.title}</h3>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
            {cr.teacher?.profile?.avatarUrl ? (
              <img src={cr.teacher.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              cr.teacher?.name?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <span className="text-sm text-slate-600">{cr.teacher?.name || 'Teacher'}</span>
        </div>
        {cr.status === 'pending_assignment' ? (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
              <Clock size={14} /> Awaiting Assignment
            </span>
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{cr.completedSessions}/{cr.totalSessions} sessions</span>
              <span className="text-emerald-600 font-medium">{presentCount} present</span>
              <span className="font-semibold text-blue-600">{cr.progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${cr.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Deep Dive Component ── */
function ClassroomDeepDive({ id, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/classrooms/${id}/details`);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

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

  // Pending assignment early return
  if (classroom?.status === 'pending_assignment') {
    return (
      <div className="p-6 sm:p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors">
          <ArrowLeft size={18} /> Back to Classrooms
        </button>

        <div className="mt-8 max-w-lg mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-2">
              Setting Up Your Classes
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Payment successful! Our team is currently assigning your instructor and building your schedule. You'll be notified once your classes are ready.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const myStats = (classroom.studentAttendance || []).find(s => (s.studentId)?.toString() === user?.id?.toString());
  const presentCount = myStats !== undefined && myStats.presentCount !== undefined ? myStats.presentCount : completedSessions.filter(s => {
    const entry = (s.studentAttendance || []).find(a => (a.studentId || a.studentId?._id)?.toString() === user?.id?.toString());
    return entry?.attendanceStatus === 'present';
  }).length;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-2">
            {classroom.course?.title}
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                {classroom.teacher?.profile?.avatarUrl ? (
                  <img src={classroom.teacher.profile.avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  classroom.teacher?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-sm font-medium text-slate-700">{classroom.teacher?.name}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {classroom.progressPercentage}% Completed
            </span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="flex gap-4 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Classes</p>
            <p className="text-xl font-bold text-slate-900">{classroom.completedSessions} <span className="text-sm text-slate-400 font-medium">/ {classroom.totalSessions}</span></p>
          </div>
          <div className="w-px bg-slate-200 mx-2"></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attendance</p>
            <p className="text-xl font-bold text-blue-600">{presentCount} <span className="text-sm text-slate-400 font-medium">present</span></p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><History size={18} className="text-blue-600" /> Session Timeline</h3>
          <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">{sessions.length} scheduled</span>
        </div>
        
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sessions have been scheduled yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...sessions].sort((a, b) => new Date(a.startTime || a.scheduledDate || 0) - new Date(b.startTime || b.scheduledDate || 0) || (a.sessionNumber || 0) - (b.sessionNumber || 0)).map(s => {
              const isPast = new Date(s.endTime) < new Date();
              return (
                <Link to={`/classrooms/${id}/sessions/${s._id}`} className="font-semibold !text-slate-900 hover:!text-blue-600 transition-colors cursor-pointer no-underline">
                <div key={s._id} className="p-6 flex flex-col md:flex-row gap-4 justify-between md:items-center hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border ${
                      s.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      s.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      #{s.sessionNumber}
                    </div>
                    <div>
                      {s.title}
                      {((s.homework?.content || s.homework?.files?.length > 0) || s.recordingLink) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {(s.homework?.content || s.homework?.files?.length > 0) && <FileText size={13} className="text-blue-400" title="Homework available" />}
                          {s.recordingLink && <PlayCircle size={13} className="text-emerald-400" title="Recording available" />}
                        </div>
                      )}
                      {/* {s.status === 'cancelled' && s.cancellationReason && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          Reason: {s.cancellationReason}
                        </p>
                      )} */}
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-800">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {fmtDate(s.scheduledDate)}</span>
                        <span className="flex items-center gap-1"><Clock size={14}/> {fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 ml-16 md:ml-0 flex-wrap">
                    {s.status !== 'completed' && s.status !== 'cancelled' && (
                      (s.googleMeetLink || s.meetLink) ? (
                        <button
                          onClick={() => window.open(s.googleMeetLink || s.meetLink, '_blank')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                        >
                          <Video size={14} /> Join
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                          <Video size={14} /> Link not available yet
                        </span>
                      )
                    )}

                    {(() => {
                      const myAttendance = s.studentAttendance.find(a => a.studentId._id.toString() === user.id.toString());
                      const myStatus = myAttendance?.attendanceStatus;                  
                      return myStatus && myStatus !== 'pending' ? (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border flex items-center gap-1 ${
                          myStatus === 'present' 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          <User size={12} />
                          {myStatus === 'present' ? 'Present' : 'Absent'}
                        </span>
                      ) : isPast && s.status !== 'cancelled' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                          Attendance Pending
                        </span>
                      ) : null;
                    })()}
                    
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${
                      s.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      s.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {s.status}
                    </span>
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
