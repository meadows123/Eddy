import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

const BookingSummary = ({ selectedTicket, selectedTable, clubId, onProceedToCheckout }) => {
  const calculateTotal = () => {
    const ticketPrice = selectedTicket?.price || 0;
    const tablePrice = selectedTable?.price || 0;
    const serviceFee = 25; // Assuming a fixed service fee
    return ticketPrice + tablePrice + serviceFee;
  };

  return (
    <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Your Selection</h3>
      
      {(!selectedTicket && !selectedTable) ? (
        <div className="text-center py-6">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Select a VIP ticket or reserve a table to continue.
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-4 mb-6">
            {selectedTicket && (
              <div className="p-3 bg-background/50 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium">{selectedTicket.name}</h4>
                  <span className="font-bold">${selectedTicket.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedTicket.description}</p>
              </div>
            )}
            
            {selectedTable && (
              <div className="p-3 bg-background/50 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium">{selectedTable.tableName} Table</h4>
                  <span className="font-bold">${selectedTable.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTable.date} at {selectedTable.time} • {selectedTable.guestCount} guests
                </p>
              </div>
            )}
          </div>
          
          <div className="border-t border-border pt-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                ${(selectedTicket?.price || 0) + (selectedTable?.price || 0)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Service Fee</span>
              <span>$25</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-4">
              <span>Total</span>
              <span>${calculateTotal()}</span>
            </div>
          </div>
          
          <Link to={`/checkout/${clubId}`} onClick={onProceedToCheckout}>
            <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default BookingSummary;