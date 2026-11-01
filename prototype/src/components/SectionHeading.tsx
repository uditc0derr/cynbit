import type { ReactNode } from 'react';

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
};

export function SectionHeading({ eyebrow, title, lead, id }: SectionHeadingProps) {
  return (
    <div>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
  );
}
