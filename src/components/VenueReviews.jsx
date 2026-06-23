import React, { useState, useEffect } from 'react';
import { Star, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const VenueReviews = ({ venueId, venueName }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, review_text: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  console.log('🔍 VenueReviews component loaded with:', { venueId, venueName });

  // Fetch reviews from database
  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('venue_reviews')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (venueId) {
      fetchReviews();
    }
  }, [venueId]);

  // Submit new review
  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to leave a review",
        variant: "destructive"
      });
      return;
    }

    if (!newReview.review_text.trim()) {
      toast({
        title: "Review required",
        description: "Please write a review before submitting",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('venue_reviews')
        .insert([{
          venue_id: venueId,
          user_id: user.id,
          rating: newReview.rating,
          review_text: newReview.review_text
        }])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback",
        className: "bg-green-500 text-white"
      });

      // Reset form and close dialog
      setNewReview({ rating: 5, review_text: '' });
      setIsAddingReview(false);
      
      // Refresh reviews
      fetchReviews();

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  // Get user initials
  const getUserInitials = (profile) => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
    }
    return 'U';
  };

  // Get user display name
  const getUserName = (profile) => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'Anonymous User';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
          <span className="text-xl font-semibold text-brand-burgundy">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Reviews Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
          <span className="text-xl font-semibold text-brand-burgundy">{averageRating}</span>
          <span className="text-brand-burgundy/60">·</span>
          <span className="text-brand-burgundy/60">{reviews.length} reviews</span>
        </div>
        
        {/* Add Review Button */}
        <Dialog open={isAddingReview} onOpenChange={(open) => {
          console.log('🔍 Dialog state changing to:', open);
          setIsAddingReview(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/5"
              data-testid="add-review-dialog-trigger"
              onClick={() => {
                console.log('🔍 Add Review button clicked!');
                setIsAddingReview(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review {venueName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Rating Selection */}
              <div>
                <label className="text-sm font-medium text-brand-burgundy mb-2 block">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star 
                        className={`h-6 w-6 ${
                          rating <= newReview.rating 
                            ? 'fill-brand-gold text-brand-gold' 
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="text-sm font-medium text-brand-burgundy mb-2 block">
                  Your Review
                </label>
                <Textarea
                  placeholder="Share your experience at this venue..."
                  value={newReview.review_text}
                  onChange={(e) => setNewReview(prev => ({ ...prev, review_text: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingReview(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="flex-1 bg-brand-burgundy hover:bg-brand-burgundy/90"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
          <p className="text-gray-500 mb-4">Be the first to share your experience!</p>
          {user && (
            <Button
              onClick={() => setIsAddingReview(true)}
              className="bg-brand-burgundy hover:bg-brand-burgundy/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Write First Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-brand-burgundy rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getUserInitials(review.profiles)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-brand-burgundy truncate">
                      {getUserName(review.profiles)}
                    </span>
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-brand-gold text-brand-gold" />
                      ))}
                      {[...Array(5 - review.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-gray-300" />
                      ))}
                    </div>
                    <span className="text-brand-burgundy/60 text-sm">·</span>
                    <span className="text-brand-burgundy/60 text-sm">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-brand-burgundy/80 text-sm leading-relaxed">
                {review.review_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenueReviews;
