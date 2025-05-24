import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '@/utils/axios';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReceivedSwapRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReceivedRequests();
  }, []);

  const fetchReceivedRequests = async () => {
    try {
      setLoading(true);
      console.log('Attempting to fetch received swap requests...');
      const response = await api.get('/api/swap/received-requests');
      console.log('API response for received requests:', response.data);
      if (response.data.success) {
        setRequests(response.data.requests || []);
        console.log('Successfully set requests:', response.data.requests?.length || 0, 'items');
      } else {
        toast.error('Failed to load swap requests');
        console.error('API call failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast.error(error.response?.data?.message || 'Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSwap = async (swapId) => {
    try {
      setProcessingRequest(swapId);
      const response = await api.post(`/api/surveillance/swap/${swapId}/accept`);

      if (response.data.success) {
        toast.success('Swap request accepted');
        // Remove the accepted request from the list
        setRequests(requests.filter(request => request.id !== swapId));
        // Navigate back to the surveillance page to show updated assignments
        navigate('/user/surveillance');
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
      const response = await api.post(`/api/surveillance/swap/${swapId}/decline`);

      if (response.data.success) {
        toast.success('Swap request declined');
        // Remove the declined request from the list
        setRequests(requests.filter(request => request.id !== swapId));
        // Optionally navigate back to the surveillance page, though a decline might not require immediate viewing there
        // navigate('/user/surveillance'); // Uncomment if needed
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Received Swap Requests</h1>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-600">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">No received swap requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-semibold text-lg text-gray-900">
                    {request.fromAssignment.module}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(request.fromAssignment.date), 'MMM dd, yyyy')} at {request.fromAssignment.time}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    From: {request.fromAssignment.user.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 