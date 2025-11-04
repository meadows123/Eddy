import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import TableManagement from './components/TableManagement';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../components/ui/use-toast';
import BackToDashboardButton from '../../components/BackToDashboardButton';

const VenueOwnerTables = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access table management',
          variant: 'destructive',
        });
        navigate('/venue-owner/login');
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Check if user is a venue owner
      const { data: venueOwner, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (venueOwnerError || !venueOwner) {
        toast({
          title: 'Venue Owner Account Required',
          description: 'Please register as a venue owner to access table management',
          variant: 'destructive',
        });
        navigate('/venue-owner/register');
        return;
      }

      setCurrentUser(user);
    } catch (error) {
      console.error('Auth check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify authentication',
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
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center mb-2">
              <BackToDashboardButton className="mr-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy mb-2">Table Management</h1>
            <p className="text-sm sm:text-base text-brand-burgundy/70">Manage your venue's tables and seating arrangements</p>
          </div>
          <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 w-full sm:w-auto">
            Add New Table
          </Button>
        </div>

        <Card className="bg-white border-brand-burgundy/10">
          <CardContent className="pt-6">
            {currentUser ? (
              <TableManagement currentUser={currentUser} />
            ) : (
              <div>Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerTables; 