import { CtaBand } from '../components/CtaBand';
import { HeroOrbit } from '../components/HeroOrbit';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { SectionHeading } from '../components/SectionHeading';

const INITIATIVES = [
  {
    icon: 'school' as const,
    title: 'BitElevate',
    body: 'A career lab that turns practice into proof of work, pairing AI review with human mentorship.',
    tag: 'Students · Careers',
  },
  {
    icon: 'groups' as const,
    title: 'Campus labs',
    body: 'Workshops that put real tooling and real constraints in front of students before their first job does.',
    tag: 'Education · Practice',
  },
  {
    icon: 'handshake' as const,
    title: 'Community builds',
    body: 'Small, useful software for local organisations, scoped and shipped alongside our client work.',
    tag: 'Local impact · Software',
  },
];

const PRINCIPLES = [
  {
    title: 'Access before scale',
    body: 'A programme that reaches twenty people well is worth more than a launch that reaches thousands badly.',
  },
  {
    title: 'Skills that transfer',
    body: 'Teach the judgement behind the tool, not just the button. Tools change; judgement compounds.',
  },
  {
    title: 'Partnerships over press',
    body: 'Work with schools and local organisations for years, not for a single photo opportunity.',
  },
];

export function ImpactPage() {
  return (
    <>
      <PageHero
        tone="warm"
        eyebrow="Our initiatives"
        eyebrowIcon="favorite"
        heading={
          <>
            Cynbit for <span className="gradient-word gradient-word--warm">Society</span>
          </>
        }
        subtext="Technology is a lever for social progress. Our initiatives move from building raw skills to nurturing resilient people — and we stay long enough to see the difference."
        meta={
          <>
            <span>BitElevate</span>
            <span aria-hidden="true">·</span>
            <span>Campus labs</span>
            <span aria-hidden="true">·</span>
            <span>Community builds</span>
          </>
        }
        actions={[
          { label: 'Explore the initiatives', href: '#initiatives' },
          { label: 'Talk to the team', href: 'https://www.cynbit.in/contact', variant: 'secondary', icon: 'arrow_forward' },
        ]}
        visual={
          <HeroOrbit
            accent="#986400"
            accentAlt="#12629d"
            centerIcon="favorite"
            icons={['public', 'diversity_3', 'school', 'groups']}
            label="Community"
            size={540}
            speed={0.8}
            notes={[
              { icon: 'school', title: 'Programmes', value: 'Mentorship' },
              { icon: 'groups', title: 'Community', value: 'Open' },
            ]}
          />
        }
      />

      <section className="page-section" id="initiatives">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="Where we invest"
            title="Programmes with a long tail."
            lead="Each initiative is designed to keep working after the first cohort, the first workshop or the first launch."
          />
          <div className="card-grid">
            {INITIATIVES.map((initiative) => (
              <article key={initiative.title} className="card">
                <span className="card__icon" style={{ background: '#fff4e3', color: '#986400' }}>
                  <Icon name={initiative.icon} />
                </span>
                <h3>{initiative.title}</h3>
                <p>{initiative.body}</p>
                <span className="card__tag" style={{ color: '#986400' }}>
                  {initiative.tag}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section--tint">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="What good looks like"
            title="Three tests we apply before we start."
            lead="Impact is easy to claim and hard to verify. These are the filters we use when deciding what to fund with our time."
          />
          <div className="card-grid">
            {PRINCIPLES.map((principle, index) => (
              <article key={principle.title} className="card">
                <span className="card__tag" style={{ marginTop: 0 }}>
                  0{index + 1}
                </span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="page-section__inner">
          <CtaBand
            title="Build the next cohort with us."
            body="If you run a school, a nonprofit or a local team with a problem worth solving, we would like to hear how you work."
            primary={{ label: 'Talk to the team', href: 'https://www.cynbit.in/contact' }}
            secondary={{ label: 'Visit BitElevate', href: 'https://www.cynbit.in/bitelevate' }}
          />
        </div>
      </section>
    </>
  );
}
