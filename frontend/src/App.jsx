import { Routes, Route } from 'react-router-dom';
import HomePage from './HomePage'
import Login from './login'
import Signup from './signup'
import Dashboard from './user/page'
import AdminLayout from './admin/layout.jsx'
import UserLayout from './user/UserLayout'
import { ThemeProvider } from './user/ThemeContext.jsx';
import Planning from './admin/planning'
import Teachers from './admin/teachers'
import AdminProfile from './admin/profile'
import AdminSettings from './admin/setting'
import AdminDashboard from './admin/page'
import EmailVerification from './EmailVerification.jsx';
import Surveillance from './user/Surveillance'
import SurveillanceManagement from './admin/surveillance'
import ExchangeHistory from './admin/exchanges'

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        
        {/* User routes with UserLayout */}
        <Route path="/" element={<UserLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="surveillance" element={<Surveillance />} />
        </Route>

        {/* Admin routes with AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminDashboard />} />
          <Route path="surveillance" element={<SurveillanceManagement />} />
          <Route path="exchanges" element={<ExchangeHistory />} />
          <Route path="planning" element={<Planning />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

export default App