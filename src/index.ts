// Main TypeFetcher API exports
export { TypeFetcher } from "./client";
export type {
	HttpMethod,
	EndpointDefinition,
	EndpointMap,
	EndpointSchema,
	RequestOptions,
	ResponseType,
	TypeFetcherConfig,
	ExtractPathParams,
} from "./types";
export { TypeFetcherError, ValidationError } from "./types";

// Standard Schema integration exports
export type {
	StandardSchemaV1,
	StandardSchemaResult,
	StandardSchemaIssue,
	InferInput,
	InferOutput,
} from "./schema";
export { validate, validateSync } from "./schema";
