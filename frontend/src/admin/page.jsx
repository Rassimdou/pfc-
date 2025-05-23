import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Users, BookOpen, Building2, ArrowUpRight, ArrowDownRight, BarChart3, LineChart } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Button } from "@/ui/button"

export default function AdminDashboard() {
  // Mock data for statistics
  const stats = [
    {
      title: "Total Teachers",
      value: "124",
    
      trend: "up",
      icon: Users,
    
    },
    {
      title: "Total Sections",
      value: "348",
    
    
      icon: BookOpen,
      
    },
    {
      title: "Total Classrooms",
      value: "42",
    
     
      icon: Building2,
   
    },
    {
      title: "Swap Requests",
      value: "87",
     
  
      icon: ArrowUpRight,
      
    },
  ]

  // Data for the pie chart
  const swapData = [
    { name: 'Accepted', value: 75, color: '#10B981' }, // emerald-600
    { name: 'Refused', value: 25, color: '#EF4444' },  // red-500
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">USTHB-Xchange</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <div className="rounded-full bg-emerald-50 p-2">
                <stat.icon className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs mt-1">
                <span className={`flex items-center ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {stat.change}
                </span>
                <span className="text-gray-500 ml-1">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Swap Requests Status</CardTitle>
            <CardDescription>Acceptance rate overview</CardDescription>
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
                  <div className="text-2xl font-bold text-emerald-600">75%</div>
                  <div className="text-sm text-gray-500">Acceptance Rate</div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-emerald-600"></div>
                <span>Accepted (75%)</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-red-500"></div>
                <span>Refused (25%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Swap Requests</CardTitle>
            <CardDescription>Recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: 1,
                  professor: "Mme. Belhouacine",
                  module: "CS 101",
                  from: { day: "Monday", time: "10:00", room: "A101" },
                  to: { day: "Wednesday", time: "14:00", room: "B203" },
                  status: "accepted",
                  date: "2 hours ago"
                },
                {
                  id: 2,
                  professor: "Dr. Bellala",
                  module: "MATH 201",
                  from: { day: "Tuesday", time: "09:00", room: "C105" },
                  to: { day: "Thursday", time: "15:00", room: "A101" },
                  status: "pending",
                  date: "5 hours ago"
                }
              ].map((swap) => (
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
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full text-sm">
                View All Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest actions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                action: "Swap Request Approved",
                description: "Mme. Belhouacine swapped Monday 10:00 with Mr. Houari's Wednesday 14:00",
                time: "2 hours ago",
              },
              {
                action: "New Teacher Added",
                description: "Dr. Emily Rodriguez was added to the Engineering department",
                time: "5 hours ago",
              },
              {
                action: "Schedule Updated",
                description: "Fall 2023 schedule was uploaded and processed",
                time: "Yesterday",
              },
              {
                action: "System Maintenance",
                description: "System was updated to version 2.3.0",
                time: "2 days ago",
              },
              {
                action: "Classroom Allocation Changed",
                description: "Room A-201 was reassigned from Computer Science to Mathematics",
                time: "3 days ago",
              },
            ].map((item, index) => (
              <div key={index} className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                <div className="mr-4 mt-0.5 rounded-full bg-emerald-100 p-1.5">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium">{item.action}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
