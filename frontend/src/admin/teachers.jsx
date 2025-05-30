import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import {
  Users,
  Search,
  UserPlus,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Loader2,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';

export default function TeachersManagement() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitingTeacher, setInvitingTeacher] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [newTeacher, setNewTeacher] = useState({
    email: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }
    fetchTeachers();
  }, [navigate]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/teachers');
      // Filter out pending teachers that are already active
      const teachers = response.data.data || [];
      const filteredTeachers = teachers.filter(teacher => {
        if (teacher.type === 'active') return true;
        // Only include pending teachers if there's no active teacher with the same email
        return !teachers.some(t => t.type === 'active' && t.email === teacher.email);
      });
      setTeachers(filteredTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        toast.error('Failed to fetch teachers');
      }
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      setInvitingTeacher(true);
      // Validate email
      if (!newTeacher.email) {
        toast.error('Please enter an email address');
        return;
      }

      const response = await api.post('/admin/teachers', newTeacher);

      if (response.data.success) {
        toast.success('Invitation sent successfully');
        setNewTeacher({
          email: ''
        });
        setIsDialogOpen(false);
        fetchTeachers(); // Refresh the list to show the new pending teacher
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to send invitation');
      }
    } finally {
      setInvitingTeacher(false);
    }
  };

  const handleCancel = () => {
    setNewTeacher({
      email: ''
    });
    setIsDialogOpen(false);
  };

  const handleDeleteTeacher = async (id, type) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        console.log('Attempting to delete teacher:', { id, type });
        const response = await api.delete(`/admin/teachers/${id}?type=${type}`);
        if (response.data.success) {
          toast.success('Teacher deleted successfully');
          setTeachers([]);
          fetchTeachers();
        } else {
          toast.error(response.data.message || 'Failed to delete teacher');
        }
      } catch (error) {
        console.error('Error deleting teacher:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          fullError: error
        });
        
        if (error.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else if (error.response?.status === 404) {
          toast.error('Teacher not found');
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to delete teacher';
          const errorDetails = error.response?.data?.error;
          console.error('Detailed error:', errorDetails);
          toast.error(`${errorMessage}${errorDetails ? `: ${errorDetails.message}` : ''}`);
        }
      }
    }
  };

  const handleResendInvitation = async (email) => {
    try {
      setResendingInvitation(true);
      const response = await api.post('/admin/teachers/resend-invitation', { email });

      if (response.data.success) {
        toast.success('Invitation resent successfully');
        fetchTeachers();
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setResendingInvitation(false);
    }
  };

  const filteredTeachers = Array.isArray(teachers) ? teachers.filter(teacher => {
    if (!teacher) return false;
    
    const matchesSearch = 
      (teacher.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (teacher.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || teacher.status === selectedStatus;

    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teachers Management</h1>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
                <DialogDescription>
                  Enter the teacher's email address to send them an invitation to join the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="teacher@university.edu" 
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                    disabled={invitingTeacher}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancel} disabled={invitingTeacher}>Cancel</Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleAddTeacher}
                  disabled={invitingTeacher}
                >
                  {invitingTeacher ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find specific teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="search" 
                placeholder="Search by name or email..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Teachers Directory</CardTitle>
          <CardDescription>Manage all teachers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                          <span className="ml-2">Loading teachers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-center">No teachers found</td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <tr key={teacher.id} className="border-b">
                        <td className="px-4 py-3 font-medium">
                          {teacher.type === 'active' ? teacher.name : 'Pending Registration'}
                        </td>
                        <td className="px-4 py-3 text-emerald-600">{teacher.email}</td>
                        <td className="px-4 py-3">
                          {teacher.type === 'active' ? teacher.phoneNumber || 'N/A' : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            teacher.status === 'Active' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {teacher.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            teacher.type === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {teacher.type === 'active' ? 'Active' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {teacher.type === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleResendInvitation(teacher.email)}
                                title="Resend Invitation"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.type)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
