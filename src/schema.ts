// Import official Standard Schema types
import type { StandardSchemaV1 } from "@standard-schema/spec";

// Re-export official Standard Schema types with aliases
export type {
	StandardSchemaV1,
	StandardSchemaV1 as StandardSchemaV1Props,
	StandardSchemaV1 as StandardSchema,
	StandardSchemaV1 as StandardSchemaTypes,
} from "@standard-schema/spec";

/**
 * Simplified validation result interface for better compatibility
 * Provides a consistent interface across different schema libraries
 */
export interface StandardSchemaResult<Output> {
	readonly success: boolean;
	readonly data?: Output;
	readonly issues?: readonly StandardSchemaIssue[];
}

/**
 * Simplified validation issue interface
 * Contains error message and optional path information
 */
export interface StandardSchemaIssue {
	readonly message: string;
	readonly path?: readonly (string | number)[];
}

/**
 * Extract input type from Standard Schema (using official implementation)
 */
export type InferInput<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>;

/**
 * Extract output type from Standard Schema (using official implementation)
 */
export type InferOutput<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>;

/**
 * Convert Standard Schema result to simplified format
 * Transforms the official result format to our consistent interface
 */
function convertResult<Output>(
	result: StandardSchemaV1.Result<Output>
): StandardSchemaResult<Output> {
	if ("value" in result) {
		// Success case
		return {
			success: true,
			data: result.value,
		};
	}
	// Failure case
	return {
		success: false,
		issues:
			result.issues?.map((issue: StandardSchemaV1.Issue) => ({
				message: issue.message,
				path: issue.path?.map((segment: unknown) =>
					typeof segment === "object" && segment !== null && "key" in segment
						? segment.key
						: segment
				) as (string | number)[],
			})) || [],
	};
}

/**
 * Async validation helper for Standard Schema
 * Validates input against schema and returns simplified result
 */
export async function validate<T extends StandardSchemaV1>(
	schema: T,
	input: unknown
): Promise<StandardSchemaResult<InferOutput<T>>> {
	const result = await schema["~standard"].validate(input);
	return convertResult(result) as StandardSchemaResult<InferOutput<T>>;
}

/**
 * Synchronous validation helper for Standard Schema
 * Validates input against schema and returns simplified result
 * Throws error if schema validation is async
 */
export function validateSync<T extends StandardSchemaV1>(
	schema: T,
	input: unknown
): StandardSchemaResult<InferOutput<T>> {
	const result = schema["~standard"].validate(input);
	if (result instanceof Promise) {
		throw new Error("Schema validation returned a Promise. Use validate() instead.");
	}
	return convertResult(result) as StandardSchemaResult<InferOutput<T>>;
}
