import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Users, CalendarDays, Clock, ArrowLeft, Phone, Share2, Heart, CheckCircle, Utensils, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TicketSelection from '@/components/TicketSelection'; // Will need styling updates
import TableReservation from '@/components/TableReservation'; // Will need styling updates
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        // Fetch venue data
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single();

        if (venueError) throw venueError;

        // Fetch tables for this venue
        const { data: tablesData, error: tablesError } = await supabase
          .from('venue_tables')
          .select('*')
          .eq('venue_id', id);

        if (tablesError) {
          console.error('Error fetching tables:', tablesError);
        }

        // Fetch images for this venue
        const { data: imagesData, error: imagesError } = await supabase
          .from('venue_images')
          .select('*')
          .eq('venue_id', id)
          .order('is_primary', { ascending: false });

        if (imagesError) {
          console.error('Error fetching images:', imagesError);
        }

        // Process images to ensure primary image is first
        let processedImages = [];
        if (imagesData && imagesData.length > 0) {
          // Find primary image
          const primaryImage = imagesData.find(img => img.is_primary);
          const otherImages = imagesData.filter(img => !img.is_primary);
          
          // Put primary image first, then other images
          if (primaryImage) {
            processedImages = [primaryImage.image_url, ...otherImages.map(img => img.image_url)];
          } else {
            // If no primary image, just use all images
            processedImages = imagesData.map(img => img.image_url);
          }
        }

        // Add tables and images to venue object
        const venueWithTables = {
          ...venueData,
          tables: tablesData || [],
          images: processedImages,
          tickets: [] // For now, no tickets from database
        };

        setVenue(venueWithTables);
        
        // Check if venue is in favorites
        const favorites = JSON.parse(localStorage.getItem('lagosvibe_favorites') || '[]');
        setIsFavorite(favorites.includes(id));
      } catch (error) {
        console.error('Error fetching venue:', error);
        toast({
          title: "Error",
          description: "Failed to load venue details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchVenue();
  }, [id, toast]);
  
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedTable(null); // Clear table selection if ticket is chosen
  };
  
  const handleReserveTable = (table) => {
    setSelectedTable(table);
    setSelectedTicket(null); // Clear ticket selection if table is chosen
  };
  
  const handleProceedToBooking = () => {
    console.log('handleProceedToBooking called');
    console.log('selectedTicket:', selectedTicket);
    console.log('selectedTable:', selectedTable);
    
    if (!selectedTicket && !selectedTable) {
      toast({
        title: "Selection Required",
        description: "Please select a ticket or reserve a table to proceed.",
        variant: "destructive",
        className: "bg-red-500 text-white",
      });
      return;
    }
    
    // Get the guest count from the selected item
    let guestCount = 2; // Default fallback
    if (selectedTable) {
      guestCount = selectedTable.guestCount || selectedTable.capacity || 2;
    } else if (selectedTicket) {
      guestCount = selectedTicket.maxGuests || 2;
    }
    
    const bookingSelection = {
      venueId: venue.id,
      venueName: venue.name,
      venueImage: venue.images && venue.images.length > 0 ? venue.images[0] : null,
      ticket: selectedTicket,
      table: selectedTable,
      guests: guestCount, // Add the guest count here
      guestCount: guestCount, // Also add as guestCount for compatibility
      timestamp: new Date().toISOString()
    };
    
    console.log('Saving booking selection:', bookingSelection);
    localStorage.setItem('lagosvibe_booking_selection', JSON.stringify(bookingSelection));
    
    const checkoutUrl = `/checkout/${venue.id}`;
    console.log('Navigating to:', checkoutUrl);
    navigate(checkoutUrl);
  };

  const toggleFavorite = () => {
    let favorites = JSON.parse(localStorage.getItem('lagosvibe_favorites') || '[]');
    if (isFavorite) {
      favorites = favorites.filter(favId => favId !== id);
      toast({ title: `${venue.name} removed from favorites.`, className: "bg-brand-burgundy text-brand-cream" });
    } else {
      favorites.push(id);
      toast({ title: `${venue.name} added to favorites!`, className: "bg-brand-gold text-brand-burgundy" });
    }
    localStorage.setItem('lagosvibe_favorites', JSON.stringify(favorites));
    setIsFavorite(!isFavorite);
  };

  const shareVenue = () => {
    if (navigator.share) {
      navigator.share({
        title: venue.name,
        text: `Check out ${venue.name} on LagosVibe!`,
        url: window.location.href,
      })
      .then(() => toast({ title: 'Venue shared!', className: "bg-brand-gold text-brand-burgundy" }))
      .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied to clipboard!', className: "bg-brand-gold text-brand-burgundy" });
    }
  };
  
  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto"></div>
        <p className="mt-4 text-brand-burgundy/70 font-body">Loading Venue Details...</p>
      </div>
    );
  }
  
  if (!venue) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-4xl font-heading mb-4 text-brand-burgundy">Venue Not Found</h2>
        <p className="text-lg text-brand-burgundy/70 font-body mb-8">The venue you're looking for doesn't exist or has been removed.</p>
        <Link to="/venues">
          <Button className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90">Back to Venues</Button>
        </Link>
      </div>
    );
  }
  
  const totalAmount = (selectedTicket?.price || 0) + (selectedTable?.price || 0);

  return (
    <div className="bg-brand-cream">
      {/* Hero/Header Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative h-[50vh] md:h-[60vh] overflow-hidden"
      >
        <img   
          className="w-full h-full object-cover" 
          alt={`Interior or exterior of ${venue.name}`}
          src={venue.images && venue.images.length > 0 
            ? venue.images[0] 
            : "https://images.unsplash.com/photo-1632111162953-c58fa2fa1080"
          }
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1632111162953-c58fa2fa1080";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-burgundy/70 via-brand-burgundy/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 md:p-12 container">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl md:text-6xl font-heading text-white mb-2"
          >
            {venue.name}
          </motion.h1>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <div className="flex items-center text-brand-gold">
              <Star className="h-5 w-5 fill-current mr-1" />
              <span className="text-white font-semibold text-lg">{venue.rating}</span>
            </div>
            <span className="text-white/80 text-sm font-body">• {venue.type} in {venue.city}</span>
          </motion.div>
        </div>
         <Link to="/venues" className="absolute top-6 left-6 md:top-8 md:left-8 inline-flex items-center text-sm text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-full backdrop-blur-sm transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Venues
        </Link>
      </motion.section>
      
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2">
            <Card className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-brand-burgundy/10 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-heading text-brand-burgundy mb-1">About {venue.name}</h2>
                  <p className="text-brand-burgundy/70 font-body">{venue.description}</p>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                    <Button variant="outline" size="icon" onClick={toggleFavorite} className={`border-brand-gold hover:bg-brand-gold/10 ${isFavorite ? 'bg-brand-gold/20 text-brand-gold' : 'text-brand-gold'}`}>
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={shareVenue} className="text-brand-gold border-brand-gold hover:bg-brand-gold/10">
                        <Share2 className="h-5 w-5" />
                    </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-body text-brand-burgundy/80">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                  <span>{venue.address}</span>
                </div>
                <div className="flex items-start">
                  <span>Price Range: {venue.price_range}</span>
                </div>
                <div className="flex items-start">
                  <CalendarDays className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                  <span>{venue.operatingDays || 'Open Daily'}</span>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                  <span>{venue.openingHours}</span>
                </div>
                 {venue.phone && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                    <a href={`tel:${venue.phone}`} className="hover:text-brand-gold">{venue.phone}</a>
                  </div>
                )}
                <div className="flex items-start">
                  <Users className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                  <span>Capacity: {venue.capacity} guests</span>
                </div>
                {venue.dressCode && (
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" /> {/* Assuming CheckCircle for dress code */}
                    <span>Dress Code: {venue.dressCode}</span>
                  </div>
                )}
                {venue.ambiance && (
                  <div className="md:col-span-2 flex items-start">
                     <CheckCircle className="h-5 w-5 mr-3 mt-0.5 text-brand-gold shrink-0" />
                    <span>Ambiance: {venue.ambiance}</span>
                  </div>
                )}
              </div>
              
              {venue.cuisine && venue.cuisine.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-heading text-xl text-brand-burgundy mb-2 flex items-center"><Utensils className="h-5 w-5 mr-2 text-brand-gold"/>Cuisine</h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.cuisine.map(c => <Badge key={c} variant="secondary" className="bg-brand-gold/20 text-brand-burgundy border-brand-gold/30">{c}</Badge>)}
                  </div>
                </div>
              )}
              {venue.music && venue.music.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-heading text-xl text-brand-burgundy mb-2 flex items-center"><Music2 className="h-5 w-5 mr-2 text-brand-gold"/>Music</h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.music.map(m => <Badge key={m} variant="secondary" className="bg-brand-gold/20 text-brand-burgundy border-brand-gold/30">{m}</Badge>)}
                  </div>
                </div>
              )}

            </Card>
            
            {/* Gallery Section */}
            {venue.images && venue.images.length > 0 && (
                 <Card className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-brand-burgundy/10 mb-8">
                    <h2 className="text-3xl font-heading text-brand-burgundy mb-6">Gallery</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {venue.images.map((img, index) => ( // Show all images
                            <motion.div 
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <img  
                                  className="w-full h-full object-cover" 
                                  alt={`${venue.name} gallery image ${index + 1}`} 
                                  src={img}
                                  onError={(e) => {
                                    e.target.src = "https://images.unsplash.com/photo-1688046671828-c26b7fd54596";
                                  }}
                                />
                            </motion.div>
                        ))}
                    </div>
                    {venue.images.length > 6 && (
                      <p className="text-center text-brand-burgundy/60 text-sm mt-4">
                        + {venue.images.length - 6} more photos
                      </p>
                    )}
                </Card>
            )}

            {/* Booking Options */}
            <Card className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-brand-burgundy/10">
              <h2 className="text-3xl font-heading text-brand-burgundy mb-6">Make a Reservation</h2>
              <Tabs defaultValue={venue.tickets && venue.tickets.length > 0 ? "tickets" : "tables"} className="font-body">
                <TabsList className="mb-6 bg-brand-cream/60 p-1 rounded-lg">
                  {venue.tickets && venue.tickets.length > 0 && <TabsTrigger value="tickets" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy data-[state=active]:shadow-md px-6 py-2.5 rounded-md text-brand-burgundy/80">VIP Tickets</TabsTrigger>}
                  {venue.tables && venue.tables.length > 0 && <TabsTrigger value="tables" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy data-[state=active]:shadow-md px-6 py-2.5 rounded-md text-brand-burgundy/80">Table Reservations</TabsTrigger>}
                </TabsList>
                
                {venue.tickets && venue.tickets.length > 0 && (
                  <TabsContent value="tickets">
                    <TicketSelection 
                      clubId={venue.id} 
                      tickets={venue.tickets} 
                      onSelectTicket={handleSelectTicket} 
                      selectedTicketId={selectedTicket?.id}
                    />
                  </TabsContent>
                )}
                
                {venue.tables && venue.tables.length > 0 && (
                  <TabsContent value="tables">
                    <TableReservation 
                      clubId={venue.id} 
                      tables={venue.tables}
                      onReserve={handleReserveTable} 
                      selectedTableId={selectedTable?.id}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </Card>
          </div>
          
          {/* Sidebar/Sticky Booking Summary */}
          <div className="lg:sticky lg:top-24 h-fit">
             <Card className="bg-white p-6 rounded-xl shadow-xl border-brand-burgundy/10">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-2xl font-heading text-brand-burgundy">Your Selection</CardTitle>
              </CardHeader>
              <CardContent className="p-0 font-body">
                {(!selectedTicket && !selectedTable) && (
                  <p className="text-brand-burgundy/70 text-sm">Select a ticket or table to get started.</p>
                )}
                {selectedTicket && (
                  <div className="mb-4 pb-4 border-b border-brand-burgundy/10">
                    <h4 className="font-semibold text-brand-burgundy">{selectedTicket.name}</h4>
                    <p className="text-sm text-brand-burgundy/70">Price: ₦{selectedTicket.price.toLocaleString()}</p>
                  </div>
                )}
                {selectedTable && (
                  <div className="mb-4 pb-4 border-b border-brand-burgundy/10">
                    <h4 className="font-semibold text-brand-burgundy">Table {selectedTable.table_number}</h4>
                    <p className="text-sm text-brand-burgundy/70">{selectedTable.table_type}</p>
                    <p className="text-sm text-brand-burgundy/70">Date: {selectedTable.date || 'Not set'} | Time: {selectedTable.time || 'Not set'}</p>
                    <p className="text-sm text-brand-burgundy/70">Guests: {selectedTable.guestCount || 'Not set'}</p>
                    <p className="text-sm text-brand-burgundy/70">Price: ₦{selectedTable.price.toLocaleString()}</p>
                  </div>
                )}
                {totalAmount > 0 && (
                   <div className="text-xl font-heading text-brand-burgundy mb-6">
                    Total: <span className="text-brand-gold">₦{totalAmount.toLocaleString()}</span>
                  </div>
                )}
                <Button 
                  onClick={handleProceedToBooking} 
                  disabled={!selectedTicket && !selectedTable}
                  className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 py-3 text-base rounded-md"
                >
                  Proceed to Booking
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailPage;