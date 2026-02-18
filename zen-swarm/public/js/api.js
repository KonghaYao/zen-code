// Import tRPC client from esm.sh
import { createTRPCProxyClient, httpBatchLink } from 'https://esm.sh/@trpc/client@11.10.0';

// tRPC client configuration
export const apiClient = createTRPCProxyClient({
    links: [
        httpBatchLink({
            url: '/api/trpc',
            headers: {
                'Content-Type': 'application/json',
            },
        }),
    ],
});
