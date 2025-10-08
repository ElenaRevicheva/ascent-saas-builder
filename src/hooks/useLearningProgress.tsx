import { useLearningProgressMutation } from '@/queries/useLearningProgressMutation';

export interface ProgressData {
  progressPercentage: number;
  isCompleted: boolean;
  timeSpentMinutes: number;
  vocabularyLearned: string[];
  confidenceScore: number;
}

// Re-export with backwards-compatible interface
export const useLearningProgress = () => {
  const { trackProgress, recordChatLearning, isLoading } = useLearningProgressMutation();

  return {
    trackProgress: async (moduleId: string, progressData: ProgressData) => {
      try {
        await trackProgress({ moduleId, progressData });
        console.log('Progress tracked successfully');
      } catch (error) {
        console.error('Error tracking progress:', error);
      }
    },
    recordChatLearning: async (vocabularyLearned: string[], confidence: number, timeSpentMinutes: number) => {
      try {
        await recordChatLearning({ vocabularyLearned, confidence, timeSpentMinutes });
        console.log('Chat learning session recorded successfully');
      } catch (error) {
        console.error('Error recording chat learning:', error);
      }
    },
    loading: isLoading,
  };
};
