// Centralized query keys for React Query
export const queryKeys = {
  subscription: (userId: string) => ['subscription', userId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  learningProgress: (userId: string) => ['learningProgress', userId] as const,
  moduleProgress: (userId: string, moduleId: string) => ['moduleProgress', userId, moduleId] as const,
  connectedBots: (userId: string) => ['connectedBots', userId] as const,
  referrals: (userId: string) => ['referrals', userId] as const,
  familyMembers: (userId: string) => ['familyMembers', userId] as const,
  learningStats: (userId: string) => ['learningStats', userId] as const,
  achievements: (userId: string) => ['achievements', userId] as const,
} as const;
