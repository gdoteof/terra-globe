import { useEffect, useRef, useState } from 'react';
import { matchAnswer } from '../domain/matching';
import { globeId, labelModeFor, type InputProps, type ModeDefinition } from './types';

function FillInInput({ question, answered, onSubmit }: InputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText('');
    inputRef.current?.focus();
  }, [question]);

  const submit = () => {
    if (text.trim() && !answered) onSubmit({ mode: 'fill-in', text });
  };

  return (
    <form
      className="fillin"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        className={`fillin-input ${answered ? (answered.correct ? 'is-correct' : 'is-wrong') : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type the country's name…"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={!!answered}
        aria-label="Country name"
      />
      <button className="fillin-submit" type="submit" disabled={!!answered || !text.trim()}>
        Answer
      </button>
    </form>
  );
}

export const fillInMode: ModeDefinition<'fill-in'> = {
  id: 'fill-in',
  label: 'Type the name',
  description: 'Spell it out — close counts, spelling is coached',
  buildQuestion(target) {
    return { mode: 'fill-in', target };
  },
  checkAnswer(q, a, pool) {
    return matchAnswer(a.text, q.target, pool);
  },
  InputComponent: FillInInput,
  globeDirectives(q, config) {
    const code = globeId(q.target);
    return {
      highlightedId: code,
      flyToId: code,
      labelMode: labelModeFor(config),
      suppressLabels: [code],
    };
  },
  promptText() {
    return 'Name the glowing country';
  },
};
