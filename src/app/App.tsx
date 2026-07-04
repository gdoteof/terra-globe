import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Globe } from '../globe/Globe';
import type { AnswerFlash, GlobeHandle } from '../globe/GlobeProps';
import type { Answer, Feature, Question } from '../domain/types';
import { MODES } from '../modes';
import { globeId, type GlobeDirectives, type ModeDefinition } from '../modes/types';
import { useSessionStore } from '../store/sessionStore';
import { MenuScreen } from '../screens/MenuScreen';
import { PlayHud } from '../screens/PlayHud';
import { SummaryScreen } from '../screens/SummaryScreen';

const IDLE_DIRECTIVES: GlobeDirectives = {
  highlightedId: null,
  flyToId: null,
  labelMode: 'none',
  suppressLabels: [],
};

/** The globe code of the country the user picked, for answer kinds that pick one. */
function pickedCode(answer: Answer, pool: Feature[]): string | null {
  if (answer.mode === 'fill-in') return null;
  const f = pool.find((p) => p.id === answer.featureId);
  return f ? globeId(f) : null;
}

export default function App() {
  const phase = useSessionStore((s) => s.phase);
  const config = useSessionStore((s) => s.config);
  const question = useSessionStore((s) => s.question);
  const pool = useSessionStore((s) => s.pool);
  const lastResult = useSessionStore((s) => s.lastResult);
  const lastAnswer = useSessionStore((s) => s.lastAnswer);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);

  const globeRef = useRef<GlobeHandle>(null);
  const [ready, setReady] = useState(false);
  const [flashes, setFlashes] = useState<AnswerFlash[]>([]);
  const flashKey = useRef(0);

  const directives = useMemo<GlobeDirectives>(() => {
    if ((phase === 'asking' || phase === 'answered') && question && config) {
      const mode = MODES[question.mode] as ModeDefinition;
      const d = (mode.globeDirectives as (q: Question, c: typeof config) => GlobeDirectives)(question, config);
      const target = globeId(question.target);
      if (phase === 'answered' && lastResult) {
        if (lastResult.correct) {
          // clear the amber pulse so the green flash reads
          return { ...d, highlightedId: null };
        }
        if (question.mode === 'click') {
          // reveal where it actually was
          return { ...d, highlightedId: target };
        }
      }
      return d;
    }
    return IDLE_DIRECTIVES;
  }, [phase, question, config, lastResult]);

  // fly to each new question's target (highlight modes only)
  useEffect(() => {
    if (phase === 'asking' && question && config) {
      const mode = MODES[question.mode] as ModeDefinition;
      const d = (mode.globeDirectives as (q: Question, c: typeof config) => GlobeDirectives)(question, config);
      if (d.flyToId) void globeRef.current?.flyTo(d.flyToId);
    }
  }, [phase, question, config]);

  // answer feedback on the globe itself
  useEffect(() => {
    if (!lastResult || !question) return;
    const target = globeId(question.target);
    const next: AnswerFlash[] = [];
    if (lastResult.correct) {
      next.push({ id: target, result: 'correct', key: ++flashKey.current });
    } else if (lastAnswer) {
      // show where the wrong pick actually is, in red
      const picked = pickedCode(lastAnswer, pool);
      if (picked && picked !== target) {
        next.push({ id: picked, result: 'wrong', key: ++flashKey.current });
      }
      if (question.mode === 'click') {
        void globeRef.current?.flyTo(target); // teach: go see where it was
      }
    }
    if (next.length) setFlashes((f) => [...f.slice(-3), ...next]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  const onCountrySelect = (a2: string) => {
    if (config?.mode !== 'click' || phase !== 'asking') return;
    const f = pool.find((p) => p.geometry.type === 'iso-a2' && p.geometry.code === a2);
    if (f) submitAnswer({ mode: 'click', featureId: f.id });
  };

  return (
    <div className="app">
      <Globe
        ref={globeRef}
        highlightedId={directives.highlightedId}
        flashes={flashes}
        labelMode={directives.labelMode}
        suppressLabels={directives.suppressLabels}
        interactive={phase === 'asking' && config?.mode === 'click'}
        idleSpin={phase === 'menu' || phase === 'summary'}
        onCountrySelect={onCountrySelect}
        onReady={() => setReady(true)}
      />
      <div className="vignette" aria-hidden />
      <AnimatePresence>
        {!ready && (
          <motion.div key="loading" className="screen loading" exit={{ opacity: 0, transition: { duration: 0.6 } }}>
            <span className="loading-text mono">charting the coastlines…</span>
          </motion.div>
        )}
        {ready && phase === 'menu' && <MenuScreen key="menu" />}
        {ready && phase === 'summary' && <SummaryScreen key="summary" />}
      </AnimatePresence>
      {ready && (phase === 'asking' || phase === 'answered') && <PlayHud />}
    </div>
  );
}
