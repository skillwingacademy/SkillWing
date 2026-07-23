import CourseCard from './CourseCard'
import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { Search, ArrowRight, Users, Radio, Zap } from 'lucide-react'
import CourseGrid from './CourseGrid'

export default function Courses({courses}){
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    

    const filteredCourses = courses.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    const stats = [
        { icon: BookOpen, label: 'Courses', value: `${courses.length}+` },
        { icon: Users, label: 'Expert Teachers', value: 'Top-tier' },
        { icon: Radio, label: 'Live Classes', value: 'Real-time' },
        { icon: Zap, label: 'Instant Access', value: 'Always' },
    ]


  return (
    <section id="courses" className="py-20 relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-3">
              Explore Our <span className="gradient-text">Courses</span>
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Hand-picked courses from industry experts, designed to take your skills to the next level.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ml-0.5" />
              <input
                type="text"
                placeholder="   Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pl-11 py-3 rounded-xl shadow-sm"
              />
            </div>
          </div>

          {/* Course Grid */}
          {loading ? (
            <LoadingSpinner text="Loading courses..." />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : (
            <CourseGrid
              courses={filteredCourses}
              emptyMessage={
                searchQuery
                  ? `No courses matching "${searchQuery}"`
                  : 'No courses available yet'
              }
            />
          )}
        </div>
      </section>
  )
}
