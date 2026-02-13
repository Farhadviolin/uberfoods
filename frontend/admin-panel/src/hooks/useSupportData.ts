import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface Ticket {
  id: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  customerName: string;
  customerId: string;
  status: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface SupportAnalytics {
  openTickets: number;
  activeChats: number;
  avgResponseTime: number;
  resolutionRate: number;
  satisfactionScore: number;
  totalTickets: number;
}

export function useSupportData() {
  // Tickets
  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () =>
      api
        .get<Ticket[]>('/support/tickets')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  // Chat Sessions
  const chatsQuery = useQuery({
    queryKey: ['support', 'chats'],
    queryFn: () =>
      api
        .get<ChatSession[]>('/support/chat/sessions')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 10 * 1000, // 10 seconds
    retry: false,
  });

  // Analytics
  const analyticsQuery = useQuery({
    queryKey: ['support', 'analytics'],
    queryFn: () =>
      api
        .get<SupportAnalytics>('/support/analytics')
        .then((res) => res.data)
        .catch(() => ({
          openTickets: 0,
          activeChats: 0,
          avgResponseTime: 0,
          resolutionRate: 0,
          satisfactionScore: 0,
          totalTickets: 0,
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  const isLoading =
    ticketsQuery.isLoading ||
    chatsQuery.isLoading ||
    analyticsQuery.isLoading;

  const error =
    ticketsQuery.error ||
    chatsQuery.error ||
    analyticsQuery.error;

  return {
    tickets: ticketsQuery.data || [],
    chatSessions: chatsQuery.data || [],
    supportAnalytics: analyticsQuery.data,
    isLoading,
    error,
    refetch: () => {
      ticketsQuery.refetch();
      chatsQuery.refetch();
      analyticsQuery.refetch();
    },
  };
}

