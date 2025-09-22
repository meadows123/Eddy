import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setEmailStatus('');

    try {
      // Debug: Log the data being sent
      const signUpPayload = {
        email,
        password,
        options: {
          data: {
            full_name: name,
            age,
            country,
            city,
            phone
          }
        }
      };
      
      console.log('🔍 DEBUG: Registration payload:', {
        email,
        name,
        age,
        country,
        city,
        phone,
        signUpPayload
      });

      // Register user with metadata
      console.log('🚀 DEBUG: Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp(signUpPayload);
      
      console.log('📥 DEBUG: Auth response:', { data, error });

      if (error) {
        console.error('❌ DEBUG: Auth signup error:', {
          message: error.message,
          status: error.status,
          details: error
        });
        setError(`Auth Error: ${error.message}`);
        return;
      }

      console.log('✅ DEBUG: Auth signup successful, user created:', data.user);
      setSuccess('Registration successful! Please check your email to confirm your account.');
      
      // Do not write to profiles here; a DB trigger creates it on user creation.
      // You can update profile fields after the user logs in (when a session exists).
      
      // Call Edge Function to send custom welcome email
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')}/send-email`;
      fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Welcome to VIPClub!',
          template: 'welcome',
          data: { email }
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEmailStatus('Welcome email sent!');
        } else {
          setEmailStatus('Registered, but failed to send welcome email.');
        }
      })
      .catch(() => {
        setEmailStatus('Registered, but failed to send welcome email.');
      });
      
    } catch (err) {
      console.error('💥 DEBUG: Unexpected error during registration:', err);
      setError(`Unexpected Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Register</h2>
      <input
        type="text"
        placeholder="Full Name"
        className="w-full mb-2 p-2 border rounded"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Age"
        className="w-full mb-2 p-2 border rounded"
        value={age}
        onChange={e => setAge(e.target.value)}
        min={1}
        required
      />
      <input
        type="text"
        placeholder="Country"
        className="w-full mb-2 p-2 border rounded"
        value={country}
        onChange={e => setCountry(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="City"
        className="w-full mb-2 p-2 border rounded"
        value={city}
        onChange={e => setCity(e.target.value)}
        required
      />
      <input
        type="tel"
        placeholder="Phone"
        className="w-full mb-2 p-2 border rounded"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full mb-2 p-2 border rounded"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full mb-2 p-2 border rounded"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {/* Email Confirmation Reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Important: Check Your Email</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>After registering, you'll receive a confirmation email. <strong>Please check your inbox and click the verification link</strong> to complete your account setup and start booking exclusive venues!</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">{success}</div>}
      {emailStatus && <div className="text-yellow-600 mt-2">{emailStatus}</div>}
    </form>
  );
};

export default RegisterForm; 