import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Clock, UserX, XCircle, CheckCircle2, Calendar, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════════
   SVG Donut Chart — pure SVG, no extra library
   ═══════════════════════════════════════════════════ */
function DonutChart({ gross, penalty, net }) {
  const total = gross + penalty || 1
  const earningsAngle = (gross / total) * 360
  const radius = 80
  const stroke = 20
  const center = 100

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    if (endAngle - startAngle >= 360) {
      // Full circle
      return [
        `M ${cx} ${cy - r}`,
        `A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
      ].join(' ')
    }
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {/* Earnings arc */}
        {gross > 0 && (
          <path
            d={describeArc(center, center, radius, 0, earningsAngle)}
            fill="none"
            stroke="url(#earningsGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
        {/* Penalty arc */}
        {penalty > 0 && (
          <path
            d={describeArc(center, center, radius, earningsAngle, 360)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.8"
          />
        )}
        <defs>
          <linearGradient id="earningsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0057dc" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Net Payout</span>
        <span className="text-2xl font-bold text-slate-900">₹{(net || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main PayoutDashboard Component
   ═══════════════════════════════════════════════════ */
export default function PayoutDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const basePath = isAdmin ? '/admin' : '/teacher'

  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedTeacher, setSelectedTeacher] = useState('all')

  // Data
  const [payoutData, setPayoutData] = useState(null)
  const [allTeachers, setAllTeachers] = useState([]) // For admin dropdown
  const [loading, setLoading] = useState(true)

  const fetchPayouts = async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin ? '/admin/payouts' : '/teacher/payouts'
      const res = await api.get(`${endpoint}?month=${month}&year=${year}`)
      const data = res.data.data

      if (isAdmin) {
        // Admin gets array of teacher payroll entries
        setAllTeachers(data)

        if (selectedTeacher === 'all') {
          // Aggregate all teachers
          const agg = {
            completedSessions: 0,
            grossEarnings: 0,
            totalPenalty: 0,
            netPayout: 0,
            deductions: {
              noShow: { count: 0, amount: 0 },
              late: { count: 0, amount: 0 },
              lmc: { count: 0, amount: 0 },
            },
            sessions: [],
          }
          data.forEach(t => {
            agg.completedSessions += t.completedSessions || 0
            agg.grossEarnings += t.grossEarnings || 0
            agg.totalPenalty += t.totalPenalty || 0
            agg.netPayout += t.netPayout || 0
            agg.deductions.noShow.count += t.deductions?.noShow?.count || 0
            agg.deductions.noShow.amount += t.deductions?.noShow?.amount || 0
            agg.deductions.late.count += t.deductions?.late?.count || 0
            agg.deductions.late.amount += t.deductions?.late?.amount || 0
            agg.deductions.lmc.count += t.deductions?.lmc?.count || 0
            agg.deductions.lmc.amount += t.deductions?.lmc?.amount || 0
            agg.sessions = agg.sessions.concat(t.sessions || [])
          })
          setPayoutData(agg)
        } else {
          const teacher = data.find(t => t.teacherId === selectedTeacher)
          setPayoutData(teacher || null)
        }
      } else {
        // Teacher gets single object
        setPayoutData(data)
      }
    } catch (err) {
      console.error('Error fetching payouts:', err)
      toast.error('Failed to load payout data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [month, year, selectedTeacher])

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleString('default', { month: 'long' })
  )

  return (
    <div className="page-enter min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <button
            onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/teacher/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900">
                Payout Dashboard
              </h1>
              <p className="text-slate-500 text-sm">Earnings, deductions & reconciliation overview</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
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
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : !payoutData || (payoutData.completedSessions === 0 && payoutData.grossEarnings === 0 && (!payoutData.sessions || payoutData.sessions.length === 0)) ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm animate-slide-up">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Available</h3>
            <p className="text-slate-500">No completed or reconciled sessions found for {monthNames[month - 1]} {year}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>

            {/* ═══════ LEFT: Chart + Stats (3 cols) ═══════ */}
            <div className="lg:col-span-3 space-y-6">

              {/* Donut Chart Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-6 font-[family-name:var(--font-family-heading)]">
                  Monthly Overview
                </h2>
                <div className="flex flex-col items-center">
                  <DonutChart
                    gross={payoutData.grossEarnings || 0}
                    penalty={payoutData.totalPenalty || 0}
                    net={payoutData.netPayout || 0}
                  />

                  {/* Legend */}
                  <div className="flex gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-500"></div>
                      <span className="text-xs text-slate-500">Earnings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-500">Penalties</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <TrendingUp size={18} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-500">Gross Earnings</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">₹{(payoutData.grossEarnings || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <TrendingDown size={18} className="text-red-600" />
                    </div>
                    <span className="text-sm text-slate-500">Total Penalty</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">₹{(payoutData.totalPenalty || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg shadow-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <DollarSign size={18} className="text-white" />
                    </div>
                    <span className="text-sm text-blue-100">Net Payout</span>
                  </div>
                  <p className="text-2xl font-bold text-white">₹{(payoutData.netPayout || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* ═══════ RIGHT: Breakdown Grid (2 cols) ═══════ */}
            <div className="lg:col-span-2 space-y-6">

              {/* Earnings Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Earnings
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Total Regular Classes</p>
                      <p className="text-xs text-slate-400">Completed sessions</p>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{payoutData.completedSessions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Gross Cash</p>
                      <p className="text-xs text-slate-400">Before deductions</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">₹{(payoutData.grossEarnings || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  Deductions
                </h3>
                <div className="space-y-3">
                  {/* No Show */}
                  <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <UserX size={14} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">No Show</p>
                        <p className="text-xs text-slate-400">{payoutData.deductions?.noShow?.count || 0} occurrences</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      -₹{(payoutData.deductions?.noShow?.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Late Entry */}
                  <div className="flex justify-between items-center p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Clock size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Late Entry</p>
                        <p className="text-xs text-slate-400">{payoutData.deductions?.late?.count || 0} occurrences</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      -₹{(payoutData.deductions?.late?.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* LMC */}
                  <div className="flex justify-between items-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                        <XCircle size={14} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">LMC</p>
                        <p className="text-xs text-slate-400">{payoutData.deductions?.lmc?.count || 0} occurrences</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-orange-600">
                      -₹{(payoutData.deductions?.lmc?.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Details Link */}
              <Link
                to={`${basePath}/payouts/details?month=${month}&year=${year}${selectedTeacher !== 'all' ? `&teacher=${selectedTeacher}` : ''}`}
                className="flex items-center justify-between w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  View Detailed Report
                </span>
                <ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
