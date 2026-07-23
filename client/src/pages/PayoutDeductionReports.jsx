import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ArrowLeft, FileText, Clock, UserX, XCircle, CheckCircle2,
  AlertTriangle, Calendar, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

/**
 * Derive a human-readable reason string from session data
 */
function getReasonText(session) {
  const pt = session.financials?.penaltyType
  if (pt === 'noshow') return 'Teacher not available — no show'
  if (pt === 'late') return 'Teacher late entry (>5 min after start)'
  if (pt === 'lmc') return `Teacher not available — LMC (inside 4 hours)`
  if (session.studentNoShowExempt) return 'Student no show — teacher exempted (waited 20+ min)'
  if (session.status === 'cancelled') return session.cancellationReason || 'Session cancelled'
  return '—'
}

function getStatusBadge(status) {
  switch (status) {
    case 'completed':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} /> Completed</span>
    case 'cancelled':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"><XCircle size={12} /> Cancelled</span>
    default:
      return <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{status}</span>
  }
}

function getPenaltyBadge(penaltyType) {
  switch (penaltyType) {
    case 'noshow':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><UserX size={11} /> No Show</span>
    case 'late':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock size={11} /> Late</span>
    case 'lmc':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"><AlertTriangle size={11} /> LMC</span>
    default:
      return <span className="text-xs text-slate-400">—</span>
  }
}

export default function PayoutDeductionReports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAdmin = user?.role === 'admin'
  const basePath = isAdmin ? '/admin' : '/teacher'

  const [month, setMonth] = useState(parseInt(searchParams.get('month')) || new Date().getMonth() + 1)
  const [year, setYear] = useState(parseInt(searchParams.get('year')) || new Date().getFullYear())
  const [selectedTeacher, setSelectedTeacher] = useState(searchParams.get('teacher') || 'all')
  const [filterPenalty, setFilterPenalty] = useState('all')

  const [sessions, setSessions] = useState([])
  const [allTeachers, setAllTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin ? '/admin/payouts' : '/teacher/payouts'
      const res = await api.get(`${endpoint}?month=${month}&year=${year}`)
      const data = res.data.data

      if (isAdmin) {
        setAllTeachers(Array.isArray(data) ? data : [])

        let allSessions = []
        const teachers = Array.isArray(data) ? data : []
        if (selectedTeacher === 'all') {
          teachers.forEach(t => {
            (t.sessions || []).forEach(s => {
              allSessions.push({ ...s, teacherName: t.teacherName })
            })
          })
        } else {
          const teacher = teachers.find(t => t.teacherId === selectedTeacher)
          if (teacher) {
            allSessions = (teacher.sessions || []).map(s => ({ ...s, teacherName: teacher.teacherName }))
          }
        }
        setSessions(allSessions)
      } else {
        // Teacher: single result
        setSessions((data.sessions || []).map(s => ({ ...s, teacherName: data.teacherName })))
      }
    } catch (err) {
      console.error('Error fetching payout details:', err)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [month, year, selectedTeacher])

  const filteredSessions = filterPenalty === 'all'
    ? sessions
    : sessions.filter(s => (s.financials?.penaltyType || 'none') === filterPenalty)

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleString('default', { month: 'long' })
  )

  return (
    <div className="page-enter min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <button
            onClick={() => navigate(`${basePath}/payouts`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Payout Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                Detailed Payout Report
              </h1>
              <p className="text-slate-500 text-sm">Session-level reconciliation audit trail</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
          {isAdmin && allTeachers.length > 0 && (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[200px]"
            >
              <option value="all">All Teachers</option>
              {allTeachers.map(t => (
                <option key={t.teacherId} value={t.teacherId}>{t.teacherName}</option>
              ))}
            </select>
          )}
          <select
            value={filterPenalty}
            onChange={(e) => setFilterPenalty(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">All Types</option>
            <option value="none">No Penalty</option>
            <option value="late">Late Entry</option>
            <option value="noshow">No Show</option>
            <option value="lmc">LMC</option>
          </select>
        </div>

        {/* Summary bar */}
        <div className="flex gap-4 mb-6 text-sm animate-slide-up" style={{ animationDelay: '0.08s' }}>
          <span className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-slate-600">
            <span className="font-bold text-slate-900">{filteredSessions.length}</span> sessions
          </span>
          {filterPenalty !== 'all' && (
            <button
              onClick={() => setFilterPenalty('all')}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <XCircle size={14} /> Clear filter
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm animate-slide-up">
            <Filter size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No sessions found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or selecting a different month.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Session #</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                    {isAdmin && (
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Teacher</th>
                    )}
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Student</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Course</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Penalty</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Payout</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map((s, i) => {
                    const payout = s.financials?.finalPayout || 0
                    return (
                      <tr key={s.sessionId || i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                          #{s.sessionNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">
                            {s.classroomType || 'Class'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {s.teacherName || '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {s.studentNames && s.studentNames.length > 0 ? s.studentNames.join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[160px] truncate" title={s.courseTitle}>
                          {s.courseTitle || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{s.scheduledDate ? fmtDate(s.scheduledDate) : '—'}</span>
                          </div>
                          {s.startTime && (
                            <div className="text-xs text-slate-400 ml-5">{fmtTime(s.startTime)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(s.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getPenaltyBadge(s.financials?.penaltyType)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap text-right ${
                          payout < 0 ? 'text-red-600' : payout > 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {payout < 0 ? `-₹${Math.abs(payout).toLocaleString('en-IN')}` : `₹${payout.toLocaleString('en-IN')}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                          <span className="line-clamp-2" title={getReasonText(s)}>
                            {getReasonText(s)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
