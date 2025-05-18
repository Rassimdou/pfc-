import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Users, BookOpen, Building2, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, LineChart } from "lucide-react"

export default function AdminDashboard() {
  // Mock data for statistics
  const stats = [
    {
      title: "Total Teachers",
      value: "124",
      change: "+12%",
      trend: "up",
      icon: Users,
      description: "Compared to last semester",
    },
    {
      title: "Total Sections",
      value: "348",
      change: "+5%",
      trend: "up",
      icon: BookOpen,
      description: "Compared to last semester",
    },
    {
      title: "Total Classrooms",
      value: "42",
      change: "-3%",
      trend: "down",
      icon: Building2,
      description: "Compared to last semester",
    },
    {
      title: "Swap Requests",
      value: "87",
      change: "+24%",
      trend: "up",
      icon: ArrowUpRight,
      description: "This month",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administration Dashboard</h1>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
            <CardDescription>Teachers by department</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <PieChart className="h-40 w-40 text-gray-300" />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-emerald-500"></div>
                <span>Computer Science (32%)</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-blue-500"></div>
                <span>Mathematics (24%)</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-amber-500"></div>
                <span>Engineering (18%)</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-red-500"></div>
                <span>Others (26%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Swap Requests</CardTitle>
            <CardDescription>Monthly trends</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-6">
            <LineChart className="h-40 w-full text-gray-300" />
          </CardContent>
        </Card>

        <Card className="col-span-1 hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Classroom Utilization</CardTitle>
            <CardDescription>By time of day</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-6">
            <BarChart3 className="h-40 w-full text-gray-300" />
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
                description: "Dr. Michael Chen swapped Monday 10:00 with Dr. Sarah Johnson's Wednesday 14:00",
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
