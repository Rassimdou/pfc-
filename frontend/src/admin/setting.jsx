import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Globe, Shield, Database, RefreshCw, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Switch } from "@/ui/switch"

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">General Settings</CardTitle>
              <CardDescription>Basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-name">System Name</Label>
                  <Input id="system-name" defaultValue="UniSwap - Professor Hour Exchange" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university-name">University Name</Label>
                  <Input id="university-name" defaultValue="University of Technology" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="america-new_york">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="america-new_york">America/New_York (UTC-5)</SelectItem>
                        <SelectItem value="america-chicago">America/Chicago (UTC-6)</SelectItem>
                        <SelectItem value="america-denver">America/Denver (UTC-7)</SelectItem>
                        <SelectItem value="america-los_angeles">America/Los_Angeles (UTC-8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select defaultValue="mdy">
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academic-year">Current Academic Year</Label>
                    <Select defaultValue="2023-2024">
                      <SelectTrigger id="academic-year">
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023-2024">2023-2024</SelectItem>
                        <SelectItem value="2022-2023">2022-2023</SelectItem>
                        <SelectItem value="2021-2022">2021-2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current-semester">Current Semester</Label>
                    <Select defaultValue="fall-2023">
                      <SelectTrigger id="current-semester">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fall-2023">Fall 2023</SelectItem>
                        <SelectItem value="spring-2024">Spring 2024</SelectItem>
                        <SelectItem value="summer-2024">Summer 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">System Contact Email</Label>
                  <Input id="contact-email" defaultValue="admin@university.edu" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Notification Settings</CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Swap Requests",
                      description: "Send email when a new swap request is created",
                    },
                    {
                      title: "Swap Approvals",
                      description: "Send email when a swap request is approved",
                    },
                    {
                      title: "Swap Rejections",
                      description: "Send email when a swap request is rejected",
                    },
                    {
                      title: "Schedule Changes",
                      description: "Send email when the schedule is updated",
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                      <Switch defaultChecked={index < 3} />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium">System Notifications</h3>
                  <div className="space-y-3 mt-3">
                    {[
                      {
                        title: "New User Registration",
                        description: "Notify admins when a new user registers",
                      },
                      {
                        title: "File Processing",
                        description: "Notify when schedule file processing is complete",
                      },
                      {
                        title: "System Updates",
                        description: "Notify about system updates and maintenance",
                      },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                        <Switch defaultChecked={index < 2} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-sender">Email Sender Name</Label>
                  <Input id="email-sender" defaultValue="UniSwap System" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-from">Email From Address</Label>
                  <Input id="email-from" defaultValue="noreply@university.edu" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Security Settings</CardTitle>
              <CardDescription>Configure system security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Authentication</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Two-Factor Authentication",
                      description: "Require 2FA for all admin accounts",
                    },
                    {
                      title: "Password Complexity",
                      description: "Enforce strong password requirements",
                    },
                    {
                      title: "Password Expiration",
                      description: "Require password changes every 90 days",
                    },
                    {
                      title: "Account Lockout",
                      description: "Lock accounts after 5 failed login attempts",
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                      <Switch defaultChecked={index < 2} />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium">Session Settings</h3>
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input id="session-timeout" type="number" defaultValue="30" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Force Logout on Browser Close</div>
                        <div className="text-sm text-gray-500">End session when browser is closed</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium">Access Control</h3>
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="allowed-domains">Allowed Email Domains</Label>
                      <Input id="allowed-domains" defaultValue="university.edu" />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated list of allowed email domains</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">IP Restriction</div>
                        <div className="text-sm text-gray-500">Restrict access to specific IP ranges</div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Appearance Settings</CardTitle>
              <CardDescription>Customize the system appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-3">
                    <Input id="primary-color" type="color" defaultValue="#10b981" className="w-16 h-10" />
                    <Input defaultValue="#10b981" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload">University Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-gray-50">
                      <Globe className="h-8 w-8 text-gray-300" />
                    </div>
                    <Button variant="outline">Upload New Logo</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">System Theme</Label>
                  <Select defaultValue="light">
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Custom CSS</div>
                    <div className="text-sm text-gray-500">Allow custom CSS for branding</div>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Advanced Settings</CardTitle>
              <CardDescription>System maintenance and advanced options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-yellow-50 text-yellow-800">
                  <h4 className="font-medium">Warning: Advanced Settings</h4>
                  <p className="text-sm mt-1">
                    Changes to these settings may affect system stability. Proceed with caution.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">System Maintenance</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Backup Database
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Restore Database
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Security Audit
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium">Data Management</h3>
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                      <Input id="data-retention" type="number" defaultValue="365" />
                      <p className="text-xs text-gray-500 mt-1">How long to keep historical data</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Automatic Data Cleanup</div>
                        <div className="text-sm text-gray-500">Automatically remove old data</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-red-600">Danger Zone</h3>
                  <div className="space-y-3 mt-3">
                    <div className="rounded-lg border border-red-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Reset System</div>
                          <div className="text-sm text-gray-500">Reset all settings to default values</div>
                        </div>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-red-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Clear All Data</div>
                          <div className="text-sm text-gray-500">Remove all system data (cannot be undone)</div>
                        </div>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}