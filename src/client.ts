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
 * エンドポイントマップからリクエストオプションの型を生成
 */
type RequestOptionsForEndpoint<
	T extends EndpointMap,
	K extends keyof T,
> = T[K] extends EndpointDefinition<any, any, infer Schema>
	? Schema extends EndpointSchema
		? {
				[P in keyof RequestOptions<Schema>]: RequestOptions<Schema>[P];
			}
		: {
				pathParams?: Record<string, string>;
				query?: Record<string, string>;
				body?: unknown;
				headers?: Record<string, string>;
			}
	: {
			pathParams?: Record<string, string>;
			query?: Record<string, string>;
			body?: unknown;
			headers?: Record<string, string>;
		};

/**
 * エンドポイントマップからレスポンス型を生成
 */
type ResponseForEndpoint<
	T extends EndpointMap,
	K extends keyof T,
> = T[K] extends EndpointDefinition<any, any, infer Schema>
	? Schema extends EndpointSchema
		? ResponseType<Schema>
		: unknown
	: unknown;

export class TypeFetcher<T extends EndpointMap = {}> {
	private endpoints: T;
	private config: TypeFetcherConfig;

	constructor(config: TypeFetcherConfig = {}) {
		this.endpoints = {} as T;
		this.config = config;
	}

	/**
	 * エンドポイントを登録
	 */
	addEndpoint<Method extends HttpMethod, Path extends string, Schema extends EndpointSchema = {}>(
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
	 * リクエストを実行
	 */
	async request<K extends keyof T & string>(
		key: K,
		options?: RequestOptionsForEndpoint<T, K>
	): Promise<ResponseForEndpoint<T, K>>;
	async request(key: string, options?: any): Promise<any>;
	async request<K extends keyof T & string>(
		key: K | string,
		options: RequestOptionsForEndpoint<T, K> | any = {}
	): Promise<ResponseForEndpoint<T, K> | any> {
		const endpoint = this.endpoints[key];
		if (!endpoint) {
			throw new Error(`Endpoint not found: ${key}`);
		}

		const parsed = this.parseRequestKey(key);
		if (!parsed) {
			throw new Error(`Invalid request key format: ${key}`);
		}

		const [method, pathTemplate] = parsed;
		const { pathParams, query, body, headers = {} } = options as any;

		// パスパラメータの検証と置換
		let finalPath = pathTemplate;
		if (pathParams) {
			if (endpoint.schema?.pathParams) {
				const validation = validateSync(endpoint.schema.pathParams, pathParams);
				if (!validation.success) {
					throw new ValidationError(validation.issues || [], "Path parameters validation failed");
				}
				finalPath = this.replacePath(pathTemplate, validation.data as Record<string, string>);
			} else {
				finalPath = this.replacePath(pathTemplate, pathParams as Record<string, string>);
			}
		}

		// クエリパラメータの検証
		let validatedQuery: any;
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

		// ボディの検証
		let validatedBody: any;
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

		// リクエストの実行
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
				...headers,
			},
		};

		if (validatedBody && method !== "GET" && method !== "DELETE") {
			requestInit.body = JSON.stringify(validatedBody);
		}

		const response = await fetch(url.toString(), requestInit);

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

		// レスポンスの解析
		const contentType = response.headers.get("content-type");
		let responseData: unknown;
		if (contentType?.includes("application/json")) {
			responseData = await response.json();
		} else {
			responseData = await response.text();
		}

		// レスポンスの検証
		if (endpoint.schema?.response) {
			const validation = validateSync(endpoint.schema.response, responseData);
			if (!validation.success) {
				throw new ValidationError(validation.issues || [], "Response validation failed");
			}
			return validation.data as ResponseForEndpoint<T, K>;
		}

		return responseData as ResponseForEndpoint<T, K>;
	}

	private parseRequestKey(key: string): [HttpMethod, string] | null {
		const match = key.match(/^(GET|POST|PUT|PATCH|DELETE) (.+)$/);
		if (!match) return null;
		return [match[1] as HttpMethod, match[2]];
	}

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
