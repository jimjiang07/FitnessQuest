import type {Exercise} from '../../src/types';

export const makeExercise = (key: string, name: string, gear: string[], cues: string[], say?: string,
  images: string[] = []): Exercise => ({key, name, gear, cues, images, ...(say && {say})});
