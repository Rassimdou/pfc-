import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { User, Mail, Phone, Building, Briefcase, Shield, Key, Clock, Calendar, LogIn } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"

export default function AdminProfile() {
  const permissions = [
    {
      title: "User Management",
      description: "Create, edit, and delete user accounts",
      access: "Full Access",
    },
    {
      title: "Schedule Management",
      description: "Upload and modify teaching schedules",
      access: "Full Access",
    },
    {
      title: "Exchange Approval",
      description: "Approve or reject swap requests",
      access: "Full Access",
    },
    {
      title: "System Configuration",
      description: "Modify system settings and parameters",
      access: "Full Access",
    },
    {
      title: "Reports & Analytics",
      description: "Generate and view system reports",
      access: "Full Access",
    },
    {
      title: "Department Management",
      description: "Manage department settings",
      access: "Full Access",
    },
  ]

  const activityItems = [
    {
      action: "Login",
      details: "Successful login from 192.168.1.1",
      time: "Today, 10:23 AM",
      icon: LogIn,
    },
    {
      action: "Password Changed",
      details: "Password was updated",
      time: "Oct 15, 2023, 2:45 PM",
      icon: Key,
    },
    {
      action: "Schedule Upload",
      details: "Uploaded Fall 2023 schedule",
      time: "Oct 10, 2023, 11:30 AM",
      icon: Calendar,
    },
    {
      action: "Login",
      details: "Successful login from 192.168.1.1",
      time: "Oct 8, 2023, 9:15 AM",
      icon: LogIn,
    },
    {
      action: "Account Created",
      details: "Account was created",
      time: "Oct 1, 2023, 3:00 PM",
      icon: User,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Profile</h1>
        <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
          View Public Profile
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">Profile Information</CardTitle>
            <CardDescription className="text-gray-500">Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-semibold mb-4">
                JD
              </div>
              <h2 className="text-xl font-semibold text-gray-900">John Doe</h2>
              <p className="text-sm text-gray-500">System Administrator</p>
            </div>
            
            <div className="space-y-3">
              <ProfileInfoItem icon={Mail} text="admin@university.edu" />
              <ProfileInfoItem icon={Phone} text="+1 (555) 123-4567" />
              <ProfileInfoItem icon={Building} text="Administration Building, Room 302" />
              <ProfileInfoItem icon={Briefcase} text="IT Department" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Edit Profile</Button>
          </CardFooter>
        </Card>

        {/* Account Management Card */}
        <Card className="md:col-span-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">Account Management</CardTitle>
            <CardDescription className="text-gray-500">Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-50 p-1 rounded-lg">
                <TabTrigger value="profile">Profile</TabTrigger>
                <TabTrigger value="security">Security</TabTrigger>
                <TabTrigger value="activity">Activity</TabTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="First Name" id="first-name" defaultValue="John" />
                    <InputField label="Last Name" id="last-name" defaultValue="Doe" />
                  </div>
                  <InputField label="Email" id="email" type="email" defaultValue="admin@university.edu" />
                  <InputField label="Phone Number" id="phone" defaultValue="+1 (555) 123-4567" />
                  <InputField 
  label="Department" 
  id="department" 
  defaultValue="it"
  options={["IT Department", "Administration", "Academic Affairs"]} 
/>
                   
                  <InputField label="Office Location" id="office" defaultValue="Administration Building, Room 302" />
                </div>
                <FormActions />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <div className="space-y-4">
                  <InputField label="Current Password" id="current-password" type="password" />
                  <InputField label="New Password" id="new-password" type="password" />
                  <InputField label="Confirm New Password" id="confirm-password" type="password" />
                  <SecurityRecommendations />
                </div>
                <FormActions />
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-gray-700">
                    Recent Activity
                  </div>
                  <div className="divide-y divide-gray-200">
                    {activityItems.map((item, index) => (
                      <ActivityItem key={index} {...item} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                    View Full Activity Log
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Card */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">Admin Permissions</CardTitle>
          <CardDescription className="text-gray-500">Your current system access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {permissions.map((item, index) => (
              <PermissionItem key={index} {...item} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Reusable Components
const ProfileInfoItem = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3 text-sm text-gray-700">
    <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
    <span>{text}</span>
  </div>
)

const TabTrigger = ({ value, children }) => (
  <TabsTrigger 
    value={value}
    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900"
  >
    {children}
  </TabsTrigger>
)

const InputField = ({ label, id, type = "text", defaultValue, options }) => {
  if (options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-gray-700">{label}</Label>
        <Select defaultValue={defaultValue}>
          <SelectTrigger id={id} className="border-gray-300 hover:border-gray-400 focus:ring-1 focus:ring-emerald-500">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="border-gray-200">
            {options.map((option) => (
              <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700">{label}</Label>
      <Input
        id={id}
        type={type}
        defaultValue={defaultValue}
        className="border-gray-300 hover:border-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  )
}

const FormActions = () => (
  <div className="flex justify-end gap-3">
    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">Cancel</Button>
    <Button className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
  </div>
)

const SecurityRecommendations = () => (
  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-amber-800">
    <h4 className="font-medium flex items-center gap-2">
      <Shield className="h-4 w-4" /> Security Recommendations
    </h4>
    <ul className="text-sm mt-2 space-y-1 ml-6 list-disc">
      <li>Use a strong password with at least 12 characters</li>
      <li>Include uppercase letters, numbers, and symbols</li>
      <li>Don't reuse passwords from other services</li>
      <li>Consider enabling two-factor authentication</li>
    </ul>
  </div>
)

const ActivityItem = ({ action, details, time, icon: Icon }) => (
  <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
      <Icon className="h-4 w-4 text-emerald-600" />
    </div>
    <div className="flex-1">
      <div className="font-medium text-gray-900">{action}</div>
      <div className="text-sm text-gray-500 mt-1">{details}</div>
      <div className="text-xs text-gray-400 mt-2 flex items-center">
        <Clock className="h-3 w-3 mr-1.5" /> {time}
      </div>
    </div>
  </div>
)

const PermissionItem = ({ title, description, access }) => (
  <div className="rounded-lg border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors">
    <h3 className="font-medium text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    <div className="mt-3">
      <span className="inline-flex items-center rounded-full bg-green-100/80 px-2.5 py-0.5 text-xs font-medium text-green-800">
        {access}
      </span>
    </div>
  </div>
)