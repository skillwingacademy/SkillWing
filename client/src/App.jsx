import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Pages
import HomePage from './pages/HomePage'
import CourseDetailPage from './pages/CourseDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentCoursePage from './pages/StudentCoursePage'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherCoursePage from './pages/TeacherCoursePage'
import CheckoutSuccess from './pages/CheckoutSuccess'
import Courses from './components/courses/Courses'
import AdminDashboard from './pages/AdminDashboard'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import SessionDetailPage from './pages/SessionDetailPage'
import PayoutDashboard from './pages/PayoutDashboard'
import PayoutDeductionReports from './pages/PayoutDeductionReports'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { usePushNotifications } from './hooks/usePushNotifications'
import api from './api/axios'

/* ═══════════════════════════════════════════════════════════════
   Protected Route — checks auth + role
   ═══════════════════════════════════════════════════════════════ */
function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullPage text="Authenticating..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to the correct dashboard
    const dest = user?.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'
    return <Navigate to={dest} replace />
  }

  return <Outlet />
}

/* ═══════════════════════════════════════════════════════════════
   Layout — Navbar + content + Footer
   ═══════════════════════════════════════════════════════════════ */
function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-18">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   App — Route definitions
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const { loading } = useAuth()
  usePushNotifications() // Auto-subscribe to push notifications on login
  const [courses, setCourses] = useState([])
  const [ loadingCourses, setLoading] = useState(true)

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

  if (loading) {
    return <LoadingSpinner fullPage text="Loading SkillSphere..." />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/courses" element={<Courses courses={courses}/>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Student-only routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/dashboard/course/:id" element={<StudentCoursePage />} />
        </Route>

        {/* Teacher-only routes */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/course/:id" element={<TeacherCoursePage />} />
          <Route path="/teacher/payouts" element={<PayoutDashboard />} />
          <Route path="/teacher/payouts/details" element={<PayoutDeductionReports />} />
        </Route>

        {/* Admin-only routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/payouts" element={<PayoutDashboard />} />
          <Route path="/admin/payouts/details" element={<PayoutDeductionReports />} />
        </Route>

        {/* Profile routes (all authenticated users) */}
        <Route element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']} />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/classrooms/:classroomId/sessions/:sessionId" element={<SessionDetailPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
