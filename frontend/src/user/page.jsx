import { useState, useEffect } from 'react';
import { Button } from "@/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Calendar, Clock, Users, Bell, Settings, BookOpen, ArrowLeftRight, CheckCircle, XCircle } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receivedSwapRequests, setReceivedSwapRequests] = useState([]);

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
      } finally {
         // Fetch user data again to get the latest
         fetchUserData();
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

    // Validate token and fetch data
    const validateAndFetchData = async () => {
      try {
        await fetchAssignments();
      } catch (error) {
        console.error('Error validating session:', error);
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    validateAndFetchData();
  }, [navigate, searchParams]);

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
      const response = await api.get('/api/surveillance/assignments'); // Ensure /api prefix
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
          // Consider a less intrusive notification for new assignments than toast
          // toast.success(`You have ${newAssignments.length} new surveillance assignment(s)!`);
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

  // Get pending swap requests for display in card (not tied to notification count)
  const pendingSwapsForCard = assignments.filter(assignment => 
    assignment.swapRequest && assignment.swapRequest.status === 'PENDING'
  );

  return (
    <div className="flex min-h-screen flex-col">
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
                  ) : pendingSwapsForCard.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No pending swap requests</div>
                  ) : (
                    pendingSwapsForCard.map((swap) => (
                      <div
                        key={swap.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                            <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium">Swap Request</div>
                            <div className="text-sm text-gray-500">{swap.module}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 pl-9">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Current: {new Date(swap.date).toLocaleDateString()} {swap.time}
                          </div>
                        </div>
                        <div className="flex gap-2 pl-9 mt-1">
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="h-7">
                            <XCircle className="h-3 w-3 mr-1" /> Decline
                          </Button>
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
}