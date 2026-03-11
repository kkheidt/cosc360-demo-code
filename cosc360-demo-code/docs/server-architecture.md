# Server Architecture: Setup & Scaling

This document describes our Express server architecture, the layered request flow, and how to scale by adding new modules.

---

## Core Principles

1. **Layered Architecture** — Request flows through Router → Middleware → Controller → Service → Repository
2. **Module-Scoped Domain** — Each module owns its domain logic (entities, types, business rules)
3. **Separation of Concerns** — Controllers validate, Services orchestrate, Repositories persist
4. **Type Safety** — Domain types define the contract for each module

---

## Directory Structure

```
server/src/
├── middleware/           # Global middleware (auth, logging, etc.)
│   └── auth.middleware.ts
├── modules/              # Feature modules
│   ├── auth/
│   │   ├── domain/       # Auth domain (User class, types, constants)
│   │   │   ├── classes/
│   │   │   │   └── User.ts
│   │   │   ├── types/
│   │   │   │   └── user.types.ts
│   │   │   └── constants/
│   │   ├── api/
│   │   │   └── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.repository.ts
│   └── tweet/
│       ├── domain/       # Tweet domain (Tweet class, types, constants)
│       │   ├── classes/
│       │   │   └── Tweet.ts
│       │   ├── types/
│       │   │   └── tweet.types.ts
│       │   └── constants/
│       ├── api/
│       │   └── tweet.routes.ts
│       ├── tweet.controller.ts
│       ├── tweet.service.ts
│       └── tweet.repository.ts
├── data/                 # Persistence layer (JSON files in dev)
│   ├── users.json
│   └── tweets.json
└── index.ts              # Express app setup
```

**Key Change:** Domain logic (classes, types, constants) is now **module-scoped**, not top-level. This means each module is completely self-contained.

---

## Layer Responsibilities

### 1. Router (`modules/*/api/*.routes.ts`)

Maps HTTP methods + URLs to middleware and handlers.

```ts
// modules/tweet/api/tweet.routes.ts
export const tweetRoutes = Router();

tweetRoutes.post("/", authMiddleware, tweetController.create);
tweetRoutes.get("/", getTweetsHandler);  // public

export { tweetRoutes };
```

**In main `index.ts`:**
```ts
import { tweetRoutes } from "./modules/tweet/api/tweet.routes";
import { authRoutes } from "./modules/auth/api/auth.routes";

app.use("/api/tweets", tweetRoutes);
app.use("/api/auth", authRoutes);
```

---

### 2. Middleware (`middleware/`)

Cross-cutting concerns that run **before** the controller.

```ts
// middleware/auth.middleware.ts
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!userId) {
    res.status(401).json({ error: "Missing X-User-Id header" });
    return;
  }

  const user = authRepository.findById(userId);
  if (!user) {
    res.status(401).json({ error: "Invalid user" });
    return;
  }

  req.userId = userId;
  next();  // Continue to controller
}
```

**Why separate?** Middleware can be reused across multiple routes. If auth logic changes, you only update one file.

---

### 3. Controller (`modules/*/[name].controller.ts`)

Validates input, calls the service, and formats the response.

```ts
// modules/tweet/tweet.controller.ts
export function create(req: Request, res: Response): void {
  // 1. Extract and validate input
  const { content } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  // 2. Call service (business logic)
  const tweet = tweetService.create(content.trim(), req.userId!);

  // 3. Return formatted response
  res.status(201).json({ data: tweet });
}
```

**Controller's job:**
- Parse request body
- Validate input (sync checks)
- Choose HTTP status codes
- Format response envelope

**Controller's NOT job:**
- Business logic (queries, calculations, rules)
- Database access

---

### 4. Service (`modules/*/[name].service.ts`)

Contains business logic and orchestrates domain objects + repositories.

```ts
// modules/tweet/tweet.service.ts
export function create(content: string, authorId: string): ITweet {
  // Use domain class to create entity
  const tweet = Tweet.create(content, authorId);
  // -> Generates UUID, timestamp

  // Persist via repository
  return tweetRepository.save(tweet.toJSON());
}

export function getTweets(): ITweet[] {
  return tweetRepository.findAll();
}
```

