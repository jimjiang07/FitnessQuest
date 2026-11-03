import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import type {CoachConfig} from '../../src/types';

// The real coach settings, so tests catch a template the engine needs going missing.
export const coach = parse(readFileSync('data/coach.yaml', 'utf8')) as CoachConfig;
