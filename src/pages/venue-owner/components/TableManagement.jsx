import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../components/ui/use-toast';

const TableManagement = ({ venueId }) => {
  const [tables, setTables] = useState([]);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTable, setNewTable] = useState({
    table_number: '',
    capacity: '',
    price: '',
    table_type: '',
    status: 'available',
  });

  // Fetch tables for this venue
  useEffect(() => {
    if (!venueId) return;
    const fetchTables = async () => {
      const { data, error } = await supabase
        .from('venue_tables')
        .select('*')
        .eq('venue_id', venueId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setTables([]);
      } else {
        setTables(data || []);
      }
    };
    fetchTables();
  }, [venueId]);

  const handleAddTable = async () => {
    if (!venueId) {
      toast({ title: 'Error', description: 'Venue ID missing', variant: 'destructive' });
      return;
    }
    if (!newTable.table_number || !newTable.capacity || !newTable.price || !newTable.table_type || !newTable.status) {
      toast({ title: 'Missing Fields', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('venue_tables').insert([
      {
        venue_id: venueId,
        table_number: newTable.table_number,
        capacity: parseInt(newTable.capacity),
        price: parseInt(newTable.price),
        table_type: newTable.table_type,
        status: newTable.status,
      }
    ]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Table Added', description: 'New table added successfully!' });
      setNewTable({ table_number: '', capacity: '', price: '', table_type: '', status: 'available' });
      setIsAddingTable(false);
      // Refresh table list
      const { data } = await supabase.from('venue_tables').select('*').eq('venue_id', venueId);
      setTables(data || []);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'booked':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-brand-burgundy">Table Management</h3>
        <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
          <DialogTrigger asChild>
            <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
            </DialogHeader>
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
                <Label htmlFor="price">Price (₦)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newTable.price}
                  onChange={(e) => setNewTable({ ...newTable, price: e.target.value })}
                  placeholder="Table price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableType">Table Type</Label>
                <Input
                  id="tableType"
                  value={newTable.table_type}
                  onChange={(e) => setNewTable({ ...newTable, table_type: e.target.value })}
                  placeholder="e.g., VIP, Standard"
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
                  <option value="booked">Booked</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <Button 
                className="w-full bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                onClick={handleAddTable}
              >
                Add Table
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card key={table.id} className="bg-white border-brand-burgundy/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-brand-burgundy">
                Table {table.table_number}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
                    {table.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TableManagement; 