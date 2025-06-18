// 公式Standard Schemaの型を使用
import type { StandardSchemaV1 } from "@standard-schema/spec";

// 公式の結果型をエクスポート
export type {
	StandardSchemaV1,
	StandardSchemaV1 as StandardSchemaV1Props,
	StandardSchemaV1 as StandardSchema,
	StandardSchemaV1 as StandardSchemaTypes,
} from "@standard-schema/spec";

// 互換性のための結果型（簡素化したインターフェース）
export interface StandardSchemaResult<Output> {
	readonly success: boolean;
	readonly data?: Output;
	readonly issues?: readonly StandardSchemaIssue[];
}

export interface StandardSchemaIssue {
	readonly message: string;
	readonly path?: readonly (string | number)[];
}

/**
 * Standard Schema から Input型を抽出（公式実装を使用）
 */
export type InferInput<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>;

/**
 * Standard Schema から Output型を抽出（公式実装を使用）
 */
export type InferOutput<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>;

/**
 * Standard Schema の検証関数を呼び出すヘルパー
 */
/**
 * Standard Schemaの結果を簡素化した形に変換
 */
function convertResult<Output>(
	result: StandardSchemaV1.Result<Output>
): StandardSchemaResult<Output> {
	if ("value" in result) {
		// 成功ケース
		return {
			success: true,
			data: result.value,
		};
	}
	// 失敗ケース
	return {
		success: false,
		issues:
			result.issues?.map((issue: StandardSchemaV1.Issue) => ({
				message: issue.message,
				path: issue.path?.map((segment: any) =>
					typeof segment === "object" && "key" in segment ? segment.key : segment
				) as (string | number)[],
			})) || [],
	};
}

/**
 * Standard Schema の検証関数を呼び出すヘルパー
 */
export async function validate<T extends StandardSchemaV1>(
	schema: T,
	input: unknown
): Promise<StandardSchemaResult<InferOutput<T>>> {
	const result = await schema["~standard"].validate(input);
	return convertResult(result) as StandardSchemaResult<InferOutput<T>>;
}

/**
 * 同期版の検証関数
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
