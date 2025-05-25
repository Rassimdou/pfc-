import { useState, useEffect } from 'react';
import { Button } from "@/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Calendar, Clock, Users, Bell, Settings, BookOpen, ArrowLeftRight, CheckCircle, XCircle } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);

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

    // Fetch notifications and pending swaps
    const fetchData = async () => {
      try {
        const [notificationsRes, swapsRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/surveillance/swap-requests/pending')
        ]);
        
        // Process notifications
        const processedNotifications = notificationsRes.data.map(notification => ({
          ...notification,
          isSender: notification.type === 'SWAP_REQUEST' && notification.details?.fromUserId === user?.id
        }));
        
        // Process swap requests
        const processedSwaps = swapsRes.data.map(swap => ({
          ...swap,
          isSender: swap.userId === user?.id,
          senderName: swap.fromAssignment?.user?.name || 'Unknown',
          receiverName: swap.toAssignment?.user?.name || 'Unknown'
        }));

        setNotifications(processedNotifications);
        setPendingSwaps(processedSwaps);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load notifications');
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold">UniSwap</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to="/dashboard" className="text-sm font-medium text-emerald-600 border-b-2 border-emerald-600 pb-1">
              Dashboard
            </Link>
            <Link to="/surveillance" className="text-sm font-medium hover:text-emerald-600">
              Surveillance
            </Link>
            <Link to="/swaps" className="text-sm font-medium hover:text-emerald-600">
              Swap Requests
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {(notifications.length > 0 || pendingSwaps.length > 0) && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                      {notifications.length + pendingSwaps.length}
                    </span>
                  )}
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
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="hidden md:inline text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">
        <div className="container py-6 px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome to USTHB-Xchange, {user?.firstName}</h1>
            <p className="text-gray-500">Here's what's happening with your teaching schedule</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Upcoming Surveillances</CardTitle>
                <CardDescription>Your next 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : upcomingAssignments.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No upcoming surveillances</div>
                  ) : (
                    upcomingAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                      >
                        <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                          <Clock className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {new Date(assignment.date).toLocaleDateString()}: {assignment.time}
                          </div>
                          <div className="text-sm text-gray-500">{assignment.module}</div>
                          <div className="text-xs text-gray-400">{assignment.room}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-emerald-600" onClick={() => navigate('/user/surveillance')}>
                  View All Surveillances
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Swap Requests</CardTitle>
                <CardDescription>Pending your action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : pendingSwaps.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No pending swap requests</div>
                  ) : (
                    pendingSwaps.map((swap) => (
                      <div
                        key={swap.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                            <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              Swap Request
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              <div className="bg-gray-50 rounded p-2 border">
                                <div className="text-xs text-gray-500 font-semibold mb-1">From Assignment</div>
                                <div className="text-sm text-gray-900 font-bold">{swap.fromAssignment?.module}</div>
                                <div className="text-xs text-gray-600">{swap.fromAssignment?.date ? new Date(swap.fromAssignment.date).toLocaleDateString() : ''} at {swap.fromAssignment?.time}</div>
                                <div className="text-xs text-gray-400">Room: {swap.fromAssignment?.room}</div>
                                <div className="text-xs text-gray-400 mt-1">Owner: {swap.fromAssignment?.user?.firstName} {swap.fromAssignment?.user?.lastName}</div>
                              </div>
                              <div className="bg-gray-50 rounded p-2 border">
                                <div className="text-xs text-gray-500 font-semibold mb-1">To Assignment</div>
                                <div className="text-sm text-gray-900 font-bold">{swap.toAssignment?.module}</div>
                                <div className="text-xs text-gray-600">{swap.toAssignment?.date ? new Date(swap.toAssignment.date).toLocaleDateString() : ''} at {swap.toAssignment?.time}</div>
                                <div className="text-xs text-gray-400">Room: {swap.toAssignment?.room}</div>
                                <div className="text-xs text-gray-400 mt-1">Owner: {swap.toAssignment?.user?.firstName} {swap.toAssignment?.user?.lastName}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 pl-9 mt-1">
                          {swap.isSender ? (
                            <Button size="sm" variant="outline" className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleSwapAction(swap.id, 'cancel')}>
                              <XCircle className="h-3 w-3 mr-1" /> Cancel Request
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSwapAction(swap.id, 'accept')}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="h-7" onClick={() => handleSwapAction(swap.id, 'decline')}>
                                <XCircle className="h-3 w-3 mr-1" /> Decline
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-emerald-600" onClick={() => navigate('/swaps')}>
                  View All Requests
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/user/surveillance')}>
                    <ArrowLeftRight className="h-4 w-4 mr-2" /> Request New Swap
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/user/surveillance')}>
                    <Calendar className="h-4 w-4 mr-2" /> View Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" /> Find Colleagues
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" /> Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};