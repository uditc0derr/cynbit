import { CtaBand } from '../components/CtaBand';
import { HeroOrbit } from '../components/HeroOrbit';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { RotatingWord } from '../components/RotatingWord';
import { SectionHeading } from '../components/SectionHeading';

const HOME_WORDS = ['AI automation', 'AI agents', 'cloud systems', 'SaaS products'];

const PILLARS = [
  {
    icon: 'auto_awesome' as const,
    title: 'AI automation',
    body: 'Agents that own the handoffs between tools, so your team stops being the integration layer.',
    tag: 'Agents · Workflows · Retrieval',
  },
  {
    icon: 'hub' as const,
    title: 'Product engineering',
    body: 'Web and mobile products built as systems: typed, tested and ready for year two, not just launch day.',
    tag: 'React · Next.js · APIs',
  },
  {
    icon: 'database' as const,
    title: 'Cloud and data',
    body: 'Dashboards and pipelines that make the operating picture legible at a glance.',
    tag: 'Cloud · Analytics · Reliability',
  },
];

const STEPS = [
  { number: '01', title: 'Discover', body: 'Map the work, the data and the decisions that actually move the business.' },
  { number: '02', title: 'Architect', body: 'Choose the smallest system that can carry the next two years.' },
  { number: '03', title: 'Build', body: 'Ship in short loops with working software at the end of every loop.' },
  { number: '04', title: 'Operate', body: 'Instrument, hand over, then keep improving against real usage.' },
];

export function HomePage() {
  return (
    <>
      <PageHero
        eyebrow="The optimistic architect"
        eyebrowIcon="auto_awesome"
        heading={
          <>
            <span className="block" aria-hidden="true">
              Architecting the future with
              <RotatingWord words={HOME_WORDS} />
            </span>
            <span className="sr-only">Architecting the future with AI automation.</span>
          </>
        }
        subtext="Cynbit designs AI automation, custom software and scalable platforms from Jaipur for teams working everywhere. Technical precision, without the theatre."
        actions={[
          { label: 'Start discovery', href: '#contact' },
          { label: 'How we work', href: '#approach', variant: 'secondary', icon: 'insights' },
        ]}
        visual={
          <HeroOrbit
            accent="#006067"
            accentAlt="#12629d"
            centerIcon="hub"
            icons={['terminal', 'psychology', 'auto_awesome', 'insights']}
            label="Automation"
            notes={[
              { icon: 'terminal', title: 'Runtime', value: 'Always on' },
              { icon: 'insights', title: 'Systems', value: 'Connected' },
            ]}
          />
        }
      />

      <section className="page-section" id="ecosystem">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="What we build"
            title="Three practices. One operating system."
            lead="Most problems do not arrive neatly labelled. We combine automation, product engineering and data so the handoffs between them are designed, not accidental."
          />
          <div className="card-grid">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="card">
                <span className="card__icon">
                  <Icon name={pillar.icon} />
                </span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
                <span className="card__tag">{pillar.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section--tint" id="approach">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="How we work"
            title="Short loops. Visible decisions."
            lead="No six-month reveal. Each stage ends with something you can open, test or challenge."
          />
          <div className="step-grid">
            {STEPS.map((step) => (
              <div key={step.number} className="step">
                <span className="step__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section" id="contact">
        <div className="page-section__inner">
          <CtaBand
            title="Have a system worth building?"
            body="Bring the messy workflow, the half-finished product or the data nobody trusts. We will tell you what we would do first — and what we would leave alone."
            primary={{ label: 'Start a conversation', href: 'https://www.cynbit.in/contact' }}
            secondary={{ label: 'See the work', href: 'https://www.cynbit.in/case-studies' }}
          />
        </div>
      </section>
    </>
  );
}
