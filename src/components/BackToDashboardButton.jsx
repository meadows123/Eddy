import React from 'react';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BackToDashboardButton = ({ className = "" }) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className={`border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 ${className}`}
      onClick={() => navigate('/venue-owner/dashboard')}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
};

export default BackToDashboardButton; 