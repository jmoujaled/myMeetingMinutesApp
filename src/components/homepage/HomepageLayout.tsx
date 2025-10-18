'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import HeroSection from './HeroSection';
import ProblemSolutionSection from './ProblemSolutionSection';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import SocialProofSection from './SocialProofSection';
import TrustSecuritySection from './TrustSecuritySection';
import styles from './HomepageLayout.module.css';

interface HomepageLayoutProps {
  isAuthenticated?: boolean;
  children?: ReactNode;
}

export default function HomepageLayout({ isAuthenticated = false, children }: HomepageLayoutProps) {
  const { loading } = useAuth();

  return (
    <main className={styles.main} role="main">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      
      <div id="main-content" className={styles.container}>
        {/* Landing page sections - only for non-authenticated users */}
        {!isAuthenticated && !loading && (
          <>
            <HeroSection isAuthenticated={isAuthenticated} />
            <ProblemSolutionSection isAuthenticated={isAuthenticated} />
            <FeaturesSection isAuthenticated={isAuthenticated} />
            <PricingSection isAuthenticated={isAuthenticated} />
            <TrustSecuritySection isAuthenticated={isAuthenticated} />
          </>
        )}
        
        {/* Features section anchor for navigation */}
        {!isAuthenticated && (
          <div id="features" className={styles.featuresAnchor} aria-hidden="true"></div>
        )}
        
        {/* Authenticated user content or additional sections */}
        {children && (
          <section className={styles.contentSection} aria-label="Main content">
            {children}
          </section>
        )}
      </div>
    </main>
  );
}