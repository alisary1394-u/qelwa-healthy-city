import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh, no refetch on mount
			gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache
		},
	},
});