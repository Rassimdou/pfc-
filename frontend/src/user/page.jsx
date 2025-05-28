import { useState, useEffect } from 'react';
import { Button } from "@/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Calendar, Clock, Users, Bell, Settings, BookOpen, ArrowLeftRight, CheckCircle, XCircle, User, LogOut, BarChart2, TrendingUp, CalendarDays, AlertCircle, Lock } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    upcomingAssignments: 0,
    completedAssignments: 0,
    pendingSwaps: 0
  });

  useEffect(() => {
    // Check for token and user data in URL params (for Google auth)
    const token = searchParams.get('token');
    const userData = searchParams.get('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        localStorage.setItem('token', token);
        localStorage.setItem('user', userData);
        setUser(parsedUser);
        // Remove token and user from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      // Check localStorage for existing session
      const storedToken = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      
      if (!storedToken || !storedUser) {
        console.log('No token or user data found, redirecting to login');
        navigate('/login');
        return;
      }
      setUser(storedUser);
    }

    // Fetch all data
    const fetchData = async () => {
      try {
        setLoading(true);
        const [notificationsRes, swapsRes, assignmentsRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/surveillance/swap-requests/pending'),
          api.get('/surveillance/assignments')
        ]);
        
        // Process notifications
        const processedNotifications = notificationsRes.data.map(notification => ({
          ...notification,
          isSender: notification.type === 'SWAP_REQUEST' && notification.details?.fromUserId === user?.id
        })).filter(notification => {
          if (notification.type === 'SWAP_REQUEST') {
            return !notification.isSender || notification.status === 'ACCEPTED';
          }
          return true;
        });
        
        // Process swap requests
        const processedSwaps = swapsRes.data.map(swap => ({
          ...swap,
          isSender: swap.userId === user?.id,
          senderName: swap.fromAssignment?.user?.name || 'Unknown',
          receiverName: swap.toAssignment?.user?.name || 'Unknown'
        })).filter(swap => !swap.isSender);

        // Process assignments
        if (assignmentsRes.data.success) {
          setAssignments(assignmentsRes.data.assignments || []);
          
          // Check for new assignments (within the last 24 hours)
          const newAssignments = assignmentsRes.data.assignments.filter(assignment => {
            const assignmentDate = new Date(assignment.createdAt);
            const now = new Date();
            const hoursDiff = (now - assignmentDate) / (1000 * 60 * 60);
            return hoursDiff <= 24;
          });

          if (newAssignments.length > 0) {
            toast.success(`You have ${newAssignments.length} new surveillance assignment(s)!`);
          }
        }

        setNotifications(processedNotifications);
        setPendingSwaps(processedSwaps);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, searchParams, user?.id]);

  const handleNotificationClick = (notification) => {
    // Handle notification click based on type
    switch (notification.type) {
      case 'SWAP_REQUEST':
        navigate('/user/surveillance');
        break;
      case 'PERMUTATION_REQUEST':
        navigate('/user/schedule');
        break;
      default:
        break;
    }
  };

  const handleSwapAction = async (swapId, action) => {
    try {
      const response = await api.post(`/surveillance/swap/${swapId}/${action}`);
      if (response.data.success) {
        toast.success(`Swap request ${action}ed successfully`);
        // Refresh the data
        const [notificationsRes, swapsRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/surveillance/swap-requests/pending')
        ]);
        setNotifications(notificationsRes.data);
        setPendingSwaps(swapsRes.data);
      }
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error);
      toast.error(`Failed to ${action} swap request`);
    }
  };

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData) {
        throw new Error('No user data found');
      }
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/surveillance/assignments');
      if (response.data.success) {
        setAssignments(response.data.assignments || []);
        
        // Check for new assignments (within the last 24 hours)
        const newAssignments = response.data.assignments.filter(assignment => {
          const assignmentDate = new Date(assignment.createdAt);
          const now = new Date();
          const hoursDiff = (now - assignmentDate) / (1000 * 60 * 60);
          return hoursDiff <= 24;
        });

        if (newAssignments.length > 0) {
          toast.success(`You have ${newAssignments.length} new surveillance assignment(s)!`);
        }
      } else {
        toast.error('Failed to load surveillance assignments');
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load surveillance assignments');
      }
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Get upcoming assignments (next 24 hours)
  const upcomingAssignments = assignments.filter(assignment => {
    const assignmentDate = new Date(assignment.date);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return assignmentDate >= now && assignmentDate <= tomorrow;
  });

  // Add handleLogout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Update stats whenever assignments or pendingSwaps change
  useEffect(() => {
    const now = new Date();
    const upcomingAssignments = assignments.filter(assignment => {
      const assignmentDate = new Date(assignment.date);
      return assignmentDate > now;
    });

    const completedAssignments = assignments.filter(assignment => {
      const assignmentDate = new Date(assignment.date);
      return assignmentDate < now;
    });

    setStats({
      totalAssignments: assignments.length,
      upcomingAssignments: upcomingAssignments.length,
      completedAssignments: completedAssignments.length,
      pendingSwaps: pendingSwaps.length
    });
  }, [assignments, pendingSwaps]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 5 }}
            >
            <BookOpen className="h-6 w-6 text-emerald-600" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
              Dashboard
            </span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to="/user" className="text-sm font-medium text-emerald-600 border-b-2 border-emerald-600 pb-1">
              Dashboard
            </Link>
            <Link to="/user/surveillance" className="text-sm font-medium hover:text-emerald-600 transition-colors">
              Surveillance
            </Link>
            <Link to="/user/swap-requests" className="text-sm font-medium hover:text-emerald-600 transition-colors">
              Swap Requests
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <AnimatePresence>
                  {(notifications.length > 0 || pendingSwaps.length > 0) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
                      >
                      {notifications.length + pendingSwaps.length}
                      </motion.span>
                  )}
                  </AnimatePresence>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-lg">
                <div className="p-4">
                  <h4 className="font-medium mb-3 text-gray-900">Notifications</h4>
                  {notifications.length === 0 && pendingSwaps.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">No new notifications</div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-md border border-gray-100"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="mt-1">
                            <Bell className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{notification.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(notification.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {pendingSwaps.map((swap) => (
                        <DropdownMenuItem
                          key={swap.id}
                          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-md border border-gray-100"
                          onClick={() => navigate('/user/surveillance')}
                        >
                          <div className="mt-1">
                            <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {swap.isSender ? 'Sent Swap Request' : 'New Swap Request'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {swap.module} - {new Date(swap.date).toLocaleDateString()} at {swap.time}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {swap.isSender ? `Sent to: ${swap.receiverName}` : `From: ${swap.senderName}`}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/user/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/user/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
            <p className="text-gray-500">Here's an overview of your surveillance duties</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    Total Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">{stats.totalAssignments}</div>
                  <p className="text-sm text-gray-500 mt-1">All surveillance duties</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.upcomingAssignments}</div>
                  <p className="text-sm text-gray-500 mt-1">Next 24 hours</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.completedAssignments}</div>
                  <p className="text-sm text-gray-500 mt-1">Past assignments</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-purple-600" />
                    Pending Swaps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats.pendingSwaps}</div>
                  <p className="text-sm text-gray-500 mt-1">Awaiting response</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 mt-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    Upcoming Assignments
                  </CardTitle>
                  <CardDescription>Your next surveillance duties</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                  {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      </div>
                  ) : upcomingAssignments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No upcoming assignments</p>
                        <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                      </div>
                  ) : (
                    upcomingAssignments.map((assignment) => (
                        <motion.div
                        key={assignment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300"
                      >
                          <div>
                            <div className="font-medium text-gray-900">{assignment.module}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(assignment.date).toLocaleDateString()} at {assignment.time}
                        </div>
                            <div className="text-sm text-gray-500">Room: {assignment.room}</div>
                          </div>
                          {assignment.isResponsible ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                              <Lock className="w-4 h-4" /> Responsible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-600">
                              Assistant
                            </span>
                          )}
                        </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-emerald-600" onClick={() => navigate('/user/surveillance')}>
                    View All Assignments
                </Button>
              </CardFooter>
            </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
                    Pending Swap Requests
                  </CardTitle>
                  <CardDescription>Requests awaiting your response</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                  {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      </div>
                  ) : pendingSwaps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <ArrowLeftRight className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No pending swap requests</p>
                        <p className="text-sm text-gray-400 mt-1">All requests have been handled</p>
                      </div>
                  ) : (
                    pendingSwaps.map((swap) => (
                        <motion.div
                        key={swap.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{swap.module}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {new Date(swap.date).toLocaleDateString()} at {swap.time}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                From: <span className="font-medium text-gray-700">{swap.senderName}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                onClick={() => handleSwapAction(swap.id, 'accept')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-200 hover:bg-gray-50 transition-colors"
                                onClick={() => handleSwapAction(swap.id, 'decline')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                        </div>
                      </div>
                        </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                  <Button variant="ghost" className="w-full text-emerald-600" onClick={() => navigate('/user/swap-requests')}>
                  View All Requests
                </Button>
              </CardFooter>
            </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-6"
          >
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-emerald-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/user/surveillance')}>
                    <ArrowLeftRight className="h-4 w-4 mr-2" /> Request New Swap
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/user/surveillance')}>
                    <Calendar className="h-4 w-4 mr-2" /> View Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}