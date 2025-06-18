import { describe, expect, test } from "vitest";
import { createStandardSchemaFromValibot } from "./adapters/valibot";
import { validateSync } from "./schema";

describe("Valibot Adapter", () => {
	test("should work with mock Valibot schema", () => {
		// Valibotライクなモックスキーマ
		const mockValibotSchema = {
			safeParse: (input: unknown) => {
				if (typeof input === "number" && input > 0) {
					return { success: true as const, output: input };
				}
				return {
					success: false as const,
					issues: [{ message: "Must be positive number", path: [] }],
				};
			},
			_types: {
				input: undefined as unknown,
				output: undefined as number,
			},
		};

		const standardSchema = createStandardSchemaFromValibot(mockValibotSchema);

		const validResult = validateSync(standardSchema, 42);
		expect(validResult.success).toBe(true);
		expect(validResult.data).toBe(42);

		const invalidResult = validateSync(standardSchema, -1);
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues?.[0]?.message).toBe("Must be positive number");
	});

	test("should handle complex object validation", () => {
		const mockUserSchema = {
			safeParse: (input: any) => {
				if (
					typeof input === "object" &&
					input !== null &&
					typeof input.name === "string" &&
					typeof input.age === "number" &&
					input.age >= 0
				) {
					return { success: true as const, output: input as { name: string; age: number } };
				}
				return {
					success: false as const,
					issues: [{ message: "Invalid user object", path: [] }],
				};
			},
			_types: {
				input: undefined as unknown,
				output: undefined as { name: string; age: number },
			},
		};

		const standardSchema = createStandardSchemaFromValibot(mockUserSchema);

		const validResult = validateSync(standardSchema, { name: "John", age: 30 });
		expect(validResult.success).toBe(true);
		expect(validResult.data).toEqual({ name: "John", age: 30 });

		const invalidResult = validateSync(standardSchema, { name: 123 });
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues?.[0]?.message).toBe("Invalid user object");
	});
});
