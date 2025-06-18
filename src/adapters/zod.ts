import type { StandardSchemaV1 } from "../schema";

/**
 * Zod互換のスキーマインターフェース
 */
interface ZodLike<Input = any, Output = Input> {
	parse(input: unknown): Output;
	safeParse(input: unknown): { success: true; data: Output } | { success: false; error: any };
	_input: Input;
	_output: Output;
}

/**
 * ZodスキーマをStandard Schemaに変換
 */
export function createStandardSchemaFromZod<T extends ZodLike>(
	zodSchema: T
): StandardSchemaV1<T["_input"], T["_output"]> {
	return {
		"~standard": {
			version: 1,
			vendor: "zod",
			validate: (input: unknown) => {
				const result = zodSchema.safeParse(input);
				if (result.success) {
					return {
						value: result.data,
					};
				}
				return {
					issues: (result as { success: false; error: any }).error.issues?.map((issue: any) => ({
						message: issue.message,
						path: issue.path,
					})) || [{ message: "Validation failed" }],
				};
			},
			types: {
				input: undefined as T["_input"],
				output: undefined as T["_output"],
			},
		},
	};
}

/**
 * 型安全なZodアダプター（型推論のヘルパー）
 */
export const z = {
	/**
	 * Zodスキーマを Standard Schema に変換
	 */
	toStandardSchema: createStandardSchemaFromZod,
} as const;
