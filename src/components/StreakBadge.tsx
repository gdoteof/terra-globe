import { motion, AnimatePresence } from 'motion/react';

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className={`streak ${streak >= 5 ? 'streak--lit' : ''}`} aria-label={`Streak ${streak}`}>
      <span className="streak-label">streak</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={streak}
          className="streak-value"
          initial={{ scale: 1.7, opacity: 0, y: -6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        >
          {streak >= 5 ? '🔥' : ''}
          {streak}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
