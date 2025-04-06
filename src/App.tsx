
import Home from './components/Home'
import CountdownPage from './components/CountdownPage'
import { Routes, Route } from 'react-router-dom'
import StudentDahboardPage from './components/StudentDahboardPage'
import TeacherDashboardPage from './components/TeacherDashboardPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/countdown" element={<CountdownPage />} />
      <Route path="/dashboard" element={<StudentDahboardPage />} />
      <Route path="/teachers" element={<TeacherDashboardPage />} />
    </Routes>
  )

}

export default App