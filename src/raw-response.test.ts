import { describe, test, expect, vi, beforeEach } from "vitest";
import { TypeFetcher } from "./client";
import { z } from "zod";

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response with clone method
const createMockResponse = (data: unknown, options: { status?: number; statusText?: string; headers?: Record<string, string>; ok?: boolean; url?: string } = {}) => {
	const response = {
		ok: options.ok ?? (options.status === undefined || options.status < 400),
		status: options.status ?? 200,
		statusText: options.statusText ?? "OK",
		url: options.url ?? "https://api.example.com/test",
		headers: new Headers({ "content-type": "application/json", ...options.headers }),
		json: vi.fn().mockResolvedValue(data),
		text: vi.fn().mockResolvedValue(typeof data === "string" ? data : JSON.stringify(data)),
		clone: vi.fn(),
	};
	response.clone.mockReturnValue(response);
	return response;
};

describe("~raw Response Property", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	test("should include ~raw property in response with schema", async () => {
		const responseData = { id: 1, name: "John", email: "john@example.com" };
		mockFetch.mockResolvedValue(createMockResponse(responseData));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("GET", "/users/{id}", {
			params: z.object({ id: z.string() }),
			response: z.object({
				id: z.number(),
				name: z.string(),
				email: z.string(),
			}),
		});

		const result = await api.request("GET /users/{id}", {
			params: { id: "1" },
		});

		// Check parsed data properties
		expect(result.data.id).toBe(1);
		expect(result.data.name).toBe("John");
		expect(result.data.email).toBe("john@example.com");

		// Check ~raw property
		expect(result["~raw"]).toBeDefined();
		expect(result["~raw"].status).toBe(200);
		expect(result["~raw"].statusText).toBe("OK");
	});

	test("should include ~raw property in response without schema", async () => {
		const responseData = { anything: "goes", here: 123 };
		mockFetch.mockResolvedValue(createMockResponse(responseData));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("GET", "/anything");

		const result = await api.request("GET /anything");

		// Check that response includes both data and ~raw
		expect(result.data).toMatchObject(responseData);
		expect(result["~raw"]).toBeDefined();
		expect(result["~raw"].status).toBe(200);
	});

	test("should work with non-JSON response", async () => {
		const textResponse = "Plain text response";
		mockFetch.mockResolvedValue(createMockResponse(textResponse, {
			headers: { "content-type": "text/plain" },
		}));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("GET", "/text");

		const result = await api.request("GET /text");

		// For text responses, the result is the text string with ~raw property added
		expect(typeof result).toBe("object"); // Object.assign creates an object
		expect(result["~raw"]).toBeDefined();
		expect(result["~raw"].headers.get("content-type")).toBe("text/plain");
	});

	test("should work with AbortSignal", async () => {
		const controller = new AbortController();
		const signal = controller.signal;

		const responseData = { message: "success" };
		mockFetch.mockResolvedValue(createMockResponse(responseData));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("POST", "/data", {
			body: z.object({ value: z.string() }),
			response: z.object({ message: z.string() }),
		});

		const result = await api.request("POST /data", {
			body: { value: "test" },
			signal,
		});

		// Verify signal was passed to fetch
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/data",
			expect.objectContaining({
				signal,
			})
		);

		// Verify we get data with ~raw property
		expect(result.data.message).toBe("success");
		expect(result["~raw"].status).toBe(200);
	});

	test("should work with custom headers", async () => {
		const responseData = { data: "test" };
		mockFetch.mockResolvedValue(createMockResponse(responseData, {
			headers: { "x-custom-header": "custom-value" },
		}));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("GET", "/test");

		const result = await api.request("GET /test", {
			headers: {
				"Accept": "application/json",
			},
		});

		expect(result["~raw"].headers.get("x-custom-header")).toBe("custom-value");
	});

	test("should preserve response headers and metadata", async () => {
		const responseData = { id: 1 };
		mockFetch.mockResolvedValue(createMockResponse(responseData, {
			status: 201,
			statusText: "Created",
			headers: {
				"location": "/users/1",
				"x-ratelimit-remaining": "999",
			},
		}));

		const client = new TypeFetcher({
			baseURL: "https://api.example.com",
		});

		const api = client.addEndpoint("POST", "/users");

		const result = await api.request("POST /users", {
			body: { name: "John" },
		});

		// Check that all response metadata is preserved
		expect(result["~raw"].status).toBe(201);
		expect(result["~raw"].statusText).toBe("Created");
		expect(result["~raw"].headers.get("location")).toBe("/users/1");
		expect(result["~raw"].headers.get("x-ratelimit-remaining")).toBe("999");
	});
});