import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../lib/sfx';

export function FeedbackLayer() {
  const phase = useSessionStore((s) => s.phase);
  const lastResult = useSessionStore((s) => s.lastResult);
  const lastNearMiss = useSessionStore((s) => s.lastNearMiss);
  const streak = useSessionStore((s) => s.streak);
  const question = useSessionStore((s) => s.question);

  const show = phase === 'answered' && lastResult != null;

  useEffect(() => {
    if (!show || !lastResult) return;
    if (!lastResult.correct) playSfx('wrong');
    else if (streak > 0 && streak % 5 === 0) playSfx('streak');
    else playSfx('correct');
  }, [show, lastResult, streak]);

  return (
    <div className="feedback-slot" aria-live="polite">
      <AnimatePresence>
        {show && lastResult && (
          <motion.div
            key={lastResult.answeredAt}
            className={`feedback ${lastResult.correct ? 'feedback--correct' : 'feedback--wrong'}`}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={
              lastResult.correct
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 1, y: 0, scale: 1, x: [0, -7, 7, -4, 4, 0] }
            }
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {lastResult.correct ? (
              <>
                <span className="feedback-title">Correct</span>
                {lastNearMiss && question && (
                  <span className="feedback-sub">
                    spelled <em>{question.target.name}</em>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="feedback-title">
                  It was <em>{question?.target.name}</em>
                </span>
                <span className="feedback-sub">now you know</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
