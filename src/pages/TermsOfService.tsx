import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using EspaLuz, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p>EspaLuz is an AI-powered Spanish learning platform that provides personalized language education for families through various communication channels including web and Telegram.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must be at least 13 years old to create an account</li>
                <li>Parents/guardians are responsible for their children's use of the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Subscription and Payment</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>We offer free trial periods and paid subscription plans</li>
                <li>Subscription fees are charged in advance and are non-refundable except as required by law</li>
                <li>You may cancel your subscription at any time</li>
                <li>Price changes will be communicated with 30 days advance notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction</li>
                <li>Transmit any harmful or malicious content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Share your account credentials with others</li>
                <li>Use the service to harass or harm others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
              <p>All content, features, and functionality of EspaLuz are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. User Content</h2>
              <p>You retain ownership of content you create, but grant us a license to use, store, and process your content to provide our services. You are responsible for ensuring you have the right to share any content you upload.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Privacy</h2>
              <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
              <p>Our service is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or meet your specific requirements.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
              <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of our service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Termination</h2>
              <p>We may terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service will cease immediately.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Changes to Terms</h2>
              <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified terms.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Information</h2>
              <p>If you have any questions about these Terms of Service, please contact us at:</p>
              <p>Email: legal@espaluz.com</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;