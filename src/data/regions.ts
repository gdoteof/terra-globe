import type { Region } from '../domain/types';

export const REGIONS: { id: Region | 'all'; label: string }[] = [
  { id: 'all', label: 'Whole world' },
  { id: 'africa', label: 'Africa' },
  { id: 'europe', label: 'Europe' },
  { id: 'asia', label: 'Asia' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'north-america', label: 'North America' },
  { id: 'south-america', label: 'South America' },
  { id: 'oceania', label: 'Oceania' },
];
