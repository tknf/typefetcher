import { describe, expect, test } from "vitest";
import { validate, validateSync } from "./schema";

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

	test("should work with Standard Schema compliant numeric validation", () => {
		const numberSchema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (input: unknown) => {
					if (typeof input === "number" && input > 0) {
						return { value: input };
					}
					return {
						issues: [{ message: "Must be positive number" }],
					};
				},
			},
		};

		const validResult = validateSync(numberSchema, 42);
		expect(validResult.success).toBe(true);
		expect(validResult.data).toBe(42);

		const invalidResult = validateSync(numberSchema, -1);
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues?.[0]?.message).toBe("Must be positive number");
	});

	test("should handle async validation", async () => {
		const asyncSchema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: async (input: unknown) => {
					await new Promise((resolve) => setTimeout(resolve, 1));
					if (typeof input === "string") {
						return { value: input.toLowerCase() };
					}
					return {
						issues: [{ message: "Expected string" }],
					};
				},
			},
		};

		const validResult = await validate(asyncSchema, "HELLO");
		expect(validResult.success).toBe(true);
		expect(validResult.data).toBe("hello");

		const invalidResult = await validate(asyncSchema, 123);
		expect(invalidResult.success).toBe(false);
		expect(invalidResult.issues).toEqual([{ message: "Expected string" }]);
	});

	test("should throw error when async schema is used with validateSync", () => {
		const asyncSchema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: async (input: unknown) => {
					return { value: input };
				},
			},
		};

		expect(() => validateSync(asyncSchema, "test")).toThrow(
			"Schema validation returned a Promise. Use validate() instead."
		);
	});

	test("should handle complex path structures in issues", () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (_input: unknown) => {
					return {
						issues: [
							{
								message: "Complex path error",
								path: ["users", 0, { key: "profile" }, "name"],
							},
						],
					};
				},
			},
		};

		const result = validateSync(schema, {});
		expect(result.success).toBe(false);
		expect(result.issues?.[0]?.path).toEqual(["users", 0, "profile", "name"]);
	});

	test("should handle missing issues in failure result", () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (_input: unknown) => {
					return {
						issues: [],
					};
				},
			},
		};

		const result = validateSync(schema, {});
		expect(result.success).toBe(false);
		expect(result.issues).toEqual([]);
	});

	test("should handle undefined issues in failure result", () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (_input: unknown) => {
					return {
						issues: [],
					};
				},
			},
		};

		const result = validateSync(schema, {});
		expect(result.success).toBe(false);
		expect(result.issues).toEqual([]);
	});
});
