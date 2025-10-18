'use client';

import { ReactNode } from 'react';
import styles from './FeaturesSection.module.css';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  highlights: string[];
  badge?: string;
}

function FeatureCard({ icon, title, description, highlights, badge }: FeatureCardProps) {
  return (
    <div className={styles.featureCard}>
      {badge && <div className={styles.badge}>{badge}</div>}
      <div className={styles.iconContainer}>
        {icon}
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
      <ul className={styles.highlightsList}>
        {highlights.map((highlight, index) => (
          <li key={index} className={styles.highlight}>
            <span className={styles.checkIcon}>✓</span>
            {highlight}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FeaturesSectionProps {
  isAuthenticated?: boolean;
}

export default function FeaturesSection({ isAuthenticated = false }: FeaturesSectionProps) {
  if (isAuthenticated) {
    return null; // Don't show features section for authenticated users
  }

  return (
    <section className={styles.featuresSection} aria-labelledby="features-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="features-heading" className={styles.sectionTitle}>
            Powerful Features That Actually Work
          </h2>
          <p className={styles.sectionSubtitle}>
            Real capabilities built for professionals who need reliable meeting documentation
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Audio Upload & Transcription Feature */}
          <FeatureCard
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            }
            title="Audio Upload & Transcription"
            description="Upload your meeting recordings and get accurate transcripts with automatic speaker identification. Supports all common audio formats with professional-grade accuracy."
            highlights={[
              "Supports MP3, WAV, M4A formats",
              "95%+ transcription accuracy",
              "Automatic speaker identification",
              "Files up to 150MB (Free plan)"
            ]}
            badge="Core Feature"
          />

          {/* AI Summaries & Meeting Minutes Feature */}
          <FeatureCard
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            }
            title="AI Meeting Minutes & Summaries"
            description="Advanced AI transforms your transcripts into professional meeting minutes with customizable summaries. Choose paragraph or bullet format, brief or detailed length."
            highlights={[
              "Automatic decision & action item extraction",
              "Customizable summary formats & length",
              "Professional meeting minutes generation",
              "Context-aware AI processing"
            ]}
            badge="AI-Powered"
          />

          {/* Multi-Language & Export Feature */}
          <FeatureCard
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M13 8H7"/>
                <path d="M17 12H7"/>
              </svg>
            }
            title="Export & Organization"
            description="Export your transcripts and meeting minutes in professional formats. Advanced search helps you find any past discussion instantly across all your meetings."
            highlights={[
              "Export as TXT, SRT, DOCX, PDF",
              "Professional document formatting",
              "Full-text search across all meetings",
              "Organized meeting history & analytics"
            ]}
            badge="Professional"
          />
        </div>

        <div className={styles.ctaContainer}>
          <p className={styles.ctaText}>
            Ready to transform your meeting productivity?
          </p>
          <a href="http://localhost:3030/register" className={styles.ctaButton}>
            Start Free
          </a>
          <p className={styles.ctaSubtext}>
            No credit card required • 60 minutes total • All features included
          </p>
        </div>
      </div>
    </section>
  );
}