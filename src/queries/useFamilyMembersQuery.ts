import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { useAuth } from '@/hooks/useAuth';

interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  age: number | null;
  learning_level: string;
  interests: string[] | null;
  tone: string;
  spanish_preference: number | null;
  english_preference: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fetchFamilyMembers = async (userId: string): Promise<FamilyMember[]> => {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const useFamilyMembersQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.familyMembers(user?.id ?? ''),
    queryFn: () => fetchFamilyMembers(user!.id),
    enabled: !!user,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (member: Omit<FamilyMember, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('family_members')
        .insert({ ...member, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers(user?.id ?? '') });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FamilyMember> }) => {
      const { data, error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers(user?.id ?? '') });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_members')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers(user?.id ?? '') });
    },
  });

  return {
    familyMembers: query.data,
    isLoading: query.isLoading,
    error: query.error,
    addMember: addMemberMutation.mutateAsync,
    updateMember: updateMemberMutation.mutateAsync,
    deleteMember: deleteMemberMutation.mutateAsync,
  };
};
