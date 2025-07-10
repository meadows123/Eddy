import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function VenueApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('pending_venue_owner_requests').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setLoading(false);
      });
  }, []);

  const handleApprove = async (req) => {
    // 1. Create Supabase user (invite)
    const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(req.email, {
      data: {
        role: 'venue_owner',
        venue_name: req.venue_name
      }
    });
    if (inviteError) return alert('Failed to invite user: ' + inviteError.message);

    // 2. Create venue_owners record
    await supabase.from('venue_owners').insert([{
      user_id: invite.user.id,
      venue_name: req.venue_name,
      venue_address: req.venue_address,
      venue_city: req.venue_city,
      venue_country: req.venue_country,
      venue_phone: req.venue_phone,
      owner_first_name: req.owner_first_name,
      owner_last_name: req.owner_last_name,
      owner_phone: req.owner_phone
    }]);

    // 3. Update request status
    await supabase.from('pending_venue_owner_requests').update({ status: 'approved' }).eq('id', req.id);

    // 4. Optionally: Send custom email (see below)
    alert('Venue owner approved and invited!');
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
  };

  const handleReject = async (req) => {
    await supabase.from('pending_venue_owner_requests').update({ status: 'rejected' }).eq('id', req.id);
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Venue Owner Requests</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Email</th>
            <th>Venue</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id}>
              <td>{req.email}</td>
              <td>{req.venue_name}</td>
              <td>{req.owner_first_name} {req.owner_last_name}</td>
              <td>{req.status}</td>
              <td>
                {req.status === 'pending' && (
                  <>
                    <Button onClick={() => handleApprove(req)} className="mr-2 bg-green-600 text-white">Approve</Button>
                    <Button onClick={() => handleReject(req)} className="bg-red-600 text-white">Reject</Button>
                  </>
                )}
                {req.status !== 'pending' && <span>{req.status}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 