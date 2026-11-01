import { Icon } from './Icon';

type CtaBandProps = {
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export function CtaBand({ title, body, primary, secondary }: CtaBandProps) {
  const external = (href: string) => href.startsWith('http');

  return (
    <div className="cta-band">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="cta-band__actions">
        <a
          href={primary.href}
          className="btn-primary"
          target={external(primary.href) ? '_blank' : undefined}
          rel={external(primary.href) ? 'noreferrer' : undefined}
        >
          {primary.label}
          <Icon name="arrow_forward" className="h-5 w-5" />
        </a>
        {secondary && (
          <a
            href={secondary.href}
            className="btn-ghost"
            target={external(secondary.href) ? '_blank' : undefined}
            rel={external(secondary.href) ? 'noreferrer' : undefined}
          >
            {secondary.label}
          </a>
        )}
      </div>
    </div>
  );
}
