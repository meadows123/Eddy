import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const PrivacyPage = () => {
  return (
    <div className="bg-brand-cream/50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">Privacy Policy</h1>
          <p className="text-brand-burgundy/70">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-white border-brand-burgundy/10">
          <CardContent className="p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">1. Information We Collect</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p><strong>Personal Information:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Name, email address, and phone number</li>
                  <li>Payment information (processed securely by third-party providers)</li>
                  <li>Booking preferences and history</li>
                  <li>Location data (when you allow it)</li>
                </ul>
                
                <p><strong>Automatically Collected Information:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage patterns and preferences</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">2. How We Use Your Information</h2>
              <div className="text-brand-burgundy/80 leading-relaxed">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2 mt-3">
                  <li>Process and manage your bookings</li>
                  <li>Send booking confirmations and updates</li>
                  <li>Provide customer support</li>
                  <li>Improve our services and user experience</li>
                  <li>Send promotional offers (with your consent)</li>
                  <li>Prevent fraud and ensure platform security</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">3. Information Sharing</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>We may share your information with:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Venues:</strong> Name, contact details, and booking information</li>
                  <li><strong>Payment Processors:</strong> Necessary payment information</li>
                  <li><strong>Service Providers:</strong> Trusted partners who help operate our platform</li>
                  <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                </ul>
                <p className="mt-3">
                  <strong>We never sell your personal information to third parties.</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">4. Data Security</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>We protect your information through:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>SSL encryption for all data transmission</li>
                  <li>Secure servers with regular security updates</li>
                  <li>Limited access to personal information by employees</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Compliance with industry security standards</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">5. Your Rights and Choices</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Access and review your personal information</li>
                  <li>Update or correct your information</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Request data portability</li>
                  <li>Object to certain types of processing</li>
                </ul>
                <p className="mt-3">
                  To exercise these rights, contact us at privacy@vipclub.ng
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">6. Cookies and Tracking</h2>
              <div className="text-brand-burgundy/80 leading-relaxed space-y-3">
                <p>We use cookies to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze site usage and performance</li>
                  <li>Provide personalized content</li>
                  <li>Enable social media features</li>
                </ul>
                <p className="mt-3">
                  You can control cookies through your browser settings, but some features may not work properly if disabled.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">7. Data Retention</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services, 
                comply with legal obligations, resolve disputes, and enforce our agreements. 
                Booking history may be retained for up to 7 years for business and legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">8. International Data Transfers</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                Your information may be transferred to and processed in countries other than Nigeria. 
                We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">9. Children's Privacy</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                Our services are not intended for children under 18. We do not knowingly collect personal information from children. 
                If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">10. Changes to This Policy</h2>
              <p className="text-brand-burgundy/80 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes by 
                posting the new policy on this page and updating the "Last updated" date. 
                Your continued use of our services constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-burgundy mb-4">11. Contact Us</h2>
              <div className="text-brand-burgundy/80 leading-relaxed">
                <p>If you have questions about this privacy policy or your personal information, contact us:</p>
                <div className="mt-3 p-4 bg-brand-cream/30 rounded-lg">
                  <p><strong>Email:</strong> info@oneeddy.com</p>
                  <p><strong>Response Time:</strong> Within 24 hours</p>
                  <p><strong>Based in:</strong> Lagos, Nigeria</p>
                  <p><strong>Privacy Inquiries:</strong> All privacy matters handled at info@oneeddy.com</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPage; 