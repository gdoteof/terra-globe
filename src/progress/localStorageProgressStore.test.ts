import { describe, expect, it } from 'vitest';
import { LocalStorageProgressStore } from './localStorageProgressStore';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    dump: map,
  };
}

describe('LocalStorageProgressStore', () => {
  it('records Leitner transitions and persists across instances', async () => {
    const storage = memoryStorage();
    const store = new LocalStorageProgressStore(storage);
    await store.record({ featureId: 'country:fr', correct: true, answeredAt: 1000 });
    await store.record({ featureId: 'country:fr', correct: true, answeredAt: 2000 });
    await store.record({ featureId: 'country:fr', correct: false, answeredAt: 3000 });

    const reloaded = new LocalStorageProgressStore(storage);
    const rec = (await reloaded.getAll()).get('country:fr')!;
    expect(rec).toMatchObject({ attempts: 3, correct: 2, box: 0, lastAskedAt: 3000 });
  });

  it('summarizes seen and mastered', async () => {
    const store = new LocalStorageProgressStore(memoryStorage());
    for (let i = 0; i < 4; i++) {
      await store.record({ featureId: 'country:de', correct: true, answeredAt: i });
    }
    await store.record({ featureId: 'country:it', correct: false, answeredAt: 9 });
    expect(await store.summary()).toEqual({ seen: 2, mastered: 1 });
  });

  it('survives a corrupted blob', async () => {
    const storage = memoryStorage();
    storage.setItem('geo.progress.v1', '{not json');
    const store = new LocalStorageProgressStore(storage);
    expect((await store.getAll()).size).toBe(0);
  });
});
