import { PageHero } from '../components/PageHero';
import { Icon } from '../components/Icon';

const SECTIONS = [
  {
    id: 'collect',
    title: '1. Data we collect',
    body: [
      'We collect the details you choose to send us: your name, email, organisation and the context of your enquiry. If you apply to BitElevate, we also collect the material you submit as part of that application.',
      'We do not buy contact lists, and we do not enrich enquiries with third-party profiles.',
    ],
  },
  {
    id: 'use',
    title: '2. How we use it',
    body: [
      'We use your details to reply to your enquiry, scope work, run an application process and keep the service secure. We do not use enquiry data to train public models.',
      'Access is limited to the people who need it to do the work you asked for. We keep an internal record of who has access and why.',
    ],
  },
  {
    id: 'never',
    title: '3. What we never do',
    list: [
      'Sell or rent personal data.',
      'Share enquiry details with advertisers.',
      'Send marketing email you did not ask for.',
      'Keep application material after a hiring process closes.',
    ],
  },
  {
    id: 'security',
    title: '4. Security and retention',
    body: [
      'Access is role-based and reviewed. Data is encrypted in transit and at rest where the platform supports it.',
      'Enquiries are kept for as long as the relationship is active, then archived or deleted on a documented schedule. Application material is removed when the process ends, unless you ask us to keep it for a future opening.',
    ],
  },
  {
    id: 'choices',
    title: '5. Your choices',
    body: [
      'You can ask for a copy, a correction or deletion of your data. If you received a message you did not want, reply once and we will stop.',
      'Requests go to the address on the contact page and are answered within 30 days.',
    ],
  },
  {
    id: 'contact',
    title: '6. Contact',
    body: [
      'For privacy questions, use the contact page and put “Privacy” in the subject. If we cannot resolve a concern directly, you can raise it with the relevant data protection authority.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <>
      <PageHero
        align="centre"
        eyebrow="Legal and transparency"
        eyebrowIcon="shield"
        heading={
          <>
            Privacy <span className="gradient-word">Policy</span>
          </>
        }
        subtext="What we collect, why we collect it, and how to get it removed. Written to be read, not to be survived."
        meta={
          <>
            <span>Last updated 20 May 2026</span>
            <span aria-hidden="true">·</span>
            <span>6 min read</span>
          </>
        }
      />

      <section className="page-section !pt-0">
        <div className="page-section__inner">
          <div className="policy-layout">
            <aside className="policy-nav" aria-label="On this page">
              <p>On this page</p>
              <ol>
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </aside>

            <div>
              <div className="policy-note mb-4 flex items-start gap-3">
                <Icon name="check_circle" className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>
                  <strong className="text-on-surface">The short version:</strong> we collect what
                  you send, use it to reply, and delete it when it is no longer needed.
                </span>
              </div>

              <div className="policy-stack">
                {SECTIONS.map((section) => (
                  <article key={section.id} id={section.id} className="policy-card">
                    <h2>{section.title}</h2>
                    {section.body?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.list && (
                      <ul>
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>

              <p className="policy-note mt-4">
                Prototype copy for layout review. Replace this with legal-reviewed text before
                production.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
