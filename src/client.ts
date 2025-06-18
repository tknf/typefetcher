import { validateSync } from "./schema";
import type {
	EndpointDefinition,
	EndpointMap,
	EndpointSchema,
	HttpMethod,
	RequestOptions,
	ResponseType,
	TypeFetcherConfig,
} from "./types";
import { TypeFetcherError, ValidationError } from "./types";

/**
 * Get the appropriate fetch implementation for the current environment
 * Priority: custom fetch > globalThis.fetch > global.fetch > throw error
 */
function getFetchImplementation(customFetch?: typeof globalThis.fetch): typeof globalThis.fetch {
	// Use custom fetch if provided
	if (customFetch) {
		return customFetch;
	}
	
	// Check for globalThis.fetch (modern browsers and Node.js 18+)
	if (typeof globalThis !== "undefined" && globalThis.fetch) {
		return globalThis.fetch.bind(globalThis);
	}
	
	// Check for global.fetch (Node.js)
	if (typeof global !== "undefined" && global.fetch) {
		return global.fetch.bind(global);
	}
	
	// No fetch available
	throw new Error(
		"fetch is not available. Please provide a fetch implementation in the config, " +
		"upgrade to Node.js 18+, or install a fetch polyfill."
	);
}

/**
 * Generate request options type from endpoint map
 */
type RequestOptionsForEndpoint<
	T extends EndpointMap,
	K extends keyof T,
> = T[K] extends EndpointDefinition<HttpMethod, string, infer Schema>
	? Schema extends EndpointSchema
		? RequestOptions<Schema>
		: {
				readonly params?: Record<string, string>;
				readonly query?: Record<string, string>;
				readonly body?: unknown;
				readonly headers?: Record<string, string>;
				readonly signal?: AbortSignal;
			}
	: {
			readonly params?: Record<string, string>;
			readonly query?: Record<string, string>;
			readonly body?: unknown;
			readonly headers?: Record<string, string>;
			readonly signal?: AbortSignal;
		};

/**
 * Base response type with raw response access
 */
type BaseResponseWithRaw<T> = T & { readonly "~raw": Response };

/**
 * Generate response type from endpoint map with raw response access
 */
type ResponseForEndpoint<
	T extends EndpointMap,
	K extends keyof T,
> = T[K] extends EndpointDefinition<HttpMethod, string, infer Schema>
	? Schema extends EndpointSchema
		? BaseResponseWithRaw<ResponseType<Schema>>
		: BaseResponseWithRaw<unknown>
	: BaseResponseWithRaw<unknown>;

/**
 * TypeScript-first API client with Standard Schema support
 * Provides type-safe HTTP requests with runtime validation
 */
export class TypeFetcher<T extends EndpointMap = {}> {
	private endpoints: T;
	private config: TypeFetcherConfig;
	private fetch: typeof globalThis.fetch;

	constructor(config: TypeFetcherConfig = {}) {
		this.endpoints = {} as T;
		this.config = config;
		this.fetch = getFetchImplementation(config.fetch);
	}

	/**
	 * Register a new endpoint with optional schema validation
	 * Returns a new TypeFetcher instance with the endpoint added to the type map
	 */
	addEndpoint<
		Method extends HttpMethod,
		Path extends string,
		Schema extends EndpointSchema | undefined = undefined,
	>(
		method: Method,
		path: Path,
		schema?: Schema
	): TypeFetcher<T & Record<`${Method} ${Path}`, EndpointDefinition<Method, Path, Schema>>> {
		const key = `${method} ${path}` as const;
		const newEndpoints = {
			...this.endpoints,
			[key]: {
				method,
				path,
				schema,
			},
		} as T & Record<`${Method} ${Path}`, EndpointDefinition<Method, Path, Schema>>;

		const newFetcher = new TypeFetcher<
			T & Record<`${Method} ${Path}`, EndpointDefinition<Method, Path, Schema>>
		>(this.config);
		newFetcher.endpoints = newEndpoints;
		return newFetcher;
	}

