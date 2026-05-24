/**
 * React Query Client
 * Dùng chung cho toàn bộ app
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 phút
      gcTime: 30 * 60 * 1000,     // 30 phút
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
