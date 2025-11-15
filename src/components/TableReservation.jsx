import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const TableReservation = ({ clubId, tables, onReserve, selectedTableId }) => {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(4);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  const handleTableSelect = (table) => {
    setSelectedTable(table);
  };
  
  const handleReserve = () => {
    if (!selectedTable || !date || !time || !guestCount) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a table.",
        variant: "destructive",
      });
      return;
    }
    
    onReserve({
      id: selectedTable.id,
      name: selectedTable.table_number,
      table_number: selectedTable.table_number,
      table_type: selectedTable.table_type,
      price: selectedTable.price,
      date,
      time,
      guestCount
    });
    
    toast({
      title: "Table selected!",
      description: `Table ${selectedTable.table_number} has been added to your selection.`,
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date" className="text-brand-burgundy mb-2 block">Date</Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-burgundy"
              min={new Date().toISOString().split('T')[0]}
            />
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50" />
          </div>
        </div>
        
        <div>
          <Label htmlFor="time" className="text-brand-burgundy mb-2 block">Time</Label>
          <div className="relative">
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="pl-10 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-burgundy"
            />
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50" />
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="guests" className="text-brand-burgundy mb-2 block">Number of Guests</Label>
        <div className="relative">
          <Input
            id="guests"
            type="number"
            min="1"
            max="30"
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value))}
            className="pl-10 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-burgundy"
          />
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50" />
        </div>
      </div>
      
      <div>
        <Label className="text-brand-burgundy mb-3 block">Select a Table</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tables.map((table) => (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTableSelect(table)}
              className={`table-item cursor-pointer p-4 rounded-lg border transition-colors ${
                selectedTable?.id === table.id
                  ? 'border-brand-burgundy bg-brand-cream text-brand-burgundy'
                  : 'border-brand-burgundy/30 bg-brand-cream/50 text-brand-burgundy/70 hover:border-brand-burgundy/50'
              }`}
            >
              <h4 className="font-medium text-sm">Table {table.table_number}</h4>
              <p className="text-xs text-brand-burgundy/70 mb-1">{table.table_type}</p>
              <p className="text-xs text-brand-burgundy/70 mb-2">Fits {table.capacity} people</p>
              <p className="text-sm font-bold">₦{table.price.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={handleReserve} 
        disabled={!selectedTable || !date || !time}
        className={`w-full ${
          selectedTable 
            ? 'bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90' 
            : 'bg-brand-cream/50 text-brand-burgundy/50 cursor-not-allowed'
        }`}
      >
        {selectedTable ? `Reserve Table ${selectedTable.table_number} - ₦${selectedTable.price.toLocaleString()}` : 'Select a Table'}
      </Button>
    </div>
  );
};

export default TableReservation;