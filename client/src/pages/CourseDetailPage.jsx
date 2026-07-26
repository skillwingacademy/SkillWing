import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IndianRupee, DollarSign, Users, BookOpen, ArrowLeft,
  CheckCircle2, Clock, Calendar, BarChart3, Globe, Tag,
  User, Check, Video, Loader2
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { currency, symbol } = useCurrency()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [demoRequest, setDemoRequest] = useState(null)   // null | DemoRequest doc
  const [requestingDemo, setRequestingDemo] = useState(false)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`)
        const courseData = res.data.data || res.data
        setCourse(courseData)

        // Check enrollment if student and redirect to classroom if bought
        if (isAuthenticated && user?.role === 'student') {
          try {
            const enrolledRes = await api.get('/student/classrooms')
            const classrooms = enrolledRes.data.data || []
            const activeClassroom = classrooms.find(c => (c.course?._id || c.course) === id)
            if (activeClassroom) {
               setIsEnrolled(true)
               // redirect handled above — keep for safety
               navigate(`/dashboard?classroomId=${activeClassroom._id}`)
               return
            }
            // Fetch demo status for unenrolled students
            try {
              const demoRes = await api.get('/demo/my-requests')
              const requests = demoRes.data.data || []
              const match = requests.find(r => (r.course?._id || r.course) === id)
              if (match) setDemoRequest(match)
            } catch {
              // no demo requests yet — fine
            }
          } catch {
            // Ignore — might not be enrolled
          }
        }
      } catch {
        setError('Course not found or failed to load.')
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [id, isAuthenticated, user])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'student') {
      toast.error('Only students can enroll in courses')
      return
    }
    if (!selectedTier) {
      toast.error('Please select a plan')
      return
    }

    setEnrolling(true)
    try {
      // Step 1: Create order on backend
      const res = await api.post('/payments/create-order', { courseId: id, purchasedTier: selectedTier, selectedCurrency: currency })
      const order = res.data.data

      // ── Mock mode: skip Razorpay widget ──
      if (order.mock) {
        await api.post('/payments/verify', {
          razorpay_order_id: order.id,
          razorpay_payment_id: 'mock_pay_auto',
          razorpay_signature: 'mock_sig_auto',
          courseId: id,
          purchasedTier: selectedTier,
        })
        navigate('/checkout/success')
        return
      }

      // ── Razorpay mode: open checkout widget ──
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'SkillWing',
        description: order.courseTitle,
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: id,
              purchasedTier: selectedTier,
              amount: order.amount / 100,
            })
            navigate('/checkout/success')
          } catch {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#0041a8',
        },
        modal: {
          ondismiss: function () {
            setEnrolling(false)
            toast.error('Payment was cancelled')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setEnrolling(false)
      })
      rzp.open()
      return // don't reset enrolling — modal is open
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout')
    } finally {
      setEnrolling(false)
    }
  }

  const handleRequestDemo = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'student') {
      toast.error('Only students can request demo classes')
      return
    }

    setRequestingDemo(true)
    try {
      // Step 1: Create a payment order for the demo fee
      const res = await api.post('/demo/create-order', {
        courseId: id,
        selectedCurrency: currency,
      })
      const order = res.data.data

      // ── Mock mode: skip Razorpay widget ──
      if (order.mock) {
        const verifyRes = await api.post('/demo/verify-payment', {
          razorpay_order_id: order.id,
          razorpay_payment_id: 'mock_pay_auto',
          razorpay_signature: 'mock_sig_auto',
          courseId: id,
          currency: order.currency,
          amount: order.price,
        })
        setDemoRequest(verifyRes.data.data)
        toast.success('Demo class booked! Admin will schedule it soon.')
        setRequestingDemo(false)
        return
      }

      // ── Razorpay mode: open checkout widget ──
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'SkillWing',
        description: `Demo Class — ${order.courseTitle}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/demo/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: id,
              currency: order.currency,
              amount: order.price,
            })
            setDemoRequest(verifyRes.data.data)
            toast.success('Demo class booked! Admin will schedule it soon.')
          } catch {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#0041a8' },
        modal: {
          ondismiss: function () {
            setRequestingDemo(false)
            toast.error('Payment was cancelled')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setRequestingDemo(false)
      })
      rzp.open()
      return // don't reset — modal is open
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout')
    } finally {
      setRequestingDemo(false)
    }
  }


  if (loading) return <LoadingSpinner text="Loading course..." />
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center page-enter">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to Courses
        </Button>
      </div>
    )
  }
  if (!course) return null

  const currencySymbol = symbol
  const CurrencyIcon = currency === 'USD' ? DollarSign : IndianRupee

  const pricing = course.pricing?.[currency.toLowerCase()] || {}
  const tiers = [
    {
      key: '1-on-1',
      label: 'Elite 1-on-1',
      subtitle: 'Private sessions · 1 student',
      price: pricing.oneOnOne || 0,
    },
    {
      key: 'Double',
      label: 'Focus Buddy',
      badge: 'Most Popular',
      subtitle: 'Semi-private · 2 students',
      price: pricing.double || 0,
    },
    {
      key: 'Batch',
      label: 'Explorer Group',
      subtitle: `Group learning · up to ${course.maxBatchCapacity || 10} students`,
      price: pricing.batch || 0,
    },
  ].filter(t => t.price > 0);

  const lowestPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0
  const selectedTierPrice = tiers.find(t => t.key === selectedTier)?.price

  // Resolve instructor names
  const instructorNames =
    course.instructors && course.instructors.length > 0
      ? course.instructors.map((i) => (typeof i === 'object' ? i.name : i))
      : course.educator
        ? [typeof course.educator === 'object' ? course.educator.name : course.educator]
        : ['Instructor']

  const details = course.courseDetails || {}

  return (
    <div className="page-enter bg-slate-50 min-h-screen">
      {/* ── Hero Section ─────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Title & Intro — 2 cols */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 leading-tight">
                {course.title}
              </h1>

              {course.introduction && (
                <p className="text-lg text-slate-600 mt-4 leading-relaxed">
                  {course.introduction}
                </p>
              )}

              {/* Instructors */}
              <div className="flex items-center gap-3 mt-6">
                <div className="flex -space-x-2">
                  {instructorNames.slice(0, 3).map((name, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white"
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Taught by: {instructorNames.join(', ')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {instructorNames.length > 1 ? `${instructorNames.length} instructors` : 'Instructor'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Plans — 1 col */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Hero price badge */}
                <div className="text-center mb-1">
                  {/* <div className="flex items-center justify-center gap-1 text-3xl font-bold text-slate-900 mb-1">
                    {lowestPrice > 0 ? (
                      <>
                        <span className="text-sm text-slate-500 font-normal">From</span>
                        <CurrencyIcon size={24} />
                        <span>{lowestPrice.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-emerald-600">Free</span>
                    )}
                  </div> */}
                </div>

                {/* Tier Selection */}
                <div className="space-y-2 mb-4">
                  {tiers.map((tier) => (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTier(tier.key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        selectedTier === tier.key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-bold text-slate-900">
                          {tier.label}
                          {tier.badge && (
                            <span className="ml-2 text-[10px] font-medium text-blue-600 align-middle">
                              ({tier.badge})
                            </span>
                          )}
                        </p>
                          <p className="text-xs text-slate-500">{tier.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTier === tier.key && <CheckCircle2 size={16} className="text-blue-600" />}
                          <span className="text-lg font-bold text-slate-900">{currencySymbol}{tier.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action button */}
                {isEnrolled ? (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={() => navigate(`/dashboard/course/${id}`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                  >
                    <CheckCircle2 size={18} />
                    Go to Course
                  </Button>
                ) : user?.role === 'teacher' || user?.role === 'admin' ? (
                  <p className="text-center text-sm text-slate-400">
                    Viewing as {user.role}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Button
                      fullWidth
                      size="lg"
                      loading={enrolling}
                      onClick={handleEnroll}
                      disabled={!selectedTier}
                      className={!selectedTier ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      {!isAuthenticated ? 'Login to Enroll' : selectedTier ? `Enroll Now — ${currencySymbol}${selectedTierPrice?.toLocaleString()}` : 'Select a Plan'}
                    </Button>

                    {/* ── Demo CTA ── */}
                    {!demoRequest && (
                      <button
                        onClick={handleRequestDemo}
                        disabled={requestingDemo}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-all disabled:opacity-50"
                      >
                        {requestingDemo
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Video size={15} />}
                        {requestingDemo
                          ? 'Processing payment…'
                          : `Book a Demo Class — ${currency === 'USD' ? '$15' : '₹100'}`}
                      </button>
                    )}

                    {demoRequest?.status === 'pending' && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <Clock size={15} className="text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Demo Requested</p>
                          <p className="text-xs text-amber-600">Admin will schedule your demo soon</p>
                        </div>
                      </div>
                    )}

                    {demoRequest?.status === 'scheduled' && (
                      <div className="flex flex-col gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-emerald-700">Demo Scheduled!</p>
                            <p className="text-xs text-emerald-600">
                              {new Date(demoRequest.scheduledAt).toLocaleString('en-IN', {
                                weekday: 'short', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true,
                              })}
                              {demoRequest.instructor?.name && ` · ${demoRequest.instructor.name}`}
                            </p>
                          </div>
                        </div>
                        {demoRequest.meetLink && (
                          <a
                            href={demoRequest.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg py-2 transition-colors"
                          >
                            <Video size={13} /> Join Demo Class
                          </a>
                        )}
                      </div>
                    )}

                    {demoRequest?.status === 'completed' && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <CheckCircle2 size={15} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500">Demo completed — enroll to continue learning!</p>
                      </div>
                    )}

                    {demoRequest?.status === 'cancelled' && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                        <Clock size={15} className="text-red-400 shrink-0" />
                        <p className="text-xs text-red-500">Demo was cancelled. Contact support for help.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Content Body ─────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main content — 2 cols */}
          <div className="lg:col-span-2 space-y-8">

            {/* At a Glance — Course Details Grid */}
            {(details.totalSessions || details.duration || details.skillLevel || details.language || (details.batchTypes && details.batchTypes.length > 0)) && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-5">
                  At a Glance
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {details.totalSessions && (
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <Calendar size={20} className="text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-slate-900">{details.totalSessions}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Sessions</p>
                    </div>
                  )}
                  {details.duration && (
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <Clock size={20} className="text-blue-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-slate-900">{details.duration}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Duration</p>
                    </div>
                  )}
                  {details.skillLevel && (
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <BarChart3 size={20} className="text-emerald-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-slate-900">{details.skillLevel}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Level</p>
                    </div>
                  )}
                  {details.language && (
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <Globe size={20} className="text-sky-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-slate-900">{details.language}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Language</p>
                    </div>
                  )}
                </div>

                {/* Batch Types */}
                {details.batchTypes && details.batchTypes.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Available Courses</p>
                    <div className="flex flex-wrap gap-2">
                      {details.batchTypes.map((bt) => (
                        <span
                          key={bt}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <Tag size={12} />
                          {bt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* About This Course */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-4">
                About This Course
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {course.description || 'No description provided.'}
              </p>
            </section>

            {/* What You Will Receive */}
            {course.whatYouWillReceive && course.whatYouWillReceive.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold font-[family-name:var(--font-family-heading)] text-slate-900 mb-5">
                  What You Will Receive
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.whatYouWillReceive.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
                    >
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — 1 col (Thumbnail + Instructors recap) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Thumbnail */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {course.thumbnailImage ? (
                <img
                  src={course.thumbnailImage}
                  alt={course.title}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center">
                  <BookOpen size={48} className="text-blue-300" />
                </div>
              )}
            </div>

            {/* Instructors box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                Instructors
              </h3>
              <div className="space-y-3">
                {instructorNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">Instructor</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
