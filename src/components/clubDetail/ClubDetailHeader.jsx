import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Music, Users } from 'lucide-react';

const ClubDetailHeader = ({ club }) => {
  return (
    <div className="relative h-[50vh] overflow-hidden">
      <img 
        className="w-full h-full object-cover" 
        alt={`${club.name} main view`}
       src="https://images.unsplash.com/photo-1680445530925-af01b317e0a6" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"></div>
      
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-10">
        <div className="container">
          <Link to="/clubs" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clubs
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{club.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {club.location}
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 mr-1" />
              {club.rating}
            </div>
            <div className="flex items-center">
              <Music className="h-4 w-4 mr-1" />
              {club.musicType}
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Capacity: {club.capacity}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubDetailHeader;