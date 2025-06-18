<div align="center">
  <img src="https://raw.githubusercontent.com/tknf/snowflake/main/docs/snowflake.png" alt="Snowflake Logo" width="250" height="auto">
  <h1>@tknf/typefetcher</h1>
  <p>TypeScript-first API client with <a href="https://standardschema.dev">Standard Schema</a> support, providing excellent DX and strict type safety.</p>
</div>

[![Github Workflow Status](https://img.shields.io/github/actions/workflow/status/tknf/typefetcher/ci.yaml?branch=main)](https://github.com/tknf/typefetcher/actions)
[![Github](https://img.shields.io/github/license/tknf/typefetcher)](https://github.com/tknf/typefetcher/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@tknf/typefetcher)](https://www.npmjs.com/package/@tknf/typefetcher)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@tknf/typefetcher)](https://bundlephobia.com/package/@tknf/typefetcher)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tknf/typefetcher)](https://bundlephobia.com/package/@tknf/typefetcher)
[![Github commit activity](https://img.shields.io/github/commit-activity/m/tknf/typefetcher)](https://github.com/tknf/typefetcher/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/tknf/typefetcher)](https://github.com/tknf/typefetcher/commits/main)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tknf/typefetcher)

## ✨ Features

- **🎯 Type-Safe**: Full TypeScript support with strict type inference
- **📊 Standard Schema**: Native support for Zod, Valibot, and other Standard Schema compliant libraries
- **🔍 Request/Response Validation**: Runtime validation with detailed error messages
- **🏗️ Builder Pattern**: Intuitive API inspired by Hono and Octokit
- **⚡ Lightweight**: Zero dependencies (except peer dependencies)
- **🛡️ Error Handling**: Comprehensive error types for different failure scenarios
- **🎪 Flexible**: Works with any Standard Schema compliant validation library

## 📦 Installation

```bash
npm install @tknf/typefetcher
```

### Peer Dependencies

TypeFetcher works with Standard Schema compliant validation libraries. Install one or more:

```bash
# Zod (requires v3.25.0+ for Standard Schema support)
npm install zod

# Valibot (requires v1.0.0+ for Standard Schema support)  
npm install valibot
```

### Node.js Compatibility

- **Node.js 18+**: Built-in fetch support, works out of the box
- **Node.js < 18**: Provide a custom fetch implementation:

```bash
# Option 1: node-fetch
npm install node-fetch

# Option 2: undici (fast HTTP client)
npm install undici
```

## 🚀 Quick Start

### Basic Usage (No Schema)

```typescript
import { TypeFetcher } from "@tknf/typefetcher";

const client = new TypeFetcher({
  baseURL: "https://jsonplaceholder.typicode.com",
  headers: {
    "Authorization": "Bearer your-token"
  }
});

// Register endpoints
const api = client
  .addEndpoint("GET", "/users")
  .addEndpoint("GET", "/users/{id}")
  .addEndpoint("POST", "/users");

// Make requests (Octokit-style)
const users = await api.request("GET /users");
const user = await api.request("GET /users/{id}", {
  params: { id: "1" }
});

const newUser = await api.request("POST /users", {
  body: { name: "John", email: "john@example.com" }
});
```

### Type-Safe Usage with Zod

```typescript
import { TypeFetcher } from "@tknf/typefetcher";
import { z } from "zod";

// Define your schemas
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const PathIdSchema = z.object({
  id: z.string()
});

// Create type-safe client
const client = new TypeFetcher({
  baseURL: "https://api.example.com"
});

const api = client
  .addEndpoint("GET", "/users", {
    response: z.array(UserSchema)
  })
  .addEndpoint("GET", "/users/{id}", {
    params: PathIdSchema,           // ✅ params is required when schema provided
    response: UserSchema
  })
  .addEndpoint("POST", "/users", {
    body: CreateUserSchema,         // ✅ body is required when schema provided
    response: UserSchema
  });

// Fully type-safe requests
const users = await api.request("GET /users"); 
// Type: { id: number; name: string; email: string; }[]

const user = await api.request("GET /users/{id}", {
  params: { id: "123" } // ✅ TypeScript ensures correct type
});
// Type: { id: number; name: string; email: string; }

const created = await api.request("POST /users", {
  body: { name: "Jane", email: "jane@example.com" } // ✅ Validated at runtime
});
```

### Type-Safe Usage with Valibot

```typescript
import { TypeFetcher } from "@tknf/typefetcher";
import * as v from "valibot";

// Define Valibot schemas
const UserSchema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
});

const CreateUserSchema = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
});

// Use directly with TypeFetcher
const api = client
  .addEndpoint("GET", "/users", {
    response: v.array(UserSchema)
  })
  .addEndpoint("POST", "/users", {
    body: CreateUserSchema,
    response: UserSchema
  });

// Same type-safe API as with Zod
const users = await api.request("GET /users");
const newUser = await api.request("POST /users", {
  body: { name: "John", email: "john@example.com" }
});
```

## 📚 API Reference

### TypeFetcher Constructor

```typescript
new TypeFetcher(config?: TypeFetcherConfig)
```

**Parameters:**
- `config` (optional): Configuration object

**TypeFetcherConfig:**
```typescript
interface TypeFetcherConfig {
  readonly baseURL?: string;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly fetch?: typeof globalThis.fetch;  // Custom fetch implementation
}
```

### addEndpoint

```typescript
addEndpoint<Method, Path, Schema>(
  method: Method, 
  path: Path, 
  schema?: Schema
): TypeFetcher<...>
```

Registers a new endpoint with optional schema validation.

**Parameters:**
- `method`: HTTP method (`"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`)
- `path`: URL path with optional parameters (e.g., `"/users/{id}"`)
- `schema` (optional): Validation schema object

**Schema Object:**
```typescript
interface EndpointSchema {
  readonly params?: StandardSchemaV1;    // Path parameters (formerly pathParams)
  readonly query?: StandardSchemaV1;     // Query parameters
  readonly body?: StandardSchemaV1;      // Request body
  readonly response?: StandardSchemaV1;  // Response validation
}
```

### request

```typescript
request<K>(key: K, options?: RequestOptions): Promise<ResponseType>
```

Executes a request to a registered endpoint.

**Parameters:**
- `key`: Endpoint key in format `"METHOD /path"`
- `options`: Request options (automatically typed based on schema)

**Request Options (when schema is provided):**
```typescript
// Schema-specified parameters become required
{
  params: InferInput<ParamsSchema>;    // Required if params schema exists
  query: InferInput<QuerySchema>;      // Required if query schema exists  
  body: InferInput<BodySchema>;        // Required if body schema exists
  headers?: Record<string, string>;    // Always optional
}
```

## 🔧 Advanced Usage

### Node.js Usage

For Node.js environments, you can provide a custom fetch implementation:

```typescript
// Node.js 18+ (built-in fetch)
const client = new TypeFetcher({
  baseURL: "https://api.example.com"
});

// Node.js < 18 with node-fetch
import fetch from "node-fetch";
const client = new TypeFetcher({
  baseURL: "https://api.example.com",
  fetch: fetch as unknown as typeof globalThis.fetch
});

// Using undici for better performance
import { fetch } from "undici";
const client = new TypeFetcher({
  baseURL: "https://api.example.com",
  fetch: fetch as unknown as typeof globalThis.fetch
});
```

### Error Handling

```typescript
import { TypeFetcherError, ValidationError } from "@tknf/typefetcher";

try {
  const user = await api.request("GET /users/{id}", {
    params: { id: "123" }
  });
} catch (error) {
  if (error instanceof TypeFetcherError) {
    // HTTP errors (404, 500, etc.)
    console.error(`HTTP ${error.status}: ${error.statusText}`);
    console.error("Response data:", error.data);
  } else if (error instanceof ValidationError) {
    // Schema validation errors
    console.error("Validation failed:", error.message);
    console.error("Issues:", error.issues);
  } else {
    // Other errors
    console.error("Unexpected error:", error);
  }
}
```

### Custom Headers per Request

```typescript
const user = await api.request("GET /users/{id}", {
  params: { id: "123" },
  headers: {
    "Accept-Language": "en-US",
    "Custom-Header": "value"
  }
});
```

### Query Parameters

```typescript
const QuerySchema = z.object({
  page: z.string(),
  limit: z.string(),
  search: z.string().optional()
});

const api = client.addEndpoint("GET", "/users", {
  query: QuerySchema,
  response: z.array(UserSchema)
});

const users = await api.request("GET /users", {
  query: {
    page: "1",
    limit: "10",
    search: "john"
  }
});
```

### Schema Transformations

Zod and Valibot schemas with transformations work seamlessly:

```typescript
const TransformSchema = z.object({
  id: z.string().transform(val => val.toUpperCase())
});

const api = client.addEndpoint("GET", "/items/{id}", {
  params: TransformSchema
});

// Input is transformed before making the request
await api.request("GET /items/{id}", {
  params: { id: "abc" } // Becomes "ABC" in the actual URL
});
```

## 🌟 Why TypeFetcher?

### Standard Schema Native

Unlike other API clients that require adapters or wrappers, TypeFetcher natively supports any [Standard Schema](https://standardschema.dev/) compliant library:

```typescript
// ❌ Other libraries require adapters
const schema = someAdapter(z.string());

// ✅ TypeFetcher uses schemas directly
const schema = z.string(); // Works with Zod 3.25.0+
const schema = v.string(); // Works with Valibot 1.0.0+
```

### Excellent TypeScript Integration

- **Required Parameters**: Schema-specified parameters become required in TypeScript
- **Type Inference**: Full type inference from schemas to response types
- **Autocomplete**: Rich IDE support with parameter suggestions

### Minimal Bundle Size

- Zero runtime dependencies (except peer dependencies)
- Tree-shakable exports
- Only import what you use

## 🔍 Examples

### REST API Client

```typescript
import { TypeFetcher } from "@tknf/typefetcher";
import { z } from "zod";

const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  userId: z.number()
});

class BlogAPI {
  private client = new TypeFetcher({
    baseURL: "https://jsonplaceholder.typicode.com"
  });

  private api = this.client
    .addEndpoint("GET", "/posts", {
      response: z.array(PostSchema)
    })
    .addEndpoint("GET", "/posts/{id}", {
      params: z.object({ id: z.string() }),
      response: PostSchema
    })
    .addEndpoint("POST", "/posts", {
      body: z.object({
        title: z.string(),
        body: z.string(),
        userId: z.number()
      }),
      response: PostSchema
    });

  async getAllPosts() {
    return this.api.request("GET /posts");
  }

  async getPost(id: string) {
    return this.api.request("GET /posts/{id}", { params: { id } });
  }

  async createPost(post: { title: string; body: string; userId: number }) {
    return this.api.request("POST /posts", { body: post });
  }
}
```

### GraphQL-like Type Safety

```typescript
// Define your API schema once
const api = client
  .addEndpoint("GET", "/users/{id}/profile", {
    params: z.object({ id: z.string() }),
    response: z.object({
      user: UserSchema,
      preferences: PreferencesSchema,
      statistics: StatsSchema
    })
  });

// Get fully typed response
const profile = await api.request("GET /users/{id}/profile", {
  params: { id: "123" }
});

// TypeScript knows the exact shape:
// profile.user.name
// profile.preferences.theme  
// profile.statistics.loginCount
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## 📋 Requirements

- **Node.js**: 16.x or higher
- **TypeScript**: 5.x or higher
- **Zod**: 3.25.0+ (if using Zod)
- **Valibot**: 1.0.0+ (if using Valibot)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass: `pnpm run test`
5. Ensure linting passes: `pnpm run lint`
6. Submit a pull request

## 👏 Acknowledgments

- [Standard Schema](https://standardschema.dev/) specification
- [Zod](https://zod.dev/) and [Valibot](https://valibot.dev/) for schema validation
- [Hono](https://hono.dev/) and [Octokit](https://octokit.github.io/rest.js/) for API design inspiration
