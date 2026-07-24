import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, BookOpen, Users, Radio, Zap, House, Star, Quote } from 'lucide-react'
import api from '../api/axios'
import CourseGrid from '../components/courses/CourseGrid'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function HomePage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses')
        setCourses(res.data.data || res.data || [])
      } catch (err) {
        setError('Failed to load courses. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  const filteredCourses = courses.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = [
    { icon: BookOpen, label: 'Courses', value: `${courses.length}+` },
    { icon: Users, label: 'Expert and Friendly Teachers', value: 'Top-tier' },
    { icon: Radio, label: 'Live Interactive Classes', value: 'Real-time' },
    { icon: House, label: 'Safe and Supportive Environment', value: 'Secure' },
  ]

  return (
    <div className="page-enter bg-slate-50 text-slate-900 min-h-screen">
      {/* ═══ Hero Section ═══ */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Floating orbs */}
        <div className="orb orb-primary w-[600px] h-[600px] -top-40 -left-40 animate-float-slow" />
        <div className="orb orb-secondary w-[500px] h-[500px] -bottom-20 -right-32 animate-float" />
        <div className="orb orb-accent w-[300px] h-[300px] top-1/3 right-1/4 animate-float-slow" style={{ animationDelay: '2s' }} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] display-flex z-0"
          style={{
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 lg:py-0">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-sm text-blue-900 mb-8 animate-slide-down shadow-sm">
                <Zap size={14} className="text-amber-500 font-bold" />
                <span className="font-bold">LEARN • GROW • FLY</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold font-[family-name:var(--font-family-heading)] leading-tight mb-6 animate-slide-up">
                <span className="gradient-text-hero">Learn Without</span>
                <br />
                <span className="text-slate-900">Limits</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 mb-10 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
                Explore expert-led courses with live sessions, interactive content, and a
                community that empowers you to grow. Start your journey today.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                <a href="#courses">
                  <Button size="lg" className="group">
                    Browse Courses
                  </Button>
                </a>
                <Link to="/register">
                  <Button variant="secondary" size="lg" className="!text-black !border-black hover:!bg-slate-200">
                    Get Started
                    <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <img
                src="/images/hero.png"
                alt="SkillSphere learning experience"
                className="w-full max-w-md rounded-3xl shadow-2xl border border-white/60 object-cover"
              />
            </div>
          </div>
        </div>

      </section>

      {/* ═══ Stats Bar ═══ */}
      <section className="relative py-8 border-y border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center md:flex-row md:text-left gap-2 md:gap-3 animate-slide-up opacity-0 px-2 py-3 md:py-0"
                style={{ animationDelay: `${i * 100 + 400}ms`, animationFillMode: 'forwards' }}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                  <stat.icon size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{stat.value}</p>
                  <p className="text-xs text-slate-600 leading-snug">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Course Catalog ═══ */}
      <section id="courses" className="py-20 relative">
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

      {/* ═══ Parent Reviews ═══ */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Subtle decorative orb */}
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-blue-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-amber-50 opacity-50 blur-3xl" />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-4">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-semibold">Loved by Parents</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-3">
              What <span className="gradient-text">Parents</span> Say
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Hear from the families whose children are thriving with SkillWing.
            </p>
          </div>

          {/* Review Cards */}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                name: 'Sarah Mitchell',
                relation: 'Mother of Ethan, Age 9',
                avatar: '/images/parent4.png',
                rating: 5,
                review: 'We tried many platforms, but SkillWing is the best. The teachers genuinely care, and the interactive live format keeps my son fully engaged the entire session!',
              },
              {
                name: 'Priya Sharma',
                relation: 'Mother of Aarav, Age 11',
                avatar: '/images/parent1.jpeg',
                rating: 5,
                review: 'SkillWing has been a game-changer for us. The live classes are highly interactive, and the patient teachers really know exactly how to engage young children.',
              },
              {
                name: 'Rajesh Patel',
                relation: 'Father of Ananya, Age 7',
                avatar: '/images/parent2.jpeg',
                rating: 5,
                review: "I was hesitant about online learning, but the small batch sizes mean my daughter gets personal attention. Her confidence has grown tremendously since joining.",
              },
              {
                name: 'Meera Iyer',
                relation: 'Mother of Karthik, Age 9',
                avatar: '/images/parent3.jpeg',
                rating: 5,
                review: 'The teaching quality here is outstanding. My son\'s coding skills improved remarkably in just 3 months! I also love that the platform feels very safe for kids.',
              },
              {
                name: 'David Thompson',
                relation: 'Father of Lily, Age 5',
                avatar: '/images/parent5.png',
                rating: 5,
                review: 'I love that my daughter can access world-class instruction from the US. Her teacher is incredibly talented, and Lily has never been more excited to learn here!',
              },
            ].map((review, i) => (
              <div
                key={review.name}
                className="relative bg-slate-50 border border-slate-200 rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 group"
              >
                {/* Quote icon */}
                <div className="absolute top-5 right-5 text-blue-100 group-hover:text-blue-200 transition-colors">
                  <Quote size={32} />
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Review text */}
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  "{review.review}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.relation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
