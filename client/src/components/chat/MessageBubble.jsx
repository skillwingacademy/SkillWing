import { useState } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

/**
 * MessageBubble — renders a single chat message.
 *
 * Props:
 *   message: Message document (populated sender)
 *   showSenderName: boolean  — show sender name above bubble (useful when many users)
 */
export default function MessageBubble({ message, showSenderName }) {
  const { user } = useAuth()
  const isMe = message.sender?._id === user?.id || message.sender?._id === user?._id
  const [imgExpanded, setImgExpanded] = useState(false)

  const time = new Date(message.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const avatar =
    message.sender?.profile?.avatarUrl ||
    message.sender?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.name || 'U')}&background=2563eb&color=fff&size=64`

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isMe && (
        <img
          src={avatar}
          alt={message.sender?.name}
          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
        />
      )}

      <div className={`flex flex-col gap-1 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showSenderName && !isMe && (
          <span className="text-xs text-slate-500 px-1">{message.sender?.name}</span>
        )}

        {/* Bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
            isMe
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }`}
        >
          {message.type === 'image' ? (
            <div>
              <img
                src={message.imageUrl}
                alt="shared image"
                onClick={() => setImgExpanded(true)}
                className="max-w-[220px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
              {message.content && (
                <p className={`mt-1.5 text-xs ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                  {message.content}
                </p>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11px] text-slate-400">{time}</span>
          {isMe && (
            message.readBy?.length > 1
              ? <CheckCheck size={12} className="text-blue-500" />
              : <Check size={12} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {imgExpanded && message.type === 'image' && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImgExpanded(false)}
        >
          <img
            src={message.imageUrl}
            alt="enlarged"
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
