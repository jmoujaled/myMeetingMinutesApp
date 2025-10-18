'use client';

import styles from './ProblemSolutionSection.module.css';

interface ProblemSolutionSectionProps {
  isAuthenticated?: boolean;
}

export default function ProblemSolutionSection({ isAuthenticated = false }: ProblemSolutionSectionProps) {
  if (isAuthenticated) {
    return null; // Don't show for authenticated users
  }

  return (
    <section className={styles.section} aria-labelledby="problem-solution-heading">
      <div className={styles.container}>
        {/* Problem Section */}
        <div className={styles.problemSection}>
          <h2 id="problem-solution-heading" className={styles.sectionTitle}>
            Meeting Productivity Challenges
          </h2>
          <p className={styles.sectionSubtitle}>
            Sound familiar? You&apos;re not alone in these meeting struggles.
          </p>
          
          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon} aria-hidden="true">😰</div>
              <h3 className={styles.problemTitle}>Note-Taking Stress</h3>
              <p className={styles.problemText}>
                Frantically scribbling notes while trying to stay engaged in the conversation. 
                Missing key points because you&apos;re focused on writing instead of listening.
              </p>
            </div>
            
            <div className={styles.problemCard}>
              <div className={styles.problemIcon} aria-hidden="true">🤔</div>
              <h3 className={styles.problemTitle}>Missed Details</h3>
              <p className={styles.problemText}>
                &quot;Wait, who said what?&quot; Struggling to remember who made which decision 
                or committed to which action item after the meeting ends.
              </p>
            </div>
            
            <div className={styles.problemCard}>
              <div className={styles.problemIcon} aria-hidden="true">📝</div>
              <h3 className={styles.problemTitle}>Follow-up Chaos</h3>
              <p className={styles.problemText}>
                Spending hours after meetings trying to piece together coherent notes 
                and action items from your scattered scribbles.
              </p>
            </div>
          </div>
        </div>

        {/* Solution Section */}
        <div className={styles.solutionSection}>
          <h2 className={styles.sectionTitle}>
            Your Meeting Productivity Solution
          </h2>
          <p className={styles.sectionSubtitle}>
            Focus on the conversation. We&apos;ll handle the documentation.
          </p>
          
          <div className={styles.solutionGrid}>
            <div className={styles.solutionCard}>
              <div className={styles.solutionIcon} aria-hidden="true">🎯</div>
              <h3 className={styles.solutionTitle}>Stay Engaged</h3>
              <p className={styles.solutionText}>
                <strong>95%+ accurate transcription</strong> means you can put down the pen 
                and focus entirely on the conversation and decision-making.
              </p>
            </div>
            

            
            <div className={styles.solutionCard}>
              <div className={styles.solutionIcon} aria-hidden="true">⚡</div>
              <h3 className={styles.solutionTitle}>Instant Action Items</h3>
              <p className={styles.solutionText}>
                <strong>AI-generated summaries</strong> extract key decisions and next steps 
                automatically, saving you hours of post-meeting work.
              </p>
            </div>
          </div>

          {/* Benefits highlight */}
          <div className={styles.benefitsHighlight}>
            <h3 className={styles.benefitsTitle}>The Result?</h3>
            <div className={styles.benefitsList}>
              <div className={styles.benefitItem}>
                <span className={styles.benefitMetric}>3+ hours</span>
                <span className={styles.benefitDescription}>saved per week on meeting documentation</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitMetric}>100%</span>
                <span className={styles.benefitDescription}>of key decisions captured accurately</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitMetric}>Zero</span>
                <span className={styles.benefitDescription}>missed action items or follow-ups</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}