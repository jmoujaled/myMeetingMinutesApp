'use client';

import styles from './TrustSecuritySection.module.css';

interface SecurityFeatureProps {
  icon: string;
  title: string;
  description: string;
}

const securityFeatures: SecurityFeatureProps[] = [
  {
    icon: '🔒',
    title: 'End-to-End Encryption',
    description: 'Your audio files and transcripts are encrypted in transit and at rest using industry-standard AES-256 encryption.'
  },
  {
    icon: '🛡️',
    title: 'Secure File Handling',
    description: 'Files are processed securely and automatically deleted after transcription. We never store your audio longer than necessary.'
  },
  {
    icon: '🔐',
    title: 'Privacy First',
    description: 'Your data belongs to you. We don\'t train AI models on your content or share your information with third parties.'
  },
  {
    icon: '⚡',
    title: 'Reliable Uptime',
    description: '99.9% uptime with redundant systems and automatic failover to ensure your transcriptions are always available.'
  },
  {
    icon: '📱',
    title: 'GDPR Compliant',
    description: 'Full compliance with GDPR, CCPA, and other privacy regulations. Request data deletion anytime.'
  },
  {
    icon: '💾',
    title: 'Data Portability',
    description: 'Export your transcripts in multiple formats (TXT, SRT, DOCX, PDF). No vendor lock-in, your data is always accessible.'
  }
];

interface TrustBadgeProps {
  label: string;
  value: string;
  description: string;
}

const trustBadges: TrustBadgeProps[] = [
  {
    label: 'Uptime',
    value: '99.9%',
    description: 'Service availability'
  },
  {
    label: 'Accuracy',
    value: '95%+',
    description: 'Transcription quality'
  },
  {
    label: 'Processing',
    value: '<5min',
    description: 'Average turnaround'
  },
  {
    label: 'Languages',
    value: '30+',
    description: 'Supported languages'
  }
];

function SecurityFeature({ icon, title, description }: SecurityFeatureProps) {
  return (
    <div className={styles.securityFeature}>
      <div className={styles.featureIcon}>{icon}</div>
      <div className={styles.featureContent}>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

function TrustBadge({ label, value, description }: TrustBadgeProps) {
  return (
    <div className={styles.trustBadge}>
      <div className={styles.badgeValue}>{value}</div>
      <div className={styles.badgeLabel}>{label}</div>
      <div className={styles.badgeDescription}>{description}</div>
    </div>
  );
}

interface TrustSecuritySectionProps {
  isAuthenticated?: boolean;
}

export default function TrustSecuritySection({ isAuthenticated = false }: TrustSecuritySectionProps) {
  if (isAuthenticated) return null;

  return (
    <section className={styles.trustSecuritySection} aria-labelledby="trust-security-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="trust-security-heading" className={styles.heading}>
            Enterprise-Grade Security & Reliability
          </h2>
          <p className={styles.subheading}>
            Your sensitive meeting data deserves the highest level of protection and reliability
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.securityFeatures}>
            {securityFeatures.map((feature, index) => (
              <SecurityFeature
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>

          <div className={styles.trustBadges}>
            <h3 className={styles.badgesHeading}>Proven Performance</h3>
            <div className={styles.badgesGrid}>
              {trustBadges.map((badge, index) => (
                <TrustBadge
                  key={index}
                  label={badge.label}
                  value={badge.value}
                  description={badge.description}
                />
              ))}
            </div>
          </div>
        </div>



        <div className={styles.guaranteeSection}>
          <div className={styles.guarantee}>
            <h3 className={styles.guaranteeHeading}>Our Promise to You</h3>
            <ul className={styles.guaranteeList}>
              <li>✅ Your data is never used to train AI models</li>
              <li>✅ Audio files are automatically deleted after processing</li>
              <li>✅ Full data export available anytime</li>
              <li>✅ 30-day money-back guarantee on paid plans</li>
              <li>✅ 24/7 security monitoring and incident response</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}