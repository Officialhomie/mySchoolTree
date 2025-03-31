
import Home from './components/Home'
import CountdownPage from './components/CountdownPage'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/countdown" element={<CountdownPage />} />
    </Routes>
  )

}

export default App