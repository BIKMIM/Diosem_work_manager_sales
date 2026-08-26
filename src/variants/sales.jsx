/* eslint-disable react-refresh/only-export-components */
import { DEFAULT_SEPARATION_PAIRS, WORKERS } from '../data/workers.js';
import { loadSeparationPairs, saveSeparationPairs } from '../utils/storage.js';
import { checkSeparationViolations } from '../utils/validators.js';
import Settings from '../components/Settings.jsx';
import ViolationResults from '../components/ViolationResults.jsx';

export const APP_CONFIG = {
  variant: 'sales',
  teamName: '영업팀',
  enableSeparation: true,
  version: '2.0.0',
  releaseDate: '2026-08-26'
};

export const getInitialVariantState = () => {
  const savedPairs = loadSeparationPairs();
  const candidatePairs = Array.isArray(savedPairs) && savedPairs.length > 0
    ? savedPairs
    : DEFAULT_SEPARATION_PAIRS;

  return candidatePairs.filter(pair => (
    Array.isArray(pair) &&
    pair.length === 2 &&
    WORKERS.includes(pair[0]) &&
    WORKERS.includes(pair[1])
  ));
};

export const saveVariantState = saveSeparationPairs;

export const analyzeVariant = (dailyData, separationPairs) => (
  checkSeparationViolations(dailyData, separationPairs)
);

export function VariantSettings({ variantState, onVariantStateChange, onClose }) {
  return (
    <Settings
      separationPairs={variantState}
      onSeparationChange={onVariantStateChange}
      onClose={onClose}
    />
  );
}

export function VariantResults({ results }) {
  return <ViolationResults violations={results} />;
}
