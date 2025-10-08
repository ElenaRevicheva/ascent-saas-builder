import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { useAuth } from '@/hooks/useAuth';

interface ProgressData {
  progressPercentage: number;
  isCompleted: boolean;
  timeSpentMinutes: number;
  vocabularyLearned: string[];
  confidenceScore: number;
}

export const useLearningProgressMutation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const trackProgressMutation = useMutation({
    mutationFn: async ({ moduleId, progressData }: { moduleId: string; progressData: ProgressData }) => {
      if (!user) throw new Error('User not authenticated');

      // Fetch existing progress
      const { data: existingProgress } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existingProgress) {
        // Update existing
        const { data, error } = await supabase
          .from('user_module_progress')
          .update({
            progress_percentage: progressData.progressPercentage,
            is_completed: progressData.isCompleted,
            time_spent_minutes: (existingProgress.time_spent_minutes || 0) + progressData.timeSpentMinutes,
            vocabulary_learned: [...new Set([
              ...(existingProgress.vocabulary_learned || []),
              ...progressData.vocabularyLearned
            ])],
            confidence_score: progressData.confidenceScore,
            completed_at: progressData.isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('user_module_progress')
          .insert({
            user_id: user.id,
            module_id: moduleId,
            progress_percentage: progressData.progressPercentage,
            is_completed: progressData.isCompleted,
            time_spent_minutes: progressData.timeSpentMinutes,
            vocabulary_learned: progressData.vocabularyLearned,
            confidence_score: progressData.confidenceScore,
            completed_at: progressData.isCompleted ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.moduleProgress(user?.id ?? '', variables.moduleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.learningProgress(user?.id ?? '') });
    },
  });

  const recordChatLearningMutation = useMutation({
    mutationFn: async ({ 
      vocabularyLearned, 
      confidence, 
      timeSpentMinutes 
    }: { 
      vocabularyLearned: string[]; 
      confidence: number; 
      timeSpentMinutes: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: user.id,
          session_type: 'chat',
          source: 'dashboard_chat',
          duration_minutes: timeSpentMinutes,
          content: {
            vocabulary_learned: vocabularyLearned,
            confidence_score: confidence
          },
          progress_data: {
            vocabulary_count: vocabularyLearned.length,
            confidence: confidence
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.learningStats(user?.id ?? '') });
    },
  });

  return {
    trackProgress: trackProgressMutation.mutateAsync,
    recordChatLearning: recordChatLearningMutation.mutateAsync,
    isLoading: trackProgressMutation.isPending || recordChatLearningMutation.isPending,
  };
};
