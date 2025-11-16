import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Store,
  Globe,
  FileText,
  Shield,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

const VenueApprovalsPage = () => {
  console.log('🚨 ADMIN VenueApprovalsPage component loaded - this should ONLY be at /admin/venue-approvals');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔐 Checking admin authentication...');
      
      // Check if user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.log('❌ No session found, redirecting to login...');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access the admin panel',
          variant: 'destructive',
        });
        navigate('/venue-owner/login');
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ User error:', userError);
        throw userError;
      }

      console.log('👤 Current user:', user.email);

      // Check if user is an admin using the database function
      const { data: isAdminResult, error: adminCheckError } = await supabase
        .rpc('is_admin', { user_email: user.email });

      if (adminCheckError) {
        console.error('❌ Admin check error:', adminCheckError);
        // Fallback to hardcoded list if database function fails
        const adminEmails = [
          'info@oneeddy.com',
          'admin@oneeddy.com',
          'owner@nightvibe.com',
          'zakmeadows1@hotmail.com'
        ];
        const isUserAdmin = adminEmails.includes(user.email?.toLowerCase());
        
        if (!isUserAdmin) {
          throw new Error('User is not an admin');
        }
      } else if (!isAdminResult) {
        console.log('❌ User is not an admin, redirecting...');
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin panel',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Get admin role
      const { data: adminRoleResult, error: roleError } = await supabase
        .rpc('get_admin_role', { user_email: user.email });

      if (!roleError && adminRoleResult) {
        setAdminRole(adminRoleResult);
        console.log('👑 Admin role:', adminRoleResult);
      }

      console.log('✅ User is authenticated as admin');
      setIsAdmin(true);
      loadRequests();
      
    } catch (error) {
      console.error('❌ Auth check error:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to verify admin access. Please contact support if you believe this is an error.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      
      const { data, error } = await supabase
        .from('pending_venue_owner_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      
      setRequests(data || []);
      
      // If approval was just completed, force a second refresh after a delay
      if (approvalCompleted) {
        setTimeout(async () => {
          const { data: finalData, error: finalError } = await supabase
            .from('pending_venue_owner_requests')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!finalError) {
            setRequests(finalData || []);
          }
        }, 3000);
        
        // Reset the flag
        setApprovalCompleted(false);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    setProcessing(true);
    try {
      
      // Check if venue owner already exists (by user_id - most reliable)
      console.log('🔍 Checking for existing venue owner record...');
      const { data: existingVenueOwnerList, error: checkError } = await supabase
        .from('venue_owners')
        .select('id, user_id, email, owner_email')
        .eq('user_id', req.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking existing venue owner:', checkError);
      }

      const existingVenueOwner = existingVenueOwnerList && existingVenueOwnerList.length > 0 
        ? existingVenueOwnerList[0] 
        : null;

      // Check if venue already exists for this owner
      console.log('🔍 Checking for existing venue...');
      const { data: existingVenueList, error: existingVenueError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', req.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let newVenue = null;
      
      if (existingVenueList && existingVenueList.length > 0) {
        console.log('⚠️ Venue already exists, using existing venue:', existingVenueList[0].id);
        newVenue = existingVenueList[0];
      } else {
        // Create new venue record
        console.log('🏗️ Creating venue record...');
        const { data: createdVenueList, error: venueError } = await supabase
          .from('venues')
          .insert([{
            name: req.venue_name,
            description: req.additional_info,
            type: req.venue_type || 'restaurant',
            price_range: req.price_range || '$$',
            address: req.venue_address,
            city: req.venue_city,
            state: req.venue_city,
            country: req.venue_country,
            status: 'active',
            is_active: true,
            owner_id: req.user_id
          }])
          .select()
          .order('id', { ascending: false })
          .limit(1);

        if (venueError) {
          console.error('❌ Failed to create venue:', venueError);
          throw new Error(`Failed to create venue: ${venueError.message}`);
        }

        if (createdVenueList && createdVenueList.length > 0) {
          newVenue = createdVenueList[0];
          console.log('✅ Venue created successfully:', newVenue.id);
        }
      }

      if (!newVenue) {
        throw new Error('Failed to get or create venue');
      }

      // Update existing venue owner record OR create new one
      let venueOwner = null;
      
      if (existingVenueOwner) {
        // Update existing record
        console.log('🔄 Updating existing venue owner record:', existingVenueOwner.id);
        console.log('📝 Update data:', {
          id: existingVenueOwner.id,
          owner_email: req.email,
          email: req.email,
          owner_name: req.contact_name,
          full_name: req.contact_name,
          venue_id: newVenue.id,
          status: 'active'
        });
        
        try {
          const { data: updatedVenueOwnerList, error: updateError } = await supabase
            .from('venue_owners')
            .update({
              owner_email: req.email,
              email: req.email, // Also set email field for consistency
              owner_name: req.contact_name,
              full_name: req.contact_name, // Also set full_name field for consistency
              venue_id: newVenue.id,
              status: 'active',
              phone: req.contact_phone,
              venue_name: req.venue_name,
              venue_type: req.venue_type || 'restaurant',
              venue_description: req.additional_info,
              venue_address: req.venue_address,
              venue_city: req.venue_city,
              venue_country: req.venue_country,
              venue_phone: req.contact_phone,
              owner_phone: req.contact_phone,
              price_range: req.price_range || '$$'
            })
            .eq('id', existingVenueOwner.id)
            .select();

          console.log('📊 Update response received:', { 
            hasError: !!updateError,
            hasData: !!updatedVenueOwnerList, 
            dataLength: updatedVenueOwnerList?.length,
            error: updateError,
            data: updatedVenueOwnerList 
          });

          if (updateError) {
            console.error('❌ Failed to update venue owner:', updateError);
            console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
            throw new Error(`Failed to update venue owner: ${updateError.message}`);
          }

          if (updatedVenueOwnerList && updatedVenueOwnerList.length > 0) {
            venueOwner = updatedVenueOwnerList[0];
            console.log('✅ Venue owner record updated successfully:', venueOwner.id);
          } else {
            console.warn('⚠️ Update succeeded but no data returned, fetching record...');
            // Fetch the record directly
            const { data: fetchedVenueOwner, error: fetchError } = await supabase
              .from('venue_owners')
              .select('*')
              .eq('id', existingVenueOwner.id)
              .single();
            
            console.log('📊 Fetch response:', {
              hasError: !!fetchError,
              hasData: !!fetchedVenueOwner,
              error: fetchError,
              data: fetchedVenueOwner
            });
            
            if (fetchError) {
              console.error('❌ Failed to fetch updated venue owner:', fetchError);
              throw new Error(`Update succeeded but failed to fetch record: ${fetchError.message}`);
            }
            venueOwner = fetchedVenueOwner;
            console.log('✅ Fetched venue owner record:', venueOwner?.id);
          }
        } catch (updateException) {
          console.error('❌ Exception during update:', updateException);
          throw updateException;
        }
      } else {
        // Create new venue owner record
        console.log('📝 Creating new venue owner record...');
        console.log('📝 Insert data:', {
          user_id: req.user_id,
          owner_email: req.email,
          email: req.email,
          owner_name: req.contact_name,
          full_name: req.contact_name,
          venue_id: newVenue.id,
          status: 'active',
          phone: req.contact_phone
        });
        
        const { data: createdVenueOwnerList, error: venueOwnerError } = await supabase
          .from('venue_owners')
          .insert([{
            user_id: req.user_id,
            owner_email: req.email,
            email: req.email, // Set both fields for consistency
            owner_name: req.contact_name,
            full_name: req.contact_name, // Set both fields for consistency
            venue_id: newVenue.id,
            status: 'active',
            phone: req.contact_phone,
            venue_name: req.venue_name,
            venue_type: req.venue_type || 'restaurant',
            venue_description: req.additional_info,
            venue_address: req.venue_address,
            venue_city: req.venue_city,
            venue_country: req.venue_country,
            venue_phone: req.contact_phone,
            owner_phone: req.contact_phone,
            price_range: req.price_range || '$$'
          }])
          .select();

        if (venueOwnerError) {
          console.error('❌ Failed to create venue owner:', venueOwnerError);
          console.error('❌ Error details:', JSON.stringify(venueOwnerError, null, 2));
          throw new Error(`Failed to create venue owner: ${venueOwnerError.message}`);
        }

        console.log('📊 Insert response:', { 
          hasData: !!createdVenueOwnerList, 
          dataLength: createdVenueOwnerList?.length,
          data: createdVenueOwnerList 
        });

        if (createdVenueOwnerList && createdVenueOwnerList.length > 0) {
          venueOwner = createdVenueOwnerList[0];
          console.log('✅ Venue owner record created successfully:', venueOwner.id);
        } else {
          console.error('❌ Insert succeeded but no data returned');
          throw new Error('Insert succeeded but no data returned from database');
        }
      }

      if (!venueOwner) {
        throw new Error('Failed to create or update venue owner record');
      }

      // Update the pending request status
      console.log('🔄 Updating pending request status...');
      const { error: pendingUpdateError } = await supabase
        .from('pending_venue_owner_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (pendingUpdateError) {
        console.error('❌ Failed to update pending request:', pendingUpdateError);
        throw new Error(`Failed to update pending request: ${pendingUpdateError.message}`);
      }

      console.log('✅ Pending request status updated successfully');

      // Send approval notification email
      try {
        const venueOwnerData = {
          email: req.email,
          contact_name: req.contact_name,
          owner_name: req.contact_name,
          venue_name: req.venue_name,
          venue_type: req.venue_type || 'restaurant',
          venue_address: req.venue_address,
          venue_city: req.venue_city
        };
        
        const { sendVenueOwnerApplicationApproved } = await import('../../lib/venueOwnerEmailService');
        await sendVenueOwnerApplicationApproved(venueOwnerData);
        console.log('✅ Approval notification email sent');
      } catch (emailError) {
        console.error('❌ Failed to send approval email:', emailError);
      }

      // Set approval completed and refresh
      setApprovalCompleted(true);
      setTimeout(async () => {
        console.log('🔄 Refreshing requests list after approval...');
        try {
          await loadRequests();
          console.log('✅ Requests list refreshed successfully');
        } catch (error) {
          console.error('❌ Failed to refresh requests:', error);
        }
      }, 2000);
      
      alert(`Venue owner approved successfully! ${req.contact_name} can now access their venue dashboard. The venue "${req.venue_name}" is now live with proper owner linking.`);
    } catch (error) {
      console.error('❌ Error in approval process:', error);
      console.error('❌ Error stack:', error.stack);
      alert('Error approving request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (req) => {
    setProcessing(true);
    try {
      await supabase.from('pending_venue_owner_requests').update({ status: 'rejected' }).eq('id', req.id);
      await loadRequests();
      alert('Request rejected successfully!');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto"></div>
          <p className="mt-4 text-brand-burgundy">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-burgundy mb-4">Access Denied</h1>
          <p className="text-brand-burgundy/70 mb-6">
            You do not have permission to access the admin panel. Only authorized administrators can view venue applications.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-brand-burgundy hover:bg-brand-burgundy/90"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while loading requests
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto"></div>
          <p className="mt-4 text-brand-burgundy">Loading venue applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream/50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-burgundy/10 rounded-full">
                <Store className="h-8 w-8 text-brand-burgundy" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-brand-burgundy">Venue Owner Applications</h1>
                <p className="text-brand-burgundy/70">Review and manage venue partnership requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-full">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Admin Access</span>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Pending: {requests.filter(r => r.status === 'pending').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Approved: {requests.filter(r => r.status === 'approved').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rejected: {requests.filter(r => r.status === 'rejected').length}</span>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-brand-burgundy mb-2">
                        {request.venue_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-brand-burgundy/70">
                        <Building2 className="h-4 w-4" />
                        <span>{request.venue_type || 'Restaurant'}</span>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Owner Information */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.contact_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.contact_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Venue Location */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.venue_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.venue_city}, {request.venue_country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {request.additional_info && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </h4>
                      <p className="text-sm text-brand-burgundy/70 line-clamp-3">
                        {request.additional_info}
                      </p>
                    </div>
                  )}

                  {/* Application Date */}
                  <div className="flex items-center gap-2 text-sm text-brand-burgundy/60">
                    <Calendar className="h-3 w-3" />
                    <span>Applied: {formatDate(request.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-brand-burgundy/10">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>

                    {request.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(request)}
                          disabled={processing}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleReject(request)}
                          disabled={processing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : 'Reject'}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {requests.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-brand-burgundy/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-brand-burgundy mb-2">No Applications Yet</h3>
            <p className="text-brand-burgundy/70">When venue owners submit applications, they will appear here for review.</p>
          </div>
        )}

        {/* Detailed View Dialog */}
        {selectedRequest && (
          <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-brand-burgundy">
                  {selectedRequest.venue_name} - Application Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Owner Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Full Name</label>
                      <p className="text-brand-burgundy">{selectedRequest.contact_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Email Address</label>
                      <p className="text-brand-burgundy">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Phone Number</label>
                      <p className="text-brand-burgundy">{selectedRequest.contact_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Application Date</label>
                      <p className="text-brand-burgundy">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Venue Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Venue Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Venue Name</label>
                      <p className="text-brand-burgundy font-semibold">{selectedRequest.venue_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Venue Type</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_type || 'Restaurant'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Description</label>
                      <p className="text-brand-burgundy">{selectedRequest.additional_info || 'No description provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Address</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">City</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Country</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_country}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Opening Hours</label>
                      <p className="text-brand-burgundy">{selectedRequest.opening_hours || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Capacity</label>
                      <p className="text-brand-burgundy">{selectedRequest.capacity || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Price Range</label>
                      <p className="text-brand-burgundy">{selectedRequest.price_range || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-brand-burgundy/10">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        handleApprove(selectedRequest);
                        setSelectedRequest(null);
                      }}
                      disabled={processing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Approve Application'}
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleReject(selectedRequest);
                        setSelectedRequest(null);
                      }}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Reject Application'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default VenueApprovalsPage; 