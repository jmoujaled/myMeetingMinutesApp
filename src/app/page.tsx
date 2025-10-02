import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <main className={styles.wrapper}>
      <section className={styles.hero}>
        <h1 className={styles.title}>My Meeting Minute app</h1>
        <p className={styles.subtitle}>
          Turn conversations into clear, action‑ready minutes. Upload audio, identify speakers,
          and get concise summaries in seconds.
        </p>

        <div className={styles.ctas}>
          <Link href="/studio" className={styles.primaryCta}>
            Try it now
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">🎙️</div>
          <h3 className={styles.featureTitle}>Upload audio</h3>
          <p className={styles.featureText}>
            Supports common formats like MP3, WAV, and M4A for quick transcription.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">🧑‍🤝‍🧑</div>
          <h3 className={styles.featureTitle}>Identify speakers</h3>
          <p className={styles.featureText}>
            Speaker attribution and change detection to follow the flow of the meeting.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">✅</div>
          <h3 className={styles.featureTitle}>Action‑ready minutes</h3>
          <p className={styles.featureText}>
            Get structured minutes you can share, with key decisions and next steps.
          </p>
        </div>
      </section>
    </main>
  );
}
