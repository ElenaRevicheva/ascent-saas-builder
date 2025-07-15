import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import React from "react";

const TermsOfService = () => (
  <div className="min-h-screen flex flex-col items-center justify-start pt-16 pb-24 bg-gradient-to-br from-pink-50 via-blue-50 to-yellow-50 dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
    <div className="w-full max-w-3xl bg-white/90 dark:bg-card shadow-2xl rounded-3xl p-8 md:p-12 border-2 border-pink-200 dark:border-blue-900 relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-pink-200 via-yellow-200 to-blue-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-tr from-blue-200 via-pink-200 to-yellow-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-center text-primary mb-2 tracking-tight drop-shadow-lg">Terms of Service</h1>
      <p className="text-center text-muted-foreground mb-8 text-sm font-medium">Last updated: July 15, 2025</p>
      <div className="prose prose-base md:prose-lg max-w-none text-foreground">
        <h2 className="terms-section-title">1. Acceptance of Terms</h2>
        <p>By accessing or using EspaLuz, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use the service.</p>
        <h2 className="terms-section-title">2. Description of Service</h2>
        <p>EspaLuz is an AI-powered language learning platform that provides personalized Spanish education for families via web, messaging apps, and other supported channels.</p>
        <h2 className="terms-section-title">3. User Accounts</h2>
        <ul>
          <li>You must provide accurate and complete information when creating an account</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>You must be at least 13 years old, or have parental consent if under 13</li>
          <li>Parents or guardians are responsible for their children's use of the service and must supervise accounts for minors</li>
        </ul>
        <h2 className="terms-section-title">4. Subscription and Payment</h2>
        <ul>
          <li>Free trials and paid subscription plans are available</li>
          <li>Subscription fees are billed in advance and are generally non-refundable unless required by law or specified in our refund policy</li>
          <li>You may cancel your subscription anytime through your account settings</li>
          <li>We will notify you of any price changes at least 30 days in advance</li>
          <li>Unpaid or failed payments may result in suspension or termination of your access</li>
        </ul>
        <h2 className="terms-section-title">5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for illegal, harmful, or unauthorized purposes</li>
          <li>Violate any laws or regulations</li>
          <li>Transmit malicious, abusive, or inappropriate content</li>
          <li>Attempt to access accounts or systems without authorization</li>
          <li>Share your login credentials with others</li>
          <li>Use the service to harass, impersonate, or harm anyone</li>
          <li>Use automated scripts, bots, or scrapers without permission</li>
        </ul>
        <h2 className="terms-section-title">6. Intellectual Property</h2>
        <p>All content, features, and functionality of EspaLuz are owned by us or our licensors and protected by intellectual property laws. You may not copy, distribute, modify, or create derivative works without express written permission.</p>
        <h2 className="terms-section-title">7. User Content</h2>
        <p>You retain ownership of any content you create, but grant us a non-exclusive, worldwide, royalty-free license to use, store, and process your content as necessary to provide the service. You are responsible for ensuring you have the right to upload and share such content.</p>
        <h2 className="terms-section-title">8. Privacy and Data Protection</h2>
        <p>We take your privacy seriously. Please review our Privacy Policy to learn how we collect, use, and protect your personal information. By using the service, you agree to those data practices.</p>
        <h2 className="terms-section-title">9. AI and Machine Learning</h2>
        <p>Our services use AI technologies. While we aim for accuracy, AI-generated content may include errors or limitations. Do not rely solely on AI content for critical decisions.</p>
        <h2 className="terms-section-title">10. Disclaimer of Warranties</h2>
        <p>The service is provided "as is" without warranties of any kind. We make no guarantees about reliability, availability, accuracy, or suitability for your needs. Use the service at your own risk.</p>
        <h2 className="terms-section-title">11. Limitation of Liability</h2>
        <p>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, even if we were advised of the possibility of such damages.</p>
        <h2 className="terms-section-title">12. Indemnification</h2>
        <p>You agree to indemnify and hold us harmless from any claims or liabilities arising from your use of the service, your violation of these terms, or your infringement of third-party rights.</p>
        <h2 className="terms-section-title">13. Termination</h2>
        <p>We may suspend or terminate your access to the service at any time, with or without notice, if we believe you've violated these terms. Upon termination, your access and data may be removed.</p>
        <h2 className="terms-section-title">14. Dispute Resolution</h2>
        <p>In the event of a dispute, we encourage you to contact us first to resolve it informally. If a resolution is not possible, disputes will be handled through individual, neutral arbitration rather than court proceedings or class actions.</p>
        <h2 className="terms-section-title">15. Changes to Terms</h2>
        <p>We may update these terms from time to time. Material changes will be announced at least 30 days in advance. Continued use of the service after changes go into effect constitutes your acceptance.</p>
        <h2 className="terms-section-title">16. Severability</h2>
        <p>If any provision of these terms is found invalid or unenforceable, the remaining provisions will remain in full force and effect.</p>
        <h2 className="terms-section-title">17. Entire Agreement</h2>
        <p>These terms and our Privacy Policy constitute the full agreement between you and EspaLuz regarding use of the service, superseding any prior agreements.</p>
        <h2 className="terms-section-title">18. Contact Us</h2>
        <p>If you have questions or concerns about these Terms of Service, please contact us at:</p>
        <p><strong>Email:</strong> aipa@aideazz.xyz</p>
      </div>
    </div>
  </div>
);

export default TermsOfService;