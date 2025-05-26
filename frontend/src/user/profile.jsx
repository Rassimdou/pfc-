import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { User, Mail, Phone, Key, Clock, LogIn, Eye, EyeOff } from "lucide-react"
import api from "@/utils/axios"
import { toast } from "react-hot-toast"

export default function UserProfile() {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access your profile');
        return;
      }

      const response = await api.get('/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setProfileData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to fetch profile data');
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSecurityInputChange = (e) => {
    const { name, value } = e.target;
    setSecurityData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to update your profile');
        return;
      }

      const response = await api.put('/users/profile', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Profile updated successfully');
        // Update local storage with new user data
        const userData = JSON.parse(localStorage.getItem('user'));
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          ...profileData
        }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to change your password');
        return;
      }

      const response = await api.post('/users/change-password', securityData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        setSecurityData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Error changing password');
    } finally {
      setLoading(false);
    }
  };

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
      action: "Profile Updated",
      details: "Profile information was modified",
      time: "Oct 10, 2023, 11:30 AM",
      icon: User,
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">User Profile</h1>
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
                {profileData.firstName?.[0]}{profileData.lastName?.[0]}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{profileData.firstName} {profileData.lastName}</h2>
              <p className="text-sm text-gray-500">Professor</p>
            </div>
            
            <div className="space-y-3">
              <ProfileInfoItem icon={Mail} text={profileData.email} />
              <ProfileInfoItem icon={Phone} text={profileData.phoneNumber} />
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
                <TabTrigger value="activity">Activity</TabTrigger>
                <TabTrigger value="security">Security</TabTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField 
                      label="First Name" 
                      id="firstName" 
                      value={profileData.firstName}
                      onChange={handleInputChange}
                    />
                    <InputField 
                      label="Last Name" 
                      id="lastName" 
                      value={profileData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <InputField 
                    label="Email" 
                    id="email" 
                    type="email" 
                    value={profileData.email}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Phone Number" 
                    id="phoneNumber" 
                    value={profileData.phoneNumber}
                    onChange={handleInputChange}
                  />
                  <div className="flex justify-end gap-3">
                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
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

              <TabsContent value="security" className="space-y-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={securityData.currentPassword}
                        onChange={handleSecurityInputChange}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={securityData.newPassword}
                        onChange={handleSecurityInputChange}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={securityData.confirmPassword}
                        onChange={handleSecurityInputChange}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={loading}
                    >
                      {loading ? "Changing Password..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Components
const ProfileInfoItem = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3 text-sm text-gray-700">
    <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
    <span>{text}</span>
  </div>
);

const TabTrigger = ({ value, children }) => (
  <TabsTrigger 
    value={value}
    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900"
  >
    {children}
  </TabsTrigger>
);

const InputField = ({ label, id, type = "text", value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-gray-700">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className="border-gray-300 hover:border-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
    />
  </div>
);

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
); 