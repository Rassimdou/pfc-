import { Button } from "@/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Calendar, Clock, Users, Bell, Settings, BookOpen, ArrowLeftRight, CheckCircle, XCircle } from "lucide-react"
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold">UniSwap</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-emerald-600 border-b-2 border-emerald-600 pb-1">
              Dashboard
            </Link>
            <Link href="/dashboard/schedule" className="text-sm font-medium hover:text-emerald-600">
              My Schedule
            </Link>
            <Link href="/dashboard/swaps" className="text-sm font-medium hover:text-emerald-600">
              Swap Requests
            </Link>
            <Link href="/dashboard/colleagues" className="text-sm font-medium hover:text-emerald-600">
              Colleagues
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                3
              </span>
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
                JP
              </div>
              <span className="hidden md:inline text-sm font-medium">Dr. Jane Porter</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="container py-6 px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome back, Dr. Porter</h1>
            <p className="text-gray-500">Here's what's happening with your teaching schedule</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Upcoming Classes</CardTitle>
                <CardDescription>Your next 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { day: "Today", time: "14:00 - 16:00", course: "Data Structures", room: "Room B-105" },
                    { day: "Tomorrow", time: "09:00 - 11:00", course: "Algorithms", room: "Room C-302" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                    >
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                        <Clock className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {item.day}: {item.time}
                        </div>
                        <div className="text-sm text-gray-500">{item.course}</div>
                        <div className="text-xs text-gray-400">{item.room}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-emerald-600">
                  View Full Schedule
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Swap Requests</CardTitle>
                <CardDescription>Pending your action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      from: "Dr. Michael Chen",
                      course: "Calculus I",
                      currentDay: "Monday, 10:00 - 12:00",
                      proposedDay: "Tuesday, 14:00 - 16:00",
                    },
                    {
                      from: "Prof. Sarah Johnson",
                      course: "Intro to Programming",
                      currentDay: "Thursday, 09:00 - 11:00",
                      proposedDay: "Wednesday, 13:00 - 15:00",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                          <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium">{item.from}</div>
                          <div className="text-sm text-gray-500">{item.course}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 pl-9">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Current: {item.currentDay}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> Proposed: {item.proposedDay}
                        </div>
                      </div>
                      <div className="flex gap-2 pl-9 mt-1">
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle className="h-3 w-3 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="h-7">
                          <XCircle className="h-3 w-3 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-emerald-600">
                  View All Requests
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700">
                    <ArrowLeftRight className="h-4 w-4 mr-2" /> Request New Swap
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" /> View Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" /> Find Colleagues
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" /> Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Tabs defaultValue="weekly">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Schedule Overview</h2>
                <TabsList>
                  <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="weekly" className="mt-0">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-7 gap-4">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                        (day, index) => (
                          <div key={index} className="text-center font-medium">
                            {day}
                          </div>
                        ),
                      )}

                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                        (day, index) => (
                          <div
                            key={index}
                            className={`min-h-[150px] rounded-lg border p-2 ${
                              day === "Saturday" || day === "Sunday" ? "bg-gray-50" : ""
                            }`}
                          >
                            {day === "Monday" && (
                              <div className="mb-2 rounded bg-emerald-100 p-2 text-xs text-emerald-700">
                                <div className="font-medium">Computer Science 101</div>
                                <div>10:00 - 12:00</div>
                                <div>Room A-201</div>
                              </div>
                            )}

                            {day === "Wednesday" && (
                              <div className="mb-2 rounded bg-emerald-100 p-2 text-xs text-emerald-700">
                                <div className="font-medium">Data Structures</div>
                                <div>14:00 - 16:00</div>
                                <div>Room B-105</div>
                              </div>
                            )}

                            {day === "Thursday" && (
                              <div className="mb-2 rounded bg-emerald-100 p-2 text-xs text-emerald-700">
                                <div className="font-medium">Algorithms</div>
                                <div>09:00 - 11:00</div>
                                <div>Room C-302</div>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monthly">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">Monthly calendar view will be displayed here</div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
