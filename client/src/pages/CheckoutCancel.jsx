import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { XCircle, ArrowLeft } from 'lucide-react'

export default function CheckoutCancel() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-md animate-scale-in">
        {/* Cancel icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-rose-500 opacity-15 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 flex items-center justify-center">
            <XCircle size={40} className="text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold font-[family-name:var(--font-family-heading)] text-white mb-3">
          Payment Cancelled
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your payment was cancelled or could not be completed. Don't worry — you can try again anytime.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button size="lg" className="group">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Browse Courses
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
