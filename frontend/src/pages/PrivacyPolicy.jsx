import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="1 April 2026">

      <h2 style={h2}>1. Introduction</h2>
      <p style={p}>Homeschool Hub ("we", "us", "our") is operated by Andrew Mills. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, store and share information about you when you use Homeschool Hub.</p>
      <p style={p}>We comply with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).</p>

      <h2 style={h2}>2. Information We Collect</h2>
      <p style={p}>We collect the following types of personal information:</p>
      <ul style={ul}>
        <li style={li}><strong>Account information:</strong> username, email address, password (stored as a secure hash)</li>
        <li style={li}><strong>Family information:</strong> children's names, year levels, and educational progress you choose to record</li>
        <li style={li}><strong>Learning content:</strong> tasks, resources, learning outcomes, and notes you create</li>
        <li style={li}><strong>Photos:</strong> images you upload to task cards, stored securely via Cloudinary</li>
        <li style={li}><strong>Usage data:</strong> application logs for error diagnosis (no third-party analytics)</li>
      </ul>
      <p style={p}>We do not collect payment information, precise location data, or any information about children other than what you voluntarily enter.</p>

      <h2 style={h2}>3. How We Use Your Information</h2>
      <p style={p}>We use your information solely to provide the Homeschool Hub service, including:</p>
      <ul style={ul}>
        <li style={li}>Authenticating your account and securing your data</li>
        <li style={li}>Storing and displaying your educational records</li>
        <li style={li}>Sending password reset emails when requested</li>
        <li style={li}>Notifying the administrator of new account requests</li>
      </ul>
      <p style={p}>We do not use your information for advertising, profiling, or sale to third parties.</p>

      <h2 style={h2}>4. Data Storage and Security</h2>
      <p style={p}>Your data is stored on servers hosted in Oracle Cloud Infrastructure (OCI). Photos and PDF files are stored via Cloudinary, a cloud media service. We use industry-standard security practices including:</p>
      <ul style={ul}>
        <li style={li}>Encrypted passwords (bcrypt hashing)</li>
        <li style={li}>JWT token-based authentication with expiry</li>
        <li style={li}>HTTPS encryption in transit (when a domain is configured)</li>
        <li style={li}>Per-user data isolation — users can only access their own family's data</li>
      </ul>

      <h2 style={h2}>5. Children's Privacy</h2>
      <p style={p}>Homeschool Hub is a tool for parents and educators to manage their own children's education. We do not knowingly collect information directly from children. All data about children is entered by the parent or guardian account holder.</p>

      <h2 style={h2}>6. Data Sharing</h2>
      <p style={p}>We do not sell, trade, or share your personal information with third parties except:</p>
      <ul style={ul}>
        <li style={li}><strong>Cloudinary</strong> — for photo and PDF file storage</li>
        <li style={li}><strong>Resend</strong> — for transactional email (password resets, signup notifications)</li>
        <li style={li}><strong>Legal requirements</strong> — if required by law or to protect our rights</li>
      </ul>

      <h2 style={h2}>7. Data Retention</h2>
      <p style={p}>We retain your data for as long as your account is active. You may request deletion of your account and all associated data by contacting us. Upon deletion, all personal information will be permanently removed within 30 days.</p>

      <h2 style={h2}>8. Your Rights</h2>
      <p style={p}>Under the Australian Privacy Act, you have the right to:</p>
      <ul style={ul}>
        <li style={li}>Access the personal information we hold about you</li>
        <li style={li}>Request correction of inaccurate information</li>
        <li style={li}>Request deletion of your account and data</li>
        <li style={li}>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
      </ul>

      <h2 style={h2}>9. Cookies</h2>
      <p style={p}>Homeschool Hub uses only essential cookies required for authentication. See our <a href="/cookies" style={a}>Cookie Policy</a> for full details.</p>

      <h2 style={h2}>10. Changes to This Policy</h2>
      <p style={p}>We may update this policy from time to time. We will notify registered users of significant changes via email.</p>

      <h2 style={h2}>11. Contact</h2>
      <p style={p}>For privacy-related enquiries, please contact Andrew Mills at the email address registered to your account, or through the admin contact within the application.</p>

    </LegalLayout>
  );
}

const h2 = { fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 36, marginBottom: 12, color: 'var(--text)' };
const p  = { marginBottom: 14 };
const ul = { paddingLeft: 24, marginBottom: 14 };
const li = { marginBottom: 6 };
const a  = { color: 'var(--primary)' };
