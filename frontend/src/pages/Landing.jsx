import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Connect with Friends and the World Around You
            </h1>
            <p className="hero-subtitle">
              Join our social network to share moments, discover new people, 
              and stay connected with what matters most to you.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-mockup">
              <div className="mockup-phone">
                <div className="mockup-screen">
                  <div className="mockup-header">
                    <div className="mockup-avatar"></div>
                    <div className="mockup-text">
                      <div className="mockup-line"></div>
                      <div className="mockup-line short"></div>
                    </div>
                  </div>
                  <div className="mockup-post">
                    <div className="mockup-avatar small"></div>
                    <div className="mockup-content">
                      <div className="mockup-line"></div>
                      <div className="mockup-line"></div>
                      <div className="mockup-line short"></div>
                    </div>
                  </div>
                  <div className="mockup-post">
                    <div className="mockup-avatar small"></div>
                    <div className="mockup-content">
                      <div className="mockup-line"></div>
                      <div className="mockup-line"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Our Social Network?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Connect with Friends</h3>
              <p>Build meaningful relationships and stay connected with people who matter to you.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Privacy First</h3>
              <p>Control who sees your content with flexible privacy settings and secure messaging.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Ready</h3>
              <p>Access your social network anywhere with our responsive design that works on all devices.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎉</div>
              <h3>Groups & Events</h3>
              <p>Join communities, create groups, and organize events with friends and like-minded people.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Real-time Chat</h3>
              <p>Stay in touch with instant messaging, group chats, and real-time notifications.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Share Moments</h3>
              <p>Share photos, videos, and stories with your network in a beautiful, intuitive interface.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of users who are already connecting and sharing on our platform.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Your Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>Social Network</h3>
              <p>Connecting people, sharing moments, building communities.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <Link to="/features">Features</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/security">Security</Link>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <Link to="/about">About</Link>
                <Link to="/careers">Careers</Link>
                <Link to="/contact">Contact</Link>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <Link to="/help">Help Center</Link>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Social Network. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
