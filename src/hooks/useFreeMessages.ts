import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const FREE_MESSAGE_LIMIT = 20;
const STORAGE_KEY = 'espaluz-free-messages';

export const useFreeMessages = () => {
  const { user } = useAuth();
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load free messages count from localStorage on component mount
  useEffect(() => {
    if (!user) {
      // For non-authenticated users, use localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const count = parseInt(stored, 10);
          setFreeMessagesUsed(isNaN(count) ? 0 : count);
        } catch (error) {
          console.error('Error parsing stored free messages count:', error);
          setFreeMessagesUsed(0);
        }
      } else {
        setFreeMessagesUsed(0);
      }
      setLoading(false);
    } else {
      // For authenticated users, we'll implement database storage later
      // For now, still use localStorage but with user-specific key
      const userStorageKey = `${STORAGE_KEY}-${user.id}`;
      const stored = localStorage.getItem(userStorageKey);
      if (stored) {
        try {
          const count = parseInt(stored, 10);
          setFreeMessagesUsed(isNaN(count) ? 0 : count);
        } catch (error) {
          console.error('Error parsing stored free messages count:', error);
          setFreeMessagesUsed(0);
        }
      } else {
        setFreeMessagesUsed(0);
      }
      setLoading(false);
    }
  }, [user]);

  // Save to localStorage whenever count changes
  useEffect(() => {
    if (!loading) {
      const storageKey = user ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;
      localStorage.setItem(storageKey, freeMessagesUsed.toString());
    }
  }, [freeMessagesUsed, user, loading]);

  const incrementMessageCount = () => {
    setFreeMessagesUsed(prev => prev + 1);
  };

  const resetMessageCount = () => {
    setFreeMessagesUsed(0);
  };

  const remainingMessages = Math.max(0, FREE_MESSAGE_LIMIT - freeMessagesUsed);
  const hasReachedLimit = freeMessagesUsed >= FREE_MESSAGE_LIMIT;
  const isNearLimit = remainingMessages <= 5;

  return {
    freeMessagesUsed,
    remainingMessages,
    hasReachedLimit,
    isNearLimit,
    incrementMessageCount,
    resetMessageCount,
    loading,
    FREE_MESSAGE_LIMIT
  };
};