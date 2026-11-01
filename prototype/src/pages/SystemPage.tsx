import { HeroOrbit } from '../components/HeroOrbit';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { SectionHeading } from '../components/SectionHeading';

const SPECS = [
  { term: 'Display line-height', value: '1.15 minimum' },
  { term: 'Gradient padding', value: '0.12em below baseline' },
  { term: 'Heading overflow', value: 'visible' },
  { term: 'Animation properties', value: 'transform, opacity' },
  { term: 'Orbit aspect ratio', value: '1 / 1, always reserved' },
  { term: 'Off-screen behaviour', value: 'paused via IntersectionObserver' },
];

const BEHAVIOURS = [
  {
    icon: 'monitoring' as const,
    title: 'Paused when you cannot see it',
    body: 'An IntersectionObserver pauses every animation when the orbit leaves the viewport. A visibility listener does the same in a background tab.',
  },
  {
    icon: 'check_circle' as const,
    title: 'Reduced motion is a real state',
    body: 'With prefers-reduced-motion enabled the stage becomes a static constellation. Rings, icons and labels stay; movement and the scan line stop.',
  },
  {
    icon: 'database' as const,
    title: 'Space reserved before paint',
    body: 'The orbit is a square with an aspect ratio, and the hero is a CSS grid. Nothing waits for an image or a script to claim its height.',
  },
  {
    icon: 'school' as const,
    title: 'A lighter mobile variant',
    body: 'Below 640px the glass notes disappear, chips get smaller and the centre disc tightens. The idea survives without the desktop weight.',
  },
];

export function SystemPage() {
  return (
    <>
      <PageHero
        align="centre"
        eyebrow="Component demo"
        eyebrowIcon="hub"
        heading={
          <>
            One hero. <span className="gradient-word">Every page.</span>
          </>
        }
        subtext="A shared PageHero and HeroOrbit replace per-page hero markup. The type scale is clip-safe, the orbit is CSS-only, and both behaviours are visible below."
        actions={[
          { label: 'See it on Home', href: '/' },
          { label: 'See it on Impact', href: '/impact', variant: 'secondary', icon: 'favorite' },
        ]}
      />

      <section className="page-section">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="Typography contract"
            title="Descenders are part of the letter."
            lead="This is the exact failure from the live site, reproduced and fixed: a gradient word with a tight line box. The padding below the baseline is deliberate."
          />

          <div className="mt-10 rounded-[2rem] border border-outline-variant/30 bg-white p-6 md:p-10">
            <p className="hero-display" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.5rem)' }}>
              <span className="gradient-word">Society, policy, jpyq.</span>
            </p>
            <p className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
              Look at the tail of the y, the bowl of the p and the hook of the j. They are painted
              by the same gradient because the gradient background extends 0.12em below the baseline.
              No wrapper hides the overflow.
            </p>
          </div>

          <dl className="spec-grid">
            {SPECS.map((spec) => (
              <div key={spec.term} className="spec">
                <dt>{spec.term}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="page-section page-section--tint">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="Orbit presets"
            title="One animation, tuned per page."
            lead="Accent, icons, size and speed are props. The structure, accessibility and performance behaviour stay identical."
          />

          <div className="orbit-demo-grid">
            <div className="orbit-demo">
              <HeroOrbit size={320} speed={1} label="Automation" />
              <h3>Home · cool</h3>
              <p>Primary teal, automation icons, default tempo.</p>
            </div>

            <div className="orbit-demo">
              <HeroOrbit
                size={320}
                speed={0.8}
                accent="#986400"
                accentAlt="#12629d"
                centerIcon="favorite"
                icons={['public', 'diversity_3', 'school', 'groups']}
                label="Community"
              />
              <h3>Impact · warm</h3>
              <p>Tertiary accent, community icons, calmer tempo.</p>
            </div>

            <div className="orbit-demo">
              <HeroOrbit
                size={320}
                speed={1.15}
                accent="#12629d"
                accentAlt="#006067"
                centerIcon="shield"
                icons={['lock', 'policy', 'check_circle', 'verified']}
                label="Trust"
              />
              <h3>Privacy · trust</h3>
              <p>Secondary blue, security icons, slightly quicker.</p>
            </div>
          </div>

          <div className="demo-swatch" aria-label="Design tokens">
            <span><i style={{ background: '#006067' }} />primary #006067</span>
            <span><i style={{ background: '#007b83' }} />primary-container #007b83</span>
            <span><i style={{ background: '#12629d' }} />secondary #12629d</span>
            <span><i style={{ background: '#986400' }} />tertiary #986400</span>
            <span><i style={{ background: '#ffddb3' }} />tertiary-fixed #ffddb3</span>
            <span><i style={{ background: '#f7fafa' }} />surface #f7fafa</span>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="page-section__inner">
          <SectionHeading
            eyebrow="Behaviour"
            title="The parts you cannot see in a screenshot."
            lead="These are the differences between an animation that looks fine in a demo and one that survives a real page."
          />
          <div className="card-grid card-grid--two">
            {BEHAVIOURS.map((behaviour) => (
              <article key={behaviour.title} className="card">
                <span className="card__icon">
                  <Icon name={behaviour.icon} />
                </span>
                <h3>{behaviour.title}</h3>
                <p>{behaviour.body}</p>
              </article>
            ))}
          </div>

          <div className="policy-note mt-8">
            <strong className="text-on-surface">Try it:</strong> open DevTools → Rendering →
            Emulate CSS media feature prefers-reduced-motion. The orbit freezes but remains
            readable. Then scroll the orbit away and watch the animation pause in the Animations
            panel.
          </div>
        </div>
      </section>
    </>
  );
}
