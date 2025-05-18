import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Search, CheckCircle, XCircle, Clock, Download, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"

export default function ExchangeHistory() {
  // Mock data for exchange history
  const exchanges = [
    {
      id: "EX-2023-001",
      requester: "Dr. Michael Chen",
      recipient: "Dr. Sarah Johnson",
      course: "Computer Science 101",
      originalSlot: "Monday, 10:00 - 12:00",
      newSlot: "Wednesday, 14:00 - 16:00",
      status: "Approved",
      date: "Oct 15, 2023",
    },
    {
      id: "EX-2023-002",
      requester: "Dr. Emily Rodriguez",
      recipient: "Dr. David Kim",
      course: "Advanced Algorithms",
      originalSlot: "Thursday, 13:00 - 15:00",
      newSlot: "Tuesday, 09:00 - 11:00",
      status: "Approved",
      date: "Oct 12, 2023",
    },
    {
      id: "EX-2023-003",
      requester: "Prof. Jennifer Lee",
      recipient: "Dr. Robert Brown",
      course: "Data Structures",
      originalSlot: "Friday, 11:00 - 13:00",
      newSlot: "Thursday, 15:00 - 17:00",
      status: "Rejected",
      date: "Oct 10, 2023",
    },
    {
      id: "EX-2023-004",
      requester: "Dr. James Wilson",
      recipient: "Prof. Lisa Garcia",
      course: "Database Systems",
      originalSlot: "Wednesday, 09:00 - 11:00",
      newSlot: "Monday, 14:00 - 16:00",
      status: "Approved",
      date: "Oct 8, 2023",
    },
    {
      id: "EX-2023-005",
      requester: "Dr. Thomas Moore",
      recipient: "Dr. Patricia Clark",
      course: "Artificial Intelligence",
      originalSlot: "Tuesday, 13:00 - 15:00",
      newSlot: "Friday, 10:00 - 12:00",
      status: "Pending",
      date: "Oct 5, 2023",
    },
    {
      id: "EX-2023-006",
      requester: "Prof. Richard Taylor",
      recipient: "Dr. Susan Martinez",
      course: "Software Engineering",
      originalSlot: "Monday, 15:00 - 17:00",
      newSlot: "Thursday, 11:00 - 13:00",
      status: "Approved",
      date: "Oct 3, 2023",
    },
    {
      id: "EX-2023-007",
      requester: "Dr. Elizabeth White",
      recipient: "Prof. Charles Harris",
      course: "Computer Networks",
      originalSlot: "Friday, 09:00 - 11:00",
      newSlot: "Tuesday, 14:00 - 16:00",
      status: "Rejected",
      date: "Sep 30, 2023",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exchange History</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find specific exchange records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input type="search" placeholder="Search by ID, teacher, or course..." className="pl-8" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="semester">This Semester</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Exchange Records</CardTitle>
          <CardDescription>Complete history of hour swap requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Requester</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Recipient</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Original Slot</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">New Slot</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exchanges.map((exchange, index) => (
                    <tr key={exchange.id} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-3 text-emerald-600 font-medium">{exchange.id}</td>
                      <td className="px-4 py-3 text-gray-500">{exchange.date}</td>
                      <td className="px-4 py-3">{exchange.requester}</td>
                      <td className="px-4 py-3">{exchange.recipient}</td>
                      <td className="px-4 py-3">{exchange.course}</td>
                      <td className="px-4 py-3 text-gray-500">{exchange.originalSlot}</td>
                      <td className="px-4 py-3 text-gray-500">{exchange.newSlot}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            exchange.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : exchange.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {exchange.status === "Approved" && <CheckCircle className="mr-1 h-3 w-3" />}
                          {exchange.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
                          {exchange.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                          {exchange.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">1</span> to <span className="font-medium">7</span> of{" "}
                <span className="font-medium">42</span> results
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8">
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Exchange Statistics</CardTitle>
          <CardDescription>Overview of exchange patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-gray-500">Most Active Department</div>
              <div className="mt-2 text-2xl font-bold">Computer Science</div>
              <div className="mt-1 text-sm text-gray-500">32% of all exchanges</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-gray-500">Most Requested Day</div>
              <div className="mt-2 text-2xl font-bold">Monday</div>
              <div className="mt-1 text-sm text-gray-500">41% of swap requests</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-gray-500">Approval Rate</div>
              <div className="mt-2 text-2xl font-bold">78%</div>
              <div className="mt-1 text-sm text-gray-500">Increased by 5% this semester</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
