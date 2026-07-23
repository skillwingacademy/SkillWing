import { CalendarDays, Clock, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'

function getSessionStatus(startTime, endTime) {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)
  const fifteenMinBefore = new Date(start.getTime() - 15 * 60000)

  if (now >= start && now <= end) return 'live'
  if (now >= fifteenMinBefore && now < start) return 'starting-soon'
  if (now < start) return 'upcoming'
  return 'ended'
}

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

export default function SessionCard({ session }) {
  const { title, startTime, endTime, meetLink, isLinkVisible } = session
  const status = getSessionStatus(startTime, endTime)

  const statusConfig = {
    live: {
      label: 'Live Now',
      dotClass: 'status-dot status-dot-live animate-live-pulse',
      cardBorder: 'border-emerald-500/30 shadow-emerald-500/10 shadow-lg',
      textColor: 'text-emerald-400',
    },
    'starting-soon': {
      label: 'Starting Soon',
      dotClass: 'status-dot status-dot-upcoming',
      cardBorder: 'border-amber-500/20',
      textColor: 'text-amber-400',
    },
    upcoming: {
      label: 'Upcoming',
      dotClass: 'status-dot status-dot-upcoming',
      cardBorder: 'border-white/5',
      textColor: 'text-amber-400',
    },
    ended: {
      label: 'Ended',
      dotClass: 'status-dot status-dot-ended',
      cardBorder: 'border-white/5 opacity-60',
      textColor: 'text-slate-500',
    },
  }

  const config = statusConfig[status]
  const showJoinButton =
    (status === 'live' || status === 'starting-soon') &&
    meetLink &&
    isLinkVisible !== false

  return (
    <div className={`glass-card p-5 ${config.cardBorder} transition-all duration-300`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-black truncate font-[family-name:var(--font-family-heading)]">
            {title}
          </h4>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-blue-400" />
              {formatDate(startTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-blue-400" />
              {formatTime(startTime)} – {formatTime(endTime)}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={config.dotClass} />
          <span className={`text-xs font-medium ${config.textColor}`}>
            {config.label}
          </span>
        </div>
      </div>

      {showJoinButton && (
        <div className="mt-4">
          <a href={meetLink} target="_blank" rel="noopener noreferrer">
            <Button variant="accent" size="sm" className="gap-1.5">
              <ExternalLink size={14} />
              Join Class
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
