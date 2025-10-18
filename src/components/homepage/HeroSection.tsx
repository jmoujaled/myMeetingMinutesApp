'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export default function HeroSection({ isAuthenticated = false }: HeroSectionProps) {
  const { loading } = useAuth();

  if (isAuthenticated) {
    return null; // Don't show landing page hero for authenticated users
  }

  // Show skeleton while auth is loading to prevent flash
  if (loading) {
    return (
      <section className={styles.hero} role="banner">
        <div className={styles.heroContent}>
          <div className="loading-skeleton w-3/4 h-12 mx-auto mb-6 rounded"></div>
          <div className="loading-skeleton w-2/3 h-6 mx-auto mb-8 rounded"></div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="loading-skeleton w-64 h-12 rounded"></div>
            <div className="loading-skeleton w-48 h-12 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.hero} role="banner" aria-labelledby="hero-heading">
      <div className={styles.heroContent}>
        <h1 id="hero-heading" className={styles.headline}>
          Turn Your Meetings Into Actionable Minutes
        </h1>
        <p className={styles.subheadline}>
          Upload audio, get accurate transcripts with speaker identification, and AI-generated meeting summaries. 
          Focus on the conversation, not the note-taking.
        </p>
        
        <div className={styles.ctaContainer} role="group" aria-label="Call to action buttons">
          <Link 
            href="http://localhost:3030/register" 
            className={styles.primaryCta}
            aria-describedby="primary-cta-description"
          >
            Start Free
          </Link>
          <span id="primary-cta-description" className="sr-only">
            Sign up for a free account with 10 transcriptions included
          </span>
          
          <Link 
            href="#features" 
            className={styles.secondaryCta}
            aria-describedby="secondary-cta-description"
          >
            See How It Works
          </Link>
          <span id="secondary-cta-description" className="sr-only">
            Learn more about our features and capabilities
          </span>
        </div>
      </div>
    </section>
  );
}