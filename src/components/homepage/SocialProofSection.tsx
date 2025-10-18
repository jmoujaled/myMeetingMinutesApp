'use client';

import styles from './SocialProofSection.module.css';

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  company?: string;
  timeSaved?: string;
}

const testimonials: TestimonialProps[] = [
  {
    quote: "I used to spend 2-3 hours after each client meeting writing up notes. Now I just upload the recording and get perfect meeting minutes in minutes. It's saved me 10+ hours per week.",
    author: "Sarah Chen",
    role: "Management Consultant",
    company: "Strategic Solutions LLC",
    timeSaved: "10+ hours/week"
  },
  {
    quote: "As a researcher conducting interviews, accurate transcription is crucial. The speaker identification feature means I never have to guess who said what. The AI summaries help me spot key themes instantly.",
    author: "Dr. Michael Rodriguez",
    role: "UX Researcher",
    company: "TechFlow Inc",
    timeSaved: "15+ hours/week"
  },
  {
    quote: "Recording podcast interviews and getting them transcribed used to cost me $200+ per episode. Now I get better accuracy, speaker labels, and summaries for a fraction of the cost.",
    author: "Jessica Park",
    role: "Podcast Creator",
    company: "The Innovation Show",
    timeSaved: "$800+ saved/month"
  },
  {
    quote: "Our team meetings are so much more productive now. Instead of one person taking notes and missing the conversation, everyone can participate fully. The action items extraction is a game-changer.",
    author: "David Thompson",
    role: "Engineering Manager",
    company: "CloudTech Solutions",
    timeSaved: "5+ hours/week"
  },
  {
    quote: "I conduct 20+ customer interviews per month. The multi-language support means I can work with global clients, and the search feature helps me find specific insights across all conversations.",
    author: "Maria Gonzalez",
    role: "Product Manager",
    company: "GlobalSoft",
    timeSaved: "12+ hours/week"
  },
  {
    quote: "Legal depositions require perfect accuracy. The transcript quality is excellent, and being able to export to different formats saves our team hours of formatting work.",
    author: "Robert Kim",
    role: "Legal Assistant",
    company: "Morrison & Associates",
    timeSaved: "8+ hours/week"
  }
];

function TestimonialCard({ quote, author, role, company, timeSaved }: TestimonialProps) {
  return (
    <div className={styles.testimonialCard}>
      <blockquote className={styles.quote}>
        "        &quot;{quote}&quot;"
      </blockquote>
      <div className={styles.author}>
        <div className={styles.authorInfo}>
          <cite className={styles.authorName}>{author}</cite>
          <div className={styles.authorRole}>
            {role}
            {company && <span className={styles.company}> at {company}</span>}
          </div>
        </div>
        {timeSaved && (
          <div className={styles.timeSaved}>
            <span className={styles.timeSavedLabel}>Saves:</span>
            <span className={styles.timeSavedValue}>{timeSaved}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SocialProofSectionProps {
  isAuthenticated?: boolean;
}

export default function SocialProofSection({ isAuthenticated = false }: SocialProofSectionProps) {
  if (isAuthenticated) return null;

  return (
    <section className={styles.socialProofSection} aria-labelledby="social-proof-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="social-proof-heading" className={styles.heading}>
            Trusted by Professionals Who Value Their Time
          </h2>
          <p className={styles.subheading}>
            Join thousands of professionals who&apos;ve transformed their meeting productivity
          </p>
        </div>

        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
              company={testimonial.company}
              timeSaved={testimonial.timeSaved}
            />
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNumber}>50,000+</div>
            <div className={styles.statLabel}>Hours Saved</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNumber}>95%+</div>
            <div className={styles.statLabel}>Accuracy Rate</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNumber}>30+</div>
            <div className={styles.statLabel}>Languages</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNumber}>10,000+</div>
            <div className={styles.statLabel}>Happy Users</div>
          </div>
        </div>
      </div>
    </section>
  );
}