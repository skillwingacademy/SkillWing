import SessionCard from './SessionCard'
import { CalendarDays } from 'lucide-react'

function groupByDate(sessions) {
  const groups = {}
  sessions.forEach((session) => {
    const date = new Date(session.startTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(session)
  })
  return groups
}

export default function SessionTimeline({ sessions = [] }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
          <CalendarDays size={28} className="text-blue-400/50" />
        </div>
        <p className="text-slate-400 font-medium">No sessions scheduled</p>
        <p className="text-sm text-slate-500 mt-1">Sessions will appear here once scheduled.</p>
      </div>
    )
  }

  // Sort by startTime ascending
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  )

  const grouped = groupByDate(sorted)

  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-[15px] top-6 bottom-6 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/20 to-transparent" />

      <div className="space-y-8">
        {Object.entries(grouped).map(([date, dateSessions], groupIndex) => (
          <div
            key={date}
            className="animate-slide-up opacity-0"
            style={{ animationDelay: `${groupIndex * 100}ms`, animationFillMode: 'forwards' }}
          >
            {/* Date separator */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center z-10 shadow-lg shadow-blue-500/20 shrink-0">
                <CalendarDays size={14} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wide">
                {date}
              </h3>
            </div>

            {/* Sessions for this date */}
            <div className="ml-[38px] space-y-3">
              {dateSessions.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
