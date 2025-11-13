import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TicketSelection from '@/components/TicketSelection';
import TableReservation from '@/components/TableReservation';
import { useToast } from '@/components/ui/use-toast';
import { allVenuesData, getLagosLocations, getVenueTypes, getMusicGenres, getDressCodes, getPriceRanges } from '@/data/clubData';
import ClubDetailHeader from '@/components/clubDetail/ClubDetailHeader';
import ClubInfoSection from '@/components/clubDetail/ClubInfoSection';
import ClubGallery from '@/components/clubDetail/ClubGallery';
import BookingSummary from '@/components/clubDetail/BookingSummary';
import { Badge } from '@/components/ui/badge';

const ClubDetailPage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [filteredClubs, setFilteredClubs] = useState(allVenuesData);
  const locations = getLagosLocations();
  const venueTypes = getVenueTypes();
  const musicGenres = getMusicGenres();
  const dressCodes = getDressCodes();
  const priceRanges = getPriceRanges();
  const [selectedType, setSelectedType] = useState(club?.type || 'all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedDressCode, setSelectedDressCode] = useState('all');
  const [selectedMusicGenre, setSelectedMusicGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  useEffect(() => {
    setTimeout(() => {
      const foundClub = getVenueById(id);
      setClub(foundClub);
      setLoading(false);
    }, 300);
  }, [id]);
  
  useEffect(() => {
    if (club) {
      setFilteredClubs(
        allVenuesData.filter(venue => 
          venue.id !== club.id && 
          (selectedType === 'all' || venue.type === selectedType) &&
          (selectedPriceRange === 'all' || venue.priceRange === selectedPriceRange) &&
          (selectedDressCode === 'all' || venue.dressCode?.includes(selectedDressCode)) &&
          (selectedMusicGenre === 'all' || venue.musicGenres?.includes(selectedMusicGenre)) &&
          (selectedLocation === 'all' || venue.city === selectedLocation)
        )
      );
    }
  }, [club, selectedType, selectedPriceRange, selectedDressCode, selectedMusicGenre, selectedLocation]);
  
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
  };
  
  const handleReserveTable = (table) => {
    setSelectedTable(table);
  };
  
  const handleProceedToCheckout = () => {
    if (!selectedTicket && !selectedTable) {
      toast({
        title: "Selection required",
        description: "Please select at least a ticket or table to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    const selection = {
      clubId: club.id,
      clubName: club.name,
      ticket: selectedTicket,
      table: selectedTable,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('nightvibe_selection', JSON.stringify(selection));
  };
  
  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!club) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Club Not Found</h2>
        <p className="text-muted-foreground mb-6">The club you're looking for doesn't exist or has been removed.</p>
        <Link to="/clubs">
          <Button>Back to Clubs</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <ClubDetailHeader club={club} />
      
      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ClubInfoSection club={club} />
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Music Genres</h3>
              <div className="flex flex-wrap gap-2">
                {club.musicGenres?.map(genre => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Dress Code</h3>
              <div className="flex flex-wrap gap-2">
                {club.dressCode?.map(code => (
                  <Badge key={code} variant="outline">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
            <ClubGallery images={club.images} clubName={club.name} />
            
            <div>
              <h2 className="text-2xl font-bold mb-4">VIP Experience</h2>
              <Tabs defaultValue="tickets">
                <TabsList className="mb-4">
                  <TabsTrigger value="tickets">VIP Tickets</TabsTrigger>
                  <TabsTrigger value="tables">Table Reservations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tickets">
                  <TicketSelection 
                    clubId={club.id} 
                    tickets={club.tickets} 
                    onSelectTicket={handleSelectTicket} 
                  />
                </TabsContent>
                
                <TabsContent value="tables">
                  <TableReservation 
                    clubId={club.id} 
                    onReserve={handleReserveTable} 
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <div>
            <div className="sticky top-20">
              <BookingSummary 
                selectedTicket={selectedTicket}
                selectedTable={selectedTable}
                clubId={club.id}
                onProceedToCheckout={handleProceedToCheckout}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Similar Venues</h2>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
          >
            All Types
          </Button>
          {venueTypes.map(type => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={selectedPriceRange === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedPriceRange('all')}
          >
            All Prices
          </Button>
          {priceRanges.map(range => (
            <Button
              key={range}
              variant={selectedPriceRange === range ? 'default' : 'outline'}
              onClick={() => setSelectedPriceRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={selectedDressCode === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedDressCode('all')}
          >
            All Dress Codes
          </Button>
          {dressCodes.map(code => (
            <Button
              key={code}
              variant={selectedDressCode === code ? 'default' : 'outline'}
              onClick={() => setSelectedDressCode(code)}
            >
              {code}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={selectedMusicGenre === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedMusicGenre('all')}
          >
            All Genres
          </Button>
          {musicGenres.map(genre => (
            <Button
              key={genre}
              variant={selectedMusicGenre === genre ? 'default' : 'outline'}
              onClick={() => setSelectedMusicGenre(genre)}
            >
              {genre}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={selectedLocation === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedLocation('all')}
          >
            All Locations
          </Button>
          {locations.map(location => (
            <Button
              key={location}
              variant={selectedLocation === location ? 'default' : 'outline'}
              onClick={() => setSelectedLocation(location)}
            >
              {location}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClubs
            .filter(venue => venue.id !== club.id && venue.type === club.type)
            .slice(0, 2)
            .map(venue => (
              <Link key={venue.id} to={`/clubs/${venue.id}`}>
                <div className="p-4 border rounded-lg hover:border-brand-gold transition-colors">
                  <h3 className="font-medium">{venue.name}</h3>
                  <p className="text-sm text-muted-foreground">{venue.city}</p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ClubDetailPage;