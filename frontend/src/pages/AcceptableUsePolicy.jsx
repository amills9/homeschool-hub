import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export default function AcceptableUsePolicy() {
  return (
    <LegalLayout title="Acceptable Use Policy" lastUpdated="1 April 2026">

      <p style={p}>This Acceptable Use Policy sets out the rules for using Homeschool Hub. By using the service, you agree to comply with this policy.</p>

      <h2 style={h2}>1. Purpose of the Service</h2>
      <p style={p}>Homeschool Hub is designed exclusively for use by parents, guardians, and educators to manage the home education of children in their care. The service must only be used for this intended purpose.</p>

      <h2 style={h2}>2. Prohibited Content</h2>
      <p style={p}>You must not upload, store, or share any content that:</p>
      <ul style={ul}>
        <li style={li}>Is illegal under Australian federal or state law</li>
        <li style={li}>Is sexually explicit, obscene, or pornographic</li>
        <li style={li}>Depicts or promotes harm to children</li>
        <li style={li}>Contains hate speech or discriminates against any person or group</li>
        <li style={li}>Infringes any third party's intellectual property rights</li>
        <li style={li}>Contains malware, viruses, or other malicious code</li>
        <li style={li}>Is defamatory, harassing, or threatening toward any person</li>
      </ul>

      <h2 style={h2}>3. Account Security</h2>
      <p style={p}>You must:</p>
      <ul style={ul}>
        <li style={li}>Keep your password secure and not share it with others</li>
        <li style={li}>Use a strong, unique password for your account</li>
        <li style={li}>Log out of shared or public devices after use</li>
        <li style={li}>Notify the administrator immediately if you suspect unauthorised access to your account</li>
      </ul>

      <h2 style={h2}>4. Prohibited Technical Use</h2>
      <p style={p}>You must not:</p>
      <ul style={ul}>
        <li style={li}>Attempt to access, modify, or delete any other user's data</li>
        <li style={li}>Try to reverse engineer, decompile, or tamper with the application</li>
        <li style={li}>Use automated tools, bots, or scripts to interact with the service</li>
        <li style={li}>Attempt to probe, scan, or test the security of the system</li>
        <li style={li}>Overload the system with excessive requests</li>
        <li style={li}>Attempt to bypass authentication or access controls</li>
      </ul>

      <h2 style={h2}>5. Data Accuracy</h2>
      <p style={p}>You are responsible for the accuracy of information you enter about your children and their education. Homeschool Hub data may be used to support compliance with homeschooling registration requirements — it is your responsibility to ensure records are accurate and complete.</p>

      <h2 style={h2}>6. Responsibility for Uploaded Files</h2>
      <p style={p}>When you upload photos or documents to Homeschool Hub:</p>
      <ul style={ul}>
        <li style={li}>You confirm you own the content or have the right to upload it</li>
        <li style={li}>You confirm the content does not violate any laws or third-party rights</li>
        <li style={li}>You understand photos are stored via Cloudinary and accept their terms of service</li>
      </ul>

      <h2 style={h2}>7. Consequences of Violation</h2>
      <p style={p}>Violation of this policy may result in:</p>
      <ul style={ul}>
        <li style={li}>Immediate suspension or termination of your account</li>
        <li style={li}>Removal of content that violates this policy</li>
        <li style={li}>Reporting to relevant authorities where required by law</li>
      </ul>

      <h2 style={h2}>8. Reporting Violations</h2>
      <p style={p}>If you become aware of any use of Homeschool Hub that violates this policy, please report it to the administrator through the application immediately.</p>

      <h2 style={h2}>9. Changes to This Policy</h2>
      <p style={p}>We may update this policy from time to time. Continued use of the service after changes constitutes acceptance of the updated policy.</p>

      <h2 style={h2}>10. Contact</h2>
      <p style={p}>For questions about acceptable use, please contact Andrew Mills through the application.</p>

    </LegalLayout>
  );
}

const h2 = { fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 36, marginBottom: 12, color: 'var(--text)' };
const p  = { marginBottom: 14 };
const ul = { paddingLeft: 24, marginBottom: 14 };
const li = { marginBottom: 6 };
