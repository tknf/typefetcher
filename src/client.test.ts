import { describe, test, expect, vi, beforeEach } from "vitest";
import { TypeFetcher } from "./client";
import { TypeFetcherError, ValidationError } from "./types";
import { z } from "zod";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response with clone method
const createMockResponse = (data: unknown, options: { status?: number; statusText?: string; headers?: Record<string, string>; ok?: boolean } = {}) => {
	const response = {
		ok: options.ok ?? (options.status === undefined || options.status < 400),
		status: options.status ?? 200,
		statusText: options.statusText ?? "OK",
		headers: new Headers({ "content-type": "application/json", ...options.headers }),
		json: vi.fn().mockResolvedValue(data),
		text: vi.fn().mockResolvedValue(typeof data === "string" ? data : JSON.stringify(data)),
		clone: vi.fn(),
	};
	response.clone.mockReturnValue(response);
	return response;
};

describe("TypeFetcher with ~raw Response", () => {
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

	test("should make GET request without schema and include ~raw", async () => {
		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users/{id}");

		const result = await client.request("GET /users/{id}", {
			params: { id: "1" },
		});

		expect(result).toMatchObject(responseData);
		expect(result["~raw"]).toBeDefined();
		expect(result["~raw"].status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/1",
			expect.objectContaining({
				method: "GET",
			})
		);
	});

	test("should make POST request with body", async () => {
		const requestData = { name: "Jane", email: "jane@example.com" };
		const responseData = { id: 2, ...requestData };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("POST", "/users");

		const result = await client.request("POST /users", {
			body: requestData,
		});

		expect(result).toMatchObject(responseData);
		expect(result["~raw"].status).toBe(200);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify(requestData),
			})
		);
	});

	test("should validate request with schema", async () => {
		const userSchema = z.object({
			name: z.string(),
			email: z.string().email(),
		});

		const responseSchema = z.object({
			id: z.number(),
			name: z.string(),
			email: z.string(),
		});

		const requestData = { name: "Alice", email: "alice@example.com" };
		const responseData = { id: 3, ...requestData };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("POST", "/users", {
			body: userSchema,
			response: responseSchema,
		});

		const result = await client.request("POST /users", {
			body: requestData,
		});

		// Type inference should work - these properties should be strongly typed
		expect(result.id).toBe(3);
		expect(result.name).toBe("Alice");
		expect(result.email).toBe("alice@example.com");
		expect(result["~raw"].status).toBe(200);
	});

	test("should throw ValidationError for invalid request body", async () => {
		const userSchema = z.object({
			name: z.string(),
		});

		const client = fetcher.addEndpoint("POST", "/users", {
			body: userSchema,
		});

		await expect(
			client.request("POST /users", {
				body: { name: 123 } as any, // Invalid input - name should be string, not number
			})
		).rejects.toThrow("Request body validation failed");
	});

	test("should handle HTTP errors", async () => {
		const errorData = { error: "User not found" };
		mockFetch.mockResolvedValueOnce(createMockResponse(errorData, {
			status: 404,
			statusText: "Not Found",
			ok: false,
		}));

		const client = fetcher.addEndpoint("GET", "/users/{id}");

		try {
			await client.request("GET /users/{id}", {
				params: { id: "999" },
			});
			expect.fail("Should have thrown TypeFetcherError");
		} catch (error) {
			expect(error).toBeInstanceOf(TypeFetcherError);
			expect((error as TypeFetcherError).status).toBe(404);
		}
	});

	test("should handle query parameters", async () => {
		const responseData = [{ id: 1, name: "John" }];
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users");

		await client.request("GET /users", {
			query: { page: "1", limit: "10" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users?page=1&limit=10",
			expect.objectContaining({
				method: "GET",
			})
		);
	});

	test("should throw error for non-existent endpoint", async () => {
		const client = fetcher.addEndpoint("GET", "/users");

		await expect(
			client.request("POST /users" as any, {})
		).rejects.toThrow("Endpoint not found: POST /users");
	});

	test("should replace path parameters correctly", async () => {
		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users/{id}/posts/{postId}");

		await client.request("GET /users/{id}/posts/{postId}", {
			params: { id: "123", postId: "456" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/123/posts/456",
			expect.any(Object)
		);
	});

	test("should throw error for missing path parameter", async () => {
		const client = fetcher.addEndpoint("GET", "/users/{id}");

		// This error should occur before fetch is called
		mockFetch.mockResolvedValue(createMockResponse({}));

		await expect(
			client.request("GET /users/{id}", {
				params: { notId: "value" } as any, // Wrong parameter name
			})
		).rejects.toThrow("Missing path parameter: id");
	});

	test("should throw error for invalid request key format", async () => {
		const client = fetcher.addEndpoint("GET", "/users");

		await expect(
			client.request("INVALID FORMAT" as any, {})
		).rejects.toThrow("Endpoint not found: INVALID FORMAT");
	});

	test("should handle non-JSON response", async () => {
		const textResponse = "Plain text";
		mockFetch.mockResolvedValueOnce(createMockResponse(textResponse, {
			headers: { "content-type": "text/plain" },
		}));

		const client = fetcher.addEndpoint("GET", "/text");

		const result = await client.request("GET /text");

		expect(result["~raw"].headers.get("content-type")).toBe("text/plain");
	});

	test("should handle HTTP error with non-JSON response", async () => {
		const errorText = "Internal Server Error";
		mockFetch.mockResolvedValueOnce(createMockResponse(errorText, {
			status: 500,
			statusText: "Internal Server Error",
			headers: { "content-type": "text/plain" },
			ok: false,
		}));

		const client = fetcher.addEndpoint("GET", "/error");

		try {
			await client.request("GET /error");
			expect.fail("Should have thrown TypeFetcherError");
		} catch (error) {
			expect(error).toBeInstanceOf(TypeFetcherError);
			expect((error as TypeFetcherError).status).toBe(500);
		}
	});

	test("should handle HTTP error with unparseable response", async () => {
		const mockResponse = createMockResponse("invalid json {", {
			status: 500,
			statusText: "Internal Server Error",
			ok: false,
		});
		mockResponse.json.mockRejectedValue(new Error("Parse error"));
		mockFetch.mockResolvedValueOnce(mockResponse);

		const client = fetcher.addEndpoint("GET", "/error");

		try {
			await client.request("GET /error");
			expect.fail("Should have thrown TypeFetcherError");
		} catch (error) {
			expect(error).toBeInstanceOf(TypeFetcherError);
			expect((error as TypeFetcherError).status).toBe(500);
		}
	});

	test("should validate response with schema", async () => {
		const responseSchema = z.object({
			id: z.number(),
			name: z.string(),
		});

		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users/{id}", {
			response: responseSchema,
		});

		const result = await client.request("GET /users/{id}", {
			params: { id: "1" },
		});

		expect(result.id).toBe(1);
		expect(result.name).toBe("John");
		expect(result["~raw"].status).toBe(200);
	});

	test("should throw ValidationError for invalid response", async () => {
		const responseSchema = z.object({
			id: z.number(),
			name: z.string(),
		});

		const invalidResponse = { id: "not a number", name: "John" };
		mockFetch.mockResolvedValueOnce(createMockResponse(invalidResponse));

		const client = fetcher.addEndpoint("GET", "/users/{id}", {
			response: responseSchema,
		});

		await expect(
			client.request("GET /users/{id}", {
				params: { id: "1" },
			})
		).rejects.toThrow("Response validation failed");
	});

	test("should throw ValidationError for invalid path parameters", async () => {
		const pathSchema = z.object({
			id: z.string().min(1),
		});

		const client = fetcher.addEndpoint("GET", "/users/{id}", {
			params: pathSchema,
		});

		await expect(
			client.request("GET /users/{id}", {
				params: { id: "" }, // Invalid: empty string
			})
		).rejects.toThrow("Path parameters validation failed");
	});

	test("should throw ValidationError for invalid query parameters", async () => {
		const querySchema = z.object({
			page: z.string().min(1),
		});

		const client = fetcher.addEndpoint("GET", "/users", {
			query: querySchema,
		});

		await expect(
			client.request("GET /users", {
				query: { page: "" }, // Invalid: empty string
			})
		).rejects.toThrow("Query parameters validation failed");
	});

	test("should validate and use path parameters with schema", async () => {
		const pathSchema = z.object({
			id: z.string().min(1),
		});

		const responseData = { id: 1, name: "John" };
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users/{id}", {
			params: pathSchema,
		});

		await client.request("GET /users/{id}", {
			params: { id: "123" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/123",
			expect.any(Object)
		);
	});

	test("should validate and use query parameters with schema", async () => {
		const querySchema = z.object({
			page: z.string(),
			limit: z.string(),
		});

		const responseData = [{ id: 1, name: "John" }];
		mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

		const client = fetcher.addEndpoint("GET", "/users", {
			query: querySchema,
		});

		await client.request("GET /users", {
			query: { page: "1", limit: "10" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users?page=1&limit=10",
			expect.any(Object)
		);
	});

	test("should pass AbortSignal to fetch request", async () => {
		const controller = new AbortController();
		const signal = controller.signal;

		mockFetch.mockResolvedValue(createMockResponse({ id: 1, name: "John" }));

		const client = fetcher.addEndpoint("GET", "/users/{id}");

		await client.request("GET /users/{id}", {
			params: { id: "1" },
			signal,
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/1",
			expect.objectContaining({
				signal,
			})
		);
	});

	test("should not include signal when not provided", async () => {
		mockFetch.mockResolvedValue(createMockResponse({ data: "test" }));

		const client = fetcher.addEndpoint("GET", "/test");

		await client.request("GET /test");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/test",
			expect.not.objectContaining({
				signal: expect.anything(),
			})
		);
	});

	test("should use custom fetch implementation", async () => {
		const customFetch = vi.fn().mockResolvedValue(createMockResponse({ data: "custom" }));
		
		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
			fetch: customFetch,
		});

		const api = client.addEndpoint("GET", "/custom");
		await api.request("GET /custom");

		expect(customFetch).toHaveBeenCalledWith(
			"https://api.example.com/custom",
			expect.any(Object)
		);
	});

	test("should handle GET and DELETE methods without body", async () => {
		mockFetch.mockResolvedValue(createMockResponse({ success: true }));

		const client = fetcher
			.addEndpoint("GET", "/get-test")
			.addEndpoint("DELETE", "/delete-test");

		await client.request("GET /get-test");
		await client.request("DELETE /delete-test");

		// Both calls should not include body in request
		expect(mockFetch).toHaveBeenNthCalledWith(1,
			"https://api.example.com/get-test",
			expect.not.objectContaining({
				body: expect.anything(),
			})
		);
		expect(mockFetch).toHaveBeenNthCalledWith(2,
			"https://api.example.com/delete-test",
			expect.not.objectContaining({
				body: expect.anything(),
			})
		);
	});

	test("should handle invalid request key format that passes initial check", async () => {
		const client = fetcher.addEndpoint("GET", "/test");
		
		// Mock endpoints directly to test parseRequestKey edge case
		(client as any).endpoints = {
			"INVALID": { method: "GET", path: "/test" }
		};

		await expect(
			(client as any).request("INVALID", {})
		).rejects.toThrow("Invalid request key format: INVALID");
	});

	test("should handle error response parsing with text content", async () => {
		const errorText = "Server Error";
		const mockResponse = createMockResponse(errorText, {
			status: 500,
			statusText: "Internal Server Error",
			headers: { "content-type": "text/plain" },
			ok: false,
		});
		
		mockFetch.mockResolvedValueOnce(mockResponse);

		const client = fetcher.addEndpoint("GET", "/error");

		try {
			await client.request("GET /error");
			expect.fail("Should have thrown TypeFetcherError");
		} catch (error) {
			expect(error).toBeInstanceOf(TypeFetcherError);
			expect((error as TypeFetcherError).status).toBe(500);
			expect((error as TypeFetcherError).data).toBe(errorText);
		}
	});

	test("should handle request with all parameter types", async () => {
		const responseData = { success: true };
		mockFetch.mockResolvedValue(createMockResponse(responseData));

		const client = fetcher.addEndpoint("PUT", "/users/{id}");

		await client.request("PUT /users/{id}", {
			params: { id: "123" },
			query: { version: "v2" },
			body: { name: "Updated" },
			headers: { "X-Custom": "value" },
		});

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/123?version=v2",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify({ name: "Updated" }),
				headers: expect.objectContaining({
					"X-Custom": "value",
				}),
			})
		);
	});
});