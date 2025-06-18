import type { StandardSchemaV1, InferInput, InferOutput } from "./schema";

/**
 * HTTPメソッド
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * パスパラメータを抽出する型
 * "/users/{id}" -> { id: string }
 */
export type ExtractPathParams<T extends string> =
	T extends `${infer _Start}{${infer Param}}${infer Rest}`
		? { [K in Param]: string } & ExtractPathParams<Rest>
		: {};

/**
 * エンドポイントのスキーマ定義
 */
export interface EndpointSchema {
	readonly pathParams?: StandardSchemaV1;
	readonly query?: StandardSchemaV1;
	readonly body?: StandardSchemaV1;
	readonly response?: StandardSchemaV1;
}

/**
 * エンドポイント定義
 */
export interface EndpointDefinition<
	Method extends HttpMethod = HttpMethod,
	Path extends string = string,
	Schema extends EndpointSchema = EndpointSchema,
> {
	readonly method: Method;
	readonly path: Path;
	readonly schema?: Schema;
}

/**
 * エンドポイントマップ
 * "GET /users/{id}" -> EndpointDefinition
 */
export type EndpointMap = Record<string, EndpointDefinition>;

/**
 * リクエストオプション
 */
export interface RequestOptions<Schema extends EndpointSchema> {
	readonly pathParams?: Schema["pathParams"] extends StandardSchemaV1
		? InferInput<Schema["pathParams"]>
		: Record<string, string>;
	readonly query?: Schema["query"] extends StandardSchemaV1 
		? InferInput<Schema["query"]> 
		: Record<string, string>;
	readonly body?: Schema["body"] extends StandardSchemaV1 
		? InferInput<Schema["body"]> 
		: unknown;
	readonly headers?: Record<string, string>;
}

/**
 * レスポンス型
 */
export type ResponseType<Schema extends EndpointSchema> =
	Schema["response"] extends StandardSchemaV1 ? InferOutput<Schema["response"]> : unknown;

/**
 * TypeFetcherの設定
 */
export interface TypeFetcherConfig {
	readonly baseURL?: string;
	readonly headers?: Record<string, string>;
	readonly timeout?: number;
}

/**
 * リクエストエラー
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
 * バリデーションエラー
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
