# Data Flow Walkthrough

A step-by-step guide showing how data travels from a button click in React, through the network to the Express server, and back to the screen. We'll trace **two complete flows**: posting a tweet (POST) and logging in (POST with state persistence).

---

## How to Read This Guide

Each flow is broken into **numbered steps**. Every step shows:

- **What happens** in plain English
- **Which file** the code lives in
- **The relevant code snippet**

Look for the `-->` arrows — they show data moving from one layer to the next.

---

## Architecture Overview

```
React Component          (handles user interaction + state)
  --> Feature API fn     (calls the fetch wrapper)
    --> api-client       (attaches headers, sends HTTP request)
      --> Vite proxy      (rewrites /api to localhost:4000)

        ~~~~ network ~~~~

      --> Express Router   (matches URL to handler)
        --> Middleware      (auth check)
          --> Controller   (validates input, calls service)
            --> Service    (business logic)
              --> Repository (reads/writes JSON file)
            <-- Service    (returns data)
          <-- Controller   (sends JSON response)

        ~~~~ network ~~~~

      <-- api-client       (parses JSON response)
    <-- Feature API fn     (extracts .data)
  <-- React Component      (updates state --> re-render)
```

---

## Flow 1: Creating a Tweet (POST /api/tweets)

The user types "Hello world" into the textarea and clicks **Tweet**.

---

### Step 1 — User clicks "Tweet" (React Component)

**File:** `client/src/features/tweets/components/create-tweet-form.tsx`

The `<form>` fires its `onSubmit` handler. React calls `handleSubmit`:

```tsx
async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
  e.preventDefault();              // stop page reload
  if (!content.trim()) return;     // guard: empty tweet

  setIsSubmitting(true);           // disable button, show "Posting..."
  try {
    await createTweetApi(content); // --> Step 2
    setContent("");                // clear textarea
    onCreate();                    // tell parent to re-fetch tweets (Step 10)
  } catch {
    // silently fail
  } finally {
    setIsSubmitting(false);        // re-enable button
  }
}
```

**What moves forward:** the string `"Hello world"` is passed to `createTweetApi()`.

---

### Step 2 — Feature API function wraps the call

**File:** `client/src/features/tweets/api/create-tweet.ts`

This thin function exists so components never deal with URLs or HTTP methods directly:

```ts
export async function createTweetApi(content: string): Promise<Tweet> {
  const res = await apiClient<Tweet>("/api/tweets", {
    method: "POST",
    body: { content },    // --> becomes JSON: {"content":"Hello world"}
  });
  return res.data!;       // unwrap the { data: ... } envelope
}
```

**What moves forward:** URL `/api/tweets`, method `POST`, body `{ content: "Hello world" }` — all passed to `apiClient()`.

---

### Step 3 — The fetch wrapper adds auth and sends the request

**File:** `client/src/lib/api-client.ts`

This is the single place where every HTTP request is built:

```ts
export async function apiClient<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body } = options;

  // 1. Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // 2. Auto-attach auth from localStorage
  const userId: string | null = localStorage.getItem("userId");
  if (userId) {
    headers["X-User-Id"] = userId;   // e.g. "a1b2c3d4-..."
  }

  // 3. Fire the actual fetch
  const response: Response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 4. Parse response
  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
```

**What goes over the wire:**

```
POST /api/tweets HTTP/1.1
Content-Type: application/json
X-User-Id: a1b2c3d4-...

{"content":"Hello world"}
```

---

### Step 4 — Vite dev server proxies the request

**File:** `client/vite.config.ts`

In development, the React app runs on `localhost:5173`. The browser sends the request to `5173`, but Vite intercepts anything starting with `/api` and forwards it:

```ts
server: {
  proxy: {
    "/api": "http://localhost:4000",
  },
},
```

`POST /api/tweets` on port 5173 --> `POST /api/tweets` on port 4000 (Express).

> This means the browser never talks to port 4000 directly — no CORS issues.

---

### Step 5 — Express router matches the route

**File:** `server/src/modules/tweet/tweet.routes.ts`

Express matches `POST /api/tweets` to this line:

```ts
tweetRoutes.post("/", authMiddleware, tweetController.create);
//                     ^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^
//                     runs first       runs second
```

The route has **two handlers** chained. Express runs `authMiddleware` first.

