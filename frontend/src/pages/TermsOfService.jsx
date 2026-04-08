import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="1 April 2026">

      <p style={p}>Please read these Terms of Service carefully before using Homeschool Hub. By creating an account or using the service, you agree to be bound by these terms.</p>

      <h2 style={h2}>1. About the Service</h2>
      <p style={p}>Homeschool Hub is a private web application operated by Andrew Mills ("we", "us", "our") that provides tools for homeschooling families to plan, track, and report on their children's education. Access is by invitation and administrator approval only.</p>

      <h2 style={h2}>2. Account Registration</h2>
      <p style={p}>To use Homeschool Hub you must:</p>
      <ul style={ul}>
        <li style={li}>Provide accurate registration information including a valid email address</li>
        <li style={li}>Receive approval from the administrator before gaining access</li>
        <li style={li}>Be at least 18 years of age, or a parent/guardian acting on behalf of a family</li>
        <li style={li}>Keep your login credentials confidential and not share your account</li>
      </ul>
      <p style={p}>You are responsible for all activity that occurs under your account.</p>

      <h2 style={h2}>3. Acceptable Use</h2>
      <p style={p}>You agree to use Homeschool Hub only for its intended purpose of managing your family's home education. You must not use the service to:</p>
      <ul style={ul}>
        <li style={li}>Store or share unlawful, harmful, or inappropriate content</li>
        <li style={li}>Attempt to access other users' data or accounts</li>
        <li style={li}>Reverse engineer, modify, or attempt to circumvent the application's security</li>
        <li style={li}>Upload malicious files or content</li>
      </ul>
      <p style={p}>See our <a href="/acceptable-use" style={a}>Acceptable Use Policy</a> for full details.</p>

      <h2 style={h2}>4. Your Content</h2>
      <p style={p}>You retain ownership of all content you upload or create within Homeschool Hub, including educational records, photos, and documents. By uploading content, you grant us a limited licence to store and display that content solely for the purpose of providing the service to you.</p>
      <p style={p}>You are responsible for ensuring you have the right to upload any content, including photos and documents.</p>

      <h2 style={h2}>5. Service Availability</h2>
      <p style={p}>We aim to keep Homeschool Hub available at all times but do not guarantee uninterrupted access. The service may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control. We will endeavour to give advance notice of planned downtime.</p>

      <h2 style={h2}>6. Data and Backups</h2>
      <p style={p}>While we take reasonable steps to protect your data, you are encouraged to periodically export your records using the Yearly Report feature. We do not guarantee against data loss and recommend keeping your own backups of critical educational records.</p>

      <h2 style={h2}>7. Account Termination</h2>
      <p style={p}>We reserve the right to suspend or terminate accounts that violate these terms. You may request deletion of your account at any time. Upon termination, your data will be permanently deleted within 30 days.</p>

      <h2 style={h2}>8. Limitation of Liability</h2>
      <p style={p}>Homeschool Hub is provided "as is" without warranties of any kind. To the maximum extent permitted by Australian law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
      <p style={p}>Nothing in these terms excludes any rights you may have under the Australian Consumer Law.</p>

      <h2 style={h2}>9. Changes to Terms</h2>
      <p style={p}>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email.</p>

      <h2 style={h2}>10. Governing Law</h2>
      <p style={p}>These terms are governed by the laws of New South Wales, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of New South Wales.</p>

      <h2 style={h2}>11. Contact</h2>
      <p style={p}>For questions about these terms, please contact Andrew Mills through the application.</p>

    </LegalLayout>
  );
}

const h2 = { fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 36, marginBottom: 12, color: 'var(--text)' };
const p  = { marginBottom: 14 };
const ul = { paddingLeft: 24, marginBottom: 14 };
const li = { marginBottom: 6 };
const a  = { color: 'var(--primary)' };
