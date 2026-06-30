import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';

export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => `${Math.round(v).toLocaleString()}${suffix}`);

  useEffect(() => {
    const controls = animate(count, to, { duration: 1.2, ease: 'easeOut' });
    return controls.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
}
