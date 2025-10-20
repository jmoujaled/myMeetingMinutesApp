'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './PricingSection.module.css';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: {
    transcriptions: string;
    fileSize: string;
    duration: string;
  };
  cta: string;
  popular?: boolean;
  comingSoon?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out our transcription service',
    limitations: {
      transcriptions: '10 transcriptions per month',
      fileSize: '150MB max file size',
      duration: '60 minutes max duration'
    },
    features: [
      'High-quality transcription',
      'Multiple file formats (MP3, WAV, M4A)',
      'Basic export options (TXT)',
      'Web-based interface',
      'Email support'
    ],
    cta: 'Start Free'
  },
  {
    name: 'Pro',
    price: '$10',
    period: 'per month',
    description: 'For professionals who need unlimited transcriptions',
    popular: true,
    comingSoon: true,
    limitations: {
      transcriptions: 'Unlimited transcriptions',
      fileSize: 'Unlimited file size',
      duration: 'Unlimited duration'
    },
    features: [
      'Everything in Free',
      'Speaker identification & diarization',
      'AI-generated meeting summaries',
      'Action items extraction',
      'Multi-language support (30+ languages)',
      'Translation capabilities',
      'Advanced export formats (SRT, DOCX, PDF)',
      'Full-text search across all transcripts',
      'Priority support',
      'API access'
    ],
    cta: 'Coming Soon'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For teams and organizations with advanced needs',
    comingSoon: true,
    limitations: {
      transcriptions: 'Unlimited transcriptions',
      fileSize: 'Unlimited file size',
      duration: 'Unlimited duration'
    },
    features: [
      'Everything in Pro',
      'User management & admin dashboard',
      'Team collaboration features',
      'Custom integrations',
      'SSO (Single Sign-On)',
      'Advanced security controls',
      'Dedicated account manager',
      'SLA guarantees',
      'Custom deployment options'
    ],
    cta: 'Contact Sales'
  }
];

interface PricingCardProps extends PricingPlan {
  billingPeriod: 'monthly' | 'annual';
}

function PricingCard({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  limitations, 
  cta, 
  popular, 
  comingSoon,
  billingPeriod 
}: PricingCardProps) {
  const getDisplayPrice = () => {
    if (price === '$0' || price === 'Custom') return price;
    
    if (billingPeriod === 'annual' && price === '$10') {
      return '$8'; // Annual pricing for Pro plan
    }
    
    return price;
  };

  const getDisplayPeriod = () => {
    if (period === 'forever' || period === 'pricing') return period;
    
    if (billingPeriod === 'annual') {
      return 'per month, billed annually';
    }
    
    return period;
  };

  const getSavingsLabel = () => {
    if (billingPeriod === 'annual' && price === '$10') {
      return 'Save 20%';
    }
    return null;
  };

  return (
    <div className={`${styles.pricingCard} ${popular ? styles.popular : ''} ${comingSoon ? styles.comingSoon : ''}`}>
      {popular && <div className={styles.popularBadge}>Most Popular</div>}
      {comingSoon && <div className={styles.comingSoonBadge}>Coming Soon</div>}
      
      <div className={styles.cardHeader}>
        <h3 className={styles.planName}>{name}</h3>
        <div className={styles.priceContainer}>
          <div className={styles.price}>
            {getDisplayPrice()}
            <span className={styles.period}>/{getDisplayPeriod()}</span>
          </div>
          {getSavingsLabel() && (
            <div className={styles.savings}>{getSavingsLabel()}</div>
          )}
        </div>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.limitations}>
        <h4 className={styles.limitationsTitle}>Usage Limits</h4>
        <ul className={styles.limitationsList}>
          <li>{limitations.transcriptions}</li>
          <li>{limitations.fileSize}</li>
          <li>{limitations.duration}</li>
        </ul>
      </div>

      <div className={styles.features}>
        <h4 className={styles.featuresTitle}>Features Included</h4>
        <ul className={styles.featuresList}>
          {features.map((feature, index) => (
            <li key={index} className={styles.feature}>
              <span className={styles.checkmark}>✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.cardFooter}>
        <button 
          className={`${styles.ctaButton} ${popular ? styles.ctaPrimary : styles.ctaSecondary}`}
          disabled={comingSoon}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

interface PricingSectionProps {
  isAuthenticated?: boolean;
}

export default function PricingSection({ isAuthenticated = false }: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  if (isAuthenticated) return null;

  return (
    <section className={styles.pricingSection} aria-labelledby="pricing-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="pricing-heading" className={styles.heading}>
            Honest, Transparent Pricing
          </h2>
          <p className={styles.subheading}>
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
          
          <div className={styles.billingToggle}>
            <button
              className={`${styles.toggleButton} ${billingPeriod === 'monthly' ? styles.active : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`${styles.toggleButton} ${billingPeriod === 'annual' ? styles.active : ''}`}
              onClick={() => setBillingPeriod('annual')}
            >
              Annual
              <span className={styles.discount}>Save 20%</span>
            </button>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={index}
              {...plan}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>



        <div className={styles.ctaSection}>
          <h3 className={styles.ctaHeading}>Ready to Transform Your Meeting Productivity?</h3>
          <p className={styles.ctaSubheading}>
            Join thousands of professionals who save hours every week with automated transcription and AI summaries.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/register" className={styles.primaryCta}>
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}