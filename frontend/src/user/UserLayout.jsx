import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ShieldCheck, User, Menu, X, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/ui/button.jsx';
import Notifications from '@/user/Notifications.jsx';
import api from '@/utils/axios'; // Import axios instance

const navLinks = [
  { to: '/user/page', label: 'Dashboard', icon: ShieldCheck },
  { to: '/user/surveillance', label: 'Surveillance', icon: ShieldCheck },
  { to: '/user/profile', label: 'Profile', icon: User },
];

export default function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
      toast.error('Please log in to access this page');
      navigate('/login');
      return;
    }

    // If user is admin, redirect to admin dashboard
    if (user.role === 'ADMIN') {
      navigate('/admin');
      return;
    }

    // If user is not a professor, redirect to login
    if (user.role !== 'PROFESSOR') {
      toast.error('Unauthorized access');
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Function to fetch pending requests count
  const fetchPendingRequestsCount = async () => {
    try {
      const response = await api.get('/api/swap/received-requests');
      if (response.data.success) {
        setPendingRequestsCount(response.data.requests?.length || 0);
      } else {
        console.error('Failed to fetch pending requests count:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
    }
  };

  // Fetch count on component mount and when notifications visibility changes
  useEffect(() => {
    fetchPendingRequestsCount();
    
    // Optionally, refetch count when the notifications dropdown is opened
    // if (showNotifications) {
    //   fetchPendingRequestsCount();
    // }

    // Set up interval for periodic fetching (e.g., every 30 seconds)
    const intervalId = setInterval(fetchPendingRequestsCount, 30000); // Fetch every 30 seconds

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);

  }, [/* Add showNotifications here if you want to refetch when it opens */]); // Dependency array

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-emerald-600 text-white shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r flex flex-col py-8 px-4 fixed h-screen z-40 transform transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:relative md:h-auto`}
      >
        <div className="mb-8 flex items-center gap-2 px-2">
          <ShieldCheck className="h-7 w-7 text-emerald-600" />
          <span className="text-xl font-bold text-emerald-700">USTHB-Xchange</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => isMobile && setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <div className="md:hidden h-16"></div> {/* Spacer for mobile header */}
        {/* Header with Notification Icon */}
        <div className="flex justify-end items-center p-4 bg-white shadow-sm">
           {/* Notification Icon and Badge */}
           <div className="relative">
               <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setShowNotifications(!showNotifications)}
               >
                   <Bell className="h-6 w-6" />
                   {/* Badge for notification count */}
                   {pendingRequestsCount > 0 && (
                       <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-600 text-xs font-bold text-white flex items-center justify-center leading-none">{pendingRequestsCount}</span>
                   )}
               </Button>

               {/* Notifications Dropdown/Modal */}
               {showNotifications && (
                   <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                       <Notifications isVisible={showNotifications} /> {/* Use the Notifications component and pass visibility */}
                   </div>
               )}
           </div>
        </div>
        
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}