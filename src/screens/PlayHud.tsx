import { motion } from 'motion/react';
import { MODES } from '../modes';
import type { ModeDefinition } from '../modes/types';
import { useSessionStore } from '../store/sessionStore';
import { PromptCard } from '../components/PromptCard';
import { FeedbackLayer } from '../components/FeedbackLayer';
import { StreakBadge } from '../components/StreakBadge';

export function PlayHud() {
  const phase = useSessionStore((s) => s.phase);
  const config = useSessionStore((s) => s.config);
  const question = useSessionStore((s) => s.question);
  const questionIndex = useSessionStore((s) => s.questionIndex);
  const score = useSessionStore((s) => s.score);
  const streak = useSessionStore((s) => s.streak);
  const lastAnswer = useSessionStore((s) => s.lastAnswer);
  const lastResult = useSessionStore((s) => s.lastResult);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);
  const nextQuestion = useSessionStore((s) => s.nextQuestion);
  const backToMenu = useSessionStore((s) => s.backToMenu);

  if (!config || !question) return null;
  const mode = MODES[question.mode] as ModeDefinition;
  const Input = mode.InputComponent;
  const answered =
    phase === 'answered' && lastAnswer && lastResult ? { answer: lastAnswer, correct: lastResult.correct } : null;

  return (
    <div className="hud">
      <header className="hud-top">
        <button className="hud-quit" onClick={backToMenu} aria-label="End session">
          ✕
        </button>
        <div className="hud-meter mono">
          <span className="hud-q">
            {String(questionIndex + 1).padStart(2, '0')}<span className="hud-dim">/{config.questionCount}</span>
          </span>
          <span className="hud-sep">·</span>
          <span>
            score <strong>{score}</strong>
          </span>
        </div>
        <StreakBadge streak={streak} />
      </header>

      <motion.div
        className="hud-bottom"
        key={question.target.id + questionIndex}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <FeedbackLayer />
        <PromptCard text={(mode.promptText as (q: typeof question) => string)(question)} />
        {Input && <Input question={question} answered={answered} onSubmit={submitAnswer} />}
        {phase === 'answered' && (
          <button className="next-button" onClick={nextQuestion}>
            Next →
          </button>
        )}
      </motion.div>
    </div>
  );
}