---

### Step 6 — Auth middleware validates the user

**File:** `server/src/middleware/auth.middleware.ts`

```ts
export function authMiddleware(
  req: Request, res: Response, next: NextFunction
): void {
  // 1. Read header
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!userId) {
    res.status(401).json({ error: "Missing X-User-Id header" });
    return;           // STOP here — controller never runs
  }

  // 2. Verify user exists in our data
  const user = authRepository.findById(userId);
  if (!user) {
    res.status(401).json({ error: "Invalid user" });
    return;           // STOP here
  }

  // 3. Attach userId to request for downstream use
  req.userId = userId;
  next();             // PASS — continue to controller
}
```

If the header is missing or the user ID doesn't exist in `users.json`, the request **stops here** with a 401. Otherwise, `req.userId` is set and `next()` passes control to the controller.

---

### Step 7 — Controller validates input and delegates to service

**File:** `server/src/modules/tweet/tweet.controller.ts`

```ts
export function create(req: Request, res: Response): void {
  // 1. Extract body
  const { content } = req.body as { content: string };

  // 2. Validate
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  // 3. Delegate to service (business logic)
  const tweet = tweetService.create(content.trim(), req.userId!);

  // 4. Send response
  res.status(201).json({ data: tweet });
}
```

**Controller's job:** validate input, call service, choose HTTP status code, shape the response. It does NOT contain business logic.

---

### Step 8 — Service runs business logic

**File:** `server/src/modules/tweet/tweet.service.ts`

```ts
export function create(content: string, authorId: string): ITweet {
  const tweet: Tweet = Tweet.create(content, authorId);
  //                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                   Domain class generates id + createdAt
  return tweetRepository.save(tweet.toJSON());
}
```

The `Tweet.create()` factory (in `domain/classes/Tweet.ts`) generates a UUID and timestamp:

```ts
static create(content: string, authorId: string): Tweet {
  return new Tweet(uuidv4(), content, authorId, new Date().toISOString());
}
```

**Service's job:** orchestrate domain objects and repository calls. If this were more complex, authorization checks and cross-module logic would live here.

---

### Step 9 — Repository persists to the JSON file

**File:** `server/src/modules/tweet/tweet.repository.ts`

```ts
export function save(tweet: ITweet): ITweet {
  const tweets: ITweet[] = readTweets();       // read tweets.json into memory
  const index = tweets.findIndex((t) => t.id === tweet.id);
  if (index >= 0) {
    tweets[index] = tweet;  // update existing
  } else {
    tweets.push(tweet);     // insert new
  }
  writeTweets(tweets);      // write entire array back to tweets.json
  return tweet;
}
```

After this, `tweets.json` on disk now contains:

```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "content": "Hello world",
    "authorId": "a1b2c3d4-...",
    "createdAt": "2026-03-10T14:30:00.000Z"
  }
]
```

**The data has been saved.** Now the response travels back up.

---

### Step 9 → 7 — Response travels back up the server layers

The repository returns the tweet object → service returns it → controller wraps it:

```ts
res.status(201).json({ data: tweet });
```

