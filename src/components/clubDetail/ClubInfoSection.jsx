import React from 'react';
import { Clock, Users, MapPin, Music } from 'lucide-react';

const ClubInfoSection = ({ club }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">About {club.name}</h2>
      <p className="text-muted-foreground mb-6">{club.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-secondary/20 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Opening Hours
          </h3>
          <p className="text-sm text-muted-foreground">{club.openingHours}</p>
        </div>
        
        <div className="bg-secondary/20 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Dress Code
          </h3>
          <p className="text-sm text-muted-foreground">{club.dressCode}</p>
        </div>
        
        <div className="bg-secondary/20 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Address
          </h3>
          <p className="text-sm text-muted-foreground">{club.address}</p>
        </div>
        
        <div className="bg-secondary/20 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Music
          </h3>
          <p className="text-sm text-muted-foreground">{club.musicType}</p>
        </div>
      </div>
    </div>
  );
};

export default ClubInfoSection;