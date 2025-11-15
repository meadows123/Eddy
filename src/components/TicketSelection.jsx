import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Star, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const TicketSelection = ({ clubId, tickets, onSelectTicket }) => {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    onSelectTicket(ticket);
    
    toast({
      title: "Ticket selected!",
      description: `${ticket.name} ticket has been added to your selection.`,
    });
  };
  
  return (
    <div className="bg-secondary/20 border border-border/50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6 flex items-center">
        <Ticket className="mr-2 h-5 w-5" />
        VIP Tickets
      </h3>
      
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -2 }}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedTicket?.id === ticket.id
                ? 'border-primary bg-primary/20 neon-border'
                : 'border-border/50 hover:border-primary/50'
            }`}
            onClick={() => handleSelectTicket(ticket)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-lg">{ticket.name}</h4>
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
              </div>
              <div className="text-xl font-bold">${ticket.price}</div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {ticket.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {feature}
                </Badge>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {ticket.entryTime}
              </div>
              {ticket.maxGuests && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  Up to {ticket.maxGuests} guests
                </div>
              )}
            </div>
            
            <Button 
              className={`mt-4 w-full ${
                selectedTicket?.id === ticket.id
                  ? 'bg-gradient-to-r from-primary to-accent text-accent-foreground'
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              }`}
              variant={selectedTicket?.id === ticket.id ? 'default' : 'secondary'}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTicket(ticket);
              }}
            >
              {selectedTicket?.id === ticket.id ? 'Selected' : 'Select Ticket'}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TicketSelection;