**Service's job:**
- Orchestrate domain objects
- Call repositories for persistence
- Handle cross-cutting logic (if tweet is too long, reject it, etc.)

**Examples of service logic:**
- "Create a tweet with a UUID and current timestamp"
- "Find user by username, or create if not exists"
- "Delete all tweets by a user"

---

### 5. Repository (`modules/*/[name].repository.ts`)

Handles all data persistence. In development, this reads/writes JSON files.

```ts
// modules/tweet/tweet.repository.ts
function readTweets(): ITweet[] {
  const data = fs.readFileSync(TWEETS_FILE, "utf-8");
  return JSON.parse(data);
}

function writeTweets(tweets: ITweet[]): void {
  fs.writeFileSync(TWEETS_FILE, JSON.stringify(tweets, null, 2), "utf-8");
}

export function save(tweet: ITweet): ITweet {
  const tweets = readTweets();
  const index = tweets.findIndex((t) => t.id === tweet.id);

  if (index >= 0) {
    tweets[index] = tweet;  // Update
  } else {
    tweets.push(tweet);     // Insert
  }

  writeTweets(tweets);
  return tweet;
}

export function findAll(): ITweet[] {
  return readTweets();
}
```

**In production:** Replace file I/O with database queries.

```ts
export async function save(tweet: ITweet): Promise<ITweet> {
  // Instead of fs.writeFileSync, use your database client:
  // await db.tweets.insert(tweet);
  return tweet;
}
```

---

### 6. Domain (`modules/*/domain/`)

**NEW:** Domain logic is now module-scoped, not top-level.

Contains:
- **Classes** — Domain entities (User, Tweet, etc.)
- **Types** — Interfaces and TypeScript types
- **Constants** — Module-specific constants

```ts
// modules/tweet/domain/classes/Tweet.ts
import { v4 as uuidv4 } from "uuid";

export class Tweet {
  constructor(
    public id: string,
    public content: string,
    public authorId: string,
    public createdAt: string
  ) {}

  static create(content: string, authorId: string): Tweet {
    return new Tweet(
      uuidv4(),
      content,
      authorId,
      new Date().toISOString()
    );
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      authorId: this.authorId,
      createdAt: this.createdAt,
    };
  }
}
```

```ts
// modules/tweet/domain/types/tweet.types.ts
export interface ITweet {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}
```

---

## Request Flow Example: POST /api/tweets

```
1. Express Router matches POST /api/tweets
   ↓
2. authMiddleware checks X-User-Id header
   ✓ User exists? Continue
   ✗ User missing? Return 401
   ↓
3. tweetController.create receives req, res
   - Extracts { content } from req.body
   - Validates: not empty? is string?
   ↓
4. tweetService.create calls domain class
   - Tweet.create(content, userId)
   - Generates UUID, timestamp
   ↓
5. tweetRepository.save persists to tweets.json
   ↓
6. Response bubbles back up:
   Controller sends: res.status(201).json({ data: tweet })
```

---

## Scaling: Adding a New Module

To add a new feature (e.g., `likes`), follow this structure:

### 1. Create domain classes and types

```ts
// modules/likes/domain/classes/Like.ts
export class Like {
  constructor(
    public id: string,
    public tweetId: string,
    public userId: string,
    public createdAt: string
  ) {}

  static create(tweetId: string, userId: string): Like {
    return new Like(uuidv4(), tweetId, userId, new Date().toISOString());
  }

  toJSON() {
    return {
      id: this.id,
      tweetId: this.tweetId,
      userId: this.userId,
      createdAt: this.createdAt,
    };
  }
}
```

```ts
// modules/likes/domain/types/like.types.ts
export interface ILike {
  id: string;
  tweetId: string;
  userId: string;
  createdAt: string;
}
```

### 2. Create repository

```ts
// modules/likes/likes.repository.ts
export function save(like: ILike): ILike {
  const likes = readLikes();
  likes.push(like);
  writeLikes(likes);
  return like;
}

export function findByTweetAndUser(tweetId: string, userId: string): ILike | undefined {
  const likes = readLikes();
  return likes.find((l) => l.tweetId === tweetId && l.userId === userId);
}
```

