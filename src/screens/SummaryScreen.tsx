import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../lib/sfx';

export function SummaryScreen() {
  const config = useSessionStore((s) => s.config);
  const results = useSessionStore((s) => s.results);
  const score = useSessionStore((s) => s.score);
  const bestStreak = useSessionStore((s) => s.bestStreak);
  const pool = useSessionStore((s) => s.pool);
  const startSession = useSessionStore((s) => s.startSession);
  const backToMenu = useSessionStore((s) => s.backToMenu);

  const accuracy = results.length ? Math.round((score / results.length) * 100) : 0;
  const missedIds = [...new Set(results.filter((r) => !r.correct).map((r) => r.featureId))];
  const missed = missedIds.map((id) => pool.find((f) => f.id === id)).filter((f) => f != null);

  useEffect(() => {
    if (accuracy >= 60) playSfx('fanfare');
    // play once when the summary appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) return null;

  const reviewMissed = () => {
    void startSession({ ...config, questionCount: Math.max(missed.length, 3) }, missed);
  };

  return (
    <motion.div className="screen summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="menu-card summary-card">
        <p className="menu-eyebrow">expedition report</p>
        <div className="summary-score">
          <span className="summary-big">{score}</span>
          <span className="summary-of mono">/ {results.length}</span>
        </div>
        <p className="summary-stats mono">
          {accuracy}% accuracy · best streak {bestStreak}
        </p>

        {missed.length > 0 && (
          <div className="summary-missed">
            <p className="summary-missed-title">Worth another look</p>
            <ul>
              {missed.map((f) => (
                <li key={f.id}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="summary-actions">
          {missed.length > 0 && (
            <button className="start-button" onClick={reviewMissed}>
              Review the {missed.length} you missed
            </button>
          )}
          <button
            className={missed.length > 0 ? 'ghost-button' : 'start-button'}
            onClick={() => void startSession(config)}
          >
            Play again
          </button>
          <button className="ghost-button" onClick={backToMenu}>
            Menu
          </button>
        </div>
      </div>
    </motion.div>
  );
}
