import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProgressData {
  progressPercentage: number;
  isCompleted: boolean;
  timeSpentMinutes: number;
  vocabularyLearned: string[];
  confidenceScore: number;
}

interface Achievement {
  achievement_type: string;
  achievement_title: string;
  achievement_description: string;
  badge_icon: string;
}

export const useLearningProgress = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

  const trackProgress = useCallback(async (moduleId: string, progressData: ProgressData) => {
    if (!user || isTracking) return;

    setIsTracking(true);
    
    try {
      console.log('Tracking learning progress:', { moduleId, progressData });
      
      const { data, error } = await supabase.functions.invoke('track-learning-progress', {
        body: {
          userId: user.id,
          moduleId,
          progressData
        }
      });

      if (error) throw error;

      // Show achievements if any were earned
      if (data.achievementsEarned && data.achievementsEarned.length > 0) {
        data.achievementsEarned.forEach((achievement: Achievement) => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.achievement_title}`, {
            description: achievement.achievement_description,
            duration: 5000
          });
        });
      }

      // Show streak updates
      if (data.currentStreak > 1) {
        const streakEmoji = data.currentStreak >= 7 ? '🔥' : '✨';
        toast.success(`${streakEmoji} ${data.currentStreak} day learning streak!`);
      }

      return data;
    } catch (error) {
      console.error('Error tracking progress:', error);
      toast.error('Failed to track learning progress');
      return null;
    } finally {
      setIsTracking(false);
    }
  }, [user, isTracking]);

  const recordChatLearning = useCallback(async (
    vocabularyWords: string[] = [],
    confidenceScore: number = 0.7,
    timeSpent: number = 5
  ) => {
    if (!user) return;

    try {
      // Create a learning session for chat interactions
      const { error } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: user.id,
          session_type: 'chat_conversation',
          source: 'dashboard',
          content: {
            vocabulary_learned: vocabularyWords,
            confidence_level: confidenceScore,
            session_duration: timeSpent
          },
          progress_data: {
            vocabulary_count: vocabularyWords.length,
            confidence: confidenceScore
          },
          duration_minutes: timeSpent
        });

      if (error) throw error;

      // Update daily learning streak
      const { error: streakError } = await supabase.functions.invoke('track-learning-progress', {
        body: {
          userId: user.id,
          moduleId: 'chat_session', // Special ID for chat sessions
          progressData: {
            progressPercentage: 100, // Chat sessions are always "complete"
            isCompleted: true,
            timeSpentMinutes: timeSpent,
            vocabularyLearned: vocabularyWords,
            confidenceScore
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Error recording chat learning:', error);
      return false;
    }
  }, [user]);

  return {
    trackProgress,
    recordChatLearning,
    isTracking
  };
};