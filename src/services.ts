// Service singletons — the single swap point when a backend arrives.
import { StaticContentSource, type ContentSource } from './data/ContentSource';
import { LocalStorageProgressStore } from './progress/localStorageProgressStore';
import type { ProgressStore } from './progress/ProgressStore';

export const contentSource: ContentSource = new StaticContentSource();
export const progressStore: ProgressStore = new LocalStorageProgressStore(window.localStorage);
