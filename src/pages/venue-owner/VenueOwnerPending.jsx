import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
  import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';

export default function VenueOwnerPending() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVenueStatus();
  }, []);

  const checkVenueStatus = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Get venue details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (venueError) throw venueError;

      setVenue(venueData);

      // If venue is approved, redirect to dashboard
      if (venueData.status === 'approved') {
        navigate('/venue-owner/dashboard');
      }
      // If venue is rejected, show rejection message
      else if (venueData.status === 'rejected') {
        toast({
          title: 'Venue Rejected',
          description: 'Your venue application has been rejected. Please contact support for more information.',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Error checking venue status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check venue status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">Venue Pending Approval</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Your venue is under review</h2>
            <p className="text-gray-600">
              We're currently reviewing your venue application. This process typically takes 1-2 business days.
            </p>
          </div>

          {venue && (
            <div className="text-left bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Venue Details:</h3>
              <p><strong>Name:</strong> {venue.name}</p>
              <p><strong>Address:</strong> {venue.address}</p>
              <p><strong>Type:</strong> {venue.type}</p>
              <p><strong>Submitted:</strong> {new Date(venue.created_at).toLocaleDateString()}</p>
            </div>
          )}

          <div className="mt-8">
            <p className="text-sm text-gray-500">
              We'll send you an email once your venue is approved. You can also check back here for updates.
            </p>
            <button
              onClick={checkVenueStatus}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Check Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 