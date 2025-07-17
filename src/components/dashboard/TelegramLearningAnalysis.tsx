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
      grammarPoints: 0,
      conversationTopic: '',
      userLanguage: '',
      spanishContent: '',
      practicalContext: ''
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

    // Analyze conversation content for practical insights
    if (session.content?.user_message && session.content?.bot_response) {
      analysis.totalMessages = session.content?.message_count || 1;
      
      const userMessage = session.content.user_message;
      const botResponse = session.content.bot_response;
      
      // Detect conversation topic and context
      if (userMessage && botResponse) {
        analysis.conversationTopic = detectTopicFromConversation(userMessage, botResponse);
        analysis.userLanguage = detectUserLanguage(userMessage);
        analysis.spanishContent = extractSpanishContent(botResponse);
        analysis.practicalContext = extractPracticalContext(userMessage, botResponse);
      }
      
      // Count Spanish words in responses
      if (session.progress_data?.spanish_words_total) {
        analysis.totalWords = session.progress_data.spanish_words_total;
      }

      // Determine conversation complexity
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

  const detectTopicFromConversation = (userMessage: string, botResponse: string): string => {
    const message = userMessage.toLowerCase();
    const response = botResponse.toLowerCase();
    
    if (message.includes('попугая') || message.includes('парrot') || response.includes('loro') || response.includes('parrot')) {
      return 'pet_care';
    }
    if (message.includes('еда') || message.includes('food') || response.includes('comida') || response.includes('alimentar')) {
      return 'food_nutrition';
    }
    if (message.includes('семья') || message.includes('family') || response.includes('familia')) {
      return 'family';
    }
    if (message.includes('путешествие') || message.includes('travel') || response.includes('viaje')) {
      return 'travel';
    }
    return 'general_conversation';
  };

  const detectUserLanguage = (userMessage: string): string => {
    // Simple language detection based on Cyrillic characters
    if (/[а-яё]/i.test(userMessage)) return 'russian';
    if (/[a-z]/i.test(userMessage)) return 'english';
    return 'unknown';
  };

  const extractSpanishContent = (botResponse: string): string => {
    // Extract Spanish phrases in quotes or specific patterns
    const spanishMatches = botResponse.match(/"([^"]*[ñáéíóúü][^"]*)"/g);
    return spanishMatches ? spanishMatches.join(', ') : '';
  };

  const extractPracticalContext = (userMessage: string, botResponse: string): string => {
    if (userMessage.includes('попугая') && botResponse.includes('alimentar')) {
      return 'pet_nutrition_advice';
    }
    return 'general_conversation';
  };

  const generateInsights = (analysis: any, sessionData: TelegramSession) => {
    const insights = [];
    const recommendations = [];
    const strengths = [];
    const practicalExercises = [];
    const contextualLearning = [];

    // Topic-specific practical advice
    const generateTopicSpecificAdvice = () => {
      switch (analysis.conversationTopic) {
        case 'pet_care':
          practicalExercises.push({
            title: '🐦 Pet Care Vocabulary Practice',
            content: 'Practice: "Mi loro come semillas" (My parrot eats seeds). Try describing your pet\'s daily routine in Spanish.',
            action: 'Create 3 sentences about pet care using: alimentar, cuidar, mascota'
          });
          contextualLearning.push('Next time, ask about "¿Cómo entrenar a mi mascota?" (How to train my pet?)');
          break;
        case 'food_nutrition':
          practicalExercises.push({
            title: '🥬 Nutrition Vocabulary Builder',
            content: 'Practice food groups: "Las verduras son nutritivas" (Vegetables are nutritious)',
            action: 'Name 5 foods in Spanish and describe their benefits: "El brócoli tiene vitaminas"'
          });
          contextualLearning.push('Explore: "¿Qué comida es saludable?" (What food is healthy?)');
          break;
        default:
          practicalExercises.push({
            title: '💬 Conversation Skills',
            content: 'Practice asking follow-up questions in Spanish',
            action: 'Learn question words: ¿Qué?, ¿Cómo?, ¿Por qué?, ¿Cuándo?'
          });
      }
    };

    generateTopicSpecificAdvice();

    // Vocabulary-specific practice
    if (analysis.vocabularyWords.size > 0) {
      const words = Array.from(analysis.vocabularyWords);
      practicalExercises.push({
        title: '📚 Today\'s Vocabulary Challenge',
        content: `Use these words in new sentences: ${words.slice(0, 3).join(', ')}`,
        action: `Try: "Hoy aprendí sobre ${words[0]}" (Today I learned about ${words[0]})`
      });

      strengths.push(`Excellent! You learned ${words.length} new words: ${words.join(', ')}`);
    }

    // Language mixing insights
    if (analysis.userLanguage === 'russian') {
      insights.push('🌍 You\'re thinking in Russian - try to form thoughts directly in Spanish for faster fluency');
      recommendations.push('Challenge: Ask your next question directly in Spanish instead of Russian');
    }

    // Grammar contextual advice
    if (analysis.spanishContent) {
      insights.push(`💡 Spanish phrases you encountered: ${analysis.spanishContent.substring(0, 100)}...`);
      practicalExercises.push({
        title: '🎯 Grammar in Context',
        content: 'Practice the verb patterns you just learned',
        action: 'Create your own sentence using the same verb structure'
      });
    }

    // Session length analysis with practical advice
    if (analysis.sessionLength >= 6) {
      strengths.push('Great conversation endurance - you engage in meaningful chats');
      recommendations.push('Perfect length! Try to summarize what you learned: "Hoy aprendí que..."');
    } else if (analysis.sessionLength >= 3) {
      recommendations.push('Extend conversations by asking "¿Puedes explicar más?" (Can you explain more?)');
    } else {
      recommendations.push('Aim for longer chats - ask "¿Qué más?" (What else?) to continue topics');
    }

    // Learning level insights with next steps
    if (analysis.learningLevel === 'intermediate') {
      insights.push('📈 Intermediate level! Ready for complex topics like culture and opinions');
      contextualLearning.push('Try discussing: "¿Cuál es tu opinión sobre...?" (What\'s your opinion about...?)');
    } else {
      insights.push('🌱 Building foundation! Focus on daily situations and basic needs');
      contextualLearning.push('Practice everyday scenarios: ordering food, asking directions');
    }

    // Session quality insights
    if (analysis.totalWords >= 50) {
      insights.push('🔥 Rich vocabulary session! You\'re absorbing lots of Spanish naturally');
      recommendations.push('Review and use these words in your next conversation');
    }

    if (analysis.grammarPoints >= 3) {
      strengths.push(`Strong grammar focus - ${analysis.grammarPoints} structures practiced`);
      practicalExercises.push({
        title: '📝 Grammar Reinforcement',
        content: 'Practice the grammar patterns you just used',
        action: 'Write 2 sentences using the same grammar structure'
      });
    }

    // Calculate score
    const score = Math.min(100, Math.round(
      (analysis.vocabularyWords.size * 4) + 
      (analysis.sessionLength * 3) + 
      (analysis.totalWords * 0.5) + 
      (analysis.grammarPoints * 5) +
      (analysis.conversationComplexity * 2)
    ));

    return {
      level: analysis.learningLevel,
      strengths,
      recommendations: recommendations.slice(0, 3),
      score,
      insights,
      vocabularyWords: Array.from(analysis.vocabularyWords),
      practicalExercises,
      contextualLearning,
      conversationTopic: analysis.conversationTopic,
      metrics: {
        vocabularySize: analysis.vocabularyWords.size,
        topicDiversity: analysis.topics.size,
        consistency: Math.round(analysis.sessionLength / 7 * 100),
        engagement: analysis.sessionLength >= 5 ? 'high' : analysis.sessionLength >= 3 ? 'medium' : 'low',
        avgSessionLength: Math.round(analysis.sessionLength),
        totalSessions: 1
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

      {/* Vocabulary Words */}
      {learningData.vocabularyWords && learningData.vocabularyWords.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-green-500" />
            <h4 className="font-semibold text-green-700">Vocabulary Learned ({learningData.vocabularyWords.length} words)</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {learningData.vocabularyWords.map((word: string, index: number) => (
              <Badge key={index} variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                {String(word)}
              </Badge>
            ))}
          </div>
        </div>
      )}

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

      {/* Practical Exercises */}
      {learningData.practicalExercises && learningData.practicalExercises.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Target className="h-5 w-5 text-indigo-500" />
              <span>Practice Exercises</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningData.practicalExercises.map((exercise: any, index: number) => (
                <div key={index} className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-700 mb-2">{exercise.title}</h4>
                  <p className="text-sm text-indigo-600 mb-3">{exercise.content}</p>
                  <div className="p-3 bg-indigo-100 rounded border border-indigo-300">
                    <p className="text-xs font-medium text-indigo-800">Try this: {exercise.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Learning Steps */}
      {learningData.contextualLearning && learningData.contextualLearning.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-purple-500" />
              <span>Next Learning Steps</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {learningData.contextualLearning.map((step: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <MessageCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-purple-700">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Recommendations */}
      <Card className="border-border/50 shadow-magical">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span>Quick Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {learningData.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-700">{recommendation}</span>
              </div>
            ))}
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