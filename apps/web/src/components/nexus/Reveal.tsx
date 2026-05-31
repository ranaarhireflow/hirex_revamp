import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: 0 | 100 | 200 | 300 | 400;
  as?: keyof React.JSX.IntrinsicElements;
}

const DELAY_CLASS: Record<number, string> = {
  0: '',
  100: 'nx-reveal-d2',
  200: 'nx-reveal-d3',
  300: 'nx-reveal-d4',
  400: 'nx-reveal-d5',
};

export default function Reveal({ children, delay = 0, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const cls = `nx-reveal ${DELAY_CLASS[delay] || ''}`;
  // @ts-expect-error — dynamic intrinsic tag
  return <Tag ref={ref} className={cls}>{children}</Tag>;
}
