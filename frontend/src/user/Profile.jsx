import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/card';
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import { User, Loader2, AlertCircle, Mail, Phone, BookOpen, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/dialog';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State for Password Change Dialog
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Endpoint is /api/auth/user/profile as confirmed
      const response = await api.get('/api/auth/user/profile');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        toast.error('Failed to load user profile');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error(error.response?.data?.message || 'Failed to load user profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    // Add more password validation if needed (e.g., length, complexity)

    setIsChangingPassword(true);
    try {
      // We need a backend endpoint for changing password
      // Assuming a POST endpoint like '/api/auth/change-password'
      const response = await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setShowPasswordChangeDialog(false);
        // Clear password fields after successful change
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(response.data.message || 'Failed to change password.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <span className="ml-3 text-lg text-gray-600">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 text-red-600 flex flex-col items-center">
        <AlertCircle className="h-10 w-10 mb-3 text-red-500" />
        <p className="text-lg">Failed to load profile data.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
             <User className="h-7 w-7 text-emerald-600" /> User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="text-lg font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Email Address</p>
            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" /> {user.email}
            </p>
          </div>
          {user.phoneNumber && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Phone Number</p>
              <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                 <Phone className="h-5 w-5 text-gray-500" /> {user.phoneNumber}
              </p>
            </div>
          )}
          {/* Add more professor-specific details here */}
          {/* Example: Modules taught (assuming user object has a modules array) */}
          {user.modules && user.modules.length > 0 && (
             <div className="space-y-2 col-span-full">
                <p className="text-sm font-medium text-gray-500">Modules Taught</p>
                <div className="flex flex-wrap gap-2">
                   {user.modules.map(module => (
                      <span key={module.id} className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-800">
                         <BookOpen className="h-4 w-4 mr-1" />{module.name}
                      </span>
                   ))}
                </div>
             </div>
          )}
           {user.role && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="text-lg font-semibold text-gray-900">{user.role}</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Settings className="h-7 w-7 text-emerald-600" /> Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Password Change Setting Item */}
          <div className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0">
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordChangeDialog(true)}>Change Password</Button>
          </div>

          {/* Add other settings items here (e.g., Change Email) */}
          {/* Example: Email Preferences */}
          {/*
          <div className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Manage your email notification preferences</p>
            </div>
             <Button variant="outline" size="sm">Manage</Button>
          </div>
          */}

        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordChangeDialog} onOpenChange={setShowPasswordChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle password visibility</span>
                  </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle password visibility</span>
                  </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
               <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle password visibility</span>
                  </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordChangeDialog(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
} 