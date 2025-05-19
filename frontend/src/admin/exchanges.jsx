import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Search, Filter, Calendar, Clock, Users, ArrowLeftRight } from "lucide-react"
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';

export default function ExchangeHistory() {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchExchanges();
  }, []);

  const fetchExchanges = async () => {
    try {
      const response = await api.get('/admin/exchanges');
      setExchanges(response.data.data || []);
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      toast.error('Failed to fetch exchange history');
    } finally {
      setLoading(false);
    }
  };

  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = 
      exchange.initiator?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exchange.receiver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exchange.module?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || exchange.status === selectedStatus;
    const matchesType = selectedType === 'all' || exchange.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exchange History</h1>
      </div>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find specific exchanges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="search" 
                placeholder="Search by teacher or module..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SURVEILLANCE">Surveillance</SelectItem>
                  <SelectItem value="SCHEDULE">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Exchange History</CardTitle>
          <CardDescription>View all exchange requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Initiator</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Receiver</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-center">Loading...</td>
                    </tr>
                  ) : filteredExchanges.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-center">No exchanges found</td>
                    </tr>
                  ) : (
                    filteredExchanges.map((exchange) => (
                      <tr key={exchange.id} className="border-b">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            exchange.type === 'SURVEILLANCE' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {exchange.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{exchange.initiator?.name}</td>
                        <td className="px-4 py-3">{exchange.receiver?.name}</td>
                        <td className="px-4 py-3">{exchange.module}</td>
                        <td className="px-4 py-3">
                          {new Date(exchange.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            exchange.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            exchange.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            exchange.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {exchange.status}
                          </span>
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