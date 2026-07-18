import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import type { ChatResponse } from '../types';

export function useChat() {
  const location = useLocation();
  const isLive = location.pathname.startsWith('/aws');
  return useMutation<ChatResponse, Error, string>({
    mutationFn: (message) => api.chat(message, isLive),
  });
}
