// components/TeacherRegistration.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const TeacherRegistration = () => {
  const { token } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // API call to verify token and create account
      const response = await api.post('/auth/complete-registration', { ...formData, token });

      if (response.data.success) {
        // Redirect to dashboard
        window.location = '/dashboard';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-emerald-600 mb-4">Complete Your Registration</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full p-2 border rounded"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength="8"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded hover:bg-emerald-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
};

export default TeacherRegistration;