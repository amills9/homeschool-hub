import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Calendar, Star, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 50%, #FFE8D6 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, background: 'var(--primary)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(45,106,79,0.3)',
          }}>
            <BookOpen size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Homeschool Hub</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Sign Up</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div className="animate-fade">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 99,
            background: 'var(--primary-pale)', border: '1px solid var(--primary-light)',
            fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 24,
          }}>
            <Star size={13} /> Your family's learning hub
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.1, marginBottom: 20,
            color: 'var(--text)',
          }}>
            Homeschooling made<br />
            <span style={{ color: 'var(--primary)' }}>beautifully simple</span>
          </h1>

          <p style={{
            fontSize: 18, color: 'var(--text-2)', maxWidth: 520,
            margin: '0 auto 40px', lineHeight: 1.6,
          }}>
            Plan weekly tasks, track learning outcomes, manage resources and watch your children thrive — all in one place.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/signup')}
              style={{ gap: 8, fontSize: 16, padding: '14px 28px' }}
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => navigate('/login')}
              style={{ fontSize: 16, padding: '14px 28px' }}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, maxWidth: 800, width: '100%', marginTop: 64,
        }}>
          {[
            { icon: Calendar, title: 'Weekly Planner', desc: 'Organise each child\'s week with subjects, tasks and duration tracking.' },
            { icon: Star, title: 'Learning Outcomes', desc: 'Set goals and celebrate achievements as children reach each milestone.' },
            { icon: Users, title: 'Multi-Family', desc: 'Each family manages their own children independently under one platform.' },
            { icon: BookOpen, title: 'Resources', desc: 'Link books, websites and PDFs to subjects and tasks for easy access.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card animate-fade" style={{ textAlign: 'left', padding: '20px 22px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--primary-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Icon size={20} color="var(--primary)" />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: 'var(--text-3)' }}>
          New accounts are reviewed and approved by the admin before access is granted.
        </p>
      </div>
    </div>
  );
}
