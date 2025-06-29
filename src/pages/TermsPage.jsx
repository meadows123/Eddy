import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const TermsPage = () => {
  return (
    <div className="bg-brand-cream/50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">Terms of Service</h1>
          <p className="text-brand-burgundy/70">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-white border-brand-burgundy/10">
          <CardContent className="p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">1. Acceptance of Terms</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                By accessing and using VIP Club's services, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">2. Use License</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>
                  Permission is granted to temporarily download one copy of VIP Club's materials for personal, 
                  non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>modify or copy the materials</li>
                  <li>use the materials for any commercial purpose or for any public display</li>
                  <li>attempt to decompile or reverse engineer any software contained on the website</li>
                  <li>remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">3. Booking and Payments</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p><strong>Booking Policy:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>All bookings are subject to venue availability and confirmation</li>
                  <li>Bookings must be made by individuals 18 years or older</li>
                  <li>False information provided during booking may result in cancellation</li>
                  <li>VIP Club reserves the right to refuse service to anyone</li>
                </ul>
                
                <p><strong>Payment Terms:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Payment is required at the time of booking unless otherwise specified</li>
                  <li>All prices are in Nigerian Naira (₦) and include applicable taxes</li>
                  <li>Service fees and processing charges may apply</li>
                  <li>Refunds are subject to the cancellation policy of each venue</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">4. Cancellation and Refund Policy</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <ul className="list-disc list-inside space-y-2">
                  <li>Cancellations made 24+ hours before the booking date are eligible for a full refund</li>
                  <li>Cancellations made 12-24 hours before the booking date are eligible for a 50% refund</li>
                  <li>Cancellations made less than 12 hours before the booking date are non-refundable</li>
                  <li>Venue-initiated cancellations will result in a full refund</li>
                  <li>Refund processing may take 5-10 business days</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">5. User Conduct</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>Users agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate and truthful information</li>
                  <li>Respect venue rules and regulations</li>
                  <li>Behave appropriately and not disturb other guests</li>
                  <li>Not engage in illegal activities on the premises</li>
                  <li>Follow dress codes and entry requirements as specified by venues</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">6. Venue Owner Responsibilities</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>Venue owners using our platform agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate venue information and availability</li>
                  <li>Honor confirmed bookings unless extraordinary circumstances arise</li>
                  <li>Maintain venue standards as advertised</li>
                  <li>Process refunds according to stated policies</li>
                  <li>Comply with all local laws and regulations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">7. Disclaimer</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                The materials on VIP Club's website are provided on an 'as is' basis. VIP Club makes no warranties, 
                expressed or implied, and hereby disclaims and negates all other warranties including without limitation, 
                implied warranties or conditions of merchantability, fitness for a particular purpose, 
                or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">8. Limitations</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                In no event shall VIP Club or its suppliers be liable for any damages (including, without limitation, 
                damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
                to use the materials on VIP Club's website, even if VIP Club or a VIP Club authorized representative has 
                been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">9. Privacy Policy</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
                to understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">10. Modifications</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                VIP Club may revise these terms of service at any time without notice. By using this website, 
                you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">11. Contact Information</h2>
              <div className="text-brand-burgundy/80 leading-relaxed">
                <p>If you have any questions about these Terms of Service, please contact us at:</p>
                <div className="mt-3 p-4 bg-brand-cream/30 rounded-lg">
                  <p><strong>Email:</strong> legal@vipclub.ng</p>
                  <p><strong>Phone:</strong> +234 (0) 123 456 7890</p>
                  <p><strong>Address:</strong> VIP Club Legal Department, Lagos, Nigeria</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsPage; 