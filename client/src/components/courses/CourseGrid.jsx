import CourseCard from './CourseCard'
import { BookOpen } from 'lucide-react'

export default function CourseGrid({ courses = [], emptyMessage = 'No courses found' }) {
  if (!courses || courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
          <BookOpen size={32} className="text-blue-400/50" />
        </div>
        <p className="text-lg text-slate-400 font-medium">{emptyMessage}</p>
        <p className="text-sm text-slate-500 mt-1">Check back later for new content.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course, index) => (
        <div
          key={course._id}
          className="animate-slide-up opacity-0"
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
        >
          <CourseCard course={course} />
        </div>
      ))}
    </div>
  )
}
