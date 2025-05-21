import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import Login from './login';
import Signup from './signup';
import Dashboard from './user/page';
import AdminLayout from './admin/layout.jsx';
import UserLayout from './user/UserLayout';
import { ThemeProvider } from './user/ThemeContext.jsx';
import Planning from './admin/planning';
import Teachers from './admin/teachers';
import AdminProfile from './admin/profile';
import AdminSettings from './admin/setting';
import AdminDashboard from './admin/page';
import EmailVerification from './EmailVerification.jsx';
import Surveillance from './user/Surveillance';
import SurveillanceManagement from './admin/surveillance';
import ExchangeHistory from './admin/exchanges';
import { Toaster } from 'react-hot-toast';



function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        
        {/* User routes */}
        <Route path="/user" element={
         
            <UserLayout />
         
        }>
          <Route index element={<Navigate to="/user/page" replace />} />
          <Route path="page" element={<Dashboard />} />
          <Route path="surveillance" element={<Surveillance />} />
        </Route>
        
        {/* Admin routes */}
        <Route path="/admin" element={
      
            <AdminLayout />
          
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="surveillance" element={<SurveillanceManagement />} />
          <Route path="exchanges" element={<ExchangeHistory />} />
          <Route path="planning" element={<Planning />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;