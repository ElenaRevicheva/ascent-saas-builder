import { supabase } from '@/integrations/supabase/client';

export const callCopyAvatar = async () => {
  console.log('🔄 Starting avatar copy process...');
  
  try {
    const response = await supabase.functions.invoke('copy-avatar', {
      body: {
        fromUserId: '5fa36928-3201-4c2f-bc27-c30b7a6d36c6',
        toUserId: '47ba0628-27a4-4cd8-9d10-38bc91baf8eb'
      }
    });

    console.log('📤 Copy avatar response:', response);

    if (response.error) {
      console.error('❌ Copy avatar error:', response.error);
      throw response.error;
    }

    console.log('✅ Copy avatar successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('💥 Error calling copy avatar:', error);
    throw error;
  }
};