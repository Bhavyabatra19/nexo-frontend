"use client";

import React, { useState, useEffect } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

export default function PrivacyPolicy() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white text-[#1a1a1a] font-['Inter',_sans-serif]">
            <style jsx global>{`
        .glass-nav {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .btn-primary {
          background-color: #0047AB;
          color: white;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background-color: #003682;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 71, 171, 0.2);
        }
        .policy-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          margin-top: 1rem;
        }
        .policy-table th {
          background: #f3f4f6;
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #e5e7eb;
        }
        .policy-table td {
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .policy-table tr:nth-child(even) td {
          background: #fafafa;
        }
      `}</style>

            <Navbar scrolled={scrolled} />

            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-[#1a1a1a]">Privacy Policy</h1>
                    <p className="text-muted-foreground">Last updated: March 17, 2026</p>

                    <p>
                        This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure
                        of Your information when You use the Service and tells You about Your privacy rights and how the
                        law protects You.
                    </p>
                    <p>
                        We use Your Personal data <strong>strictly</strong> to provide and improve the Service. By using
                        the Service, You agree to the collection and use of information in accordance with this Privacy
                        Policy.
                    </p>

                    {/* 1. Interpretation and Definitions */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">1. Interpretation and Definitions</h2>

                        <h3 className="text-xl font-medium mt-4">Interpretation</h3>
                        <p>
                            The words of which the initial letter is capitalized have meanings defined under the
                            following conditions. The following definitions shall have the same meaning regardless of
                            whether they appear in singular or in plural.
                        </p>

                        <h3 className="text-xl font-medium mt-4">Definitions</h3>
                        <p>For the purposes of this Privacy Policy:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Account</strong> means a unique account created for You to access our Service.
                            </li>
                            <li>
                                <strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in
                                this Agreement) refers to <strong>NORTHSTAR LABS (NEXO)</strong>, Kushal Vatika, Ahinsa
                                Marg, Jugsalai, Jamshedpur 831006, Jharkhand, India.
                            </li>
                            <li>
                                <strong>Personal Data</strong> is any information that relates to an identified or
                                identifiable individual.
                            </li>
                            <li>
                                <strong>Service</strong> refers to the Website (<strong>getnexo.in</strong>) and the
                                NEXO Application.
                            </li>
                            <li>
                                <strong>Sub-processor</strong> means any third-party data processor engaged by the
                                Company to process Personal Data on its behalf.
                            </li>
                            <li>
                                <strong>Third-party Social Media Service</strong> refers to any website or social
                                network through which a User can log in or create an account to use the Service
                                (specifically Google).
                            </li>
                        </ul>
                    </section>

                    {/* 2. Collecting and Using Your Personal Data */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">2. Collecting and Using Your Personal Data</h2>

                        <h3 className="text-xl font-medium mt-4">Types of Data Collected</h3>

                        <h4 className="text-lg font-medium mt-2">Personal Data</h4>
                        <p>
                            While using Our Service, We may ask You to provide Us with certain personally identifiable
                            information that can be used to contact or identify You. Personally identifiable information
                            is limited to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Full Name</li>
                            <li>Email Address</li>
                            <li>Mobile Number</li>
                            <li>Usage Data (timestamps of signup and interaction logs)</li>
                        </ul>

                        <h4 className="text-lg font-medium mt-4">
                            Information from Third-Party Services (Google Integration)
                        </h4>
                        <p>
                            NEXO allows You to create an account and log in through Google. If You grant us access to
                            Your Google Account, We collect information <strong>solely</strong> to automate and provide
                            Your core CRM experience. We request the following specific scopes:
                        </p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li>
                                <strong>Google Contacts</strong>{" "}
                                (<code>https://www.googleapis.com/auth/contacts.readonly</code>): Names, email
                                addresses, phone numbers, and job titles of Your connections. This data is used
                                exclusively to populate your NEXO contact list so you can manage your professional
                                network without manual data entry. No data is written back to your Google Contacts.
                            </li>
                            <li>
                                <strong>Google Calendar</strong>{" "}
                                (<code>https://www.googleapis.com/auth/calendar.readonly</code>): Metadata of calendar
                                events — specifically event titles, attendee email addresses, and event timestamps. This
                                data is used exclusively to build the <strong>Interaction History</strong> timeline
                                displayed on each contact&apos;s profile page inside NEXO. The timeline shows You when You
                                last met or have an upcoming scheduled meeting with a specific person, enabling You to
                                maintain relationships proactively. No event descriptions, attachments, meeting links,
                                or private notes are read or stored. No calendar data is written, modified, or deleted.
                            </li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <strong>Important:</strong> Google data accessed via these scopes is stored only within Your
                            secured NEXO account. It is never shared with other users, never used to train AI or machine
                            learning models, and never processed by advertising networks or data brokers. See Section 3
                            for full Limited Use disclosures.
                        </p>

                        <h4 className="text-lg font-medium mt-4">LinkedIn Contact Import</h4>
                        <p>
                            You may optionally import contacts into NEXO by uploading a LinkedIn connections export
                            (CSV file) that You obtain directly from LinkedIn. NEXO does not connect to LinkedIn&apos;s API
                            and does not store Your LinkedIn credentials. The uploaded CSV file is processed in memory
                            to extract contact information (name, email address, company, job title, and LinkedIn
                            profile URL) and is discarded immediately after processing. Extracted records are stored
                            within Your NEXO account only and are subject to the same protections as all other contact
                            data.
                        </p>

                        <h4 className="text-lg font-medium mt-4">WhatsApp Notification Integration</h4>
                        <p>
                            NEXO offers an optional WhatsApp notification channel for reminders and task alerts. If You
                            enable this feature in Settings, You provide Your WhatsApp-registered mobile number. We use
                            this number solely to deliver outbound notifications from NEXO via the{" "}
                            <strong>Meta WhatsApp Business Cloud API</strong>. We do not read, store, or process any of
                            Your WhatsApp messages, conversations, or contact lists. You may disable WhatsApp
                            notifications at any time from the Settings page.
                        </p>

                        <h4 className="text-lg font-medium mt-4">User-Generated Content</h4>
                        <p>
                            We collect data that You manually input to provide Relationship Intelligence:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Personal notes about Your contacts.</li>
                            <li>Relationship tags (e.g., &quot;Founder,&quot; &quot;VC,&quot; &quot;Strategic Lead&quot;).</li>
                            <li>
                                Important dates (birthdays and anniversaries) to trigger milestone reminders within the
                                app.
                            </li>
                            <li>Reminders and tasks linked to specific contacts, including scheduled due times.</li>
                        </ul>
                    </section>

                    {/* 3. Google API Services Disclosure & Limited Use */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">3. Google API Services Disclosure &amp; Limited Use</h2>
                        <p>
                            NEXO&apos;s use and transfer to any other app of information received from Google APIs will
                            adhere to the{" "}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                Google API Services User Data Policy
                            </a>
                            , including the Limited Use requirements. Specifically:
                        </p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li>
                                <strong>No Advertising:</strong> We do not use Your Google user data for serving
                                advertisements, including retargeting, personalized, or interest-based advertising.
                            </li>
                            <li>
                                <strong>No Data Brokers:</strong> We do not sell or transfer Your Google user data to
                                data brokers, information resellers, or any other third parties.
                            </li>
                            <li>
                                <strong>Strictly For Functionality:</strong> We only use Google data to provide the
                                user-facing features directly visible in the NEXO interface — specifically{" "}
                                <strong>Contact Management</strong>, <strong>Interaction History</strong> (calendar
                                events timeline on contact profiles), and <strong>Network Search</strong>.
                            </li>
                            <li>
                                <strong>No AI / ML Training:</strong> We do not use Your Google user data to develop,
                                improve, or train generalized artificial intelligence or machine learning models. Google
                                data is used only to deliver personalized in-app functionality scoped exclusively to
                                Your individual account.
                            </li>
                            <li>
                                <strong>No Cross-User Aggregation:</strong> Your Google data is never combined with,
                                compared against, or visible to any other NEXO user&apos;s data.
                            </li>
                            <li>
                                <strong>Human Access:</strong> We do not allow humans to read Your Google user data
                                unless (a) we have Your affirmative agreement for specific messages, (b) it is necessary
                                for security purposes such as investigating abuse, or (c) to comply with applicable law.
                                In all permitted cases, access is logged and limited to the minimum necessary data.
                            </li>
                            <li>
                                <strong>OAuth Token Security:</strong> OAuth 2.0 refresh tokens issued by Google are
                                stored in encrypted form (AES-256) on Our servers and are accessible only to the
                                authenticated account holder&apos;s server-side session. Tokens are never exposed in
                                client-side code, browser storage, or application logs.
                            </li>
                        </ul>
                    </section>

                    {/* 4. AI-Powered Features & Data Processing */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">4. AI-Powered Features &amp; Data Processing</h2>
                        <p>
                            NEXO uses artificial intelligence to provide the following features. In all cases, AI
                            processing is strictly scoped to Your individual account. Your data is never used to train
                            AI models and is never visible to other users.
                        </p>

                        <h4 className="text-lg font-medium mt-2">Nexo AI (Relationship Intelligence &amp; Network Search)</h4>
                        <p>
                            Your contact data — names, job titles, companies, and notes You have added — is used to
                            generate AI-powered relationship summaries and to answer natural-language queries about your
                            network (e.g., &quot;Who do I know at Sequoia?&quot;). To enable semantic search, NEXO generates
                            vector embeddings of your contact records using <strong>Google&apos;s Gemini Embedding model</strong>{" "}
                            and stores them in <strong>Pinecone</strong>, a vector database. Each embedding is tagged
                            with Your unique account identifier only. Embeddings are mathematical representations and
                            do not contain raw personally identifiable data. They are used solely to compute search
                            relevance within Your own account.
                        </p>

                        <h4 className="text-lg font-medium mt-2">Merge &amp; Fix (Contact Deduplication)</h4>
                        <p>
                            NEXO uses AI to identify and merge duplicate contact records within Your own account. The
                            system first applies deterministic rules — if two contacts share an identical email address,
                            phone number, or LinkedIn URL, they are flagged as definite duplicates without any AI
                            involvement. Only contacts where no exact identifier match exists are submitted for
                            AI-assisted fuzzy name and company matching. Contact data used in this AI comparison is
                            processed via <strong>Google&apos;s Gemini API</strong> under Our service agreement and is not
                            retained by the AI provider for model training purposes.
                        </p>

                        <h4 className="text-lg font-medium mt-2">Google Calendar Data in Interaction History</h4>
                        <p>
                            Calendar event metadata (event title, attendee email addresses, and date/time) retrieved
                            via the <code>calendar.readonly</code> scope is used exclusively to populate the{" "}
                            <strong>Interaction History</strong> panel on each contact&apos;s profile page within NEXO. This
                            panel displays when You last met a specific person and any upcoming scheduled meetings,
                            helping You maintain relationships without manually logging interactions. Calendar data is
                            not used for any purpose beyond constructing this user-facing timeline, and no calendar
                            data is ever written, modified, or deleted by NEXO.
                        </p>
                    </section>

                    {/* 5. Use of Your Personal Data */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">5. Use of Your Personal Data</h2>
                        <p>The Company uses Personal Data strictly for the following purposes:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>To provide and maintain our Service:</strong> Including to monitor the usage of
                                our Service and ensure its stability.
                            </li>
                            <li>
                                <strong>To manage Your Account:</strong> To manage Your registration as a user of the
                                Service.
                            </li>
                            <li>
                                <strong>To send Notifications:</strong> Reminder and task alerts are delivered via email
                                (AWS Simple Email Service) and/or WhatsApp (Meta WhatsApp Business Cloud API) based on
                                Your notification preferences configured in Settings. You may disable either channel at
                                any time.
                            </li>
                            <li>
                                <strong>To contact You:</strong> By email regarding critical system updates, security
                                alerts, or informative communications directly related to the functionalities of the
                                Service.
                            </li>
                        </ul>
                    </section>

                    {/* 6. Sub-processors & Third-Party Services */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">6. Sub-processors &amp; Third-Party Services</h2>
                        <p>
                            To deliver the Service, We engage the following sub-processors who may process Your
                            Personal Data on Our behalf. All sub-processors are bound by data processing agreements
                            consistent with this Policy.
                        </p>
                        <div className="overflow-x-auto mt-2">
                            <table className="policy-table">
                                <thead>
                                    <tr>
                                        <th>Sub-processor</th>
                                        <th>Purpose</th>
                                        <th>Data Involved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Google LLC</strong></td>
                                        <td>Authentication (OAuth 2.0), read-only Contacts sync, read-only Calendar sync, AI embedding generation (Gemini API)</td>
                                        <td>Name, email, phone, calendar event metadata (title, attendees, timestamps), contact text for embeddings</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Pinecone Inc.</strong></td>
                                        <td>Vector database for AI-powered semantic contact search within Your account</td>
                                        <td>Anonymized semantic embeddings of contact records (no raw PII stored)</td>
                                    </tr>
                                    <tr>
                                        <td><strong>SendGrid</strong></td>
                                        <td>Transactional email delivery (reminders, task alerts, system notifications)</td>
                                        <td>Your email address, notification subject and body</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Meta Platforms (WhatsApp Business Cloud API)</strong></td>
                                        <td>Outbound WhatsApp notification delivery (optional, user-enabled feature)</td>
                                        <td>Your WhatsApp mobile number, notification content</td>
                                    </tr>
                                    <tr>
                                        <td><strong>PostgreSQL</strong></td>
                                        <td>Relational database hosting for all account, contact, and activity data</td>
                                        <td>All account and contact data</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 7. Retention of Your Personal Data */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">7. Retention of Your Personal Data</h2>
                        <p>
                            The Company will retain Your Personal Data only for as long as is necessary for the purposes
                            set out in this Privacy Policy.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Synced Google Data:</strong> If You disconnect Your Google Account from our
                                Service, all synced contacts and calendar data are automatically purged from our active
                                databases within <strong>30 days</strong>.
                            </li>
                            <li>
                                <strong>AI Embeddings (Pinecone):</strong> Vector embeddings generated from Your contact
                                data are permanently deleted from Pinecone within <strong>30 days</strong> of account
                                disconnection or account deletion.
                            </li>
                            <li>
                                <strong>Account Data:</strong> We will retain Your name and email for as long as Your
                                account is active.
                            </li>
                            <li>
                                <strong>Account Deletion:</strong> Upon self-service deletion (via Settings) or a
                                written request, all Personal Data — including contacts, notes, reminders, AI vector
                                embeddings, OAuth tokens, and account records — is permanently and irrecoverably deleted
                                within <strong>30 days</strong>.
                            </li>
                        </ul>
                    </section>

                    {/* 8. Security of Your Personal Data */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">8. Security of Your Personal Data</h2>
                        <p>
                            The security of Your Personal Data is important to Us. We employ the following measures:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>AES-256 encryption</strong> for all data at rest.</li>
                            <li><strong>TLS 1.2+</strong> for all data in transit.</li>
                            <li>
                                <strong>Encrypted OAuth token storage</strong> — Google refresh tokens are stored
                                encrypted and are never exposed in client-side code, browser storage, or application
                                logs.
                            </li>
                            <li>
                                <strong>Role-based access controls</strong> to limit internal access to Personal Data.
                            </li>
                        </ul>
                        <p>
                            No method of transmission over the Internet or method of electronic storage is 100% secure.
                            We cannot guarantee absolute security but are committed to using industry-standard
                            protections.
                        </p>
                    </section>

                    {/* 9. Your Rights (India DPDP Act / IT Act) */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">9. Your Rights (India DPDP Act / IT Act)</h2>
                        <p>
                            In accordance with the Information Technology Act, 2000 and the Digital Personal Data
                            Protection Act (DPDP) 2023, you have the right to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Access / Review:</strong> Request a copy of the Personal Data we hold about You.
                            </li>
                            <li>
                                <strong>Correction:</strong> Request correction of inaccurate or incomplete data.
                            </li>
                            <li>
                                <strong>Erasure (Right to be Forgotten):</strong> Request permanent deletion of Your
                                Personal Data, including AI vector embeddings stored in Pinecone. You may also delete
                                Your account directly from within the app via{" "}
                                <em>Settings &rarr; Delete My Account</em>.
                            </li>
                            <li>
                                <strong>Revoke Google Access:</strong> You may revoke NEXO&apos;s access to Your Google
                                Account at any time via{" "}
                                <a
                                    href="https://myaccount.google.com/permissions"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    Google Account Permissions
                                </a>
                                . Upon revocation, synced data is purged within 30 days per Section 7.
                            </li>
                            <li>
                                <strong>Disable Notifications:</strong> You may disable email and/or WhatsApp
                                notifications at any time from <em>Settings</em> within the app.
                            </li>
                        </ul>
                        <p className="mt-3">
                            To exercise any of these rights, or to request complete deletion of your account and all
                            associated data, please contact us at{" "}
                            <a href="mailto:naman@getnexo.in" className="text-blue-600 underline">
                                naman@getnexo.in
                            </a>
                            . We will process all data deletion requests within <strong>30 days</strong>.
                        </p>
                    </section>

                    {/* 10. Children's Privacy */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">10. Children&apos;s Privacy</h2>
                        <p>
                            Our Service does not address anyone under the age of 18. We do not knowingly collect
                            personally identifiable information from anyone under 18. If You are a parent or guardian
                            and are aware that your child has provided Us with Personal Data, please contact us at{" "}
                            <a href="mailto:naman@getnexo.in" className="text-blue-600 underline">
                                naman@getnexo.in
                            </a>{" "}
                            and we will take steps to remove that information promptly.
                        </p>
                    </section>

                    {/* 11. Changes to this Privacy Policy */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">11. Changes to this Privacy Policy</h2>
                        <p>
                            We may update Our Privacy Policy from time to time. We will notify You of any changes by
                            updating the &quot;Last updated&quot; date at the top of this page and, where changes are material,
                            by sending a notification to the email address associated with Your account. Changes are
                            effective when posted.
                        </p>
                    </section>

                    {/* 12. Contact Us */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold mt-8">12. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, You can contact us:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>By email:</strong>{" "}
                                <a href="mailto:naman@getnexo.in" className="text-blue-600 underline">
                                    naman@getnexo.in
                                </a>
                            </li>
                            <li>
                                <strong>By post:</strong> NORTHSTAR LABS (NEXO), Kushal Vatika, Ahinsa Marg, Jugsalai,
                                Jamshedpur 831006, Jharkhand, India
                            </li>
                        </ul>
                    </section>

                </div>
            </main>
            <Footer />
        </div>
    );
}
