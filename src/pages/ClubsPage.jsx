import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Music, MapPin, Tag, Users, Shirt, DollarSign, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VenueCard from '@/components/VenueCard';
import { allClubsData, getUkCities, getVenueTypes, getMusicGenres, getDressCodes, getPriceRanges } from '@/data/clubData';

const ClubsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClubs, setFilteredClubs] = useState(allClubsData);
  
  const [filters, setFilters] = useState({
    location: 'all',
    venueType: 'all',
    musicGenre: 'all',
    dressCode: 'all',
    priceRange: 'all',
  });

  const locations = getUkCities();
  const venueTypes = getVenueTypes();
  const musicGenres = getMusicGenres();
  const dressCodes = getDressCodes();
  const priceRanges = getPriceRanges();

  useEffect(() => {
    let results = allClubsData;
    
    if (searchTerm) {
      results = results.filter(club => 
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.musicType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (club.musicGenres && club.musicGenres.some(genre => genre.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }
    
    Object.keys(filters).forEach(filterKey => {
      if (filters[filterKey] !== 'all') {
        if (filterKey === 'musicGenre') {
          results = results.filter(club => club.musicGenres && club.musicGenres.includes(filters[filterKey]));
        } else {
          results = results.filter(club => club[filterKey] === filters[filterKey]);
        }
      }
    });
    
    setFilteredClubs(results);
  }, [searchTerm, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      location: 'all',
      venueType: 'all',
      musicGenre: 'all',
      dressCode: 'all',
      priceRange: 'all',
    });
  };
  
  return (
    <div className="py-12">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold mb-4">Discover Top Nightlife Venues in the UK</h1>
          <p className="text-muted-foreground max-w-3xl">
            Find the best clubs, lounges, and bars. Filter by city, price, music, and more to plan your perfect night out.
          </p>
        </motion.div>
        
        <div className="mb-8 p-6 bg-card/50 border border-border/60 rounded-lg glass-effect">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="relative flex-grow md:col-span-2 lg:col-span-1">
              <Label htmlFor="search" className="text-sm font-medium mb-1 block">Search</Label>
              <div className="relative">
                <Input 
                  id="search"
                  type="text" 
                  placeholder="Club name, music, vibe..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <Label htmlFor="location-filter" className="text-sm font-medium mb-1 block flex items-center"><MapPin className="h-4 w-4 mr-1 text-primary" />Location</Label>
              <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                <SelectTrigger id="location-filter">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location} value={location} className="capitalize">{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter" className="text-sm font-medium mb-1 block flex items-center"><Tag className="h-4 w-4 mr-1 text-primary" />Venue Type</Label>
              <Select value={filters.venueType} onValueChange={(value) => handleFilterChange('venueType', value)}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {venueTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="music-filter" className="text-sm font-medium mb-1 block flex items-center"><Music className="h-4 w-4 mr-1 text-primary" />Music Genre</Label>
              <Select value={filters.musicGenre} onValueChange={(value) => handleFilterChange('musicGenre', value)}>
                <SelectTrigger id="music-filter">
                  <SelectValue placeholder="Select Genre" />
                </SelectTrigger>
                <SelectContent>
                  {musicGenres.map(genre => (
                    <SelectItem key={genre} value={genre} className="capitalize">{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dresscode-filter" className="text-sm font-medium mb-1 block flex items-center"><Shirt className="h-4 w-4 mr-1 text-primary" />Dress Code</Label>
              <Select value={filters.dressCode} onValueChange={(value) => handleFilterChange('dressCode', value)}>
                <SelectTrigger id="dresscode-filter">
                  <SelectValue placeholder="Select Dress Code" />
                </SelectTrigger>
                <SelectContent>
                  {dressCodes.map(code => (
                    <SelectItem key={code} value={code} className="capitalize">{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price-filter" className="text-sm font-medium mb-1 block flex items-center"><DollarSign className="h-4 w-4 mr-1 text-primary" />Price Range</Label>
              <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value)}>
                <SelectTrigger id="price-filter">
                  <SelectValue placeholder="Select Price" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map(range => (
                    <SelectItem key={range} value={range} className="capitalize">{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={resetFilters} variant="ghost" className="mt-4 text-sm text-muted-foreground hover:text-primary">
            <FilterX className="h-4 w-4 mr-1" /> Reset All Filters
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.length > 0 ? (
            filteredClubs.map((club) => (
              <VenueCard key={club.id} venue={club} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">No venues found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button 
                variant="outline" 
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubsPage;