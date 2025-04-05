
import Home from './components/Home'
import CountdownPage from './components/CountdownPage'
import { Routes, Route } from 'react-router-dom'
import StudentDahboardPage from './components/StudentDahboardPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/countdown" element={<CountdownPage />} />
      <Route path="/dashboard" element={<StudentDahboardPage />} />
    </Routes>
  )

}

export default App