import React from 'react';
import { Calendar, Clock, User } from 'lucide-react';

const OrderSummary = ({ selection, totalAmount, vipPerks }) => {
  // Handle both old format and new booking modal format
  const venueName = selection.clubName || selection.venueName || 'Venue';
  const isFromModal = selection.isFromModal;
  const hasTable = isFromModal ? (selection.selectedTable && Object.keys(selection.selectedTable).length > 0) : (selection.table && Object.keys(selection.table).length > 0);
  
  // Debug logging to understand the data structure
  console.log('🔍 OrderSummary Debug:', {
    isFromModal,
    hasTable: !!hasTable,
    'selection.selectedTable': selection.selectedTable,
    'selection.table': selection.table,
    'selectedTable.table_number': selection.selectedTable?.table_number,
    'selectedTable.name': selection.selectedTable?.name,
    'full selection': selection
  });
  
  return (
    <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Order Summary</h3>
      
      <div className="mb-4">
        <h4 className="font-medium text-lg">{venueName}</h4>
        {selection.venueLocation && (
          <p className="text-sm text-muted-foreground">{selection.venueLocation}</p>
        )}
      </div>
      
      <div className="space-y-4 mb-6">
        {/* Handle old ticket format */}
        {selection.ticket && !isFromModal && (
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium">{selection.ticket.name}</h4>
              <span className="font-bold">${selection.ticket.price}</span>
            </div>
            <p className="text-xs text-muted-foreground">{selection.ticket.description}</p>
          </div>
        )}
        
        {/* Handle general venue booking when no specific table */}
        {isFromModal && !selection.selectedTable && (
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium">General Venue Booking</h4>
              <span className="font-bold">$50</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-2 flex-wrap">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {selection.date}
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {selection.time}
              </div>
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {selection.guests} guests
              </div>
            </div>
            {selection.specialRequests && (
              <p className="text-xs text-muted-foreground mt-1">
                Special requests: {selection.specialRequests}
              </p>
            )}
          </div>
        )}

        {/* Handle table booking - both old and new format */}
        {hasTable && (
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium">
                {isFromModal 
                  ? `Table ${selection.selectedTable?.table_number || selection.selectedTable?.name || selection.selectedTable?.id || 'Reservation'}`
                  : `${selection.table?.tableName || 'Table'}`
                }
              </h4>
              <span className="font-bold">
                {isFromModal 
                  ? `₦${selection.selectedTable?.price || 50}`
                  : `$${selection.table.price}`
                }
              </span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-2 flex-wrap">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {isFromModal ? selection.date : selection.table?.date}
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {isFromModal ? selection.time : selection.table?.time}
              </div>
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {isFromModal ? `${selection.guests} guests` : `${selection.table?.guestCount} guests`}
              </div>
            </div>
            {isFromModal && selection.selectedTable && (
              <p className="text-xs text-muted-foreground mt-1">
                Capacity: {selection.selectedTable.capacity} guests • {selection.selectedTable.table_type}
              </p>
            )}
            {isFromModal && selection.specialRequests && (
              <p className="text-xs text-muted-foreground mt-1">
                Special requests: {selection.specialRequests}
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="border-t border-border pt-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${isFromModal 
            ? (selection.selectedTable?.price || 50)
            : ((selection.ticket?.price || 0) + (selection.table?.price || 0))
          }</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Service Fee</span>
          <span>$25</span>
        </div>
        {vipPerks && vipPerks.includes("10% Discount Applied") && (
          <div className="flex justify-between mb-2 text-green-400">
            <span className="text-muted-foreground">Referral Discount</span>
            <span>-10%</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg mt-4">
          <span>Total</span>
          <span>${totalAmount}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;