import type { StandardSchemaV1 } from "../schema";

/**
 * Valibot互換のスキーマインターフェース
 */
interface ValibotLike<Input = unknown, Output = Input> {
	safeParse(
		input: unknown
	):
		| { success: true; output: Output; issues?: never }
		| { success: false; issues: readonly ValibotIssue[]; output?: never };
	_types?: {
		input: Input;
		output: Output;
	};
}

interface ValibotIssue {
	message: string;
	path?: readonly { key: string | number }[];
}

/**
 * ValibotスキーマをStandard Schemaに変換
 */
export function createStandardSchemaFromValibot<T extends ValibotLike>(
	valibotSchema: T
): StandardSchemaV1<
	T["_types"] extends { input: infer I } ? I : unknown,
	T["_types"] extends { output: infer O } ? O : unknown
> {
	return {
		"~standard": {
			version: 1,
			vendor: "valibot",
			validate: (input: unknown) => {
				const result = valibotSchema.safeParse(input);
				if (result.success) {
					return {
						value: result.output as T["_types"] extends { output: infer O } ? O : unknown,
					};
				}
				return {
					issues: result.issues?.map((issue) => ({
						message: issue.message,
						path: issue.path?.map((segment) => segment.key),
					})) || [{ message: "Validation failed" }],
				};
			},
			types: {
				input: undefined as T["_types"] extends { input: infer I } ? I : unknown,
				output: undefined as T["_types"] extends { output: infer O } ? O : unknown,
			},
		},
	};
}

/**
 * 型安全なValibotアダプター（型推論のヘルパー）
 */
export const v = {
	/**
	 * Valibotスキーマを Standard Schema に変換
	 */
	toStandardSchema: createStandardSchemaFromValibot,
} as const;
