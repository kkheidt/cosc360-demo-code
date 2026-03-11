# Bulletproof React: Setup & Scaling

This document outlines how we structure our React codebase for scalability, maintainability, and clear separation of concerns.

---

## Core Principles

1. **Feature-First Organization** — Each feature (auth, tweets, etc.) is self-contained
2. **API Isolation** — Features never import API calls from other features
3. **Centralized HTTP Client** — All network requests flow through a single `apiClient`
4. **Type Safety** — Shared types in `types/` and feature-specific types in each module

---

## Directory Structure

```
client/src/
├── app/                    # Root App component and routing
├── components/
│   └── ui/                 # Shared UI components (Button, Input, etc.)
├── features/               # Feature modules
│   ├── auth/
│   │   ├── api/            # Auth API functions (login, logout)
│   │   ├── components/     # Auth UI (LoginForm, etc.)
│   │   └── types/          # Auth-specific types (User, etc.)
│   └── tweets/
│       ├── api/            # Tweet API functions (create, list)
│       ├── components/     # Tweet UI (TweetForm, TweetList, etc.)
│       └── types/          # Tweet-specific types (Tweet, etc.)
├── lib/
│   ├── api-client.ts       # Centralized HTTP client
│   ├── auth.tsx            # AuthContext + useAuth hook
│   └── ...                 # Other utilities
└── types/
    └── common.ts           # Shared types across features
```

---

## Key Patterns

### 1. Feature API Functions

Each feature exposes only API functions via `features/*/api/`. Components never call `apiClient` directly.

**Bad:**
```tsx
// In a component
const res = await fetch("/api/tweets", { method: "POST", body: ... });
```

**Good:**
```tsx
// In a component
const tweet = await createTweetApi(content);

// In features/tweets/api/create-tweet.ts
export async function createTweetApi(content: string): Promise<Tweet> {
  const res = await apiClient<Tweet>("/api/tweets", {
    method: "POST",
    body: { content },
  });
  return res.data!;
}
```

**Why:** API changes are isolated to one file per endpoint. Components stay focused on UI logic.

---

### 2. Centralized HTTP Client

All requests use `apiClient` from `lib/api-client.ts`. This is where:
- Auth headers are automatically attached
- Errors are normalized
- Request/response interceptors can be added globally

```ts
// lib/api-client.ts
export async function apiClient<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Auto-attach userId from localStorage
  const userId = localStorage.getItem("userId");
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
```

---

### 3. Feature Isolation

Features should **never** directly import from other features. Use shared context or prop drilling for cross-feature communication.

**Bad:**
```tsx
// In features/tweets/components/TweetList.tsx
import { getCurrentUser } from "@/features/auth/api";  // DON'T DO THIS
```

**Good:**
```tsx
// In features/tweets/components/TweetList.tsx
import { useAuth } from "@/lib/auth";  // Use context instead

export function TweetList() {
  const { user } = useAuth();  // user comes from AuthContext
  // ...
}
```

**Why:** This prevents circular dependencies and makes features independently testable.

---

### 4. Type Organization

- **Shared types** → `src/types/common.ts` (e.g., `ApiResponse<T>`)
- **Feature types** → `features/*/types/` (e.g., `User`, `Tweet`)

Feature types are re-exported from a barrel file for convenience:

```ts
// features/auth/types/index.ts
export type { User, IUser } from "./user";
export type { LoginResponse } from "./login-response";

// Then a component can do:
import { User } from "@/features/auth/types";
```

---

## Scaling: Adding a New Feature

To add a new feature (e.g., `messages`), follow this checklist:

1. **Create the module:**
   ```
   src/features/messages/
   ├── api/             # message.ts, sendMessage.ts, etc.
   ├── components/      # MessageList.tsx, MessageForm.tsx, etc.
   └── types/           # Message.ts, index.ts
   ```

2. **Define types first:**
   ```ts
   // features/messages/types/message.ts
   export interface Message {
     id: string;
     content: string;
     senderId: string;
     createdAt: string;
   }
   ```

3. **Write API functions:**
   ```ts
   // features/messages/api/send-message.ts
   export async function sendMessageApi(
     recipientId: string,
     content: string
   ): Promise<Message> {
     const res = await apiClient<Message>("/api/messages", {
       method: "POST",
       body: { recipientId, content },
     });
     return res.data!;
   }
   ```

4. **Create components:**
   ```tsx
   // features/messages/components/message-form.tsx
   import { sendMessageApi } from "../api/send-message";

   export function MessageForm() {
     const handleSend = async (content: string) => {
       await sendMessageApi(recipientId, content);
     };
     // ...
   }
   ```

5. **No need to modify other features** — Messages is entirely self-contained.

---

## Performance Considerations

### Code Splitting by Feature

With bundlers like Vite, each feature can be lazy-loaded:

```tsx
// app/App.tsx
const TweetPage = lazy(() => import("@/features/tweets/pages/feed"));
const MessagesPage = lazy(() => import("@/features/messages/pages/inbox"));

export function App() {
  return (
    <Routes>
      <Route path="/feed" element={<Suspense fallback={<div>Loading...</div>}><TweetPage /></Suspense>} />
      <Route path="/messages" element={<Suspense fallback={<div>Loading...</div>}><MessagesPage /></Suspense>} />
    </Routes>
  );
}
```

---

### Memoization & Re-render Prevention

Use `React.memo` and `useCallback` in components that receive props from context:

```tsx
import { memo, useCallback } from "react";

export const TweetItem = memo(function TweetItem({ tweet, onDelete }) {
  const handleDelete = useCallback(() => {
    onDelete(tweet.id);
  }, [tweet.id, onDelete]);

  return <div onClick={handleDelete}>{tweet.content}</div>;
});
```

---

### API Call Optimization

Avoid unnecessary refetches:
- Use `useCallback` to memoize API calls
- Store results in state or a caching layer
- Consider debouncing search inputs

```tsx
const fetchTweets = useCallback(async () => {
  const data = await getTweetsApi();
  setTweets(data);
}, []);  // Only created once per component mount
```

---

## Testing Strategy

Each feature should have tests in the same directory:

```
features/tweets/
├── __tests__/
│   ├── create-tweet.test.ts
│   ├── tweet-list.test.tsx
│   └── mock-data.ts
├── api/
├── components/
└── types/
```

**API tests:**
```ts
// Mock apiClient for testing
vi.mock("@/lib/api-client", () => ({
  apiClient: vi.fn(),
}));

it("should create a tweet", async () => {
  const mockTweet = { id: "1", content: "Hello", authorId: "user1", createdAt: "..." };
  vi.mocked(apiClient).mockResolvedValue({ data: mockTweet });

  const result = await createTweetApi("Hello");
  expect(result).toEqual(mockTweet);
});
```

---

## Common Pitfalls to Avoid

1. ❌ **Circular imports:** Feature A imports from Feature B imports from Feature A
2. ❌ **Direct HTTP calls:** Components calling `fetch` directly instead of using `apiClient`
3. ❌ **Shared state without context:** Multiple features managing the same data separately
4. ❌ **API logic in components:** Business logic leaking into UI components
5. ❌ **Ignoring types:** Using `any` instead of defining proper types

---

## Summary

- **Organize by feature**, not by layer
- **Isolate API calls** in `features/*/api/`
- **Use centralized HTTP client** for consistency
- **Prevent circular imports** by keeping features self-contained
- **Scale by adding new features** without touching existing ones
