import { supabase } from '@/integrations/supabase/client';

export const copyAvatarToCurrentUser = async () => {
  try {
    const response = await supabase.functions.invoke('copy-avatar', {
      body: {
        fromUserId: '5fa36928-3201-4c2f-bc27-c30b7a6d36c6',
        toUserId: '47ba0628-27a4-4cd8-9d10-38bc91baf8eb'
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error) {
    console.error('Error copying avatar:', error);
    throw error;
  }
};