**HTTP response sent:**

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "id": "f47ac10b-...",
    "content": "Hello world",
    "authorId": "a1b2c3d4-...",
    "createdAt": "2026-03-10T14:30:00.000Z"
  }
}
```

---

### Step 10 — Response arrives back in the browser

The `apiClient` in Step 3 receives the response, parses JSON, checks `response.ok` (201 is ok), and returns `{ data: { id, content, ... } }`.

`createTweetApi` in Step 2 unwraps `res.data!` and returns the `Tweet` object.

`handleSubmit` in Step 1 receives it, clears the textarea, then calls `onCreate()`:

```tsx
await createTweetApi(content);  // done!
setContent("");                 // clear form
onCreate();                     // --> parent's fetchTweets()
```

---

### Step 11 — Parent re-fetches all tweets to update the feed

**File:** `client/src/features/tweets/components/tweet-list.tsx`

`onCreate` is actually `fetchTweets`, passed as a prop from `FeedPage`:

```tsx
<CreateTweetForm onCreate={fetchTweets} />
```

```tsx
const fetchTweets = useCallback(async (): Promise<void> => {
  try {
    const data = await getTweetsApi();  // GET /api/tweets
    setTweets(data);                    // update state --> React re-renders
  } catch {
    // silently fail
  } finally {
    setIsLoading(false);
  }
}, []);
```

This fires `GET /api/tweets`, which goes through the same layers (minus auth middleware since GET is public), and returns all tweets with their author info attached. React updates state, the component re-renders, and the new tweet appears in the feed.

---

## Flow 2: Logging In (POST /api/auth/login)

The user types "alice" and clicks **Log in**.

---

### Step 1 — Form submits in LoginForm

**File:** `client/src/features/auth/components/login-form.tsx`

```tsx
async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
  e.preventDefault();
  setError("");
  setIsSubmitting(true);

  try {
    const user = await loginApi(username);  // --> Step 2
    login(user);                            // --> Step 5 (save to context)
    navigate("/feed");                      // redirect
  } catch (err) {
    setError(err instanceof Error ? err.message : "Login failed");
  } finally {
    setIsSubmitting(false);
  }
}
```

---

### Step 2 — loginApi calls the fetch wrapper

**File:** `client/src/features/auth/api/login.ts`

```ts
export async function loginApi(username: string): Promise<User> {
  const res = await apiClient<User>("/api/auth/login", {
    method: "POST",
    body: { username },
  });
  return res.data!;
}
```

Note: No `X-User-Id` header is sent yet (the user isn't logged in), but `apiClient` handles that gracefully — it only attaches the header if `localStorage.getItem("userId")` returns something.

---

### Step 3 — Express route matches, no auth middleware needed

**File:** `server/src/modules/auth/auth.routes.ts`

```ts
authRoutes.post("/login", authController.login);  // no authMiddleware!
```

Login is a public endpoint — no middleware guard.

---

### Step 4 — Controller → Service → Repository

**Controller** (`auth.controller.ts`) validates username, calls service:

```ts
const user = authService.login(username.trim());
res.json({ data: user });
```

**Service** (`auth.service.ts`) either finds or creates the user:

```ts
export function login(username: string): IUser {
  const existing = authRepository.findByUsername(username);
  if (existing) {
    return existing;          // returning user? welcome back
  }
  const user = User.create(username);  // new user? create one
  return authRepository.save(user.toJSON());
}
```

**Repository** (`auth.repository.ts`) reads/writes `users.json` — same pattern as tweet repository.

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "username": "alice",
    "createdAt": "2026-03-10T14:00:00.000Z"
  }
}
```

---

### Step 5 — Client saves user to Context + localStorage

Back in `login-form.tsx`, the returned user object hits `login(user)`:

**File:** `client/src/lib/auth.tsx`

```tsx
function login(user: User): void {
  localStorage.setItem("userId", user.id);  // persist for page refresh
  setUser(user);                            // update React context
}
```

This does two critical things:

1. **`localStorage.setItem("userId", ...)`** — so `apiClient` will attach `X-User-Id` on all future requests, and the user stays logged in across page refreshes.
2. **`setUser(user)`** — updates `AuthContext`, which causes any component calling `useAuth()` to re-render with the new user.

Then `navigate("/feed")` sends the user to the feed page.

---

## Summary: The Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Component** | `features/*/components/` | User interaction, form state, call API fns, update UI |
| **Feature API** | `features/*/api/` | Map actions to HTTP calls, unwrap response envelope |
| **API Client** | `lib/api-client.ts` | Attach auth header, serialize/deserialize JSON, error handling |
| **Vite Proxy** | `vite.config.ts` | Forward `/api` requests to Express in development |
| **Router** | `modules/*/routes.ts` | Map HTTP method + URL to middleware + controller |
| **Middleware** | `middleware/` | Cross-cutting concerns (auth check) before controller |
| **Controller** | `modules/*/controller.ts` | Validate input, call service, choose status code, shape response |
| **Service** | `modules/*/service.ts` | Business logic, orchestrate domain objects + repositories |
| **Repository** | `modules/*/repository.ts` | Data access — read/write JSON files (would be a DB in production) |

---

## Key Takeaway

Data always flows in one direction through clearly separated layers. Each layer has a single job and only talks to its immediate neighbor. This makes the code predictable: if there's a bug in how tweets are saved, you look at the repository. If the wrong status code is returned, you look at the controller. If the auth header is missing, you look at the middleware or api-client.
