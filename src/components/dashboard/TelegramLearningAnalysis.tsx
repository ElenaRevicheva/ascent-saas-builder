import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BookOpen, 
  MessageCircle, 
  Clock, 
  Star,
  Lightbulb,
  ArrowRight,
  Award,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface TelegramSession {
  id: string;
  created_at: string;
  duration_minutes: number;
  content: any;
  progress_data: any;
  source: string;
}

interface LearningAnalysisProps {
  session: TelegramSession;
}

export const TelegramLearningAnalysis = ({ session }: LearningAnalysisProps) => {
  console.log('🎯 TelegramLearningAnalysis received session:', {
    id: session.id.substring(0, 8),
    vocabulary: session.progress_data?.vocabulary_learned?.length || 0,
    spanish_words: session.progress_data?.spanish_words_total || 0,
    duration: session.duration_minutes,
    progress_data: session.progress_data,
    content: session.content
  });

  const analyzeLearningProgress = () => {
    const analysis = {
      vocabularyWords: new Set<string>(),
      topics: new Set<string>(),
      emotions: new Set<string>(),
      totalWords: 0,
      totalMessages: 0,
      sessionLength: session.duration_minutes || 0,
      learningLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
      conversationComplexity: 0,
      grammarPoints: 0
    };

    // Extract vocabulary from progress_data
    if (session.progress_data?.vocabulary_learned) {
      console.log('📚 Found vocabulary:', session.progress_data.vocabulary_learned);
      session.progress_data.vocabulary_learned.forEach((word: string) => {
        analysis.vocabularyWords.add(word.toLowerCase());
      });
    }

    // Extract topics and emotions
    if (session.progress_data?.session_emotions) {
      session.progress_data.session_emotions.forEach((emotion: string) => {
        analysis.emotions.add(emotion);
      });
    }

    // Extract learning level from session
    if (session.progress_data?.learning_level) {
      analysis.learningLevel = session.progress_data.learning_level;
    }

    // Extract grammar points
    if (session.progress_data?.grammar_points_total) {
      analysis.grammarPoints = session.progress_data.grammar_points_total;
    }

    // Analyze conversation content
    if (session.content?.user_message && session.content?.bot_response) {
      analysis.totalMessages = session.content?.message_count || 1;
      
      // Count Spanish words in responses
      if (session.progress_data?.spanish_words_total) {
        analysis.totalWords = session.progress_data.spanish_words_total;
      }

      // Determine conversation complexity
      const userMessage = session.content.user_message;
      if (typeof userMessage === 'string') {
        analysis.conversationComplexity = userMessage.split(' ').length;
      }
    }

    // Extract topics from content
    if (session.content?.family_role) {
      analysis.topics.add(session.content.family_role);
    }

    return generateInsights(analysis, session);
  };

  const generateInsights = (analysis: any, sessionData: TelegramSession) => {
    const insights = [];
    const recommendations = [];
    const strengths = [];

    // Vocabulary analysis
    const vocabSize = analysis.vocabularyWords.size;
    if (vocabSize >= 10) {
      strengths.push(`Great vocabulary session - ${vocabSize} words learned!`);
    } else if (vocabSize >= 5) {
      strengths.push(`Good vocabulary building - ${vocabSize} words learned`);
      recommendations.push('Try to use new vocabulary in different contexts to reinforce learning');
    } else if (vocabSize > 0) {
      recommendations.push('Focus on learning 3-5 new words per conversation');
      recommendations.push('Ask the bot to explain new Spanish words you encounter');
    }

    // Session length analysis
    if (analysis.sessionLength >= 6) {
      strengths.push('Great conversation endurance - you engage in meaningful chats');
    } else if (analysis.sessionLength >= 3) {
      recommendations.push('Try extending conversations to 5-7 minutes for deeper learning');
    } else {
      recommendations.push('Aim for longer conversations - ask follow-up questions!');
    }

    // Conversation complexity
    if (analysis.conversationComplexity >= 8) {
      strengths.push('Advanced conversation skills - you use complex sentences!');
    } else if (analysis.conversationComplexity >= 5) {
      recommendations.push('Challenge yourself with longer, more detailed responses');
    } else {
      recommendations.push('Try to elaborate more in your responses - explain your thoughts in detail');
    }

    // Learning level insights
    if (analysis.learningLevel === 'advanced') {
      insights.push('🎓 You\'re at an advanced level! Focus on nuanced expressions and cultural topics');
      recommendations.push('Practice subjunctive mood and complex grammatical structures');
    } else if (analysis.learningLevel === 'intermediate') {
      insights.push('📈 You\'re progressing to intermediate level! Keep building vocabulary');
      recommendations.push('Start using more complex tenses like past perfect and future conditional');
    } else {
      insights.push('🌱 You\'re building a strong foundation! Focus on basic conversations');
      recommendations.push('Practice present tense verbs and common everyday phrases');
    }

    // Session quality insights
    if (analysis.totalWords >= 50) {
      insights.push('🔥 Rich Spanish conversation - lots of vocabulary practice!');
    } else if (analysis.totalWords >= 20) {
      insights.push('👍 Good Spanish usage in this session!');
    }

    if (analysis.grammarPoints >= 3) {
      strengths.push(`Strong grammar practice - ${analysis.grammarPoints} grammar points covered`);
    }

    // Calculate score based on session metrics
    const score = Math.min(100, Math.round(
      (vocabSize * 4) + 
      (analysis.sessionLength * 3) + 
      (analysis.totalWords * 0.5) + 
      (analysis.grammarPoints * 5) +
      (analysis.conversationComplexity * 2)
    ));

    return {
      level: analysis.learningLevel,
      strengths,
      recommendations: recommendations.slice(0, 4), // Limit to 4 recommendations
      score,
      insights,
      metrics: {
        vocabularySize: vocabSize,
        topicDiversity: analysis.topics.size,
        consistency: Math.round(analysis.sessionLength / 7 * 100), // Simple session quality metric
        engagement: analysis.sessionLength >= 5 ? 'high' : analysis.sessionLength >= 3 ? 'medium' : 'low',
        avgSessionLength: Math.round(analysis.sessionLength),
        totalSessions: 1 // This is for a single session
      }
    };
  };

  const learningData = analyzeLearningProgress();
  
  console.log('📊 Final learning analysis results:', {
    vocabularySize: learningData.metrics.vocabularySize,
    score: learningData.score,
    level: learningData.level,
    consistency: learningData.metrics.consistency,
    avgSessionLength: learningData.metrics.avgSessionLength,
    topicDiversity: learningData.metrics.topicDiversity,
    strengths: learningData.strengths,
    recommendations: learningData.recommendations.slice(0, 3)
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'advanced': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'intermediate': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'high': return 'text-emerald-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Learning Level & Score Overview */}
      <Card className="border-border/50 shadow-magical">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
              <div>
                <h3 className="text-lg font-bold">Learning Analysis</h3>
                <p className="text-sm text-muted-foreground font-normal">AI-powered insights from your conversations</p>
              </div>
            </div>
            <Badge className={`${getLevelColor(learningData.level)} font-semibold`}>
              {learningData.level.charAt(0).toUpperCase() + learningData.level.slice(1)} Level
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Learning Score */}
          <div className="text-center p-6 bg-gradient-to-br from-[hsl(var(--espaluz-primary))]/10 to-purple-500/10 rounded-xl border border-[hsl(var(--espaluz-primary))]/20">
            <div className="text-4xl font-bold text-[hsl(var(--espaluz-primary))] mb-2">
              {learningData.score}
            </div>
            <div className="text-sm text-muted-foreground mb-3">Learning Progress Score</div>
            <Progress value={learningData.score} className="w-full h-3" />
            <div className="text-xs text-muted-foreground mt-2">
              Based on vocabulary, consistency, and engagement
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
              <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-blue-600">{learningData.metrics.vocabularySize}</div>
              <div className="text-xs text-muted-foreground">Words Learned</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
              <Target className="h-5 w-5 text-green-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-green-600">{learningData.metrics.consistency}%</div>
              <div className="text-xs text-muted-foreground">Consistency</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-500/20">
              <MessageCircle className="h-5 w-5 text-purple-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-purple-600">{learningData.metrics.topicDiversity}</div>
              <div className="text-xs text-muted-foreground">Topics Explored</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border border-orange-500/20">
              <Clock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-orange-600">{learningData.metrics.avgSessionLength}min</div>
              <div className="text-xs text-muted-foreground">Avg Session</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Achievements */}
      {learningData.strengths.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Award className="h-5 w-5 text-emerald-500" />
              <span>Your Strengths</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {learningData.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-700">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Learning Tips */}
      {learningData.insights.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Learning Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {learningData.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Star className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-blue-700">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized Recommendations */}
      <Card className="border-border/50 shadow-magical">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span>Personalized Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {learningData.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
                <ArrowRight className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-amber-700">{recommendation}</span>
                </div>
              </div>
            ))}
            
            {learningData.recommendations.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Start more conversations to get personalized recommendations!</p>
              </div>
            )}
          </div>
          
          {session && (
            <div className="mt-6 p-4 bg-gradient-to-r from-[hsl(var(--espaluz-primary))]/10 to-purple-500/10 rounded-lg border border-[hsl(var(--espaluz-primary))]/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[hsl(var(--espaluz-primary))]">Keep Learning!</h4>
                  <p className="text-sm text-muted-foreground">Your next conversation awaits</p>
                </div>
                <Button 
                  className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                  onClick={() => window.open('https://t.me/espaluz_bot', '_blank')}
                >
                  Chat Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};