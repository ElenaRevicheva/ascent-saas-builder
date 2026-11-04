import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';

/*
 * 4 Nov 2026: the roadmap is no longer a pop-up window (it showed 1.5 of 6 steps and could never tick a step).
 * It lives on the dashboard as <FamilyRoadmap /> (always visible, ticks from real data); this header button
 * scrolls to it. The old dialog and its LearningOptions pop-up are in git history (main, before this branch).
 */
export const LearningRoadmap = () => (
  <Button
    size="lg"
    className="rounded-full px-8 py-3 text-lg font-semibold shadow-lg"
    onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
  >
    <Map className="mr-2 h-5 w-5" aria-hidden />
    Your EspaLuz map
  </Button>
);
