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
- **📋 Structured Response**: Rich response metadata (headers, status, URL) with `~raw` access
- **⚡ Lightweight**: Zero dependencies (except peer dependencies)
- **🛡️ Error Handling**: Comprehensive error types for different failure scenarios
- **🎪 Flexible**: Works with any Standard Schema compliant validation library
- **🚫 AbortSignal Support**: Request cancellation and timeout support

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
const response = await api.request("GET /users");

// Structured response with metadata
console.log("Data:", response.data);           // Response body
console.log("Status:", response.status);       // HTTP status code
console.log("Headers:", response.headers);     // Response headers
console.log("URL:", response.url);             // Request URL
console.log("Raw:", response["~raw"]);         // Raw Response object

// Access specific user
const userResponse = await api.request("GET /users/{id}", {
  params: { id: "1" }
});

const user = userResponse.data; // Just the data
const status = userResponse.status; // 200, 404, etc.
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

// Fully type-safe requests with structured responses
const usersResponse = await api.request("GET /users"); 
// Type: StructuredResponse<User[]>

const users = usersResponse.data; // User[]
const status = usersResponse.status; // number
const headers = usersResponse.headers; // Headers

const userResponse = await api.request("GET /users/{id}", {
  params: { id: "123" } // ✅ TypeScript ensures correct type
});
// Type: StructuredResponse<User>

const user = userResponse.data; // User object
if (userResponse.status === 200) {
  console.log("User found:", user.name);
}

const created = await api.request("POST /users", {
  body: { name: "Jane", email: "jane@example.com" } // ✅ Validated at runtime
});

// Access creation details
console.log("Created user:", created.data);
console.log("Location:", created.headers.get("location"));
console.log("Status:", created.status); // 201
```

## 📊 Response Structure

Every request returns a structured response with rich metadata:

```typescript
interface StructuredResponse<T> {
  readonly data: T;              // Parsed response data (your API data)
  readonly headers: Headers;     // Response headers object  
  readonly status: number;       // HTTP status code (200, 404, etc.)
  readonly url: string;          // Final request URL
  readonly "~raw": Response;     // Raw fetch Response object
}
```

### Working with Response Data

```typescript
const response = await api.request("GET /users/{id}", {
  params: { id: "123" }
});

// Access parsed data (type-safe when schema is provided)
const user = response.data;

// Check HTTP status
if (response.status === 200) {
  console.log("Success!");
} else if (response.status === 404) {
  console.log("User not found");
}

// Access response headers
const contentType = response.headers.get("content-type");
const rateLimit = response.headers.get("x-rate-limit-remaining");

// Get request URL (useful for debugging)
console.log("Request was made to:", response.url);

// Access raw Response for advanced use cases
const rawResponse = response["~raw"];
const responseText = await rawResponse.clone().text();
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
const usersResponse = await api.request("GET /users");
const users = usersResponse.data; // User[]

const newUserResponse = await api.request("POST /users", {
  body: { name: "John", email: "john@example.com" }
});
const newUser = newUserResponse.data; // User
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
  readonly params?: StandardSchemaV1;    // Path parameters
  readonly query?: StandardSchemaV1;     // Query parameters  
  readonly body?: StandardSchemaV1;      // Request body
  readonly response?: StandardSchemaV1;  // Response validation
}
```

### request

```typescript
request<K>(key: K, options?: RequestOptions): Promise<StructuredResponse<T>>
```

Executes a request to a registered endpoint and returns a structured response.

**Parameters:**
- `key`: Endpoint key in format `"METHOD /path"`
- `options`: Request options (automatically typed based on schema)

**Request Options:**
```typescript
interface RequestOptions {
  readonly params?: Record<string, string> | SchemaType;   // Path parameters
  readonly query?: Record<string, string> | SchemaType;    // Query parameters
  readonly body?: unknown | SchemaType;                    // Request body
  readonly headers?: Record<string, string>;               // Custom headers
  readonly signal?: AbortSignal;                           // Abort signal
}

