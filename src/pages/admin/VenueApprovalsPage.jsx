import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

const VenueApprovalsPage = () => {
  console.log('🚨 ADMIN VenueApprovalsPage component loaded - this should ONLY be at /admin/venue-approvals');
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      console.log('🔄 Loading venue owner requests...');
      
      const { data, error } = await supabase
        .from('pending_venue_owner_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('✅ Loaded requests:', data?.length || 0, 'requests');
      console.log('📊 Request statuses:', data?.map(r => ({ id: r.id, status: r.status, email: r.email })) || []);
      
      setRequests(data || []);
      
      // If approval was just completed, force a second refresh after a delay
      if (approvalCompleted) {
        console.log('🔄 Approval was completed, doing final refresh in 3 seconds...');
        setTimeout(async () => {
          console.log('🔄 Final refresh after approval...');
          const { data: finalData, error: finalError } = await supabase
            .from('pending_venue_owner_requests')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!finalError) {
            setRequests(finalData || []);
            console.log('✅ Final refresh completed');
          }
        }, 3000);
        
        // Reset the flag
        setApprovalCompleted(false);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    setProcessing(true);
    try {
      console.log('🚀 Starting approval process for:', req.email);
      console.log('📝 Request data:', req);
      
      // Use the actual venue type from the request, with a reasonable fallback
      const venueType = req.venue_type || 'restaurant';
      
      console.log('🏢 Venue type from request:', {
        original: req.venue_type,
        using: venueType
      });

      // Find the existing venue owner record using owner_email
      console.log('🔍 Looking for venue owner with owner_email:', req.email);
      console.log('🔍 Looking for status: pending_approval');
      
      const { data: existingVenueOwner, error: venueOwnerFindError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', req.email)
        .eq('status', 'pending')
        .single();

      if (venueOwnerFindError || !existingVenueOwner) {
        console.error('❌ Could not find existing venue owner record:', venueOwnerFindError);
        console.error(' Search criteria:', { email: req.email, status: 'pending_approval' });
        
        // Let's see what records exist for this email
        const { data: allRecords, error: checkError } = await supabase
          .from('venue_owners')
          .select('*')
          .eq('owner_email', req.email);
        
        if (checkError) {
          console.error('❌ Error checking all records:', checkError);
        } else {
          console.log('📊 All records found for this email:', allRecords);
          if (allRecords && allRecords.length > 0) {
            console.log('📊 Record statuses:', allRecords.map(r => ({ id: r.id, status: r.status })));
          }
        }
        
        throw new Error(`Could not find venue owner record for ${req.email}. Make sure they have completed the registration process first.`);
      }

      console.log('✅ Found existing venue owner record:', existingVenueOwner);
      console.log('📊 Current status:', existingVenueOwner.status);
      console.log('🆔 Record ID:', existingVenueOwner.id);
      console.log('📧 Owner Email:', existingVenueOwner.owner_email);

      // Check if the venue owner already has a valid user_id
      if (existingVenueOwner.user_id) {
        console.log('✅ Venue owner already has user_id:', existingVenueOwner.user_id);
      } else {
        console.log('⚠️ No user_id found, will create venue without owner_id initially');
      }

      // SKIP THE FIRST STATUS UPDATE - just log what we're going to do
      console.log('⏸️ Skipping first status update - will update everything at once later');

      // Now create the venue record
      console.log('🏗️ Creating venue record...');
      const venueData = {
          name: req.venue_name,
          description: req.additional_info,
          type: venueType,
          price_range: req.price_range || '$$',
          address: req.venue_address,
          city: req.venue_city,
        state: req.venue_city,
          country: req.venue_country,
        latitude: 6.5244,
          longitude: 3.3792,
          contact_phone: req.contact_phone,
          contact_email: req.email,
        owner_id: existingVenueOwner.user_id,
          status: 'approved',
          is_active: true
      };

      console.log('📝 Venue data to create:', venueData);

      const { data: newVenue, error: venueError } = await supabase
        .from('venues')
        .insert(venueData)
        .select()
        .single();

      if (venueError) {
        console.error('❌ Failed to create venue:', venueError);
        
        // If it's a foreign key error, try creating without owner_id
        if (venueError.code === '23503' && venueError.message.includes('owner_id')) {
          console.log('🔄 Retrying venue creation without owner_id...');
          
          const venueDataWithoutOwner = { ...venueData };
          delete venueDataWithoutOwner.owner_id;
          
          const { data: retryVenue, error: retryError } = await supabase
            .from('venues')
            .insert(venueDataWithoutOwner)
        .select()
        .single();

          if (retryError) {
            throw new Error(`Failed to create venue even without owner_id: ${retryError.message}`);
          }
          
          console.log('✅ Venue created successfully without owner_id:', retryVenue);
          newVenue = retryVenue;
        } else {
          throw new Error(`Failed to create venue: ${venueError.message}`);
        }
      } else {
        console.log('✅ Venue created successfully:', newVenue);
      }

      // Add this debugging BEFORE the final update:

      console.log('🔍 DEBUGGING FINAL UPDATE:');
      console.log('  - existingVenueOwner.id:', existingVenueOwner.id);
      console.log('  - existingVenueOwner.owner_email:', existingVenueOwner.owner_email);
      console.log('  - existingVenueOwner.status:', existingVenueOwner.status);

      // Let's verify this record still exists in the database
      const { data: verifyRecord, error: verifyError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('id', existingVenueOwner.id);

      if (verifyError) {
        console.error('❌ Error verifying record:', verifyError);
      } else {
        console.log('📊 Record verification result:', verifyRecord);
        if (verifyRecord && verifyRecord.length > 0) {
          console.log('✅ Record found with status:', verifyRecord[0].status);
        } else {
          console.log('❌ No record found with this ID');
        }
      }

      // Find the venue owner record AGAIN right before updating (in case it changed)
      console.log('🔄 Finding venue owner record again before final update...');
      console.log('🔍 Searching for email:', req.email);
      console.log('🔍 Searching for status: pending_approval');

      const { data: currentVenueOwner, error: findError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', req.email)
        .eq('status', 'pending')
        .single();

      if (findError) {
        console.error('❌ Error finding venue owner record:', findError);
        console.error('❌ Error details:', findError.message, findError.code);
        throw new Error(`Failed to find venue owner record: ${findError.message}`);
      }

      if (!currentVenueOwner) {
        console.error('❌ No venue owner record found for final update');
        throw new Error('No venue owner record found for final update');
      }

      console.log('✅ Found current venue owner record:', currentVenueOwner.id);
      console.log('📊 Current record status:', currentVenueOwner.status);
      console.log('📧 Current record email:', currentVenueOwner.owner_email);

      // NOW do the final update using the fresh record
      console.log('🔄 Updating venue_owners with final status and venue_id...');
      console.log('🔗 Updating record ID:', currentVenueOwner.id);
      console.log('🔗 Setting status to: active');
      console.log('🔗 Setting venue_id to:', newVenue.id);

      const { data: finalUpdateResult, error: finalUpdateError } = await supabase
        .from('venue_owners')
        .update({ 
          status: 'active',
          venue_id: newVenue.id
        })
        .eq('id', currentVenueOwner.id)
        .select();

      if (finalUpdateError) {
        console.error('❌ Failed to finalize venue owner update:', finalUpdateError);
        console.error('❌ Error details:', finalUpdateError.message, finalUpdateError.code);
        throw new Error(`Failed to finalize venue owner update: ${finalUpdateError.message}`);
      }

      // Check if we got any results
      if (!finalUpdateResult || finalUpdateResult.length === 0) {
        console.error('❌ Update returned 0 rows');
        console.error('❌ Update query:', `UPDATE venue_owners SET status='active', venue_id='${newVenue.id}' WHERE id='${currentVenueOwner.id}'`);
        throw new Error('No venue owner record was finalized - update returned 0 rows');
      }

      console.log('✅ Venue owner record finalized successfully:', finalUpdateResult[0]);

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
          venue_type: venueType,
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
      await loadRequests();Why
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
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand-burgundy/10 rounded-full">
              <Store className="h-8 w-8 text-brand-burgundy" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand-burgundy">Venue Owner Applications</h1>
              <p className="text-brand-burgundy/70">Review and manage venue partnership requests</p>
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