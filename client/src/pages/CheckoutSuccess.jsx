import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'

export default function CheckoutSuccess() {
  return (
    <div className="minh-h-screen bg-white">
    <div className="min-h-[80vh] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-md animate-scale-in">
        {/* Success animation */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-pulse-glow" />
          {/* Circle */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          {/* Sparkles */}
          <Sparkles
            size={16}
            className="absolute -top-1 -right-1 text-amber-400 animate-bounce-soft"
          />
          <Sparkles
            size={12}
            className="absolute -bottom-1 -left-2 text-blue-400 animate-bounce-soft"
            style={{ animationDelay: '300ms' }}
          />
        </div>

        <h1 className="text-3xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-3">
          Payment Successful!
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You're all set! Your enrollment has been confirmed. Head to your dashboard to start learning.
        </p>

        <Link to="/dashboard">
          <Button size="lg" className="group">
            Go to Dashboard
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
    </div>
  )
}
