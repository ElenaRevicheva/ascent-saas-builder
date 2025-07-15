import React from "react";

const PrivacyPolicy = () => (
  <div className="min-h-screen flex flex-col items-center justify-start pt-16 pb-24 bg-gradient-to-br from-pink-50 via-blue-50 to-yellow-50 dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
    <div className="w-full max-w-3xl bg-white/90 dark:bg-card shadow-2xl rounded-3xl p-8 md:p-12 border-2 border-pink-200 dark:border-blue-900 relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-pink-200 via-yellow-200 to-blue-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-tr from-blue-200 via-pink-200 to-yellow-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-center text-primary mb-2 tracking-tight drop-shadow-lg">Privacy Policy</h1>
      <p className="text-center text-muted-foreground mb-8 text-sm font-medium">Last updated: July 15, 2025</p>
      <div className="prose prose-base md:prose-lg max-w-none text-foreground">
        <h2 className="terms-section-title">1. Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.</p>
        <strong>Personal Information:</strong>
        <ul>
          <li>Account information (email, name, password)</li>
          <li>Learning progress and preferences</li>
          <li>Communication data from chat interactions</li>
          <li>Usage analytics and performance data</li>
          <li>Payment information (processed by third-party payment processors)</li>
        </ul>
        <strong>Automatically Collected Information:</strong>
        <ul>
          <li>Device information (device type, operating system, browser type)</li>
          <li>IP address and general location data</li>
          <li>Usage patterns and feature interactions</li>
          <li>Performance metrics and error logs</li>
        </ul>
        <h2 className="terms-section-title">2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our Spanish learning services</li>
          <li>Personalize your learning experience using AI algorithms</li>
          <li>Communicate with you about your account and our services</li>
          <li>Analyze usage patterns to enhance our platform</li>
          <li>Process payments and manage subscriptions</li>
          <li>Ensure platform security and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>
        <h2 className="terms-section-title">3. Information Sharing and Disclosure</h2>
        <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
        <ul>
          <li><strong>With your explicit consent</strong></li>
          <li><strong>Service providers:</strong> Trusted third-party vendors who assist in operating our platform (cloud hosting, payment processing, analytics)</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or to protect our rights and safety</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          <li><strong>AI training:</strong> Anonymized and aggregated data may be used to improve our AI models</li>
        </ul>
        <h2 className="terms-section-title">4. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:</p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Regular security audits and monitoring</li>
          <li>Access controls and authentication measures</li>
          <li>Secure data storage with reputable cloud providers</li>
        </ul>
        <p>However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
        <h2 className="terms-section-title">5. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access and update</strong> your personal information through your account settings</li>
          <li><strong>Delete your account</strong> and associated data</li>
          <li><strong>Opt out</strong> of marketing communications</li>
          <li><strong>Request data portability</strong> in a machine-readable format</li>
          <li><strong>Object to processing</strong> of your data for certain purposes</li>
          <li><strong>Withdraw consent</strong> where processing is based on consent</li>
        </ul>
        <p>To exercise these rights, please contact us using the information provided below.</p>
        <h2 className="terms-section-title">6. Cookies and Tracking Technologies</h2>
        <p>We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. Types of cookies we use include:</p>
        <ul>
          <li><strong>Essential cookies:</strong> Required for basic functionality</li>
          <li><strong>Performance cookies:</strong> Help us understand how you use our service</li>
          <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
          <li><strong>Marketing cookies:</strong> Deliver relevant advertisements (if applicable)</li>
        </ul>
        <p>You can control cookie settings through your browser preferences, though disabling certain cookies may affect service functionality.</p>
        <h2 className="terms-section-title">7. Children's Privacy</h2>
        <p>Our service is designed for family use, including children under 13. We take special care to protect children's privacy and comply with the Children's Online Privacy Protection Act (COPPA) and other applicable laws:</p>
        <ul>
          <li>We obtain parental consent before collecting personal information from children under 13</li>
          <li>Parents can review, modify, or delete their child's information</li>
          <li>We collect only information necessary to provide our educational services</li>
          <li>We do not share children's personal information with third parties except as outlined in this policy</li>
        </ul>
        <h2 className="terms-section-title">8. Data Retention</h2>
        <p>We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Specifically:</p>
        <ul>
          <li>Account information is kept while your account is active</li>
          <li>Learning progress data is retained to maintain continuity of your educational experience</li>
          <li>Communication data may be kept for customer service purposes</li>
          <li>We may retain some information for legitimate business purposes or legal compliance even after account deletion</li>
        </ul>
        <h2 className="terms-section-title">9. International Data Transfers</h2>
        <p>Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through appropriate safeguards such as standard contractual clauses or other approved mechanisms.</p>
        <h2 className="terms-section-title">10. Third-Party Links and Services</h2>
        <p>Our service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those external services, and we encourage you to review their privacy policies.</p>
        <h2 className="terms-section-title">11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
        <ul>
          <li>Posting the updated policy on our website</li>
          <li>Updating the "Last updated" date</li>
          <li>Sending you an email notification (for significant changes)</li>
          <li>Providing in-app notifications</li>
        </ul>
        <p>Your continued use of our service after changes become effective constitutes acceptance of the updated policy.</p>
        <h2 className="terms-section-title">12. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, want to exercise your rights, or have privacy-related concerns, please contact us at:</p>
        <p><strong>Email:</strong> aipa@aideazz.xyz<br/><strong>Subject line:</strong> Privacy Policy Inquiry</p>
        <p>We will respond to your inquiry within a reasonable timeframe as required by applicable law.</p>
        <hr />
        <p className="text-xs text-muted-foreground mt-8">*This Privacy Policy is effective as of the last updated date above.*</p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;