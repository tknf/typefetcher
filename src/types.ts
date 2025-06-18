import type { StandardSchemaV1, InferInput, InferOutput } from "./schema";

/**
 * Supported HTTP methods for API requests
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Extract path parameters from URL template
 * "/users/{id}" -> { id: string }
 */
export type ExtractPathParams<T extends string> =
	T extends `${infer _Start}{${infer Param}}${infer Rest}`
		? { [K in Param]: string } & ExtractPathParams<Rest>
		: Record<string, never>;

/**
 * Schema definition for endpoint validation
 * Defines validation schemas for different parts of the request/response
 */
export interface EndpointSchema {
	readonly params?: StandardSchemaV1;
	readonly query?: StandardSchemaV1;
	readonly body?: StandardSchemaV1;
	readonly response?: StandardSchemaV1;
}

/**
 * Complete endpoint definition including method, path, and optional schema
 */
export interface EndpointDefinition<
	Method extends HttpMethod = HttpMethod,
	Path extends string = string,
	Schema extends EndpointSchema | undefined = EndpointSchema | undefined,
> {
	readonly method: Method;
	readonly path: Path;
	readonly schema?: Schema;
}

/**
 * Map of endpoint keys to their definitions
 * Key format: "METHOD /path" -> EndpointDefinition
 */
export type EndpointMap = Record<string, EndpointDefinition>;

/**
 * Request options with conditional typing based on schema
 * Parameters become required when schema is provided
 */
export type RequestOptions<Schema extends EndpointSchema> = {
	readonly headers?: Record<string, string>;
	readonly signal?: AbortSignal;
} & (Schema["params"] extends StandardSchemaV1
	? { readonly params: InferInput<Schema["params"]> }
	: { readonly params?: Record<string, string> }) &
	(Schema["query"] extends StandardSchemaV1
		? { readonly query: InferInput<Schema["query"]> }
		: { readonly query?: Record<string, string> }) &
	(Schema["body"] extends StandardSchemaV1
		? { readonly body: InferInput<Schema["body"]> }
		: { readonly body?: unknown });

/**
 * Response type inferred from schema or unknown if no schema provided
 */
export type ResponseType<Schema extends EndpointSchema> =
	Schema["response"] extends StandardSchemaV1 ? InferOutput<Schema["response"]> : unknown;

/**
 * Configuration options for TypeFetcher client
 */
export interface TypeFetcherConfig {
	readonly baseURL?: string;
	readonly headers?: Record<string, string>;
	readonly timeout?: number;
	readonly fetch?: typeof globalThis.fetch;
}

/**
 * HTTP error thrown when request fails
 * Contains status code, status text, and optional response data
 */
export class TypeFetcherError extends Error {
	constructor(
		public readonly status: number,
		public readonly statusText: string,
		message?: string,
		public readonly data?: unknown
	) {
		super(message || `${status} ${statusText}`);
		this.name = "TypeFetcherError";
	}
}

/**
 * Schema validation error with detailed issue information
 * Contains validation issues with messages and optional paths
 */
export class ValidationError extends Error {
	constructor(
		public readonly issues: readonly { message: string; path?: readonly (string | number)[] }[],
		message = "Validation failed"
	) {
		super(message);
		this.name = "ValidationError";
	}
}
