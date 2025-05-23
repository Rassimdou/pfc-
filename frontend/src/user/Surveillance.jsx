import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { BadgeCheck, Lock, Upload, FileText, Calendar, Clock, Users, ArrowLeftRight, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import UserLayout from './UserLayout';
import api from '@/utils/axios';
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

export default function Surveillance() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSwappableOnly, setShowSwappableOnly] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [targetAssignment, setTargetAssignment] = useState('');
  const [pendingSwaps, setPendingSwaps] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/surveillance/assignments');
      if (response.data.success) {
        setAssignments(response.data.assignments || []);
        // Filter assignments that are pending swaps
        const pending = response.data.assignments.filter(assignment => 
          assignment.swapRequest && assignment.swapRequest.status === 'PENDING'
        );
        setPendingSwaps(pending);
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

  const handleSwapRequest = async () => {
    if (!selectedAssignment || !targetAssignment) {
      toast.error('Please select both assignments');
      return;
    }

    try {
      await api.post(`/surveillance/${selectedAssignment.id}/swap-request`, {
        targetAssignmentId: targetAssignment
      });
      toast.success('Swap request sent successfully');
      setShowSwapDialog(false);
      fetchAssignments();
    } catch (error) {
      console.error('Error sending swap request:', error);
      toast.error(error.response?.data?.message || 'Failed to send swap request');
    }
  };

  const handleAcceptSwap = async (swapId) => {
    try {
      await api.post(`/surveillance/swap/${swapId}/accept`);
      toast.success('Swap request accepted');
      fetchAssignments();
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast.error(error.response?.data?.message || 'Failed to accept swap request');
    }
  };

  const handleDeclineSwap = async (swapId) => {
    try {
      await api.post(`/surveillance/swap/${swapId}/decline`);
      toast.success('Swap request declined');
      fetchAssignments();
    } catch (error) {
      console.error('Error declining swap:', error);
      toast.error(error.response?.data?.message || 'Failed to decline swap request');
    }
  };

  const handleCancelSwap = async (swapId) => {
    try {
      await api.post(`/surveillance/swap/${swapId}/cancel`);
      toast.success('Swap request cancelled');
      fetchAssignments();
    } catch (error) {
      console.error('Error cancelling swap:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel swap request');
    }
  };

  // Filter assignments based on search term and swappable filter
  const filteredAssignments = assignments.filter(assignment => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      assignment.module.toLowerCase().includes(searchLower) ||
      assignment.room.toLowerCase().includes(searchLower) ||
      new Date(assignment.date).toLocaleDateString().includes(searchLower) ||
      assignment.time.toLowerCase().includes(searchLower)
    );

    if (showSwappableOnly) {
      return matchesSearch && assignment.canSwap && !assignment.isResponsible;
    }

    return matchesSearch;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {pendingSwaps.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Swap Requests
            </CardTitle>
            <CardDescription>You have {pendingSwaps.length} pending swap request(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingSwaps.map(swap => (
                <div key={swap.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium">{swap.module}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(swap.date).toLocaleDateString()} at {swap.time}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAcceptSwap(swap.swapRequest.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineSwap(swap.swapRequest.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Surveillance Assignments</CardTitle>
          <CardDescription>
            View and manage your surveillance duties. Responsible assignments cannot be swapped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search by module, room, date, or time..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showSwappableOnly}
                onChange={e => setShowSwappableOnly(e.target.checked)}
              />
              Show only swappable assignments
            </label>
          </div>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        Loading assignments...
                      </td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No surveillance assignments found
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map(assignment => (
                      <tr key={assignment.id} className="border-b">
                        <td className="px-4 py-2">
                          {new Date(assignment.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2">{assignment.time}</td>
                        <td className="px-4 py-2">{assignment.module}</td>
                        <td className="px-4 py-2">{assignment.room}</td>
                        <td className="px-4 py-2">
                          {assignment.isResponsible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Lock className="w-4 h-4" /> Responsible
                            </span>
                          ) : (
                            <span className="text-gray-500">Assistant</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {assignment.swapRequest ? (
                            <span className="inline-flex items-center gap-1 text-blue-700">
                              <FileText className="w-4 h-4" />
                              {assignment.swapRequest.status === 'PENDING' ? 'Pending Swap' :
                               assignment.swapRequest.status === 'APPROVED' ? 'Swapped' :
                               assignment.swapRequest.status === 'REJECTED' ? 'Rejected' :
                               'Cancelled'}
                            </span>
                          ) : (
                            <span className="text-gray-500">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {!assignment.isResponsible && assignment.canSwap && !assignment.swapRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowSwapDialog(true);
                              }}
                            >
                              <ArrowLeftRight className="h-4 w-4 mr-1" />
                              Request Swap
                            </Button>
                          )}
                          {assignment.swapRequest?.status === 'PENDING' && 
                           assignment.swapRequest.fromAssignmentId === assignment.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelSwap(assignment.swapRequest.id)}
                            >
                              Cancel Request
                            </Button>
                          )}
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

      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Request Swap</DialogTitle>
            <DialogDescription>
              Select another assignment to swap with your current assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Assignment</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedAssignment?.module}</div>
                <div className="text-sm text-gray-500">
                  {selectedAssignment?.date && new Date(selectedAssignment.date).toLocaleDateString()} at {selectedAssignment?.time}
                </div>
                <div className="text-sm text-gray-500">Room: {selectedAssignment?.room}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Assignment to Swap With</label>
              <Select value={targetAssignment} onValueChange={setTargetAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments
                    .filter(a => 
                      a.id !== selectedAssignment?.id && 
                      a.canSwap && 
                      !a.isResponsible &&
                      !a.swapRequest
                    )
                    .map(assignment => (
                      <SelectItem key={assignment.id} value={assignment.id.toString()}>
                        {assignment.module} - {new Date(assignment.date).toLocaleDateString()} at {assignment.time}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSwapRequest}
              disabled={!targetAssignment}
            >
              Send Swap Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 