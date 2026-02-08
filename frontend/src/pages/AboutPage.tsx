import React from 'react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a12',
        color: '#fff',
        fontFamily: "'Press Start 2P', cursive",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10, 10, 18, 0.95)',
          borderBottom: '1px solid #1a1a2e',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Link to="/" className="nes-btn is-primary" style={{ fontSize: '0.5rem', padding: '8px 16px', position: 'absolute', left: '1.5rem' }}>
            ← Back
          </Link>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="Prompt Duel"
              style={{ height: '60px', width: 'auto' }}
            />
            <span style={{ fontSize: '1rem', color: '#92cc41' }}>Prompt Duel</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        {/* Large Logo Section */}
        <section style={{ textAlign: 'center', marginBottom: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Prompt Duel"
            style={{
              height: '250px',
              width: 'auto',
              marginBottom: '24px',
              display: 'block',
              filter: 'drop-shadow(0 0 30px rgba(146, 204, 65, 0.3))',
            }}
          />
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              color: '#92cc41',
              marginBottom: '12px',
              textShadow: '0 0 20px rgba(146, 204, 65, 0.5)',
            }}
          >
            Prompt Duel
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>The Ultimate AI Prompt Engineering Battle Arena</p>
        </section>

        {/* About Section */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              backgroundColor: '#0d0d18',
              border: '2px solid #1a1a2e',
              padding: '40px',
              marginBottom: '32px',
            }}
          >
            <h2 style={{ fontSize: '1rem', color: '#209cee', marginBottom: '24px', textAlign: 'center' }}>
              About the Project
            </h2>
            <p
              style={{
                fontSize: '0.7rem',
                color: '#888',
                lineHeight: '2.2',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              Prompt Duel is a competitive platform where players battle head-to-head in real-time prompt engineering
              challenges. Using AI, players craft prompts to solve coding challenges, competing to achieve
              the best results with the fewest prompts.
            </p>
            <p
              style={{
                fontSize: '0.7rem',
                color: '#888',
                lineHeight: '2.2',
                textAlign: 'center',
              }}
            >
              Whether you're a beginner learning the art of prompt engineering or an experienced developer looking
              to test your skills, Prompt Duel offers challenges for every skill level.
            </p>
          </div>

          {/* Team / Creator Section */}
          <div
            style={{
              backgroundColor: '#0d0d18',
              border: '2px solid #1a1a2e',
              padding: '40px',
              marginBottom: '32px',
            }}
          >
            <h2 style={{ fontSize: '1rem', color: '#92cc41', marginBottom: '24px', textAlign: 'center' }}>
              Meet the Creator
            </h2>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: 'rgba(146, 204, 65, 0.1)',
                  border: '2px solid #92cc41',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="nes-icon is-large heart"></i>
              </div>
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px' }}>Kenneth Phang</h3>
              <p style={{ fontSize: '0.6rem', color: '#92cc41', marginBottom: '16px' }}>Developer & Creator</p>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: '#888',
                  lineHeight: '2',
                  maxWidth: '500px',
                  margin: '0 auto',
                }}
              >
                Passionate about AI, prompt engineering, and creating fun competitive experiences.
                Built Prompt Duel to help others learn and master the art of communicating with AI.
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div
            style={{
              backgroundColor: '#0d0d18',
              border: '2px solid #1a1a2e',
              padding: '40px',
              marginBottom: '32px',
            }}
          >
            <h2 style={{ fontSize: '1rem', color: '#f7d51d', marginBottom: '24px', textAlign: 'center' }}>
              Built With
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              {['React', 'TypeScript', 'Vite', 'Bun', 'Elysia', 'SQLite', 'Multi-AI', 'NES.css'].map((tech) => (
                <div
                  key={tech}
                  style={{
                    padding: '16px',
                    backgroundColor: '#0a0a12',
                    border: '1px solid #1a1a2e',
                  }}
                >
                  <span style={{ fontSize: '0.6rem', color: '#888' }}>{tech}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact / Links */}
          <div
            style={{
              backgroundColor: '#0d0d18',
              border: '2px solid #1a1a2e',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '1rem', color: '#e76e55', marginBottom: '24px' }}>Get in Touch</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
              <a
                href="https://github.com/kenken64"
                target="_blank"
                rel="noopener noreferrer"
                className="nes-btn"
                style={{ fontSize: '0.6rem', padding: '12px 20px', textDecoration: 'none' }}
              >
                GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '32px 1.5rem',
          borderTop: '1px solid #1a1a2e',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#555', fontSize: '0.6rem' }}>
          © 2024 Prompt Duel. Powered by AI.
        </p>
      </footer>
    </div>
  );
}
