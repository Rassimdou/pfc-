import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "./utils/axios";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { BookOpen } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for error in URL params
    const error = searchParams.get('error');
    if (error) {
      setError(decodeURIComponent(error));
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('Starting login process...');
      const response = await api.post("/auth/login", { email, password });
      console.log('Login response received:', response.data);

      if (response.data.success) {
        // Store user data and token in localStorage
        const userData = response.data.user;
        const token = response.data.accessToken;
        
        console.log('User data from response:', userData);
        console.log('User role from response:', userData.role);
        console.log('Token:', token);
        
        // Store token and user data
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Configure axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Show success message
        toast.success("Login successful!");
        
        // Redirect based on role
        console.log('User role for redirection:', userData.role);
        if (userData.role === "ADMIN") {
          console.log('Redirecting to admin dashboard...');
          navigate("/admin", { replace: true });
        } else if (userData.role === "PROFESSOR") {
          console.log('Redirecting to user dashboard...');
          navigate("/user/page", { replace: true });
        }
      } else {
        console.error('Login failed:', response.data);
        setError(response.data.message || 'Login failed');
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = "Failed to log in. Please try again.";
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        switch (error.response.status) {
          case 401:
            errorMessage = "Invalid email or password";
            break;
          case 403:
            errorMessage = "Account not verified. Please check your email.";
            break;
          case 429:
            errorMessage = "Too many attempts. Please try again later.";
            break;
          case 500:
            errorMessage = error.response.data.message || "Server error. Please try again later.";
            break;
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = "Network error. Please check your connection.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    const googleAuthUrl = `${import.meta.env.VITE_API_URL}/auth/google`;
    console.log('Redirecting to Google auth:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col justify-center items-center p-4 md:p-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-emerald-600" />
          <span className="text-2xl font-bold">USTHB-Xchange</span>
        </Link>

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-lg animate-fadeIn">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Welcome to USTHB-Xchange</h1>
            <p className="text-gray-500">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button 
              type="button" 
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">↻</span>
                  Redirecting...
                </span>
              ) : (
                <>
                  <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">University Email</Label>
              <Input
                id="email"
                placeholder="professor@university.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="8"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">↻</span>
                  Signing In...
                </span>
              ) : "Sign In"}
            </Button>
          </div>

          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-emerald-600 hover:underline"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>

      <footer className="border-t bg-white py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} UniSwap. All rights reserved.
      </footer>
    </div>
  );
}