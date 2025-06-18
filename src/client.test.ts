import { beforeEach, describe, expect, test, vi } from "vitest";
import { createStandardSchemaFromZod } from "./adapters/zod";
import { TypeFetcher } from "./client";
import { TypeFetcherError, ValidationError } from "./types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Zodライクなモックスキーマ
const createMockZodSchema = <T>(validator: (input: unknown) => T) => ({
	parse: (input: unknown) => validator(input),
	safeParse: (input: unknown) => {
		try {
			const data = validator(input);
			return { success: true as const, data };
		} catch (error) {
			return {
				success: false as const,
				error: {
					issues: [{ message: "Validation failed", path: [] }],
				},
			};
		}
	},
	_input: undefined as unknown,
	_output: undefined as T,
});

describe("TypeFetcher", () => {
	let fetcher: TypeFetcher;

	beforeEach(() => {
		fetcher = new TypeFetcher({ baseURL: "https://api.example.com" });
		mockFetch.mockClear();
	});

	test("should create instance with default config", () => {
		const defaultFetcher = new TypeFetcher();
		expect(defaultFetcher).toBeInstanceOf(TypeFetcher);
	});

	test("should add endpoint and maintain type safety", () => {
		const newFetcher = fetcher.addEndpoint("GET", "/users/{id}");
		expect(newFetcher).toBeInstanceOf(TypeFetcher);
	});

	test("should make GET request without schema", async () => {
		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => responseData,
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("GET", "/users/{id}");

		const result = await client.request("GET /users/{id}", {
			pathParams: { id: "1" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/1",
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
			})
		);
		expect(result).toEqual(responseData);
	});

	test("should make POST request with body", async () => {
		const requestBody = { name: "Jane", email: "jane@example.com" };
		const responseData = { id: 2, ...requestBody };

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => responseData,
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("POST", "/users");

		const result = await client.request("POST /users", {
			body: requestBody,
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify(requestBody),
			})
		);
		expect(result).toEqual(responseData);
	});

	test("should validate request with schema", async () => {
		const userSchema = createMockZodSchema((input: any) => {
			if (typeof input?.name !== "string") throw new Error("Invalid name");
			return input as { name: string; email?: string };
		});

		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => responseData,
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("POST", "/users", {
			body: createStandardSchemaFromZod(userSchema),
		});

		const result = await client.request("POST /users", {
			body: { name: "John", email: "john@example.com" },
		});

		expect(result).toEqual(responseData);
	});

	test("should throw ValidationError for invalid request body", async () => {
		const userSchema = createMockZodSchema((input: any) => {
			if (typeof input?.name !== "string") throw new Error("Invalid name");
			return input;
		});

		const client = fetcher.addEndpoint("POST", "/users", {
			body: createStandardSchemaFromZod(userSchema),
		});

		await expect(
			client.request("POST /users", {
				body: { name: 123 }, // Invalid: name should be string
			})
		).rejects.toThrow(ValidationError);
	});

	test("should handle HTTP errors", async () => {
		const errorData = { error: "User not found" };
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
			json: async () => errorData,
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("GET", "/users/{id}");

		try {
			await client.request("GET /users/{id}", {
				pathParams: { id: "999" },
			});
			expect.fail("Should have thrown TypeFetcherError");
		} catch (error) {
			expect(error).toBeInstanceOf(TypeFetcherError);
			expect((error as TypeFetcherError).status).toBe(404);
		}
	});

	test("should handle query parameters", async () => {
		const responseData = [{ id: 1, name: "John" }];
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => responseData,
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("GET", "/users");

		await client.request("GET /users", {
			query: { page: "1", limit: "10" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users?page=1&limit=10",
			expect.any(Object)
		);
	});

	test("should throw error for non-existent endpoint", async () => {
		await expect(fetcher.request("GET /non-existent" as any, {} as any)).rejects.toThrow(
			"Endpoint not found"
		);
	});

	test("should replace path parameters correctly", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({}),
			headers: new Headers({ "content-type": "application/json" }),
		});

		const client = fetcher.addEndpoint("GET", "/users/{userId}/posts/{postId}");

		await client.request("GET /users/{userId}/posts/{postId}", {
			pathParams: { userId: "123", postId: "456" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/123/posts/456",
			expect.any(Object)
		);
	});
});
