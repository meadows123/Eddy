import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';

const ContactPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: 'Message Sent!',
        description: 'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        className: 'bg-green-500 text-white'
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-brand-cream/50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">Contact Us</h1>
          <p className="text-brand-burgundy/70 text-lg max-w-2xl mx-auto">
            Get in touch with our team. We're here to help with bookings, partnerships, or any questions you may have.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-brand-burgundy/10 h-fit">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-brand-gold/20 rounded-full">
                    <Mail className="h-5 w-5 text-brand-burgundy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-burgundy">Email</h3>
                    <p className="text-brand-burgundy/70">info@oneeddy.com</p>
                    <p className="text-brand-burgundy/70">General inquiries & support</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-brand-gold/20 rounded-full">
                    <Phone className="h-5 w-5 text-brand-burgundy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-burgundy">Phone</h3>
                    <p className="text-brand-burgundy/70">Available via email</p>
                    <p className="text-brand-burgundy/70">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-brand-gold/20 rounded-full">
                    <MapPin className="h-5 w-5 text-brand-burgundy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-burgundy">Location</h3>
                    <p className="text-brand-burgundy/70">
                      Based in Lagos, Nigeria<br />
                      Serving venues nationwide<br />
                      Built in memory of Eddy
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-brand-gold/20 rounded-full">
                    <Clock className="h-5 w-5 text-brand-burgundy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-burgundy">Response Times</h3>
                    <p className="text-brand-burgundy/70">
                      Email: Within 24 hours<br />
                      Booking platform: 24/7 available<br />
                      Urgent matters: Same day response
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white border-brand-burgundy/10 mt-6">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-brand-burgundy mb-2">For Customers</h4>
                  <ul className="space-y-1 text-brand-burgundy/70">
                    <li>• Booking Help & Support</li>
                    <li>• Payment Issues</li>
                    <li>• Account Management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-brand-burgundy mb-2">For Venue Owners</h4>
                  <ul className="space-y-1 text-brand-burgundy/70">
                    <li>• Partnership Inquiries</li>
                    <li>• Technical Support</li>
                    <li>• Account Setup</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-brand-burgundy/10">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Send us a Message</CardTitle>
                <p className="text-brand-burgundy/70">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-brand-burgundy">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 border-brand-burgundy/20 focus:border-brand-burgundy"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-brand-burgundy">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 border-brand-burgundy/20 focus:border-brand-burgundy"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-brand-burgundy">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="mt-1 border-brand-burgundy/20 focus:border-brand-burgundy"
                      placeholder="What is this regarding?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-brand-burgundy">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      className="mt-1 border-brand-burgundy/20 focus:border-brand-burgundy"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="bg-white border-brand-burgundy/10 mt-6">
              <CardHeader>
                <CardTitle className="text-brand-burgundy">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-brand-burgundy mb-2">How do I make a booking?</h4>
                  <p className="text-brand-burgundy/70 text-sm">
                    Simply browse our venues, select your preferred date and time, choose your table or ticket, and complete the payment process.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-brand-burgundy mb-2">Can I cancel my booking?</h4>
                  <p className="text-brand-burgundy/70 text-sm">
                    Yes, cancellations are allowed based on each venue's policy. Check your booking confirmation for specific cancellation terms.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-brand-burgundy mb-2">How do I become a venue partner?</h4>
                  <p className="text-brand-burgundy/70 text-sm">
                    Visit our venue owner registration page or contact us directly to discuss partnership opportunities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;