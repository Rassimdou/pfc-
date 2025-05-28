import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Users, BookOpen, Building2, ArrowUpRight, ArrowDownRight, BarChart3, LineChart, RefreshCw } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Button } from "@/ui/button"
import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import api from '@/utils/axios'
import { toast } from 'react-hot-toast'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    teachers: 0,
    sections: 0,
    classrooms: 0,
    swapRequests: {
      total: 0,
      accepted: 0,
      declined: 0,
      canceled: 0,
      pending: 0
    }
  })
  const [swapData, setSwapData] = useState([])
  const [recentSwaps, setRecentSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch teachers count
      const teachersResponse = await api.get('/admin/teachers')
      const activeTeachersCount = teachersResponse.data?.data?.filter(teacher => teacher.type === 'active').length || 0

      // Fetch modules count (sections)
      const modulesResponse = await api.get('/admin/modules')
      const sectionsCount = modulesResponse.data?.data?.length || 0

      // Fetch classrooms count
      const classroomsResponse = await api.get('/admin/classrooms')
      const classroomsCount = classroomsResponse.data?.data?.length || 0

      // Fetch swap requests
      const swapRequestsResponse = await api.get('/admin/exchanges')
      const swapRequests = swapRequestsResponse.data?.data || []

      // Calculate swap request statistics
      const swapStats = {
        total: swapRequests.length,
        accepted: swapRequests.filter(req => req.status === 'ACCEPTED').length,
        declined: swapRequests.filter(req => req.status === 'DECLINED').length,
        canceled: swapRequests.filter(req => req.status === 'CANCELED').length,
        pending: swapRequests.filter(req => req.status === 'PENDING').length
      }

      setStats({
        teachers: activeTeachersCount,
        sections: sectionsCount,
        classrooms: classroomsCount,
        swapRequests: swapStats
      })

      // Calculate swap status distribution
      const acceptedCount = swapRequests.filter(swap => swap.status === 'ACCEPTED').length
      const declinedCount = swapRequests.filter(swap => swap.status === 'DECLINED').length
      const pendingCount = swapRequests.filter(swap => swap.status === 'PENDING').length
      const canceledCount = swapRequests.filter(swap => swap.status === 'CANCELED').length

      setSwapData([
        { name: 'Accepted', value: acceptedCount, color: '#10B981' },
        { name: 'Declined', value: declinedCount, color: '#EF4444' },
        { name: 'Pending', value: pendingCount, color: '#F59E0B' },
        { name: 'Canceled', value: canceledCount, color: '#6B7280' }
      ])

      // Get recent swaps
      const recentSwapsData = swapRequests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(swap => ({
          id: swap.id,
          professor: swap.user?.name || 'Unknown',
          module: swap.fromAssignment?.module || 'Unknown',
          from: {
            day: new Date(swap.fromAssignment?.date).toLocaleDateString('en-US', { weekday: 'long' }),
            time: swap.fromAssignment?.time || 'N/A',
            room: swap.fromAssignment?.room || 'N/A'
          },
          to: {
            day: new Date(swap.toAssignment?.date).toLocaleDateString('en-US', { weekday: 'long' }),
            time: swap.toAssignment?.time || 'N/A',
            room: swap.toAssignment?.room || 'N/A'
          },
          status: swap.status?.toLowerCase() || 'unknown',
          date: new Date(swap.createdAt).toLocaleString()
        }))

      setRecentSwaps(recentSwapsData)
      setLoading(false)
      setError(null)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to fetch dashboard data')
      setLoading(false)
      if (error.response?.status === 401) {
        setError('Please log in to access the admin dashboard')
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else if (error.response?.status === 404) {
        const endpoint = error.config?.url?.split('/').pop()
        setError(`API endpoint not found: ${endpoint}. Please check the server configuration.`)
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later or contact support.')
      } else if (!error.response) {
        setError('Network error. Please check your internet connection.')
      } else {
        setError(`Failed to load dashboard data: ${error.response?.data?.message || error.message}`)
      }
    }
  }

  const statsCards = [
    {
      title: "Total Teachers",
      value: stats.teachers,
      icon: Users,
    },
    {
      title: "Total Sections",
      value: stats.sections,
      icon: BookOpen,
    },
    {
      title: "Total Classrooms",
      value: stats.classrooms,
      icon: Building2,
    },
    {
      title: "Swap Requests",
      value: stats.swapRequests.total,
      icon: RefreshCw,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          {error.includes('log in') && (
            <div className="text-gray-500">Redirecting to login page...</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">USTHB-Xchange</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <div className="rounded-full bg-emerald-50 p-2">
                <stat.icon className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Swap Requests Status</CardTitle>
            <CardDescription>Distribution of swap request statuses</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="relative h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={swapData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {swapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {Math.round((swapData[0]?.value / stats.swapRequests.total) * 100 || 0)}%
                  </div>
                  <div className="text-sm text-gray-500">Acceptance Rate</div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              {swapData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Recent Swap Requests</CardTitle>
            <CardDescription>Latest activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSwaps.map((swap) => (
                <div key={swap.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      swap.status === 'accepted' ? 'bg-emerald-500' :
                      swap.status === 'pending' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{swap.professor}</p>
                        <p className="text-xs text-gray-500">{swap.module}</p>
                      </div>
                      <span className="text-xs text-gray-500">{swap.date}</span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <div className="flex items-center bg-gray-50 px-3 py-1 rounded">
                        <ArrowUpRight className="h-3 w-3 mr-1 text-gray-400" />
                        <span>{swap.from.day} {swap.from.time}</span>
                        <span className="mx-1 text-gray-400">•</span>
                        <span className="text-gray-600">{swap.from.room}</span>
                      </div>
                      <span className="mx-2 text-gray-400">→</span>
                      <div className="flex items-center bg-gray-50 px-3 py-1 rounded">
                        <ArrowDownRight className="h-3 w-3 mr-1 text-gray-400" />
                        <span>{swap.to.day} {swap.to.time}</span>
                        <span className="mx-1 text-gray-400">•</span>
                        <span className="text-gray-600">{swap.to.room}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        swap.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        swap.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
