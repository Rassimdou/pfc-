import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Upload, FileText, FileSpreadsheet, Calendar, Check, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"

export default function Planning() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planning Management</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Calendar className="h-4 w-4 mr-2" />
          View Current Schedule
        </Button>
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upload">Upload Schedule</TabsTrigger>
          <TabsTrigger value="preview">Preview & Validate</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Upload Schedule Files</CardTitle>
              <CardDescription>Upload PDF or Excel files containing the university schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select>
                      <SelectTrigger id="semester">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fall-2023">Fall 2023</SelectItem>
                        <SelectItem value="spring-2024">Spring 2024</SelectItem>
                        <SelectItem value="summer-2024">Summer 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="math">Mathematics</SelectItem>
                        <SelectItem value="eng">Engineering</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file-type">File Type</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger id="file-type">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Schedule</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-emerald-50 p-3">
                    <Upload className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Drag & Drop Files</h3>
                  <p className="text-sm text-gray-500 mb-4">or click to browse your files</p>
                  <div className="flex gap-2 mb-4">
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 flex items-center">
                      <FileText className="h-3 w-3 mr-1" /> PDF
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 flex items-center">
                      <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
                    </div>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Files</Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50 text-blue-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">File Processing Information</h4>
                  <p className="text-sm mt-1">
                    Our system will automatically extract schedule information from your uploaded files. PDF files will
                    be processed using OCR technology, while Excel files will be directly parsed. The processing may
                    take a few minutes depending on the file size and complexity.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Upload & Process</Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Processing Options</CardTitle>
              <CardDescription>Configure how the system processes your uploaded files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="extraction-mode">Extraction Mode</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger id="extraction-mode">
                        <SelectValue placeholder="Select extraction mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automatic Detection</SelectItem>
                        <SelectItem value="template">Use Template</SelectItem>
                        <SelectItem value="manual">Manual Configuration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                    <Select defaultValue="prompt">
                      <SelectTrigger id="conflict-resolution">
                        <SelectValue placeholder="Select conflict resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prompt">Prompt for Resolution</SelectItem>
                        <SelectItem value="overwrite">Overwrite Existing</SelectItem>
                        <SelectItem value="keep">Keep Existing</SelectItem>
                        <SelectItem value="merge">Merge Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="processing-notes">Processing Notes</Label>
                  <Input
                    id="processing-notes"
                    placeholder="Add any special instructions for processing this file..."
                    className="h-20"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="notify" className="rounded border-gray-300" />
                  <Label htmlFor="notify">Notify me when processing is complete</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Preview Extracted Schedule</CardTitle>
              <CardDescription>Review and validate the extracted schedule data before finalizing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="font-medium">Fall2023_Schedule.pdf</div>
                      <div className="text-xs text-gray-500">Uploaded 10 minutes ago • 2.4 MB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-emerald-600 font-medium flex items-center">
                      <Check className="h-4 w-4 mr-1" /> Processing Complete
                    </div>
                    <Button variant="outline" size="sm">
                      View Original
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                    <div className="font-medium">Extracted Schedule Data</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <AlertCircle className="h-4 w-4 mr-1" /> Report Issues
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="h-4 w-4 mr-1" /> Validate All
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Day</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            course: "CS 101: Intro to Programming",
                            professor: "Dr. Michael Chen",
                            day: "Monday",
                            time: "10:00 - 12:00",
                            room: "A-201",
                            status: "Valid",
                          },
                          {
                            course: "CS 202: Data Structures",
                            professor: "Dr. Sarah Johnson",
                            day: "Wednesday",
                            time: "14:00 - 16:00",
                            room: "B-105",
                            status: "Valid",
                          },
                          {
                            course: "CS 303: Algorithms",
                            professor: "Dr. James Wilson",
                            day: "Thursday",
                            time: "09:00 - 11:00",
                            room: "C-302",
                            status: "Warning",
                          },
                          {
                            course: "MATH 201: Calculus I",
                            professor: "Dr. Emily Rodriguez",
                            day: "Tuesday",
                            time: "13:00 - 15:00",
                            room: "D-110",
                            status: "Valid",
                          },
                          {
                            course: "ENG 305: Software Engineering",
                            professor: "Prof. David Kim",
                            day: "Friday",
                            time: "11:00 - 13:00",
                            room: "A-105",
                            status: "Error",
                          },
                        ].map((item, index) => (
                          <tr key={index} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                            <td className="px-4 py-3">{item.course}</td>
                            <td className="px-4 py-3">{item.professor}</td>
                            <td className="px-4 py-3">{item.day}</td>
                            <td className="px-4 py-3">{item.time}</td>
                            <td className="px-4 py-3">{item.room}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  item.status === "Valid"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "Error"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Discard</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Finalize & Import</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Upload History</CardTitle>
              <CardDescription>Previous schedule uploads and their processing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">File Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Uploaded By</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Semester</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        fileName: "Fall2023_Schedule.pdf",
                        uploadedBy: "Admin User",
                        date: "Oct 15, 2023",
                        semester: "Fall 2023",
                        status: "Processed",
                      },
                      {
                        fileName: "CS_Department_Spring2024.xlsx",
                        uploadedBy: "Admin User",
                        date: "Oct 10, 2023",
                        semester: "Spring 2024",
                        status: "Processed",
                      },
                      {
                        fileName: "Math_Department_Fall2023.pdf",
                        uploadedBy: "Department Head",
                        date: "Sep 28, 2023",
                        semester: "Fall 2023",
                        status: "Processed",
                      },
                      {
                        fileName: "Engineering_Spring2024.pdf",
                        uploadedBy: "Admin User",
                        date: "Sep 20, 2023",
                        semester: "Spring 2024",
                        status: "Failed",
                      },
                      {
                        fileName: "Summer2023_AllDepartments.xlsx",
                        uploadedBy: "System Admin",
                        date: "May 15, 2023",
                        semester: "Summer 2023",
                        status: "Processed",
                      },
                    ].map((item, index) => (
                      <tr key={index} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 flex items-center gap-2">
                          {item.fileName.endsWith(".pdf") ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-green-500" />
                          )}
                          {item.fileName}
                        </td>
                        <td className="px-4 py-3">{item.uploadedBy}</td>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.semester}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.status === "Processed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
