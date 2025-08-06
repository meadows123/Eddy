import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const TableManagement = ({ currentUser }) => {
  const [tables, setTables] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [newTable, setNewTable] = useState({
    table_number: '',
    capacity: '',
    price_per_hour: '',
    minimum_spend: '',
    table_type: '',
    status: 'available',
    venue_id: '',
    description: '',
  });

  // Log the currentUser for debugging
  useEffect(() => {
    console.log('[TableManagement] currentUser prop:', currentUser);
  }, [currentUser]);

  // Fetch venues and tables for all venues owned by the current user
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchVenuesAndTables = async () => {
      console.log('Fetching venues for owner_id:', currentUser.id);
      // Fetch all venues for this owner
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, owner_id')
        .eq('owner_id', currentUser.id);
      if (venuesError) {
        toast({ title: 'Error', description: venuesError.message, variant: 'destructive' });
        setVenues([]);
        setTables([]);
        return;
      }
      console.log('currentUser.id:', currentUser.id);
      console.log('venuesData:', venuesData);
      console.log('venuesError:', venuesError);
      setVenues(venuesData || []);
      const venueIds = Array.isArray(venuesData) ? venuesData.map(v => v.id) : [];
      if (!venueIds || venueIds.length === 0) {
        setTables([]);
        return;
      }
      // Fetch all tables for these venues
      const { data: tablesData, error: tablesError } = await supabase
        .from('venue_tables')
        .select('*')
        .in('venue_id', venueIds);
      if (tablesError) {
        toast({ title: 'Error', description: tablesError.message, variant: 'destructive' });
        setTables([]);
      } else {
        console.log('tablesData:', tablesData);
        console.log('tablesError:', tablesError);
        setTables(tablesData || []);
      }
    };
    fetchVenuesAndTables();
  }, [currentUser]);

  const handleAddTable = async () => {
    if (!newTable.venue_id) {
      toast({ title: 'Error', description: 'Please select a venue for this table.', variant: 'destructive' });
      return;
    }
    if (
      !newTable.table_number ||
      !newTable.capacity ||
      !newTable.price_per_hour ||
      !newTable.table_type ||
      !newTable.status
    ) {
      toast({ title: 'Missing Fields', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    // Ensure capacity and price are valid integers
    const capacity = parseInt(newTable.capacity, 10);
    const price = parseInt(newTable.price_per_hour, 10);

    if (isNaN(capacity) || isNaN(price)) {
      toast({ title: 'Invalid Input', description: 'Capacity and Price must be valid numbers.', variant: 'destructive' });
      return;
    }

    const tableData = {
      venue_id: newTable.venue_id,
      table_number: newTable.table_number,
      capacity,
      price_per_hour: price,
      minimum_spend: newTable.minimum_spend ? parseInt(newTable.minimum_spend, 10) : null,
      table_type: newTable.table_type,
      status: newTable.status,
      description: newTable.description,
    };

    let error;
    if (editingTable) {
      // Update existing table
      const result = await supabase
        .from('venue_tables')
        .update(tableData)
        .eq('id', editingTable.id);
      error = result.error;
    } else {
      // Add new table
      const result = await supabase
        .from('venue_tables')
        .insert([tableData]);
      error = result.error;
    }

    if (error) {
      toast({ title: 'Error', description: `Failed to ${editingTable ? 'update' : 'add'} table: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: `Table ${editingTable ? 'Updated' : 'Added'}`, description: `Table ${editingTable ? 'updated' : 'added'} successfully!` });
      setNewTable({ table_number: '', capacity: '', price_per_hour: '', minimum_spend: '', table_type: '', status: 'available', venue_id: '', description: '' });
      setEditingTable(null);
      setIsAddingTable(false);
      // Refresh table list
      const { data: venues } = await supabase.from('venues').select('id').eq('owner_id', currentUser.id);
      const venueIds = venues.map(v => v.id);
      const { data: tablesData } = await supabase.from('venue_tables').select('*').in('venue_id', venueIds);
      setTables(tablesData || []);
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setNewTable({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      price_per_hour: table.price_per_hour ? table.price_per_hour.toString() : '',
      minimum_spend: table.minimum_spend ? table.minimum_spend.toString() : '',
      table_type: table.table_type,
      status: table.status,
      venue_id: table.venue_id,
      description: table.description || '',
    });
    setIsAddingTable(true);
  };

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Are you sure you want to delete this table?')) {
      return;
    }

    const { error } = await supabase
      .from('venue_tables')
      .delete()
      .eq('id', tableId);

    if (error) {
      toast({ title: 'Error', description: `Failed to delete table: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Table Deleted', description: 'Table deleted successfully!' });
      // Refresh table list
      const { data: venues } = await supabase.from('venues').select('id').eq('owner_id', currentUser.id);
      const venueIds = venues.map(v => v.id);
      const { data: tablesData } = await supabase.from('venue_tables').select('*').in('venue_id', venueIds);
      setTables(tablesData || []);
    }
  };

  const handleDialogClose = (open) => {
    setIsAddingTable(open);
    if (!open) {
      // Reset form when dialog closes
      setEditingTable(null);
      setNewTable({ table_number: '', capacity: '', price_per_hour: '', minimum_spend: '', table_type: '', status: 'available', venue_id: '', description: '' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  console.log('venues in render:', venues);

  return (
    <div className="space-y-6">
      {/* Removed warning for missing currentUser */}
      {/* Always show table management UI */}
      <>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-brand-burgundy">Table Management</h3>
          <Dialog open={isAddingTable} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button
                className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                title={"Add a new table to your venue"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="add-table-desc">
              <DialogHeader>
                <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
              </DialogHeader>
              <div id="add-table-desc" className="sr-only">
                Fill out the form below to {editingTable ? 'edit the' : 'add a new'} table {editingTable ? '' : 'to your venue'}.
              </div>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tableNumber">Table Number</Label>
                  <Input
                    id="tableNumber"
                    value={newTable.table_number}
                    onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                    placeholder="e.g., A1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                    placeholder="Number of seats"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Price per Hour (₦)</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    value={newTable.price_per_hour}
                    onChange={(e) => setNewTable({ ...newTable, price_per_hour: e.target.value })}
                    placeholder="Hourly rate for this table"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_spend">Minimum Spend (₦)</Label>
                  <Input
                    id="minimum_spend"
                    type="number"
                    value={newTable.minimum_spend}
                    onChange={(e) => setNewTable({ ...newTable, minimum_spend: e.target.value })}
                    placeholder="Minimum spending requirement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tableType">Table Type</Label>
                  <select
                    id="tableType"
                    value={newTable.table_type}
                    onChange={(e) => setNewTable({ ...newTable, table_type: e.target.value })}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">Select table type</option>
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newTable.description}
                    onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                    placeholder="e.g., Near window, VIP section, Corner booth"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={newTable.status}
                    onChange={(e) => setNewTable({ ...newTable, status: e.target.value })}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venueId">Venue</Label>
                  <select
                    id="venueId"
                    value={newTable.venue_id}
                    onChange={e => setNewTable({ ...newTable, venue_id: e.target.value })}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">Select a venue</option>
                    {/* Render options dynamically from venues */}
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                  </select>
                </div>
                <Button 
                  className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                  onClick={handleAddTable}
                >
                  {editingTable ? 'Update Table' : 'Add Table'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {tables.length === 0 ? (
          <div className="text-center text-brand-burgundy/70 py-8">
            No tables yet. Add your first table!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {tables.map((table) => (
              <Card key={table.id} className="bg-white border-brand-burgundy/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold text-brand-burgundy">
                    Table {table.table_number}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditTable(table)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600"
                      onClick={() => handleDeleteTable(table.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {table.description && (
                      <div className="text-sm text-brand-burgundy/80 italic mb-2">
                        {table.description}
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-burgundy/70">Type:</span>
                      <span className="font-medium">{table.table_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-burgundy/70">Capacity:</span>
                      <span className="font-medium">{table.capacity} seats</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-burgundy/70">Price:</span>
                      <span className="font-medium">₦{table.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-burgundy/70">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(table.status)}`}>
                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    </div>
  );
};

export default TableManagement; 