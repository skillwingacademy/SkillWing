import { useState, useRef } from 'react'
import { Image, Send, X } from 'lucide-react'

/**
 * ChatInput — text input with image attachment support.
 *
 * Props:
 *   onSendText(text: string) — called when user sends a text message
 *   onSendImage(file: File)  — called when user picks an image
 *   disabled: boolean
 *   onTyping()               — called on each keystroke
 *   onStopTyping()           — called when the user stops typing
 */
export default function ChatInput({ onSendText, onSendImage, disabled, onTyping, onStopTyping }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null) // { file, url }
  const fileRef = useRef(null)
  const typingTimer = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    onTyping?.()
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => onStopTyping?.(), 1500)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    e.target.value = ''
  }

  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const handleSend = () => {
    if (disabled) return
    if (preview) {
      onSendImage?.(preview.file)
      clearPreview()
      return
    }
    const trimmed = text.trim()
    if (!trimmed) return
    onSendText?.(trimmed)
    setText('')
    clearTimeout(typingTimer.current)
    onStopTyping?.()
  }

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      {/* Image preview strip */}
      {preview && (
        <div className="mb-2 flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
          <img
            src={preview.url}
            alt="preview"
            className="h-14 w-14 rounded-lg object-cover border border-slate-200"
          />
          <span className="text-sm text-slate-600 flex-1 truncate">{preview.file.name}</span>
          <button
            onClick={clearPreview}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image picker */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40"
          title="Send image"
        >
          <Image size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || !!preview}
          placeholder={preview ? 'Press send to share image…' : 'Type a message…'}
          rows={1}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 max-h-28 overflow-y-auto"
          style={{ minHeight: '42px' }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !preview)}
          className="shrink-0 p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
