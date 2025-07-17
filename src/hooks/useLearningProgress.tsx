
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface ProgressData {
  progressPercentage: number;
  isCompleted: boolean;
  timeSpentMinutes: number;
  vocabularyLearned: string[];
  confidenceScore: number;
}

export const useLearningProgress = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const trackProgress = async (moduleId: string, progressData: ProgressData) => {
    if (!user) {
      console.error('No user found for progress tracking');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Tracking progress for module:', moduleId, progressData);
      
      // Try to update existing progress first
      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await supabase
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
          .eq('id', existingProgress.id);

        if (updateError) throw updateError;
      } else {
        // Create new progress record
        const { error: insertError } = await supabase
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
          });

        if (insertError) throw insertError;
      }

      console.log('Progress tracked successfully');
      
    } catch (error) {
      console.error('Error tracking progress:', error);
      // Don't show error toast - just log it and continue
      // toast.error('Failed to save progress');
    } finally {
      setLoading(false);
    }
  };

  return {
    trackProgress,
    loading
  };
};
