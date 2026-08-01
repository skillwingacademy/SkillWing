import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  Check, X, ShieldAlert, BookOpen, MapPin, Phone, Calendar,
  PlusCircle, Pencil, LayoutGrid, Users, UserCheck, GraduationCap, Menu, ArrowLeft, Video,
  FileText, PlayCircle, Clock, DollarSign, Plus, CalendarPlus, CheckCircle2, XCircle, CalendarDays, MessageSquare, Award,
  Search, Filter, Trash2, Archive, RotateCcw, MoreVertical, User, Mail, PhoneCall
} from 'lucide-react'
import api from '../api/axios'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AdminCourseForm from '../components/admin/AdminCourseForm'
import TeacherLevelBadge from '../components/ui/TeacherLevelBadge'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('courses')
  const [teachers, setTeachers] = useState([])
  const [approvedTeachers, setApprovedTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeClassroomId = searchParams.get('classroomId')
  const setActiveClassroomId = (id) => {
    if (id) {
      setSearchParams({ classroomId: id })
    } else {
      setSearchParams({})
    }
  }

  // Course form states
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  // Dispatcher modal
  const [dispatchModal, setDispatchModal] = useState(false)
  const [dispatchClassroom, setDispatchClassroom] = useState(null)
  const [dispatchInstructorId, setDispatchInstructorId] = useState('')
  const [dispatchDates, setDispatchDates] = useState([{ date: '', time: '' }])
  const [dispatchLoading, setDispatchLoading] = useState(false)

  // Payroll
  const [payrollData, setPayrollData] = useState([])
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1)
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())

  // Payment Matrix & Manual Rate Selection States
  const [rateConfig, setRateConfig] = useState(null)
  const [showRateMatrixModal, setShowRateMatrixModal] = useState(false)
  const [rateMatrixForm, setRateMatrixForm] = useState(null)
  const [savingRateMatrix, setSavingRateMatrix] = useState(false)

  // Teacher Level & Manual Rate Edit Modal State
  const [editTeacherRateModal, setEditTeacherRateModal] = useState(false)
  const [editingTeacherData, setEditingTeacherData] = useState(null)
  const [selectedTeacherLevel, setSelectedTeacherLevel] = useState('Junior')
  const [selectedPerClassRate, setSelectedPerClassRate] = useState(120)
  const [savingTeacherRate, setSavingTeacherRate] = useState(false)

  const openTeacherRateModal = (teacher) => {
    const currentLevel = teacher.teacherLevel || teacher.profile?.teacherLevel || 'Junior'
    const currentRate = teacher.profile?.perClassRate || 0
    setEditingTeacherData(teacher)
    setSelectedTeacherLevel(currentLevel)
    setSelectedPerClassRate(currentRate)
    setEditTeacherRateModal(true)
  }

  const handleSaveTeacherLevelAndRate = async (e) => {
    if (e) e.preventDefault()
    if (!editingTeacherData || savingTeacherRate) return
    setSavingTeacherRate(true)
    const teacherId = editingTeacherData._id || editingTeacherData.teacherId
    console.log('[Teacher Rate/Level Save] Sending request for teacher:', teacherId, {
      teacherLevel: selectedTeacherLevel,
      perClassRate: Number(selectedPerClassRate),
    })

    let isSuccess = false
    try {
      const res = await api.put(`/admin/teachers/${teacherId}/rate-level`, {
        teacherLevel: selectedTeacherLevel,
        perClassRate: Number(selectedPerClassRate),
      })
      console.log('[Teacher Rate/Level Save] Response:', res.data)

      if (res.status >= 200 && res.status < 300 && res.data?.success !== false) {
        isSuccess = true
        toast.success(res.data?.message || 'Teacher level and per-class rate updated successfully')
        setEditTeacherRateModal(false)
      } else {
        toast.error(res.data?.message || 'Failed to update teacher level and rate')
      }
    } catch (err) {
      console.error('[Teacher Rate/Level Save] Error:', err)
      toast.error(err.response?.data?.message || 'Failed to update teacher level and rate')
    } finally {
      setSavingTeacherRate(false)
    }

    if (isSuccess) {
      try {
        await loadData()
        if (tab === 'payroll') await loadPayroll()
      } catch (refreshErr) {
        console.error('[Teacher Rate/Level Save] Post-save data refresh error (non-fatal):', refreshErr)
      }
    }
  }

  const handleSaveRateMatrix = async (e) => {
    if (e) e.preventDefault()
    if (savingRateMatrix) return
    setSavingRateMatrix(true)
    console.log('[Payment Matrix Save] Sending request with payload:', rateMatrixForm)

    let isSuccess = false
    try {
      const res = await api.put('/admin/teacher-rates', rateMatrixForm)
      console.log('[Payment Matrix Save] Response:', res.data)

      if (res.status >= 200 && res.status < 300 && res.data?.success !== false) {
        isSuccess = true
        toast.success(res.data?.message || 'Payment matrix updated successfully')
        setShowRateMatrixModal(false)
      } else {
        toast.error(res.data?.message || 'Failed to update payment matrix')
      }
    } catch (err) {
      console.error('[Payment Matrix Save] Error:', err)
      toast.error(err.response?.data?.message || 'Failed to update payment matrix')
    } finally {
      setSavingRateMatrix(false)
    }

    if (isSuccess) {
      try {
        await loadData()
        if (tab === 'payroll') await loadPayroll()
      } catch (refreshErr) {
        console.error('[Payment Matrix Save] Post-save data refresh error (non-fatal):', refreshErr)
      }
    }
  }

  // Student-Centric Classrooms States
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [studentCourseFilter, setStudentCourseFilter] = useState('all')
  const [studentTeacherFilter, setStudentTeacherFilter] = useState('all')
  const [studentStatusTab, setStudentStatusTab] = useState('active') // 'active' | 'archived'
  const [activeMenuStudentId, setActiveMenuStudentId] = useState(null)

  // Edit & Delete Student Modal States
  const [editStudentModal, setEditStudentModal] = useState(false)
  const [editingStudentForm, setEditingStudentForm] = useState({ id: '', name: '', email: '', phoneNumber: '' })
  const [savingStudentEdit, setSavingStudentEdit] = useState(false)

  const [deleteStudentModal, setDeleteStudentModal] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(null)
  const [deletingStudentLoading, setDeletingStudentLoading] = useState(false)

  const handleArchiveStudent = async (studentId) => {
    try {
      const res = await api.put(`/admin/students/${studentId}/archive`)
      toast.success(res.data.message || 'Student archive status updated')
      setActiveMenuStudentId(null)
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student archive status')
    }
  }

  const handleEditStudentSave = async (e) => {
    e.preventDefault()
    setSavingStudentEdit(true)
    try {
      const res = await api.put(`/admin/students/${editingStudentForm.id}`, {
        name: editingStudentForm.name,
        email: editingStudentForm.email,
        phoneNumber: editingStudentForm.phoneNumber,
      })
      toast.success(res.data.message || 'Student information updated')
      setEditStudentModal(false)
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student info')
    } finally {
      setSavingStudentEdit(false)
    }
  }

  const handleDeleteStudentConfirm = async () => {
    if (!deletingStudent) return
    setDeletingStudentLoading(true)
    try {
      const res = await api.delete(`/admin/students/${deletingStudent._id || deletingStudent.id}`)
      toast.success(res.data.message || 'Student permanently deleted')
      setDeleteStudentModal(false)
      setDeletingStudent(null)
      if (selectedStudentId === (deletingStudent._id || deletingStudent.id)) {
        setSelectedStudentId(null)
      }
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student')
    } finally {
      setDeletingStudentLoading(false)
    }
  }

  // Demo request state
  const [demoRequests, setDemoRequests] = useState([])
  const [demoModal, setDemoModal] = useState(false)
  const [selectedDemo, setSelectedDemo] = useState(null)
  const [demoInstructorId, setDemoInstructorId] = useState('')
  const [demoDate, setDemoDate] = useState('')
  const [demoTime, setDemoTime] = useState('')
  const [demoMeetLink, setDemoMeetLink] = useState('')
  const [demoDuration, setDemoDuration] = useState(45)
  const [demoNotes, setDemoNotes] = useState('')
  const [demoModalLoading, setDemoModalLoading] = useState(false)
  const [demoCancelModal, setDemoCancelModal] = useState(false)
  const [demoCancelReason, setDemoCancelReason] = useState('')
  const [demoStatusFilter, setDemoStatusFilter] = useState('pending')

  const loadData = async () => {
    try {
      const [pendRes, courRes, apprRes, studRes, classRes, rateRes] = await Promise.all([
        api.get('/admin/teachers/pending'),
        api.get('/courses'),
        api.get('/admin/teachers/approved'),
        api.get('/admin/students'),
        api.get('/admin/classrooms'),
        api.get('/admin/teacher-rates')
      ])
      setTeachers(pendRes.data.data || [])
      setCourses(courRes.data.data || [])
      setApprovedTeachers(apprRes.data.data || [])
      setStudents(studRes.data.data || [])
      setClassrooms(classRes.data.data || [])
      setRateConfig(rateRes.data.data || null)
      // Fetch demo requests
      try {
        const demoRes = await api.get('/demo/admin/requests')
        setDemoRequests(demoRes.data.data || [])
      } catch {}
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/teachers/${id}/approve`)
      toast.success('Teacher approved successfully')
      await loadData()
    } catch (err) {
      toast.error('Failed to approve teacher')
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return
    try {
      await api.put(`/admin/teachers/${id}/reject`)
      toast.success('Teacher application rejected')
      await loadData()
    } catch (err) {
      toast.error('Failed to reject teacher')
    }
  }

  const handleCourseSaved = async () => {
    setShowCourseForm(false)
    setEditingCourse(null)
    await loadData()
  }

  const openEdit = (course) => {
    setEditingCourse(course)
    setShowCourseForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pendingClassrooms = classrooms.filter(c => c.status === 'pending_assignment')

  const openDispatchModal = (classroom) => {
    setDispatchClassroom(classroom)
    setDispatchInstructorId('')
    setDispatchDates(Array.from({ length: classroom.totalSessions || 1 }, () => ({ date: '', time: '' })))
    setDispatchModal(true)
  }

  const handleDispatch = async () => {
    if (!dispatchInstructorId) {
      toast.error('Please select an instructor')
      return
    }
    const validDates = dispatchDates.filter(d => d.date && d.time)
    if (validDates.length === 0) {
      toast.error('Please add at least one session date')
      return
    }
    setDispatchLoading(true)
    try {
      const scheduleDates = validDates
        .map(d => new Date(`${d.date}T${d.time}`).toISOString())
      await api.post(`/admin/classrooms/${dispatchClassroom._id}/schedule-batch`, {
        instructorId: dispatchInstructorId,
        scheduleDates,
      })
      toast.success('Instructor assigned and sessions scheduled!')
      setDispatchModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule')
    } finally {
      setDispatchLoading(false)
    }
  }


  const fetchPayroll = async () => {
    setPayrollLoading(true)
    try {
      const res = await api.get(`/admin/payouts?month=${payrollMonth}&year=${payrollYear}`)
      setPayrollData(res.data.data || [])
    } catch (err) {
      console.error('Error fetching payroll:', err)
      toast.error('Failed to load payroll data')
    } finally {
      setPayrollLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'payroll') {
      fetchPayroll()
    }
  }, [tab, payrollMonth, payrollYear])

  if (loading) {
    return <LoadingSpinner text="Loading admin dashboard..." fullPage />
  }

  const tabs = [
    { id: 'courses', label: 'Courses', icon: LayoutGrid, badge: courses.length },
    { id: 'classrooms', label: 'Classrooms', icon: BookOpen, badge: classrooms.length },
    { id: 'teachers', label: 'Teachers', icon: UserCheck, badge: approvedTeachers.length },
    { id: 'students', label: 'Students', icon: GraduationCap, badge: students.length },
    { id: 'approvals', label: 'Approvals', icon: Users, badge: teachers.length },
    { id: 'pending', label: 'Pending', icon: Clock, badge: pendingClassrooms.length },
    { id: 'demos', label: 'Demo Requests', icon: Video, badge: demoRequests.filter(d => d.status === 'pending').length || undefined },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare, navigate: '/chat' },
  ]

  const openScheduleModal = (demo) => {
    setSelectedDemo(demo)
    setDemoInstructorId(demo.instructor?._id || '')
    setDemoDate(demo.scheduledAt ? new Date(demo.scheduledAt).toISOString().split('T')[0] : '')
    setDemoTime(demo.scheduledAt ? new Date(demo.scheduledAt).toTimeString().slice(0, 5) : '')
    setDemoMeetLink(demo.meetLink || '')
    setDemoDuration(demo.durationMinutes || 45)
    setDemoNotes(demo.adminNotes || '')
    setDemoModal(true)
  }

  const handleScheduleDemo = async () => {
    if (!demoInstructorId || !demoDate || !demoTime || !demoMeetLink) {
      toast.error('Please fill all required fields')
      return
    }
    setDemoModalLoading(true)
    try {
      await api.patch(`/demo/admin/${selectedDemo._id}/schedule`, {
        instructorId: demoInstructorId,
        scheduledAt: new Date(`${demoDate}T${demoTime}`).toISOString(),
        meetLink: demoMeetLink,
        durationMinutes: demoDuration,
        adminNotes: demoNotes,
      })
      toast.success('Demo scheduled and student notified!')
      setDemoModal(false)
      const res = await api.get('/demo/admin/requests')
      setDemoRequests(res.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule demo')
    } finally {
      setDemoModalLoading(false)
    }
  }

  const handleCompleteDemo = async (id) => {
    try {
      await api.patch(`/demo/admin/${id}/complete`)
      toast.success('Demo marked as completed')
      const res = await api.get('/demo/admin/requests')
      setDemoRequests(res.data.data || [])
    } catch {
      toast.error('Failed to complete demo')
    }
  }

  const handleCancelDemo = async () => {
    try {
      await api.patch(`/demo/admin/${selectedDemo._id}/cancel`, { reason: demoCancelReason })
      toast.success('Demo cancelled')
      setDemoCancelModal(false)
      setDemoCancelReason('')
      const res = await api.get('/demo/admin/requests')
      setDemoRequests(res.data.data || [])
    } catch {
      toast.error('Failed to cancel demo')
    }
  }

  const getTeacherCourses = (teacherId) => {
    return courses.filter(c =>
      (c.educator && (c.educator._id === teacherId || c.educator === teacherId)) ||
      (c.instructors && c.instructors.some(i => (typeof i === 'object' ? i._id === teacherId : i === teacherId)))
    );
  }

  return (
    <div className="page-enter min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow active:scale-95"
            >
              <Menu size={18} className="text-white" />
            </button>
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center shadow-lg shadow-blue-500/25">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <p className="text-slate-500 ml-[52px]">Manage teachers, courses, and students from one place.</p>
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
                  onClick={() => { if (t.navigate) { navigate(t.navigate); return; } setTab(t.id); setIsSidebarOpen(false); setActiveClassroomId(null); }}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 last:mb-0 ${
                    tab === t.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t.id === 'approvals' && t.badge > 0 && (
                    <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse"></span>
                  )}
                  <t.icon size={18} className="shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {t.badge > 0 && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
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
              <AdminClassroomDeepDive 
                id={activeClassroomId} 
                onBack={() => setActiveClassroomId(null)} 
              />
            ) : (
              <>
                {/* ─────── APPROVALS TAB ─────── */}
                {tab === 'approvals' && (
                  <>
                    {teachers.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check size={32} />
                        </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h3>
                    <p className="text-slate-500">There are no pending teacher applications to review at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {teachers.map((teacher) => (
                      <div key={teacher._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                              {teacher.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{teacher.name}</h3>
                              <p className="text-sm text-slate-500">{teacher.email}</p>
                            </div>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                            Pending
                          </span>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-start gap-3">
                            <Phone size={16} className="text-slate-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Phone Number</p>
                              <p className="text-sm text-slate-900">{teacher.phoneNumber || 'Not provided'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-slate-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">State</p>
                              <p className="text-sm text-slate-900">{teacher.state || 'Not provided'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Calendar size={16} className="text-slate-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</p>
                              <p className="text-sm text-slate-900">
                                {teacher.dob ? new Date(teacher.dob).toLocaleDateString() : 'Not provided'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <BookOpen size={16} className="text-slate-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Intended Course</p>
                              <p className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mt-0.5 border border-blue-100">
                                {teacher.intendedCourse ? teacher.intendedCourse.title : 'Not provided'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(teacher._id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                          >
                            <Check size={18} className="mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(teacher._id)}
                            variant="secondary"
                            className="flex-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                          >
                            <X size={18} className="mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─────── COURSES TAB ─────── */}
            {tab === 'courses' && (
              <>
                {showCourseForm ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                      {editingCourse ? 'Edit Course' : 'Create New Course'}
                    </h2>
                    <AdminCourseForm
                      course={editingCourse}
                      onSaved={handleCourseSaved}
                      onCancel={() => { setShowCourseForm(false); setEditingCourse(null) }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-6">
                      <Button onClick={() => { setEditingCourse(null); setShowCourseForm(true) }}>
                        <PlusCircle size={18} className="mr-2" />
                        New Course
                      </Button>
                    </div>

                    {courses.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Courses Yet</h3>
                        <p className="text-slate-500 mb-4">Create your first course to get started.</p>
                        <Button onClick={() => setShowCourseForm(true)}>
                          <PlusCircle size={16} className="mr-2" />
                          Create Course
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {courses.map((c) => (
                          <div key={c._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            {/* Thumbnail */}
                            <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-50 relative overflow-hidden">
                              {c.thumbnailImage ? (
                                <img src={c.thumbnailImage} alt={c.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen size={40} className="text-blue-300" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  c.isActive
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {c.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            {/* Content */}
                            <div className="p-4">
                              <h3 className="font-bold text-slate-900 line-clamp-2 mb-1">{c.title}</h3>
                              {c.instructors && c.instructors.length > 0 && (
                                <p className="text-xs text-slate-500 mb-2">
                                  {c.instructors.map((i) => (typeof i === 'object' ? i.name : i)).join(', ')}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-sm font-bold text-blue-600">
                                  {c.currency === 'USD' ? '$' : '₹'}{c.price > 0 ? c.price : 'Free'}
                                </span>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openEdit(c)}
                                  className="text-xs !text-black"
                                >
                                  <Pencil size={14} className="mr-1 !text-black" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ─────── CLASSROOMS TAB (STUDENT-CENTRIC) ─────── */}
            {tab === 'classrooms' && (() => {
              // Aggregate classrooms by student (so each student appears ONCE)
              const studentMap = new Map()

              students.forEach((st) => {
                studentMap.set(st._id, {
                  _id: st._id,
                  name: st.name || 'Unnamed Student',
                  email: st.email || '',
                  phoneNumber: st.phoneNumber || '',
                  avatar: st.profile?.avatarUrl || '',
                  isArchived: st.isArchived || false,
                  createdAt: st.createdAt,
                  classrooms: [],
                })
              })

              classrooms.forEach((cr) => {
                (cr.enrolledStudents || []).forEach((st) => {
                  const stId = typeof st === 'object' ? st._id : st
                  if (!studentMap.has(stId)) {
                    if (typeof st === 'object') {
                      studentMap.set(stId, {
                        _id: st._id,
                        name: st.name || 'Unnamed Student',
                        email: st.email || '',
                        phoneNumber: st.phoneNumber || '',
                        avatar: st.profile?.avatarUrl || '',
                        isArchived: st.isArchived || false,
                        createdAt: st.createdAt,
                        classrooms: [],
                      })
                    }
                  }
                  const entry = studentMap.get(stId)
                  if (entry) {
                    if (!entry.classrooms.some((c) => c.classroomId === cr._id)) {
                      entry.classrooms.push({
                        classroomId: cr._id,
                        courseTitle: cr.course?.title || 'Untitled Course',
                        courseThumbnail: cr.course?.thumbnailImage || '',
                        teacherName: cr.teacher?.name || 'Unassigned',
                        purchasedTier: cr.classroomType || '1-on-1',
                        status: cr.status || 'active',
                        progressPercentage: cr.progressPercentage || 0,
                        completedSessions: cr.completedSessions || 0,
                        totalSessions: cr.totalSessions || 0,
                        remainingSessions: Math.max(0, (cr.totalSessions || 0) - (cr.completedSessions || 0)),
                        attendanceSummary: `${cr.completedSessions || 0}/${cr.totalSessions || 0} completed`,
                        paymentStatus: cr.amountPaid > 0 ? 'Paid' : 'Active',
                        createdAt: cr.createdAt,
                      })
                    }
                  }
                })
              })

              const allStudentRecords = Array.from(studentMap.values())
              const activeStudentRecords = allStudentRecords.filter((s) => !s.isArchived)
              const archivedStudentRecords = allStudentRecords.filter((s) => s.isArchived)

              const currentStudentList = (studentStatusTab === 'active' ? activeStudentRecords : archivedStudentRecords).filter((st) => {
                const matchesSearch =
                  !studentSearchTerm ||
                  st.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                  st.email.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                  st._id.toLowerCase().includes(studentSearchTerm.toLowerCase())

                const matchesCourse =
                  studentCourseFilter === 'all' ||
                  st.classrooms.some((c) => c.courseTitle.toLowerCase() === studentCourseFilter.toLowerCase())

                const matchesTeacher =
                  studentTeacherFilter === 'all' ||
                  st.classrooms.some((c) => c.teacherName.toLowerCase() === studentTeacherFilter.toLowerCase())

                return matchesSearch && matchesCourse && matchesTeacher
              })

              const selectedStudentData = selectedStudentId ? studentMap.get(selectedStudentId) : null

              return (
                <div className="space-y-6">
                  {selectedStudentId && selectedStudentData ? (
                    /* ── SCREEN 2: STUDENT DETAIL VIEW ── */
                    <div className="space-y-6 animate-slide-up">
                      <button
                        onClick={() => setSelectedStudentId(null)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-sm transition-all group"
                      >
                        <ArrowLeft size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" /> Back to Students
                      </button>

                      {/* Student Header Info Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                            {selectedStudentData.avatar ? (
                              <img src={selectedStudentData.avatar} alt={selectedStudentData.name} className="w-full h-full object-cover" />
                            ) : (
                              selectedStudentData.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-2xl font-bold text-slate-900">{selectedStudentData.name}</h2>
                              {selectedStudentData.isArchived && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 uppercase">
                                  Archived
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedStudentData._id}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
                              {selectedStudentData.email && (
                                <span className="flex items-center gap-1.5">
                                  <Mail size={13} className="text-slate-400" /> {selectedStudentData.email}
                                </span>
                              )}
                              {selectedStudentData.phoneNumber && (
                                <span className="flex items-center gap-1.5">
                                  <PhoneCall size={13} className="text-slate-400" /> {selectedStudentData.phoneNumber}
                                </span>
                              )}
                              {selectedStudentData.createdAt && (
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={13} className="text-slate-400" /> Joined {new Date(selectedStudentData.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Management Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingStudentForm({
                                id: selectedStudentData._id,
                                name: selectedStudentData.name,
                                email: selectedStudentData.email,
                                phoneNumber: selectedStudentData.phoneNumber || '',
                              })
                              setEditStudentModal(true)
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleArchiveStudent(selectedStudentData._id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm ${
                              selectedStudentData.isArchived
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {selectedStudentData.isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                            {selectedStudentData.isArchived ? 'Restore' : 'Archive'}
                          </button>
                          <button
                            onClick={() => {
                              setDeletingStudent(selectedStudentData)
                              setDeleteStudentModal(true)
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>

                      {/* Enrolled Courses Header */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-family-heading)] mb-4">
                          Enrolled Courses & Active Classrooms ({selectedStudentData.classrooms.length})
                        </h3>

                        {selectedStudentData.classrooms.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                            This student is not currently enrolled in any classrooms.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedStudentData.classrooms.map((cr) => (
                              <div
                                key={cr.classroomId}
                                onClick={() => setActiveClassroomId(cr.classroomId)}
                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer group"
                              >
                                <div className="flex items-start gap-4 mb-4">
                                  <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold">
                                    {cr.courseThumbnail ? (
                                      <img src={cr.courseThumbnail} alt={cr.courseTitle} className="w-full h-full object-cover" />
                                    ) : (
                                      <BookOpen size={24} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-12">
                                    <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                      {cr.courseTitle}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                      Teacher: <span className="font-semibold text-slate-700">{cr.teacherName}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                        {cr.purchasedTier}
                                      </span>
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md capitalize ${
                                        cr.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {cr.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Progress & Session Stats */}
                                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Course Progress:</span>
                                    <span className="font-bold text-blue-600">{cr.progressPercentage}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${cr.progressPercentage}%` }} />
                                  </div>
                                  <div className="flex justify-between text-slate-500 pt-1">
                                    <span>Completed: <strong className="text-slate-800">{cr.completedSessions}</strong></span>
                                    <span>Remaining: <strong className="text-slate-800">{cr.remainingSessions}</strong></span>
                                    <span>Payment: <strong className="text-emerald-600">{cr.paymentStatus}</strong></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── SCREEN 1: ENROLLED STUDENTS GRID VIEW ── */
                    <div className="space-y-6">
                      {/* Header Controls & Filters */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)]">Classrooms — Enrolled Students</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Select a student to view enrolled courses, attendance, and classroom progress.</p>
                          </div>

                          {/* Active vs Archived Tabs */}
                          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                              onClick={() => setStudentStatusTab('active')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                studentStatusTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Active Students ({activeStudentRecords.length})
                            </button>
                            <button
                              onClick={() => setStudentStatusTab('archived')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                studentStatusTab === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              Archived Students ({archivedStudentRecords.length})
                            </button>
                          </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                          {/* Search Input */}
                          <div className="relative">
                            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search by student name or email..."
                              value={studentSearchTerm}
                              onChange={(e) => setStudentSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          {/* Course Filter */}
                          <div className="relative">
                            <Filter size={15} className="absolute left-3 top-2.5 text-slate-400" />
                            <select
                              value={studentCourseFilter}
                              onChange={(e) => setStudentCourseFilter(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="all">All Courses</option>
                              {courses.map((c) => (
                                <option key={c._id} value={c.title}>{c.title}</option>
                              ))}
                            </select>
                          </div>

                          {/* Teacher Filter */}
                          <div className="relative">
                            <Filter size={15} className="absolute left-3 top-2.5 text-slate-400" />
                            <select
                              value={studentTeacherFilter}
                              onChange={(e) => setStudentTeacherFilter(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="all">All Teachers</option>
                              {approvedTeachers.map((t) => (
                                <option key={t._id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Students Grid */}
                      {currentStudentList.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                          <User size={36} className="text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">No {studentStatusTab} students found</h3>
                          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filters.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {currentStudentList.map((st) => (
                            <div
                              key={st._id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                            >
                              <div>
                                {/* Header & Actions */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                  <div
                                    onClick={() => setSelectedStudentId(st._id)}
                                    className="flex items-center gap-3 cursor-pointer group min-w-0"
                                  >
                                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                                      {st.avatar ? (
                                        <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                                      ) : (
                                        st.name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                        {st.name}
                                      </h3>
                                      <p className="text-xs text-slate-500 truncate">{st.email || 'No email'}</p>
                                    </div>
                                  </div>

                                  {/* Dropdown Menu */}
                                  <div className="relative shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveMenuStudentId(activeMenuStudentId === st._id ? null : st._id)
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {activeMenuStudentId === st._id && (
                                      <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 text-xs animate-scale-in">
                                        <button
                                          onClick={() => {
                                            setActiveMenuStudentId(null)
                                            setSelectedStudentId(st._id)
                                          }}
                                          className="w-full px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                          <BookOpen size={13} /> View Courses
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveMenuStudentId(null)
                                            setEditingStudentForm({
                                              id: st._id,
                                              name: st.name,
                                              email: st.email,
                                              phoneNumber: st.phoneNumber || '',
                                            })
                                            setEditStudentModal(true)
                                          }}
                                          className="w-full px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                          <Pencil size={13} /> Edit Student
                                        </button>
                                        <button
                                          onClick={() => handleArchiveStudent(st._id)}
                                          className="w-full px-3 py-2 text-left font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                        >
                                          {st.isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                                          {st.isArchived ? 'Restore Student' : 'Archive Student'}
                                        </button>
                                        <div className="border-t border-slate-100 my-1" />
                                        <button
                                          onClick={() => {
                                            setActiveMenuStudentId(null)
                                            setDeletingStudent(st)
                                            setDeleteStudentModal(true)
                                          }}
                                          className="w-full px-3 py-2 text-left font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <Trash2 size={13} /> Delete Student
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Badges & Stats */}
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Purchased Courses</p>
                                    <p className="text-sm font-bold text-slate-900">{st.classrooms.length}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Active Classrooms</p>
                                    <p className="text-sm font-bold text-blue-600">
                                      {st.classrooms.filter((c) => c.status === 'active').length}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* View Profile Button */}
                              <button
                                onClick={() => setSelectedStudentId(st._id)}
                                className="mt-4 w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                View Purchased Courses ({st.classrooms.length})
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {tab === 'teachers' && (
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)]">Approved Teachers</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage teacher levels, per-class rates, and assigned courses.</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setRateMatrixForm(rateConfig || {
                        Junior: { range1: 120, range2: 135, range3: 150, range4: 165 },
                        Senior: { range1: 140, range2: 155, range3: 170, range4: 185 },
                        Master: { range1: 160, range2: 175, range3: 190, range4: 205 },
                      });
                      setShowRateMatrixModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Award size={16} /> Teacher Payment Settings
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {approvedTeachers.length === 0 ? (
                    <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                       <p className="text-slate-500">No approved teachers found.</p>
                    </div>
                  ) : (
                    approvedTeachers.map(teacher => {
                      const teacherCourses = getTeacherCourses(teacher._id)
                      const currentRate = teacher.profile?.perClassRate || 0
                      const teacherLevel = teacher.teacherLevel || teacher.profile?.teacherLevel || 'Junior'
                      return (
                        <div key={teacher._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0 cursor-pointer"
                              onClick={() => window.open(`/profile/${teacher._id}`, '_blank')}
                            >
                              {teacher.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3
                                  className="text-lg font-bold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => window.open(`/profile/${teacher._id}`, '_blank')}
                                >{teacher.name}</h3>
                                <TeacherLevelBadge level={teacherLevel} />
                              </div>
                              <p className="text-sm text-slate-500 truncate">{teacher.email}</p>
                            </div>
                          </div>

                          {/* Level & Rate summary row */}
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Selected Per-Class Rate</p>
                              <p className="text-lg font-bold text-slate-900">
                                {currentRate > 0 ? `₹${currentRate.toLocaleString('en-IN')}` : <span className="text-slate-400 text-sm font-medium">Not set</span>}
                              </p>
                            </div>
                            <button
                              onClick={() => openTeacherRateModal(teacher)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                            >
                              <Pencil size={13} /> Edit Level & Rate
                            </button>
                          </div>

                          <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Assigned Courses ({teacherCourses.length}):</h4>
                          {teacherCourses.length > 0 ? (
                            <ul className="space-y-1">
                              {teacherCourses.map(c => (
                                <li key={c._id} className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg truncate">
                                  <BookOpen size={14} className="shrink-0" />
                                  <span className="truncate">{c.title}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No courses assigned yet.</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                </div>
              </div>
            )}

            {/* ─────── STUDENTS TAB ─────── */}
            {tab === 'students' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {students.length === 0 ? (
                  <div className="p-12 text-center">
                     <p className="text-slate-500">No students found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Enrolled Courses</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {students.map(student => (
                          <tr key={student._id} onClick={() => window.open(`/profile/${student._id}`, '_blank')} className="hover:bg-slate-50 transition-colors cursor-pointer">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{student.email}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {student.enrolledCourses && student.enrolledCourses.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {student.enrolledCourses.map(course => (
                                    <span
                                      key={course._id}
                                      className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                                    >
                                      {course.title}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not enrolled in any course</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ─────── PENDING QUEUE TAB ─────── */}
            {tab === 'pending' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)]">
                  Pending Assignments ({pendingClassrooms.length})
                </h2>
                {pendingClassrooms.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-500">All classrooms have been assigned!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingClassrooms.map((cr) => (
                      <div key={cr._id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Pending</span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">{cr.classroomType}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{cr.course?.title || 'Untitled Course'}</h3>
                        <p className="text-sm text-slate-500 mb-1">
                          Students: {cr.enrolledStudents?.map(s => s.name).join(', ') || 'None'}
                        </p>
                        <p className="text-sm text-slate-500 mb-1">Total Sessions: {cr.totalSessions}</p>
                        <p className="text-xs text-slate-400 mb-4">
                          Purchased: {new Date(cr.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <Button variant="primary" size="sm" fullWidth onClick={() => openDispatchModal(cr)}>
                          <CalendarPlus size={14} className="mr-1" /> Assign & Schedule
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─────── PAYROLL TAB ─────── */}
            {tab === 'payroll' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-family-heading)]">Payroll</h2>
                  <Link
                    to="/admin/payouts"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:hover:scale-[1.02]"
                  >
                    <DollarSign size={16} />
                    Open Payout Dashboard
                  </Link>
                </div>

                {/* Month/Year Selector & Payment Settings Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-slate-700">Period:</label>
                    <select
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={payrollYear}
                      onChange={(e) => setPayrollYear(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const y = new Date().getFullYear() - 2 + i
                        return <option key={y} value={y}>{y}</option>
                      })}
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setRateMatrixForm(rateConfig || {
                        Junior: { range1: 120, range2: 135, range3: 150, range4: 165 },
                        Senior: { range1: 140, range2: 155, range3: 170, range4: 185 },
                        Master: { range1: 160, range2: 175, range3: 190, range4: 205 },
                      });
                      setShowRateMatrixModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Award size={16} /> Teacher Payment Settings
                  </Button>
                </div>

                {payrollLoading ? (
                  <div className="flex justify-center py-12"><LoadingSpinner /></div>
                ) : payrollData.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">No completed sessions found for this period.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                          <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                          <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</th>
                          <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Rate</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Penalty</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollData.map((row, i) => (
                          <tr key={row.teacherId || i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{row.teacherName}</td>
                            <td className="px-5 py-3.5 text-sm text-center">
                              <TeacherLevelBadge level={row.teacherLevel || 'Junior'} />
                            </td>
                            <td className="px-5 py-3.5 text-sm text-slate-600 text-center font-bold">{row.completedSessions}</td>
                            <td className="px-5 py-3.5 text-sm text-slate-600 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-semibold text-slate-900">₹{row.perClassRate || 0}</span>
                                <button
                                  onClick={() => openTeacherRateModal(row)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Edit Level & Rate"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-emerald-600 text-right font-medium">₹{(row.grossEarnings || 0).toLocaleString('en-IN')}</td>
                            <td className="px-5 py-3.5 text-sm text-red-500 text-right font-medium">{(row.totalPenalty || 0) > 0 ? `-₹${(row.totalPenalty || 0).toLocaleString('en-IN')}` : '₹0'}</td>
                            <td className="px-5 py-3.5 text-sm font-bold text-blue-600 text-right">₹{(row.netPayout || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50">
                          <td className="px-5 py-3 text-sm font-bold text-slate-900" colSpan="4">Grand Total</td>
                          <td className="px-5 py-3 text-sm font-bold text-emerald-600 text-right">
                            ₹{payrollData.reduce((sum, r) => sum + (r.grossEarnings || 0), 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3 text-sm font-bold text-red-500 text-right">
                            -₹{payrollData.reduce((sum, r) => sum + (r.totalPenalty || 0), 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">
                            ₹{payrollData.reduce((sum, r) => sum + (r.netPayout || 0), 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── DEMO REQUESTS TAB ────────────── */}
            {tab === 'demos' && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 flex-1">Demo Class Requests</h2>
                  {['pending','scheduled','completed','cancelled'].map(s => (
                    <button key={s} onClick={() => setDemoStatusFilter(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-all ${
                        demoStatusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {s} ({demoRequests.filter(d => d.status === s).length})
                    </button>
                  ))}
                </div>

                {demoRequests.filter(d => d.status === demoStatusFilter).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-3 text-slate-400">
                    <Video size={36} className="opacity-40" />
                    <p className="font-medium">No {demoStatusFilter} demo requests</p>
                  </div>
                ) : (
                  demoRequests.filter(d => d.status === demoStatusFilter).map(demo => (
                    <div key={demo._id} className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-start gap-4">
                        {demo.course?.thumbnailImage && (
                          <img src={demo.course.thumbnailImage} alt={demo.course.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800">{demo.course?.title}</h3>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              demo.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              demo.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700' :
                              demo.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-600'
                            }`}>{demo.status}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Student: <span className="font-medium">{demo.student?.name}</span>
                            <span className="text-slate-400 ml-2 text-xs">{demo.student?.email}</span>
                          </p>
                          {demo.status === 'scheduled' && demo.scheduledAt && (
                            <p className="text-xs text-emerald-700 mt-1">
                              {new Date(demo.scheduledAt).toLocaleString('en-IN', {
                                weekday: 'short', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true,
                              })}
                              {demo.instructor?.name && ` · ${demo.instructor.name}`}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            Requested {new Date(demo.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            {demo.paymentAmount > 0 && (
                              <span className="ml-2 text-emerald-600 font-semibold">
                                · Paid {demo.paymentCurrency === 'USD' ? `$${demo.paymentAmount}` : `₹${demo.paymentAmount}`}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {(demo.status === 'pending' || demo.status === 'scheduled') && (
                            <button onClick={() => openScheduleModal(demo)}
                              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              <CalendarPlus size={13} /> {demo.status === 'pending' ? 'Schedule' : 'Reschedule'}
                            </button>
                          )}
                          {demo.status === 'scheduled' && (
                            <button onClick={() => handleCompleteDemo(demo._id)}
                              className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              <CheckCircle2 size={13} /> Complete
                            </button>
                          )}
                          {(demo.status === 'pending' || demo.status === 'scheduled') && (
                            <button onClick={() => { setSelectedDemo(demo); setDemoCancelModal(true) }}
                              className="text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              <XCircle size={13} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
        </div>
      </div>


      {/* ── Schedule Demo Modal ─────────────── */}
      <Modal isOpen={demoModal} onClose={() => setDemoModal(false)} title="Schedule Demo Class">
        <div className="space-y-4">
          {selectedDemo && (
            <div className="bg-white/10 rounded-xl p-3 space-y-1">
              <p className="text-sm text-white/70">Course: <span className="text-white font-medium">{selectedDemo.course?.title}</span></p>
              <p className="text-sm text-white/70">Student: <span className="text-white font-medium">{selectedDemo.student?.name}</span></p>
            </div>
          )}
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Instructor <span className="text-red-400">*</span></label>
            <select value={demoInstructorId} onChange={e => setDemoInstructorId(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-slate-800">
              <option value="">Choose instructor…</option>
              {approvedTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70 block mb-1.5">Date <span className="text-red-400">*</span></label>
              <input type="date" value={demoDate} onChange={e => setDemoDate(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]" />
            </div>
            <div>
              <label className="text-sm text-white/70 block mb-1.5">Time <span className="text-red-400">*</span></label>
              <input type="time" value={demoTime} onChange={e => setDemoTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Duration (minutes)</label>
            <input type="number" value={demoDuration} min={15} max={180}
              onChange={e => setDemoDuration(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Meet Link <span className="text-red-400">*</span></label>
            <input type="url" value={demoMeetLink} onChange={e => setDemoMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Notes (optional)</label>
            <textarea value={demoNotes} onChange={e => setDemoNotes(e.target.value)} rows={2}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <Button variant="primary" fullWidth loading={demoModalLoading} onClick={handleScheduleDemo}>
            Schedule &amp; Notify Student
          </Button>
        </div>
      </Modal>

      {/* ── Cancel Demo Modal ──────────────── */}
      <Modal isOpen={demoCancelModal} onClose={() => setDemoCancelModal(false)} title="Cancel Demo Request">
        <div className="space-y-4">
          <p className="text-sm text-white/70">Are you sure you want to cancel the demo for <span className="text-white font-semibold">{selectedDemo?.student?.name}</span>?</p>
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Reason (optional)</label>
            <textarea value={demoCancelReason} onChange={e => setDemoCancelReason(e.target.value)} rows={2}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDemoCancelModal(false)}>Go Back</Button>
            <Button variant="danger" fullWidth onClick={handleCancelDemo}>Confirm Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* ── Dispatcher Modal ──────────────── */}
      <Modal isOpen={dispatchModal} onClose={() => setDispatchModal(false)} title="Assign Instructor & Schedule">
        <div className="space-y-5">
          {/* Classroom Info */}
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-sm text-white/70">Course: <span className="text-white font-medium">{dispatchClassroom?.course?.title}</span></p>
            <p className="text-sm text-white/70 mt-1">Students: <span className="text-white font-medium">{dispatchClassroom?.enrolledStudents?.map(s => s.name).join(', ')}</span></p>
            <p className="text-sm text-white/70 mt-1">Required Sessions: <span className="text-white font-medium">{dispatchClassroom?.totalSessions || 'Not set'}</span></p>
          </div>

          {/* Instructor Dropdown */}
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Select Instructor</label>
            <select
              value={dispatchInstructorId}
              onChange={(e) => setDispatchInstructorId(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">Choose an instructor...</option>
              {approvedTeachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Date Slots */}
          <div>
            <label className="text-sm text-white/70 block mb-1.5">Session Dates & Times</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {dispatchDates.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-white/50 w-6 shrink-0">#{i + 1}</span>
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => {
                      const updated = [...dispatchDates]
                      updated[i] = { ...updated[i], date: e.target.value }
                      setDispatchDates(updated)
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    value={d.time}
                    onChange={(e) => {
                      const updated = [...dispatchDates]
                      updated[i] = { ...updated[i], time: e.target.value }
                      setDispatchDates(updated)
                    }}
                    className="w-28 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                  />
                  {dispatchDates.length > 1 && (
                    <button
                      onClick={() => setDispatchDates(dispatchDates.filter((_, idx) => idx !== i))}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setDispatchDates([...dispatchDates, { date: '', time: '' }])}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={14} /> Add another date
            </button>
          </div>

          <Button variant="primary" fullWidth loading={dispatchLoading} onClick={handleDispatch}>
            Assign & Create Sessions
          </Button>
        </div>
      </Modal>

      {/* ── Teacher Payment Matrix Settings Modal ─────────────── */}
      <Modal isOpen={showRateMatrixModal} onClose={() => setShowRateMatrixModal(false)} title="Teacher Payment Matrix Settings">
        <form onSubmit={handleSaveRateMatrix} className="space-y-6">
          <p className="text-xs font-medium text-slate-200">
            Set the per-class payout rates (₹) for each Teacher Level across monthly session tiers. Admin can manually assign any of these rates to a teacher.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Teacher Level</th>
                  <th className="p-3 text-center">0–24 Sessions</th>
                  <th className="p-3 text-center">25–48 Sessions</th>
                  <th className="p-3 text-center">49–72 Sessions</th>
                  <th className="p-3 text-center">73–96 Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {['Junior', 'Senior', 'Master'].map((level) => (
                  <tr key={level} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">
                      <TeacherLevelBadge level={level} />
                    </td>
                    {['range1', 'range2', 'range3', 'range4'].map((rangeKey) => (
                      <td key={rangeKey} className="p-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            required
                            value={rateMatrixForm?.[level]?.[rangeKey] ?? ''}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setRateMatrixForm((prev) => ({
                                ...prev,
                                [level]: {
                                  ...prev?.[level],
                                  [rangeKey]: val,
                                },
                              }))
                            }}
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowRateMatrixModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={savingRateMatrix}
            >
              Save Payment Matrix
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Teacher Level & Manual Rate Selection Modal ─────────────── */}
      <Modal isOpen={editTeacherRateModal} onClose={() => setEditTeacherRateModal(false)} title="Edit Teacher Level & Per-Class Rate">
        {editingTeacherData && (() => {
          const currentLevelMatrix = (rateConfig && rateConfig[selectedTeacherLevel]) || {
            Junior: { range1: 120, range2: 135, range3: 150, range4: 165 },
            Senior: { range1: 140, range2: 155, range3: 170, range4: 185 },
            Master: { range1: 160, range2: 175, range3: 190, range4: 205 },
          }[selectedTeacherLevel]

          const levelRateOptions = [
            { label: `₹${currentLevelMatrix?.range1 || 0} (0–24 Sessions)`, value: currentLevelMatrix?.range1 || 0 },
            { label: `₹${currentLevelMatrix?.range2 || 0} (25–48 Sessions)`, value: currentLevelMatrix?.range2 || 0 },
            { label: `₹${currentLevelMatrix?.range3 || 0} (49–72 Sessions)`, value: currentLevelMatrix?.range3 || 0 },
            { label: `₹${currentLevelMatrix?.range4 || 0} (73–96 Sessions)`, value: currentLevelMatrix?.range4 || 0 },
          ]

          return (
            <form onSubmit={handleSaveTeacherLevelAndRate} className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900">{editingTeacherData.name || editingTeacherData.teacherName}</p>
                <p className="text-xs text-slate-500">{editingTeacherData.email}</p>
              </div>

              {/* 1. Teacher Level Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-100 uppercase tracking-wider block mb-1.5 opacity-100">Teacher Level</label>
                <select
                  value={selectedTeacherLevel}
                  onChange={(e) => {
                    const newLevel = e.target.value
                    setSelectedTeacherLevel(newLevel)
                    const newMatrix = (rateConfig && rateConfig[newLevel]) || {
                      Junior: { range1: 120, range2: 135, range3: 150, range4: 165 },
                      Senior: { range1: 140, range2: 155, range3: 170, range4: 185 },
                      Master: { range1: 160, range2: 175, range3: 190, range4: 205 },
                    }[newLevel]
                    setSelectedPerClassRate(newMatrix?.range1 || 0)
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              {/* 2. Manual Per-Class Rate Selection (Filtered by Level) */}
              <div>
                <label className="text-xs font-semibold text-slate-100 uppercase tracking-wider block mb-1.5 opacity-100">Per-Class Rate (Manually Selected)</label>
                <select
                  value={selectedPerClassRate}
                  onChange={(e) => setSelectedPerClassRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  {levelRateOptions.map((opt, idx) => (
                    <option key={idx} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Displays only rate options configured for the <span className="font-semibold text-slate-800">{selectedTeacherLevel}</span> level.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditTeacherRateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={savingTeacherRate}
                >
                  Save Level & Rate
                </Button>
              </div>
            </form>
          )
        })()}
      </Modal>

      {/* ── Edit Student Modal ───────────────────────── */}
      <Modal isOpen={editStudentModal} onClose={() => setEditStudentModal(false)} title="Edit Student Information">
        <form onSubmit={handleEditStudentSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-100 uppercase tracking-wider block mb-1 opacity-100">Student Name</label>
            <input
              type="text"
              required
              value={editingStudentForm.name}
              onChange={(e) => setEditingStudentForm({ ...editingStudentForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-100 uppercase tracking-wider block mb-1 opacity-100">Email Address</label>
            <input
              type="email"
              required
              value={editingStudentForm.email}
              onChange={(e) => setEditingStudentForm({ ...editingStudentForm, email: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-100 uppercase tracking-wider block mb-1 opacity-100">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. +91 9876543210"
              value={editingStudentForm.phoneNumber}
              onChange={(e) => setEditingStudentForm({ ...editingStudentForm, phoneNumber: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditStudentModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={savingStudentEdit}
            >
              Save Student Info
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Student Confirmation Modal ─────────── */}
      <Modal isOpen={deleteStudentModal} onClose={() => setDeleteStudentModal(false)} title="Delete Student Confirmation">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-900">Permanent Deletion Warning</h4>
              <p className="text-xs text-red-700 mt-0.5">
                Are you sure you want to permanently delete <strong className="text-red-900">{deletingStudent?.name}</strong>? This action cannot be undone.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Deleting this student will remove their account record and un-enroll them from all active classrooms.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteStudentModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              loading={deletingStudentLoading}
              onClick={handleDeleteStudentConfirm}
            >
              Permanently Delete Student
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ── Deep Dive Component ── */
function AdminClassroomDeepDive({ id, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add Session State
  const [addSessionModal, setAddSessionModal] = useState(false);
  const [addSessionDate, setAddSessionDate] = useState('');
  const [addSessionNumber, setAddSessionNumber] = useState('');
  const [addSessionLoading, setAddSessionLoading] = useState(false);

  // Cancel and Reschedule Session States
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelSessionItem, setCancelSessionItem] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleSessionItem, setRescheduleSessionItem] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', startTime: '', endTime: '' });
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

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
  }, [id]);

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!addSessionDate) return toast.error('Date is required');
    setAddSessionLoading(true);
    try {
      await api.post(`/admin/classrooms/${id}/sessions`, { 
        scheduleDate: addSessionDate,
        sessionNumber: addSessionNumber ? Number(addSessionNumber) : undefined
      });
      toast.success('Session added successfully!');
      setAddSessionModal(false);
      setAddSessionDate('');
      setAddSessionNumber('');
      await fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add session');
    } finally {
      setAddSessionLoading(false);
    }
  };

  const handleCancelSession = async (e) => {
    e.preventDefault();
    if (!cancellationReason) return toast.error('Reason is required');
    setCancelLoading(true);
    try {
      await api.patch(`/classrooms/sessions/${cancelSessionItem._id}/cancel`, { cancellationReason });
      toast.success('Session cancelled');
      setCancelModal(false);
      setCancelSessionItem(null);
      setCancellationReason('');
      await fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel session');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleSession = async (e) => {
    e.preventDefault();
    setRescheduleLoading(true);
    try {
      await api.patch(`/classrooms/sessions/${rescheduleSessionItem._id}/reschedule`, {
        scheduledDate: rescheduleForm.date,
        startTime: new Date(`${rescheduleForm.date}T${rescheduleForm.startTime}`).toISOString(),
        endTime: new Date(`${rescheduleForm.date}T${rescheduleForm.endTime}`).toISOString()
      });
      toast.success('Session rescheduled successfully');
      setRescheduleModal(false);
      setRescheduleSessionItem(null);
      setRescheduleForm({ date: '', startTime: '', endTime: '' });
      await fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule session');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const openCancelModal = (session) => {
    setCancelSessionItem(session);
    setCancellationReason('');
    setCancelModal(true);
  };

  const openRescheduleModal = (session) => {
    setRescheduleSessionItem(session);
    setRescheduleForm({
      date: "",
      startTime: "",
      endTime: "",
    });
    setRescheduleModal(true);
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
        <ArrowLeft size={16} /> Back to Classrooms
      </button>

      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-2">
            {classroom.course?.title}
          </h2>
          <div className="flex items-center gap-2 mt-2 mb-6">
            <span className="text-sm text-slate-500 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold border border-blue-100">
              {classroom.progressPercentage}% Completed
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            {/* Teacher Column */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instructor</p>
              <div 
                onClick={() => window.open(`/profile/${classroom.teacher?._id}`, '_blank')}
                className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {classroom.teacher?.profile?.avatarUrl ? <img src={classroom.teacher.profile.avatarUrl} className="w-full h-full object-cover" /> : classroom.teacher?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{classroom.teacher?.name}</p>
                </div>
              </div>
            </div>

            {/* Students Column */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Students ({enrolledStudents.length})</p>
              <div className="flex flex-col gap-2">
                {enrolledStudents.map((st) => (
                  <div 
                    key={st?._id || st}
                    onClick={() => window.open(`/profile/${st?._id || st}`, '_blank')}
                    className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 text-sm font-bold shadow-sm">
                      {st?.profile?.avatarUrl ? <img src={st.profile.avatarUrl} className="w-full h-full object-cover" /> : st?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{st?.name}</p>
                    </div>
                  </div>
                ))}
                {enrolledStudents.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No students enrolled</p>
                )}
              </div>
            </div>
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
          <h3 className="font-bold text-slate-900 flex items-center gap-2">Session Management Timeline</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">{sessions.length} scheduled</span>
            {classroom.status !== 'pending_assignment' && (
              <Button size="sm" onClick={() => setAddSessionModal(true)}>
                <Plus size={14} className="mr-1 inline-block" /> Add Extra Session
              </Button>
            )}
          </div>
        </div>
        
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sessions have been scheduled yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...sessions].sort((a, b) => new Date(a.startTime || a.scheduledDate || 0) - new Date(b.startTime || b.scheduledDate || 0) || (a.sessionNumber || 0) - (b.sessionNumber || 0)).map(s => {
              const isPast = new Date(s.endTime) < new Date();
              return (
                <div 
                  key={s._id} 
                  className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/classrooms/${id}/sessions/${s._id}`)}
                >
                  {/* Left Column: Date & Time */}
                  <div className="md:w-48 shrink-0">
                    <div className="text-sm font-bold text-slate-900">{fmtDate(s.scheduledDate)}</div>
                    <div className="text-sm text-slate-500">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</div>
                    
                    <div className="mt-2 flex flex-col gap-2 items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        isPast ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status === 'scheduled' && isPast ? 'overdue' : s.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Details */}
                  <div className="flex-1 min-w-0 md:border-l-2 border-slate-100 md:pl-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">#{s.sessionNumber}</span>
                      <Link to={`/classrooms/${id}/sessions/${s._id}`} className="text-base font-bold !text-slate-900 hover:!text-blue-600 transition-colors flex items-center gap-2">
                        {s.title}
                        {(s.homework?.content || s.homework?.files?.length > 0) && <FileText size={13} className="text-blue-400" title="Homework" />}
                        {s.recordingLink && <PlayCircle size={13} className="text-emerald-400" title="Recording" />}
                      </Link>
                    </div>

                    {s.status === 'scheduled' && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openRescheduleModal(s)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                        >
                          <CalendarDays size={14} /> Reschedule
                        </button>
                        <button
                          onClick={() => openCancelModal(s)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Add Session Modal */}
      <Modal isOpen={addSessionModal} onClose={() => setAddSessionModal(false)} title="Add Extra Session">
        <form onSubmit={handleAddSession} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white block mb-1">Session Date & Time *</label>
            <input
              type="datetime-local"
              required
              className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={addSessionDate}
              onChange={(e) => setAddSessionDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white block mb-1">Session Number (Optional)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 25"
              className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={addSessionNumber}
              onChange={(e) => setAddSessionNumber(e.target.value)}
            />
            <p className="text-xs text-white/50 mt-1">Leave blank to automatically assign the next available session number.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" className="text-white" onClick={() => setAddSessionModal(false)}>Cancel</Button>
          </div>
          <Button type="submit" variant="primary" fullWidth loading={addSessionLoading}>Add Session</Button>
        </form>
      </Modal>

      {/* Cancel Session Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Session">
        <form onSubmit={handleCancelSession} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white block mb-1">Reason for Cancellation</label>
            <textarea
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              rows={3}
              placeholder="E.g., Teacher sick, emergency, etc."
            />
          </div>
          <Button type="submit" variant="danger" fullWidth loading={cancelLoading}>Confirm Cancellation</Button>
        </form>
      </Modal>

      {/* Reschedule Session Modal */}
      <Modal isOpen={rescheduleModal} onClose={() => setRescheduleModal(false)} title="Reschedule Session">
        <form onSubmit={handleRescheduleSession} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white block mb-1">New Date</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleForm.date}
              onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white block mb-1">Start Time</label>
              <input
                type="time"
                required
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white block mb-1">End Time</label>
              <input
                type="time"
                required
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg flex gap-2 text-sm">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <p>This will change the date and time of the current session.</p>
          </div>
          <Button type="submit" variant="primary" fullWidth loading={rescheduleLoading}>Confirm Reschedule</Button>
        </form>
      </Modal>
    </div>
  );
}
