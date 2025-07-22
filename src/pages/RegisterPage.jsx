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
      
      // Insert into profiles table (for immediate profile availability)
      if (data.user) {
        console.log('🔍 DEBUG: Creating profile record...');
        const profileData = {
          id: data.user.id,
          full_name: name,
          age: age ? parseInt(age) : null,
          country,
          city,
          email,
          phone
        };
        
        console.log('📤 DEBUG: Profile data:', profileData);
        
        const { data: profileResult, error: profileError } = await supabase.from('profiles').upsert(profileData);
        
        console.log('📥 DEBUG: Profile upsert result:', { profileResult, profileError });
        
        if (profileError) {
          console.error('❌ DEBUG: Profile creation error:', profileError);
          setError(`Profile Error: ${profileError.message}`);
          return;
        }
        
        console.log('✅ DEBUG: Profile created successfully');
      }
      
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