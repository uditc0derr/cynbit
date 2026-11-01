import type { CSSProperties } from 'react';
import { useDocumentVisible, useInView, usePrefersReducedMotion } from '../hooks/useMotion';
import { Icon, type IconName } from './Icon';
import './HeroOrbit.css';

export type OrbitNote = {
  icon: IconName;
  title: string;
  value: string;
};

type HeroOrbitProps = {
  /** Main accent, usually the page's primary colour. */
  accent?: string;
  /** Secondary accent used by one ring and one note. */
  accentAlt?: string;
  /** Icon in the glass disc. */
  centerIcon?: IconName;
  /** 2–4 orbiting icons. Extra values are ignored. */
  icons?: IconName[];
  /** Maximum rendered size in px. The stage scales down fluidly. */
  size?: number;
  /** Multiplier: 1 is the default tempo, 0.7 is calmer, 1.4 is faster. */
  speed?: number;
  /** Caption under the centre icon. */
  label?: string;
  /** Up to two small glass notes. Hidden on mobile to keep the stage light. */
  notes?: OrbitNote[];
  className?: string;
};

const DEFAULT_ICONS: IconName[] = ['terminal', 'psychology', 'auto_awesome', 'insights'];

/**
 * Decorative hero visual. It carries no information that is not in the hero
 * copy, so the whole stage is hidden from assistive technology.
 *
 * All motion is CSS transform/opacity. React only toggles `data-paused` and
 * `data-static`; it never drives frames.
 */
export function HeroOrbit({
  accent = '#006067',
  accentAlt = '#12629d',
  centerIcon = 'hub',
  icons = DEFAULT_ICONS,
  size = 560,
  speed = 1,
  label = 'Automation',
  notes = [],
  className = '',
}: HeroOrbitProps) {
  const { ref, inView } = useInView<HTMLDivElement>('160px');
  const documentVisible = useDocumentVisible();
  const reducedMotion = usePrefersReducedMotion();

  const paused = !inView || !documentVisible;
  const visibleIcons = icons.slice(0, 4);

  const style = {
    '--orbit-accent': accent,
    '--orbit-accent-alt': accentAlt,
    '--orbit-size': `${size}px`,
    '--orbit-speed': speed,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`orbit ${className}`}
      style={style}
      data-paused={paused ? 'true' : 'false'}
      data-static={reducedMotion ? 'true' : 'false'}
      aria-hidden="true"
      data-testid="hero-orbit"
    >
      <div className="orbit__halo" />

      <svg className="orbit__rings" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <circle className="orbit__ring orbit__ring--outer" cx="200" cy="200" r="197" />
        <circle className="orbit__ring orbit__ring--arc" cx="200" cy="200" r="112" />
      </svg>

      {/*
        Each rotating ring lives in its own HTML layer with a static SVG inside.
        Rotating an SVG <g> is not composited in Chrome and costs a layout every
        frame; rotating an HTML box is a pure transform, so it stays on the
        compositor.
      */}
      <div className="orbit__ring-layer orbit__ring-layer--slow" aria-hidden="true">
        <svg viewBox="0 0 400 400" focusable="false">
          <circle className="orbit__ring orbit__ring--dashed" cx="200" cy="200" r="172" />
        </svg>
      </div>
      <div className="orbit__ring-layer orbit__ring-layer--reverse" aria-hidden="true">
        <svg viewBox="0 0 400 400" focusable="false">
          <circle className="orbit__ring orbit__ring--dotted" cx="200" cy="200" r="136" />
        </svg>
      </div>

      <div className="orbit__disc">
        <Icon name={centerIcon} className="orbit__disc-icon" />
        <span className="orbit__disc-label">{label}</span>
        <span className="orbit__scan" />
      </div>

      {visibleIcons.map((icon, index) => (
        <div
          key={`${icon}-${index}`}
          className="orbit__satellite"
          style={
            {
              '--angle': `${index * 90 + 18}deg`,
              '--duration': `${26 + index * 4}s`,
              '--delay': `${index * -6}s`,
            } as CSSProperties
          }
        >
          <div className="orbit__satellite-chip">
            <Icon name={icon} />
          </div>
        </div>
      ))}

      {notes.slice(0, 2).map((note, index) => (
        <div
          key={note.title}
          className={`orbit__note orbit__note--${index === 0 ? 'a' : 'b'}`}
          style={index === 0 ? undefined : ({ '--orbit-accent': accentAlt } as CSSProperties)}
        >
          <span className="orbit__note-icon">
            <Icon name={note.icon} />
          </span>
          <span>
            <span className="orbit__note-title">{note.title}</span>
            <br />
            <span className="orbit__note-value">{note.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
