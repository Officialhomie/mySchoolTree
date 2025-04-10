
import Home from './components/Home'
import CountdownPage from './components/CountdownPage'
import { Routes, Route } from 'react-router-dom'
import StudentDahboardPage from './components/StudentDahboardPage'
import TeacherDashboardPage from './components/TeacherDashboardPage'
import SchoolAdministratorDashboardPage from './components/SchoolAdminstratorDashboardPage'
import RedirectPage from './components/RedirectPage'
import ProtectedRoute from './components/ProtectedRoute'
import RoleSelectionPage from './components/RoleSelectionPage'
import GuestDashboard from './components/GuestDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/countdown" element={<CountdownPage />} />
      <Route path="/student-dashboard" element={<StudentDahboardPage />} />
      <Route path="/teachers" element={<TeacherDashboardPage />} />
      <Route path="/school-admin" element={<SchoolAdministratorDashboardPage />} />
      <Route path="/redirect" element={<RedirectPage />} />
      <Route path="/role-select" element={<RoleSelectionPage />} />
      <Route path="/guest-dashboard" element={<GuestDashboard />} />

      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <SchoolAdministratorDashboardPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )

}

export default App