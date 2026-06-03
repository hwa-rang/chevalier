import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** Lets non-screen code (e.g. the global time-transition overlay) drive navigation. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
