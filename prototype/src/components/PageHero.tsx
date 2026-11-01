import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import './PageHero.css';

export type HeroAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
};

type PageHeroProps = {
  eyebrow: string;
  eyebrowIcon?: IconName;
  /** The heading can contain <span className="gradient-word"> for a gradient word. */
  heading: ReactNode;
  subtext: ReactNode;
  /** Optional line under the subtext, e.g. "Last updated 20 May 2026". */
  meta?: ReactNode;
  actions?: HeroAction[];
  /** Optional right-hand (or below-text) visual. */
  visual?: ReactNode;
  align?: 'split' | 'centre';
  tone?: 'cool' | 'warm';
  id?: string;
};

/**
 * One hero for every inner page.
 *
 * Typography is intentionally clip-safe:
 *  - .hero-display uses line-height 1.15 and bottom padding.
 *  - .gradient-word adds 0.12em of padding inside its own paint box so the
 *    gradient exists behind descenders (y, g, p, j, q).
 *  - No ancestor sets overflow:hidden or a fixed height. The only clipped
 *    element is the decorative backdrop, which contains no copy.
 */
export function PageHero({
  eyebrow,
  eyebrowIcon,
  heading,
  subtext,
  meta,
  actions = [],
  visual,
  align = 'split',
  tone = 'cool',
  id,
}: PageHeroProps) {
  return (
    <section
      id={id}
      className={`page-hero page-hero--${align} page-hero--${tone}`}
      data-testid="page-hero"
    >
      <div className="page-hero__backdrop" aria-hidden="true">
        <div className="page-hero__wash page-hero__wash--a" />
        <div className="page-hero__wash page-hero__wash--b" />
        <div className="page-hero__grid" />
      </div>

      <div className="page-hero__inner">
        <div className="page-hero__copy">
          <p className="eyebrow">
            {eyebrowIcon && <Icon name={eyebrowIcon} className="h-3.5 w-3.5" />}
            {eyebrow}
          </p>

          <h1 className="hero-display page-hero__heading">{heading}</h1>

          <p className="page-hero__subtext">{subtext}</p>
          {meta && <div className="page-hero__meta">{meta}</div>}

          {actions.length > 0 && (
            <div className="page-hero__actions">
              {actions.map((action) => {
                const className =
                  action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
                const content = (
                  <>
                    {action.label}
                    <Icon name={action.icon ?? 'arrow_forward'} className="h-5 w-5" />
                  </>
                );

                return action.href.startsWith('/') ? (
                  <Link key={action.label} to={action.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <a key={action.label} href={action.href} className={className}>
                    {content}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {visual && <div className="page-hero__visual">{visual}</div>}
      </div>
    </section>
  );
}