### 3. Create service

```ts
// modules/likes/likes.service.ts
import { Like } from "./domain/classes/Like";
import { likesRepository } from "./likes.repository";

export function toggleLike(tweetId: string, userId: string): ILike | null {
  const existing = likesRepository.findByTweetAndUser(tweetId, userId);

  if (existing) {
    likesRepository.delete(existing.id);
    return null;  // Unliked
  }

  const like = Like.create(tweetId, userId);
  return likesRepository.save(like);
}
```

### 4. Create controller

```ts
// modules/likes/likes.controller.ts
export function toggle(req: Request, res: Response): void {
  const { tweetId } = req.body;

  if (!tweetId || typeof tweetId !== "string") {
    res.status(400).json({ error: "tweetId is required" });
    return;
  }

  const result = likesService.toggleLike(tweetId, req.userId!);
  res.json({ data: result });
}
```

### 5. Create routes

```ts
// modules/likes/api/likes.routes.ts
export const likesRoutes = Router();

likesRoutes.post("/toggle", authMiddleware, likesController.toggle);

export { likesRoutes };
```

### 6. Register in main app

```ts
// index.ts
import { likesRoutes } from "./modules/likes/api/likes.routes";

app.use("/api/likes", likesRoutes);
```

**Done!** The `likes` module is completely self-contained and doesn't touch any other module's code.

---

## Module Independence Checklist

When adding a new module, ensure it's self-contained:

- ✅ Domain classes live in `modules/[name]/domain/classes/`
- ✅ Types live in `modules/[name]/domain/types/`
- ✅ Constants live in `modules/[name]/domain/constants/` (if any)
- ✅ Repository only reads/writes the module's own data
- ✅ Service doesn't call other module services (unless really necessary)
- ✅ Controller doesn't know about other modules

---

## Performance & Scaling

### Async/Await & Concurrency

In production, use proper async patterns:

```ts
// Instead of synchronous fs operations:
// const data = fs.readFileSync(file);

// Use async:
export async function save(tweet: ITweet): Promise<ITweet> {
  // Using a real database:
  const result = await db.tweets.insert(tweet);
  return result;
}
```

Service methods should also be async:

```ts
export async function create(
  content: string,
  authorId: string
): Promise<ITweet> {
  const tweet = Tweet.create(content, authorId);
  return tweetRepository.save(tweet);  // Wait for persistence
}
```

### Caching

Add caching at the service or repository level to avoid repeated reads:

```ts
let cachedTweets: ITweet[] | null = null;

export function getTweets(): ITweet[] {
  if (cachedTweets) return cachedTweets;

  cachedTweets = readTweets();
  return cachedTweets;
}

export function invalidateCache(): void {
  cachedTweets = null;
}
```

---

## Testing Strategy

Each module should have tests in the same directory:

```
modules/tweet/
├── __tests__/
│   ├── tweet.service.test.ts
│   ├── tweet.controller.test.ts
│   ├── tweet.repository.test.ts
│   └── mock-data.ts
├── domain/
├── api/
├── tweet.controller.ts
├── tweet.service.ts
└── tweet.repository.ts
```

**Service test example:**
```ts
it("should create a tweet with UUID and timestamp", () => {
  const tweet = tweetService.create("Hello", "user-123");

  expect(tweet.id).toBeDefined();
  expect(tweet.authorId).toBe("user-123");
  expect(tweet.createdAt).toBeDefined();
});
```

---

## Common Pitfalls to Avoid

1. ❌ **Shared domain layer:** Multiple modules importing from a central `domain/` folder
2. ❌ **Service calling service:** `tweetService` importing `authService`
3. ❌ **Repository doing business logic:** Repository calculating tweet scores, filtering, etc.
4. ❌ **Controller calling repository directly:** Should go through service
5. ❌ **Mixing sync and async:** Some repos return Promises, others return values

---

## Summary

- **Each module is self-contained** with its own domain, repository, service, controller
- **Domain logic is module-scoped**, not centralized
- **Layers have clear responsibilities:** Router → Middleware → Controller → Service → Repository
- **Scale by adding modules** without modifying existing ones
- **Test each layer independently** to catch bugs early
