import { describe, expect, test } from "vitest";
import { createStandardSchemaFromZod } from "./adapters/zod";
import { validateSync } from "./schema";

describe("Standard Schema", () => {
	test("should validate with custom schema", () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (input: unknown) => {
					if (typeof input === "string") {
						return { value: input.toUpperCase() };
					}
					return {
						issues: [{ message: "Expected string" }],
					};
				},
			},
		};

		const validResult = validateSync(schema, "hello");
		expect(validResult.success).toBe(true);
		expect(validResult.data).toBe("HELLO");

		const invalidResult = validateSync(schema, 123);
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues).toEqual([{ message: "Expected string" }]);
	});

	test("should work with Zod adapter", () => {
		const mockZodSchema = {
			parse: (input: unknown) => {
				if (typeof input === "number" && input > 0) {
					return input;
				}
				throw new Error("Must be positive number");
			},
			safeParse: (input: unknown) => {
				try {
					const data = mockZodSchema.parse(input);
					return { success: true as const, data };
				} catch (error) {
					return {
						success: false as const,
						error: {
							issues: [{ message: "Must be positive number", path: [] }],
						},
					};
				}
			},
			_input: undefined as unknown,
			_output: undefined as number,
		};

		const standardSchema = createStandardSchemaFromZod(mockZodSchema);

		const validResult = validateSync(standardSchema, 42);
		expect(validResult.success).toBe(true);
		expect(validResult.data).toBe(42);

		const invalidResult = validateSync(standardSchema, -1);
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues?.[0]?.message).toBe("Must be positive number");
	});
});
