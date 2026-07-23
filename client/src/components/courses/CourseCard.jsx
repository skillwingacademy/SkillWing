import { Link } from 'react-router-dom'
import { User, IndianRupee, BookOpen } from 'lucide-react'
import { useCurrency } from '../../context/CurrencyContext'

export default function CourseCard({ course }) {
  const {
    _id,
    title,
    thumbnailImage: thumbnail,
    price,
    currency: legacyCurrency,
    educator,
    instructors,
  } = course

  const { currency, symbol } = useCurrency()

  // Compute lowest tier price, falling back to legacy `price` field
  const pricing = course.pricing?.[currency.toLowerCase()] || {}
  const tierPrices = [pricing.oneOnOne, pricing.double, pricing.batch].filter(p => p > 0)
  const lowestPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : (price || 0)
  const currencySymbol = symbol

  // Resolve instructor names: prefer new instructors array, fall back to educator
  const instructorNames =
    instructors && instructors.length > 0
      ? instructors.map((i) => (typeof i === 'object' ? i.name : i))
      : educator
        ? [typeof educator === 'object' ? educator.name : educator]
        : ['Instructor']
  const displayInstructor = instructorNames.join(', ')

  return (
    <Link
      to={`/courses/${_id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600/30 to-blue-600/30">
            <BookOpen size={40} className="text-blue-400/60" />
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Price badge */}
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            {lowestPrice > 0 ? (
              <>From {currencySymbol}{lowestPrice}</>
            ) : (
              <span className="text-emerald-400">Free</span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 flex-1 text-lg font-semibold leading-snug text-slate-900 transition-colors duration-200 group-hover:text-blue-600">
          {title}
        </h3>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
            <User size={12} className="text-slate-500" />
          </div>
          <span className="truncate text-sm text-slate-500">{displayInstructor}</span>
        </div>
      </div>
    </Link>
  )
}