	/**
	 * Execute a request to a registered endpoint
	 * Validates request parameters and response data if schemas are provided
	 */
	async request<K extends string & keyof T>(
		key: K,
		options?: RequestOptionsForEndpoint<T, K>
	): Promise<ResponseForEndpoint<T, K>> {
		const endpoint = this.endpoints[key];
		if (!endpoint) {
			throw new Error(`Endpoint not found: ${String(key)}`);
		}

		const parsed = this.parseRequestKey(String(key));
		if (!parsed) {
			throw new Error(`Invalid request key format: ${String(key)}`);
		}

		const [method, pathTemplate] = parsed;
		const {
			params,
			query,
			body,
			headers = {},
			signal,
		} = (options || {}) as RequestOptionsForEndpoint<T, K>;

		// Validate and replace path parameters
		let finalPath = pathTemplate;
		if (params) {
			if (endpoint.schema?.params) {
				const validation = validateSync(endpoint.schema.params, params);
				if (!validation.success) {
					throw new ValidationError(validation.issues || [], "Path parameters validation failed");
				}
				finalPath = this.replacePath(pathTemplate, validation.data as Record<string, string>);
			} else {
				finalPath = this.replacePath(pathTemplate, params as Record<string, string>);
			}
		}

		// Validate query parameters
		let validatedQuery: unknown;
		if (query) {
			if (endpoint.schema?.query) {
				const validation = validateSync(endpoint.schema.query, query);
				if (!validation.success) {
					throw new ValidationError(validation.issues || [], "Query parameters validation failed");
				}
				validatedQuery = validation.data;
			} else {
				validatedQuery = query;
			}
		}

		// Validate request body
		let validatedBody: unknown;
		if (body) {
			if (endpoint.schema?.body) {
				const validation = validateSync(endpoint.schema.body, body);
				if (!validation.success) {
					throw new ValidationError(validation.issues || [], "Request body validation failed");
				}
				validatedBody = validation.data;
			} else {
				validatedBody = body;
			}
		}

		// Execute HTTP request
		const url = new URL(finalPath, this.config.baseURL);
		if (validatedQuery) {
			Object.entries(validatedQuery).forEach(([key, value]) => {
				url.searchParams.set(key, String(value));
			});
		}

		const requestInit: RequestInit = {
			method,
			headers: {
				"Content-Type": "application/json",
				...this.config.headers,
				...(headers as Record<string, string>),
			},
			...(signal && { signal }),
		};

		if (validatedBody && method !== "GET" && method !== "DELETE") {
			requestInit.body = JSON.stringify(validatedBody);
		}

		const response = await this.fetch(url.toString(), requestInit);
		
		// Clone response immediately before consuming body
		const responseClone = response.clone();

		if (!response.ok) {
			let errorData: unknown;
			try {
				const contentType = response.headers.get("content-type");
				errorData = contentType?.includes("application/json")
					? await response.json()
					: await response.text();
			} catch {
				errorData = null;
			}
			throw new TypeFetcherError(response.status, response.statusText, undefined, errorData);
		}

		// Parse response based on content type
		const contentType = response.headers.get("content-type");
		let responseData: unknown;
		if (contentType?.includes("application/json")) {
			responseData = await response.json();
		} else {
			responseData = await response.text();
		}

		// Validate response data against schema
		if (endpoint.schema?.response) {
			const validation = validateSync(endpoint.schema.response, responseData);
			if (!validation.success) {
				throw new ValidationError(validation.issues || [], "Response validation failed");
			}
			return Object.assign(validation.data as any, { "~raw": responseClone }) as ResponseForEndpoint<T, K>;
		}

		return Object.assign(responseData as any, { "~raw": responseClone }) as ResponseForEndpoint<T, K>;
	}

	/**
	 * Parse request key into HTTP method and path
	 * Expected format: "METHOD /path"
	 */
	private parseRequestKey(key: string): [HttpMethod, string] | null {
		const match = key.match(/^(GET|POST|PUT|PATCH|DELETE) (.+)$/);
		if (!match) return null;
		return [match[1] as HttpMethod, match[2]];
	}

	/**
	 * Replace path template parameters with actual values
	 * Template format: "/users/{id}" becomes "/users/123"
	 */
	private replacePath(template: string, params: Record<string, string>): string {
		return template.replace(/\{([^}]+)\}/g, (_, key) => {
			const value = params[key];
			if (value === undefined) {
				throw new Error(`Missing path parameter: ${key}`);
			}
			return encodeURIComponent(value);
		});
	}
}
