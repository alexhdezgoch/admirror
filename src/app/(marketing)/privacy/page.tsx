import { Metadata } from 'next';
import { MarketingNav, Footer } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Privacy Policy - AdMirror',
  description: 'Privacy Policy for AdMirror - AI-powered competitive intelligence for Meta Ads',
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: February 9, 2026</p>

          <div className="space-y-6">
            {/* Introduction */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-slate-600">
                AdMirror (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the AdMirror platform
                at https://admirror.vercel.app. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our service.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
              <div className="space-y-4 text-slate-600">
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Account Information</h3>
                  <p>When you create an account, we collect your email address and authentication credentials.</p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Meta/Facebook Data</h3>
                  <p>
                    When you connect your Meta (Facebook) account, we access publicly available ad data
                    from the Meta Ad Library API. This includes ad creative content, advertiser names,
                    and ad performance metrics that are publicly available.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Usage Data</h3>
                  <p>
                    We automatically collect information about how you interact with our service,
                    including pages visited, features used, and time spent on the platform.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>Provide, operate, and maintain our competitive intelligence service</li>
                <li>Analyze advertising trends and patterns using AI technology</li>
                <li>Improve and personalize your experience</li>
                <li>Communicate with you about updates, features, and support</li>
                <li>Process transactions and manage your subscription</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Meta/Facebook Data Usage */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Meta/Facebook Data Usage</h2>
              <div className="space-y-4 text-slate-600">
                <p>
                  AdMirror integrates with Meta&apos;s platforms to provide competitive intelligence features.
                  Our use of Meta data is governed by Meta&apos;s Platform Terms and Developer Policies.
                </p>
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">What We Access</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Public ad library data available through the Meta Ad Library API</li>
                    <li>Ad creative content, formats, and targeting information</li>
                    <li>Advertiser page information</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">How We Use Meta Data</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Display competitor ads for analysis</li>
                    <li>Generate AI-powered insights on advertising patterns</li>
                    <li>Build swipe files and creative inspiration galleries</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Data Retention</h3>
                  <p>
                    Meta ad data is cached temporarily to improve performance. We do not permanently
                    store Meta platform data beyond what is necessary for service operation.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Sharing */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Sharing</h2>
              <div className="space-y-4 text-slate-600">
                <p>We do not sell your personal information. We may share data with:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <span className="font-medium text-slate-800">Service Providers:</span> Third-party
                    vendors who help us operate our service (hosting, analytics, payment processing)
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">Legal Requirements:</span> When required
                    by law or to protect our rights and safety
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">Business Transfers:</span> In connection
                    with a merger, acquisition, or sale of assets
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Security */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
              <p className="text-slate-600">
                We implement appropriate technical and organizational security measures to protect
                your information, including encryption in transit and at rest, secure authentication,
                and regular security assessments. However, no method of transmission over the Internet
                is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Your Rights</h2>
              <div className="space-y-4 text-slate-600">
                <p>Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p>
                  To exercise these rights, please contact us using the information below.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Contact Information</h2>
              <p className="text-slate-600">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-slate-600 mt-2">
                Email: privacy@admirror.app
              </p>
            </section>

            {/* Updates to Policy */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Updates to This Policy</h2>
              <p className="text-slate-600">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
                Your continued use of the service after any changes constitutes acceptance of the new
                Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
