import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/ui/card';
import { FileText, ShieldCheck, User, Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/user/surveillance', label: 'Surveillance', icon: ShieldCheck },
  { to: '/user/files', label: 'My Files', icon: FileText },
  { to: '/user/profile', label: 'Profile', icon: User },
];

export default function UserLayout({ children }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="min-h-screen flex bg-gray-50 relative">
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
          <span className="text-xl font-bold text-emerald-700">User Panel</span>
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
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 min-h-screen">
        <div className="md:hidden h-16"></div> {/* Spacer for mobile header */}
        <Card className="p-4 md:p-6">
          {children}
        </Card>
      </main>
    </div>
  );
}