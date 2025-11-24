import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    const { moduleId, progressData } = await req.json();
    
    if (!moduleId || !progressData) {
      throw new Error('Missing required parameters');
    }

    console.log(`Tracking progress for user ${userId}, module ${moduleId}`);

    // Update module progress
    const { error: progressError } = await supabase
      .from('user_module_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        progress_percentage: progressData.progressPercentage,
        is_completed: progressData.isCompleted,
        completed_at: progressData.isCompleted ? new Date().toISOString() : null,
        time_spent_minutes: progressData.timeSpentMinutes,
        vocabulary_learned: progressData.vocabularyLearned || [],
        confidence_score: progressData.confidenceScore || 0
      });

    if (progressError) throw progressError;

    // Update learning streak
    const today = new Date().toISOString().split('T')[0];
    
    // Get current streak data
    const { data: streakData, error: streakFetchError } = await supabase
      .from('learning_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    let currentStreak = 1;
    let longestStreak = 1;

    if (streakData) {
      const lastActivityDate = new Date(streakData.last_activity_date);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, no change in streak
        currentStreak = streakData.current_streak;
        longestStreak = streakData.longest_streak;
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        currentStreak = streakData.current_streak + 1;
        longestStreak = Math.max(currentStreak, streakData.longest_streak);
      } else {
        // Streak broken, reset to 1
        currentStreak = 1;
        longestStreak = streakData.longest_streak;
      }
    }

    // Update streak
    const { error: streakError } = await supabase
      .from('learning_streaks')
      .upsert({
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: today
      });

    if (streakError) throw streakError;

    // Check for achievements
    const achievements = await checkForAchievements(supabase, userId, {
      currentStreak,
      longestStreak,
      moduleCompleted: progressData.isCompleted,
      vocabularyCount: progressData.vocabularyLearned?.length || 0
    });

    console.log(`Progress tracked successfully. Current streak: ${currentStreak}, Achievements earned: ${achievements.length}`);

    return new Response(JSON.stringify({
      success: true,
      currentStreak,
      longestStreak,
      achievementsEarned: achievements
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error tracking learning progress:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function checkForAchievements(supabase: any, userId: string, data: any) {
  const achievements = [];

  // Get user's current progress data
  const { data: userProgress } = await supabase
    .from('user_module_progress')
    .select('*')
    .eq('user_id', userId);

  const completedModules = userProgress?.filter((p: any) => p.is_completed)?.length || 0;

  // Check existing achievements to avoid duplicates
  const { data: existingAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_type')
    .eq('user_id', userId);

  const existingTypes = existingAchievements?.map((a: any) => a.achievement_type) || [];

  // First Module Achievement
  if (data.moduleCompleted && completedModules === 1 && !existingTypes.includes('first_module')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'first_module',
      achievement_title: 'First Steps',
      achievement_description: 'Completed your first learning module!',
      badge_icon: 'star'
    });
  }

  // Streak Achievements
  if (data.currentStreak >= 7 && !existingTypes.includes('week_streak')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'week_streak',
      achievement_title: 'Week Warrior',
      achievement_description: 'Maintained a 7-day learning streak!',
      badge_icon: 'fire'
    });
  }

  if (data.currentStreak >= 30 && !existingTypes.includes('month_streak')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'month_streak',
      achievement_title: 'Dedication Master',
      achievement_description: 'Incredible! 30-day learning streak achieved!',
      badge_icon: 'trophy'
    });
  }

  // Module Completion Achievements
  if (completedModules >= 5 && !existingTypes.includes('five_modules')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'five_modules',
      achievement_title: 'Learning Champion',
      achievement_description: 'Completed 5 learning modules!',
      badge_icon: 'award'
    });
  }

  // Vocabulary Achievements
  const totalVocabulary = userProgress?.flatMap((p: any) => p.vocabulary_learned || []) || [];
  const uniqueWords = [...new Set(totalVocabulary)].length;
  
  if (uniqueWords >= 50 && !existingTypes.includes('vocabulary_50')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'vocabulary_50',
      achievement_title: 'Word Collector',
      achievement_description: 'Learned 50 unique Spanish words!',
      badge_icon: 'book'
    });
  }

  if (uniqueWords >= 100 && !existingTypes.includes('vocabulary_100')) {
    achievements.push({
      user_id: userId,
      achievement_type: 'vocabulary_100',
      achievement_title: 'Vocabulary Master',
      achievement_description: 'Amazing! 100 unique Spanish words learned!',
      badge_icon: 'brain'
    });
  }

  // Insert new achievements
  if (achievements.length > 0) {
    const { error } = await supabase
      .from('user_achievements')
      .insert(achievements);

    if (error) {
      console.error('Error inserting achievements:', error);
      return [];
    }
  }

  return achievements;
}