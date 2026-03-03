import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { ErrorLog } from './pages/ErrorLog'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8" style={{ marginLeft: 230 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/error-log" element={<ErrorLog />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