// When schema is provided, corresponding fields become required and strongly typed
```

## 🔧 Advanced Usage

### AbortSignal Support

```typescript
// Request cancellation
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await api.request("GET /users/{id}", {
    params: { id: "123" },
    signal: controller.signal
  });
  
  console.log("User:", response.data);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log("Request was cancelled");
  }
}
```

### Custom Headers per Request

```typescript
const response = await api.request("GET /users/{id}", {
  params: { id: "123" },
  headers: {
    "Accept-Language": "en-US",
    "X-Custom-Header": "value",
    "Authorization": "Bearer specific-token" // Override global headers
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

const response = await api.request("GET /users", {
  query: {
    page: "1",
    limit: "10",
    search: "john"
  }
});

console.log("Users:", response.data);
console.log("Total pages:", response.headers.get("x-total-pages"));
```

### Working with Raw Response

For advanced use cases, access the raw `Response` object:

```typescript
const response = await api.request("GET /download/{id}", {
  params: { id: "file123" }
});

// Access raw Response
const rawResponse = response["~raw"];

// Stream response body
const reader = rawResponse.body?.getReader();
const contentLength = rawResponse.headers.get("content-length");

console.log(`Downloading ${contentLength} bytes`);

// Process stream...
while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process chunk
  console.log(`Received ${value.length} bytes`);
}
```

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
  const response = await api.request("GET /users/{id}", {
    params: { id: "123" }
  });
  
  console.log("User:", response.data);
  console.log("Status:", response.status);
} catch (error) {
  if (error instanceof TypeFetcherError) {
    // HTTP errors (404, 500, etc.)
    console.error(`HTTP ${error.status}: ${error.statusText}`);
    console.error("Response data:", error.data);
  } else if (error instanceof ValidationError) {
    // Schema validation errors
    console.error("Validation failed:", error.message);
    error.issues.forEach(issue => {
      console.error(`- ${issue.message} at ${issue.path?.join('.')}`);
    });
  } else {
    // Other errors (network, abort, etc.)
    console.error("Unexpected error:", error);
  }
}
```

### Schema Transformations

Zod and Valibot schemas with transformations work seamlessly:

```typescript
const TransformSchema = z.object({
  id: z.string().transform(val => val.toUpperCase()),
  date: z.string().transform(val => new Date(val))
});

const api = client.addEndpoint("GET", "/items/{id}", {
  params: TransformSchema
});

// Input is transformed before making the request
const response = await api.request("GET /items/{id}", {
  params: { id: "abc", date: "2023-01-01" }
  // Becomes: id="ABC", date=Date object in the actual request
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

### Rich Response Information

Get comprehensive response metadata without extra work:

```typescript
// ❌ Traditional fetch
const rawResponse = await fetch("/api/users");
const data = await rawResponse.json();
// Lost: headers, status, url information

// ✅ TypeFetcher structured response
const response = await api.request("GET /users");
// Available: data, headers, status, url, ~raw
```

### Excellent TypeScript Integration

- **Required Parameters**: Schema-specified parameters become required in TypeScript
- **Type Inference**: Full type inference from schemas to response types
- **Autocomplete**: Rich IDE support with endpoint and parameter suggestions
- **Structured Response**: Access both data and metadata with full type safety

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
    const response = await this.api.request("GET /posts");
    return {
      posts: response.data,
      count: response.headers.get("x-total-count")
    };
  }

  async getPost(id: string) {
    const response = await this.api.request("GET /posts/{id}", { 
      params: { id } 
    });
    
    if (response.status === 404) {
      throw new Error("Post not found");
    }
    
    return response.data;
  }

  async createPost(post: { title: string; body: string; userId: number }) {
    const response = await this.api.request("POST /posts", { body: post });
    
    return {
      post: response.data,
      location: response.headers.get("location"),
      status: response.status
    };
  }
}
```

### File Upload with Progress

```typescript
const api = client.addEndpoint("POST", "/upload", {
  body: z.instanceof(FormData),
  response: z.object({
    fileId: z.string(),
    url: z.string()
  })
});

async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.request("POST /upload", {
    body: formData,
    headers: {
      // Don't set Content-Type, let browser set it with boundary
    }
  });

  console.log("Upload completed!");
  console.log("File ID:", response.data.fileId);
  console.log("File URL:", response.data.url);
  console.log("Server:", response.headers.get("server"));

  return response.data;
}
```

### Pagination Helper

```typescript
async function getAllUsers() {
  const users = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await api.request("GET /users", {
      query: { page: page.toString(), limit: "50" }
    });

    users.push(...response.data);

    // Check if there are more pages
    const totalPages = parseInt(response.headers.get("x-total-pages") || "1");
    hasMore = page < totalPages;
    page++;
  }

  return users;
}
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Build
pnpm run build
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