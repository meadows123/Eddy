import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ChevronDown, ChevronUp, Search, Users, Building, CreditCard, HelpCircle } from 'lucide-react';
import { Input } from '../components/ui/input';

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle },
    { id: 'booking', name: 'Booking', icon: Users },
    { id: 'payment', name: 'Payment', icon: CreditCard },
    { id: 'venues', name: 'Venues', icon: Building },
  ];

  const faqs = [
    {
      id: 1,
      category: 'booking',
      question: 'How do I make a reservation?',
      answer: 'To make a reservation, browse our available venues, select your preferred date and time, choose the number of guests, select a table or ticket type, and complete the payment process. You\'ll receive a confirmation email with all the details.'
    },
    {
      id: 2,
      category: 'booking',
      question: 'Can I modify or cancel my booking?',
      answer: 'Yes, you can modify or cancel your booking through your account dashboard. Cancellation policies vary by venue:\n• 24+ hours before: Full refund\n• 12-24 hours before: 50% refund\n• Less than 12 hours: No refund\n\nModifications are subject to availability.'
    },
    {
      id: 3,
      category: 'booking',
      question: 'What happens if the venue cancels my booking?',
      answer: 'If a venue cancels your booking, you will receive a full refund automatically. We will also help you find alternative venues with similar offerings and may provide additional compensation for the inconvenience.'
    },
    {
      id: 4,
      category: 'booking',
      question: 'Can I book for someone else?',
      answer: 'Yes, you can make a booking for someone else. However, the person attending must have valid identification that matches the booking details. You can add guest information during the booking process.'
    },
    {
      id: 5,
      category: 'payment',
      question: 'What payment methods do you accept?',
      answer: 'We accept various payment methods including:\n• Credit/Debit cards (Visa, Mastercard)\n• Bank transfers\n• Mobile money (depending on location)\n• Cryptocurrency (Bitcoin, Ethereum)\n\nAll payments are processed securely through our encrypted payment system.'
    },
    {
      id: 6,
      category: 'payment',
      question: 'When will I be charged?',
      answer: 'Payment is typically processed immediately upon booking confirmation. For some premium venues, a deposit may be required at booking with the remaining balance due closer to your visit date.'
    },
    {
      id: 7,
      category: 'payment',
      question: 'How long do refunds take?',
      answer: 'Refunds are processed within 5-10 business days to your original payment method. The exact timing depends on your bank or payment provider. You\'ll receive an email confirmation when the refund is initiated.'
    },
    {
      id: 8,
      category: 'payment',
      question: 'Are there any additional fees?',
      answer: 'A small service fee may apply to cover payment processing and platform maintenance. This fee is clearly displayed before you complete your booking. There are no hidden charges.'
    },
    {
      id: 9,
      category: 'venues',
      question: 'How do I find venues near me?',
      answer: 'Use our location-based search feature on the venues page. You can filter by distance, type of venue, price range, and amenities. Enable location services for the most accurate results.'
    },
    {
      id: 10,
      category: 'venues',
      question: 'What information is provided about each venue?',
      answer: 'Each venue listing includes:\n• Photos and virtual tours\n• Location and contact details\n• Capacity and table layouts\n• Menu and pricing information\n• Dress code and entry requirements\n• Customer reviews and ratings\n• Available dates and times'
    },
    {
      id: 11,
      category: 'venues',
      question: 'Can I visit a venue before booking?',
      answer: 'Many venues welcome visits during their operating hours. Contact the venue directly through our platform to arrange a viewing. Some venues also offer virtual tours on their listing page.'
    },
    {
      id: 12,
      category: 'venues',
      question: 'How do I list my venue on VIP Club?',
      answer: 'Venue owners can register through our venue owner portal. The process includes:\n• Account creation and verification\n• Venue information submission\n• Photo uploads and virtual tour setup\n• Pricing and availability configuration\n• Approval process (typically 2-3 business days)'
    },
    {
      id: 13,
      category: 'booking',
      question: 'What should I bring to my reservation?',
      answer: 'Please bring:\n• Valid photo ID matching the booking name\n• Booking confirmation (digital or printed)\n• Payment method for any additional purchases\n• Any special requirements documentation if applicable'
    },
    {
      id: 14,
      category: 'booking',
      question: 'What if I arrive late?',
      answer: 'Please contact the venue directly if you\'re running late. Most venues hold reservations for 15-30 minutes past the booking time. After this period, your table may be released to other guests.'
    },
    {
      id: 15,
      category: 'payment',
      question: 'Can I split the payment with friends?',
      answer: 'Yes! Our split payment feature allows you to divide the cost among multiple people. During checkout, select "Split Payment" and enter your friends\' details. They\'ll receive payment links via email or SMS.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="bg-brand-cream/50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">Frequently Asked Questions</h1>
          <p className="text-brand-burgundy/70 text-lg">
            Find answers to common questions about VIP Club bookings, payments, and venues.
          </p>
        </div>

        {/* Search and Filter */}
        <Card className="bg-white border-brand-burgundy/10 mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-burgundy/50 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-brand-burgundy/20 focus:border-brand-burgundy"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                        activeCategory === category.id
                          ? 'bg-brand-burgundy text-white'
                          : 'bg-brand-cream/50 text-brand-burgundy hover:bg-brand-burgundy/10'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="p-8 text-center">
                <HelpCircle className="h-12 w-12 text-brand-burgundy/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-burgundy mb-2">No questions found</h3>
                <p className="text-brand-burgundy/70">
                  Try adjusting your search terms or selecting a different category.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card key={faq.id} className="bg-white border-brand-burgundy/10">
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-brand-cream/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="outline" 
                        className="border-brand-gold text-brand-burgundy bg-brand-gold/10"
                      >
                        {faq.category}
                      </Badge>
                      <h3 className="font-semibold text-brand-burgundy">{faq.question}</h3>
                    </div>
                    {expandedFAQ === faq.id ? (
                      <ChevronUp className="h-5 w-5 text-brand-burgundy/50" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-brand-burgundy/50" />
                    )}
                  </button>
                  
                  {expandedFAQ === faq.id && (
                    <div className="px-6 pb-4">
                      <div className="pt-2 border-t border-brand-burgundy/10">
                        <p className="text-brand-burgundy/80 leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Contact Section */}
        <Card className="bg-white border-brand-burgundy/10 mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-brand-burgundy mb-2">Still have questions?</h3>
            <p className="text-brand-burgundy/70 mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-2 bg-brand-burgundy text-white rounded-lg hover:bg-brand-burgundy/90 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="mailto:support@vipclub.ng"
                className="inline-flex items-center justify-center px-6 py-2 border border-brand-burgundy text-brand-burgundy rounded-lg hover:bg-brand-burgundy/10 transition-colors"
              >
                Email Us
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQPage; 