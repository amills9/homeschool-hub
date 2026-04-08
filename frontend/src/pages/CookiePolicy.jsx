import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="1 April 2026">

      <p style={p}>This Cookie Policy explains how Homeschool Hub uses cookies and similar technologies when you use our service.</p>

      <h2 style={h2}>1. What Are Cookies?</h2>
      <p style={p}>Cookies are small text files stored on your device by your browser when you visit a website. They help websites remember information about your visit, such as your login status.</p>

      <h2 style={h2}>2. How We Use Cookies</h2>
      <p style={p}>Homeschool Hub uses only <strong>essential cookies</strong> that are strictly necessary for the service to function. We do not use advertising cookies, tracking cookies, or third-party analytics cookies.</p>

      <h2 style={h2}>3. Cookies We Set</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Purpose</th>
            <th style={th}>Duration</th>
            <th style={th}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}><code>token</code></td>
            <td style={td}>Stores your authentication JWT so you remain logged in between sessions</td>
            <td style={td}>7 days</td>
            <td style={td}>Essential</td>
          </tr>
          <tr>
            <td style={td}><code>user</code></td>
            <td style={td}>Stores basic user information (username, role) in localStorage for the UI</td>
            <td style={td}>Session</td>
            <td style={td}>Essential</td>
          </tr>
          <tr>
            <td style={td}><code>preferences</code></td>
            <td style={td}>Stores your display preferences (theme colour, font) in localStorage</td>
            <td style={td}>Persistent</td>
            <td style={td}>Functional</td>
          </tr>
          <tr>
            <td style={td}><code>dashboard_open_children</code></td>
            <td style={td}>Remembers which child cards were open on the Dashboard</td>
            <td style={td}>Persistent</td>
            <td style={td}>Functional</td>
          </tr>
        </tbody>
      </table>

      <p style={{ ...p, marginTop: 16 }}>Note: <code>token</code>, <code>user</code>, <code>preferences</code>, and <code>dashboard_open_children</code> are stored in your browser's <strong>localStorage</strong>, not as traditional cookies. They function similarly and are covered by this policy.</p>

      <h2 style={h2}>4. Third-Party Cookies</h2>
      <p style={p}>Homeschool Hub does not set third-party cookies. However, the following third-party services may set their own cookies when you interact with them:</p>
      <ul style={ul}>
        <li style={li}><strong>Cloudinary</strong> — when viewing or downloading photos and PDFs</li>
        <li style={li}><strong>Google Fonts</strong> — when loading the application fonts (Fraunces, DM Sans)</li>
      </ul>
      <p style={p}>These third parties have their own privacy and cookie policies which we encourage you to review.</p>

      <h2 style={h2}>5. Managing Cookies</h2>
      <p style={p}>Because Homeschool Hub only uses essential and functional cookies, refusing them will prevent the application from working correctly. You can clear stored data at any time by:</p>
      <ul style={ul}>
        <li style={li}>Logging out of your account (clears authentication tokens)</li>
        <li style={li}>Clearing your browser's localStorage and cookies via your browser settings</li>
      </ul>

      <h2 style={h2}>6. Changes to This Policy</h2>
      <p style={p}>We may update this policy if we change how we use cookies. We will notify users of significant changes.</p>

      <h2 style={h2}>7. Contact</h2>
      <p style={p}>For questions about our use of cookies, please contact Andrew Mills through the application.</p>

    </LegalLayout>
  );
}

const h2    = { fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 36, marginBottom: 12, color: 'var(--text)' };
const p     = { marginBottom: 14 };
const ul    = { paddingLeft: 24, marginBottom: 14 };
const li    = { marginBottom: 6 };
const table = { width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 14 };
const th    = { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontWeight: 600, color: 'var(--text)' };
const td    = { padding: '8px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--text-2)' };
