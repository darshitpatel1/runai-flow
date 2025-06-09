import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: any;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  // Get current Firebase user and token
  const firebaseToken = await getFirebaseToken();
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(firebaseToken ? { "Authorization": `Bearer ${firebaseToken}` } : {}),
      ...options?.headers
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Empty response for methods like DELETE
  if (res.status === 204) {
    return {};
  }
  
  // Parse JSON for everything else
  try {
    return await res.json();
  } catch (error) {
    console.warn("Response was not JSON", error);
    return {};
  }
}

// Helper function to get Firebase token
async function getFirebaseToken(): Promise<string | null> {
  try {
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn('No user is signed in');
      return null;
    }
    
    // Get the Firebase authentication token
    const token = await currentUser.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get Firebase token for authentication
    const firebaseToken = await getFirebaseToken();
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        ...(firebaseToken ? { "Authorization": `Bearer ${firebaseToken}` } : {})
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Allow data to become stale immediately so invalidations work
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
