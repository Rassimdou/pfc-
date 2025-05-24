import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { toast } from 'react-hot-toast';
import api from '@/utils/axios';
import { Card, CardContent } from '@/ui/card';
import { format } from 'date-fns';

export default function Notifications({ isVisible }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    fetchPendingRequests();
    
    // Set up interval for periodic fetching (e.g., every 10 seconds)
    const intervalId = setInterval(fetchPendingRequests, 10000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [isVisible]);

  const fetchPendingRequests = async () => {
    try {
      if (!isVisible) return;
      setLoading(true);
      const response = await api.get('/api/swap/received-requests');
      if (response.data.success) {
        setPendingRequests(response.data.requests || []);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error(error.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSwap = async (swapId) => {
    try {
      setProcessingRequest(swapId);
      const response = await api.post(`/api/swap/surveillance/swap/${swapId}/accept`);
      
      if (response.data.success) {
        toast.success('Swap request accepted');
        // Refresh the notifications list
        await fetchPendingRequests();
      } else {
        toast.error(response.data.message || 'Failed to accept swap request');
      }
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast.error(error.response?.data?.message || 'Failed to accept swap request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineSwap = async (swapId) => {
    try {
      setProcessingRequest(swapId);
      const response = await api.post(`/api/swap/surveillance/swap/${swapId}/decline`);
      
      if (response.data.success) {
        toast.success('Swap request declined');
        // Refresh the notifications list
        await fetchPendingRequests();
      } else {
        toast.error(response.data.message || 'Failed to decline swap request');
      }
    } catch (error) {
      console.error('Error declining swap:', error);
      toast.error(error.response?.data?.message || 'Failed to decline swap request');
    } finally {
      setProcessingRequest(null);
    }
  };

  return (
    <div className="w-80 max-h-[500px] overflow-y-auto">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          Notifications
        </h3>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No new notifications</p>
        </div>
      ) : (
        <div className="divide-y">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-0 rounded-none shadow-none">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">Swap Request</p>
                      <p className="text-sm text-gray-500">
                        From: {request.fromAssignment.user.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Pending
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Current Assignment:</span>
                      <p className="text-gray-600">
                        {request.toAssignment.module} - {request.toAssignment.room}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(request.toAssignment.date), 'MMM dd, yyyy')} at {request.toAssignment.time}
                      </p>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Requested Assignment:</span>
                      <p className="text-gray-600">
                        {request.fromAssignment.module} - {request.fromAssignment.room}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(request.fromAssignment.date), 'MMM dd, yyyy')} at {request.fromAssignment.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAcceptSwap(request.id)}
                      disabled={processingRequest === request.id}
                    >
                      {processingRequest === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDeclineSwap(request.id)}
                      disabled={processingRequest === request.id}
                    >
                      {processingRequest === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 