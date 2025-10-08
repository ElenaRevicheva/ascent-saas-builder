import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { useAuth } from '@/hooks/useAuth';

interface ConnectedBot {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string | null;
  connected_at: string;
  last_activity: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fetchConnectedBots = async (userId: string): Promise<ConnectedBot[]> => {
  const { data, error } = await supabase
    .from('connected_bots')
    .select('*')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const useConnectedBotsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.connectedBots(user?.id ?? ''),
    queryFn: () => fetchConnectedBots(user!.id),
    enabled: !!user,
  });

  const updateBotActivityMutation = useMutation({
    mutationFn: async (botId: string) => {
      const { data, error } = await supabase
        .from('connected_bots')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', botId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connectedBots(user?.id ?? '') });
    },
  });

  return {
    connectedBots: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateBotActivity: updateBotActivityMutation.mutateAsync,
    hasTelegramBot: query.data?.some(bot => bot.platform === 'telegram' && bot.is_active) || false,
  };
};
