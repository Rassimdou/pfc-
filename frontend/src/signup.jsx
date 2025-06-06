import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { BookOpen } from "lucide-react"
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleData, setGoogleData] = useState(null);

  useEffect(() => {
    // Check for token in URL params
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (token) {
      // Store token immediately
      localStorage.setItem('token', token);
      // If email is provided, pre-fill and mark as verified
      if (email) {
        setFormData(prev => ({
          ...prev,
          email: email
        }));
        setEmailVerified(true);
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phoneNumber || (!isGoogleSignup && (!formData.password || !formData.confirmPassword))) {
      setError("All fields are required");
      return false;
    }
    if (!isGoogleSignup && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!isGoogleSignup && formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError("Invalid phone number format");
      return false;
    }
    return true;
  };

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const response = await api.post('/auth/check-email', {
        email: formData.email.toLowerCase().trim()
      });
      
      if (response.data.valid) {
        setEmailVerified(true);
        toast.success('Email verified! You can proceed with signup.');
      } else {
        setError('This email is not authorized to register. Please contact your administrator.');
        toast.error('This email is not authorized to register. Please contact your administrator.');
      }
    } catch (err) {
      console.error('Email verification error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to verify email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) return;
    if (!emailVerified && !isGoogleSignup) {
      setError("Please verify your email first");
      return;
    }

    try {
      setLoading(true);
      
      // Get the token from URL params or localStorage
      const token = searchParams.get('token') || localStorage.getItem('token');
      
      if (token) {
        // This is an invitation signup
        const response = await api.post('/auth/set-password', {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          isGoogleSignup: false
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          retry: 3,
          retryDelay: 1000
        });

        if (response.data.success) {
          // Update stored token and user data
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Account created successfully!');
          navigate('/dashboard');
        }
      } else {
        // Regular email/password signup
        const response = await api.post('/auth/set-password', {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          isGoogleSignup: false
        }, {
          retry: 3,
          retryDelay: 1000
        });

        if (response.data.success) {
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Account created successfully!');
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      let errorMessage = "An error occurred during signup";
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        errorMessage = err.response.data.message || errorMessage;
        
        // Handle specific error cases
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        
        // Check if server is running
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/test`);
          const data = await response.json();
          console.log('Server test response:', data);
          errorMessage = "Server is running but request failed. Please try again.";
        } catch (pingError) {
          console.error('Server ping failed:', pingError);
          errorMessage = "Server is not responding. Please try again later.";
        }
      } else {
        console.error('Error:', err.message);
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, ''); // Remove trailing slash if present
    const googleAuthUrl = `${baseUrl}/api/auth/google`;
    console.log('Redirecting to Google auth:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col justify-center items-center p-4 md:p-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-emerald-600" />
          <span className="text-2xl font-bold">UniSwap</span>
        </Link>

        <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-lg animate-fadeIn">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-gray-500">Enter your information to get started</p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {!isGoogleSignup && (
            <div className="space-y-4">
              <Button 
                type="button" 
                className="w-full bg-white border border-gray-300 text-black hover:bg-gray-50"
                onClick={handleGoogleSignup}
              >
                <span className="flex items-center justify-center text-black">
                  <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
                  <span className="text-black font-medium">Continue with Google</span>
                </span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input 
                  id="firstName" 
                  placeholder="Jane" 
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!emailVerified}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input 
                  id="lastName" 
                  placeholder="Porter" 
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!emailVerified}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">University Email</Label>
              <div className="flex gap-2">
                <Input 
                  id="email" 
                  placeholder="professor@university.edu" 
                  type="email" 
                  value={formData.email}
                  onChange={handleChange}
                  disabled={emailVerified}
                />
                {!emailVerified && !isGoogleSignup && (
                  <Button 
                    type="button"
                    onClick={verifyEmail}
                    disabled={loading || !formData.email}
                    className="whitespace-nowrap"
                  >
                    {loading ? "Verifying..." : "Verify Email"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input 
                id="phoneNumber" 
                placeholder="+2130000000000" 
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={!emailVerified}
              />
              <p className="text-xs text-gray-500">Enter your phone number with country code (e.g., +2130000000000)</p>
            </div>

            {!isGoogleSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={formData.password}
                    onChange={handleChange}
                    disabled={!emailVerified}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={!emailVerified}
                  />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !emailVerified}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t bg-white py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} UniSwap. All rights reserved.
      </footer>
    </div>
  )
}
