import { useState, useEffect } from 'react';
import { Button } from "@/ui/button"
import { Card, CardContent } from "@/ui/card"
import { ArrowLeftRight, CheckCircle, XCircle, Clock } from "lucide-react"
import { useNavigate } from "react-router-dom";
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';

export default function SwapRequests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [swapRequests, setSwapRequests] = useState([]);

  useEffect(() => {
    fetchSwapRequests();
  }, []);

  const fetchSwapRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/surveillance/swap-requests/pending');
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      const processedSwaps = response.data.map(swap => ({
        id: swap.id,
        isSender: swap.fromUser.id === currentUser?.id,
        senderName: `${swap.fromUser.firstName} ${swap.fromUser.lastName}`,
        fromAssignment: {
          module: swap.fromModule,
          date: new Date(swap.fromDate),
          time: swap.fromTime
        },
        toAssignment: {
          module: swap.module,
          date: new Date(swap.date),
          time: swap.time
        },
        createdAt: new Date(swap.createdAt)
      }));
      setSwapRequests(processedSwaps);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast.error('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (swapId, action) => {
    try {
      const response = await api.post(`/surveillance/swap/${swapId}/${action}`);
      if (response.data.success) {
        toast.success(`Swap request ${action}ed successfully`);
        // Refresh the list
        fetchSwapRequests();
      }
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error);
      toast.error(`Failed to ${action} swap request`);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 bg-gray-50">
        <div className="container py-6 px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Swap Requests</h1>
            <p className="text-gray-500">Manage your surveillance swap requests</p>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : swapRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg">No pending swap requests</p>
                    <p className="text-sm mt-2">When you receive swap requests, they will appear here</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              swapRequests.map((swap) => (
                <Card key={swap.id} className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-emerald-100 p-2">
                        <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {swap.isSender ? 'Sent Swap Request' : 'Received Swap Request'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {swap.isSender ? 'You sent this request' : `From: ${swap.senderName}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {swap.createdAt.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">From Assignment</h4>
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-900">{swap.fromAssignment.module}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(swap.fromAssignment.date)} at {swap.fromAssignment.time}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">To Assignment</h4>
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-900">{swap.toAssignment.module}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(swap.toAssignment.date)} at {swap.toAssignment.time}
                              </p>
                            </div>
                          </div>
                        </div>

                        {!swap.isSender && (
                          <div className="flex gap-3 mt-4">
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleSwapAction(swap.id, 'accept')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleSwapAction(swap.id, 'decline')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {swap.isSender && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleSwapAction(swap.id, 'cancel')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Request
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 