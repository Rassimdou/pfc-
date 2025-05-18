import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import axios from 'axios';
export default function EmailVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/check-email`,
        { email: email.toLowerCase() })
    
      
      
      if (response.data.valid) {
        navigate('/signup', { state: { verifiedEmail: email } });
      } else {
        setError('This email is not authorized for registration. Please contact your administrator.');
      }
    } catch (err) {
      console.error('Error verifying email:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-emerald-600">Academic Registration</h1>
          <p className="text-gray-500">Verify your university email to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">University Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="professor@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-600 hover:underline">
            Log in here
          </a>
        </div>
      </div>
    </div>
  );
}