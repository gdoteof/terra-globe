import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { LabelVisibility, QuizConfig } from '../domain/types';
import { REGIONS } from '../data/regions';
import { MODE_LIST } from '../modes';
import { useSessionStore } from '../store/sessionStore';
import { useSettingsStore } from '../store/settingsStore';
import { progressStore } from '../services';
import { QUESTION_COUNT_OPTIONS } from '../app/constants';

const LABEL_OPTIONS: { id: LabelVisibility; label: string; hint: string }[] = [
  { id: 'none', label: 'No labels', hint: 'expedition mode' },
  { id: 'some', label: 'Neighbors', hint: 'nearby names shown' },
  { id: 'all', label: 'All labels', hint: 'open atlas' },
];

export function MenuScreen() {
  const startSession = useSessionStore((s) => s.startSession);
  const lastConfig = useSettingsStore((s) => s.lastConfig);
  const setLastConfig = useSettingsStore((s) => s.setLastConfig);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const setSoundOn = useSettingsStore((s) => s.setSoundOn);
  const [config, setConfig] = useState<QuizConfig>(lastConfig);
  const [seen, setSeen] = useState<{ seen: number; mastered: number } | null>(null);

  useEffect(() => {
    void progressStore.summary().then(setSeen);
  }, []);

  const start = () => {
    setLastConfig(config);
    void startSession(config);
  };

  return (
    <motion.div
      className="screen menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="menu-card">
        <p className="menu-eyebrow">terra incognita → terra cognita</p>
        <h1 className="menu-title">Terra</h1>
        <p className="menu-sub">Learn the world by heart.</p>

        <fieldset className="menu-group">
          <legend>Mode</legend>
          <div className="mode-row">
            {MODE_LIST.map((m) => (
              <button
                key={m.id}
                className={`mode-card ${config.mode === m.id ? 'is-active' : ''}`}
                onClick={() => setConfig({ ...config, mode: m.id })}
              >
                <span className="mode-name">{m.label}</span>
                <span className="mode-desc">{m.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="menu-group">
          <legend>Region</legend>
          <div className="chip-row">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                className={`chip ${config.region === r.id ? 'is-active' : ''}`}
                onClick={() => setConfig({ ...config, region: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="menu-row-2">
          <fieldset className="menu-group">
            <legend>Map labels</legend>
            <div className="chip-row">
              {LABEL_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  className={`chip ${config.labels === o.id ? 'is-active' : ''}`}
                  title={o.hint}
                  onClick={() => setConfig({ ...config, labels: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="menu-group">
            <legend>Questions</legend>
            <div className="chip-row">
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`chip ${config.questionCount === n ? 'is-active' : ''}`}
                  onClick={() => setConfig({ ...config, questionCount: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <button className="start-button" onClick={start}>
          Begin expedition
        </button>

        <div className="menu-footer">
          {seen && seen.seen > 0 ? (
            <span className="mono">
              {seen.seen} countries visited · {seen.mastered} mastered
            </span>
          ) : (
            <span className="mono">197 countries await</span>
          )}
          <button className="sound-toggle" onClick={() => setSoundOn(!soundOn)}>
            {soundOn ? 'sound on' : 'sound off'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
