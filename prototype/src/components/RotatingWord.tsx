import { useEffect, useState } from 'react';
import { useDocumentVisible, useInView, usePrefersReducedMotion } from '../hooks/useMotion';

type RotatingWordProps = {
  words: string[];
  /** Milliseconds between words. Default 4200ms. */
  interval?: number;
};

/**
 * The home headline's changing last phrase.
 *
 * Two safeguards matter here:
 *  - The window is padded and is the only overflow:hidden box; the gradient
 *    word itself has padding-bottom so descenders keep their gradient.
 *  - Rotation stops off screen, in a hidden tab, and under reduced motion,
 *    so it cannot keep waking the main thread.
 */
export function RotatingWord({ words, interval = 4200 }: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const { ref, inView } = useInView<HTMLSpanElement>('0px');
  const documentVisible = useDocumentVisible();
  const reducedMotion = usePrefersReducedMotion();

  const shouldRotate = inView && documentVisible && !reducedMotion;

  useEffect(() => {
    if (!shouldRotate || words.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % words.length;
      });
    }, interval);

    return () => window.clearInterval(timer);
  }, [shouldRotate, interval, words.length]);

  // Keep the outgoing word around just long enough to fade out.
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), 650);
    return () => window.clearTimeout(timer);
  }, [previous]);

  return (
    <span ref={ref} className="word-rotator" aria-hidden="true">
      {previous !== null && (
        <span className="word-rotator__word word-rotator__word--out gradient-word">
          {words[previous]}.
        </span>
      )}
      <span key={index} className="word-rotator__word word-rotator__word--in gradient-word">
        {words[index]}.
      </span>
    </span>
  );
}
