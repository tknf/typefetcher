/**
 * TypeFetcher Basic Usage Examples
 *
 * This file demonstrates basic usage patterns for TypeFetcher.
 * Zod 3.25.0+ / Valibot 1.0+ are Standard Schema compliant, so they can be used directly.
 */

import { TypeFetcher, TypeFetcherError, ValidationError } from "../dist";
import { z } from "zod"

/**
 * Basic usage example (no schema validation)
 */
function basicExample() {
	// Create client instance
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
		headers: {
			"User-Agent": "TypeFetcher Example",
		},
	});

	// Register endpoints
	const api = client
		.addEndpoint("GET", "/users")
		.addEndpoint("GET", "/users/{id}")
		.addEndpoint("POST", "/users")
		.addEndpoint("PUT", "/users/{id}")
		.addEndpoint("DELETE", "/users/{id}");

	// Octokit-style API methods
	return {
		async getUsers() {
			// Returns structured response with metadata
			const response = await api.request("GET /users");
			console.log("Users data:", response.data);
			console.log("Response status:", response.status);
			console.log("Response headers:", response.headers);
			console.log("Request URL:", response.url);
			// Access raw Response object: response["~raw"]
			return response;
		},

		async getUser(id: string) {
			// Pass path parameters
			const response = await api.request("GET /users/{id}", {
				params: { id },
			});
			return response.data; // Return just the data
		},

		async createUser(userData: any) {
			const response = await api.request("POST /users", {
				body: userData,
			});
			return response;
		},

		async updateUser(id: string, userData: any) {
			const response = await api.request("PUT /users/{id}", {
				params: { id },
				body: userData,
			});
			return response;
		},

		async deleteUser(id: string) {
			const response = await api.request("DELETE /users/{id}", {
				params: { id },
			});
			// Check status code for success
			return response.status === 204;
		},
	};
}

/**
 * Type-safe usage example with schema validation
 */
function typeSafeExample() {
	// Define Zod schemas (Zod 3.25.0+ is Standard Schema compliant)
	const UserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
		username: z.string(),
	});

	const CreateUserSchema = z.object({
		name: z.string(),
		email: z.string().email(),
		username: z.string(),
	});

	const PathIdSchema = z.object({
		id: z.string(),
	});

	// Create client instance
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	// Register endpoints with schema validation
	const api = client
		.addEndpoint("GET", "/users", {
			response: z.array(UserSchema),
		})
		.addEndpoint("GET", "/users/{id}", {
			params: PathIdSchema,
			response: UserSchema,
		})
		.addEndpoint("POST", "/users", {
			body: CreateUserSchema,
			response: UserSchema,
		})
		.addEndpoint("PUT", "/users/{id}", {
			params: PathIdSchema,
			body: CreateUserSchema,
			response: UserSchema,
		});

	return {
		async getUsers() {
			// TypeScript: Promise<StructuredResponse<User[]>>
			// Response is validated at runtime
			const response = await api.request("GET /users");
			// response.data is strongly typed as User[]
			return response.data;
		},

		async getUser(id: string) {
			// params are type-checked and validated at runtime
			// TypeScript: Promise<StructuredResponse<User>>
			const response = await api.request("GET /users/{id}", {
				params: { id } // Type-checked against PathIdSchema
			});
			// response.data is strongly typed as User
			return response.data;
		},

		async createUser(userData: { name: string; email: string; username: string }) {
			// body is type-checked and validated at runtime
			const response = await api.request("POST /users", {
				body: userData, // Type-checked against CreateUserSchema
			});
			
			// Access both data and metadata
			console.log("Created user:", response.data);
			console.log("Location header:", response.headers.get("location"));
			console.log("Status:", response.status);
			
			return response.data;
		},

		async updateUser(id: string, userData: { name: string; email: string; username: string }) {
			const response = await api.request("PUT /users/{id}", {
				params: { id },
				body: userData,
			});
			return response.data;
		},
	};
}

/**
 * Advanced usage with AbortSignal and custom headers
 */
function advancedExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
		headers: {
			"Authorization": "Bearer token",
		},
	});

	const api = client.addEndpoint("GET", "/users/{id}");

	return {
		async getUserWithAbort(id: string, timeoutMs: number = 5000) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

			try {
				const response = await api.request("GET /users/{id}", {
					params: { id },
					signal: controller.signal,
					headers: {
						"X-Custom-Header": "custom-value",
					},
				});

				clearTimeout(timeoutId);
				return response;
			} catch (error) {
				clearTimeout(timeoutId);
				throw error;
			}
		},
	};
}

/**
 * Error handling example
 */
async function errorHandlingExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
	});

	const api = client.addEndpoint("GET", "/users/{id}");

	try {
		const response = await api.request("GET /users/{id}", {
			params: { id: "123" },
		});
		
		console.log("User data:", response.data);
		console.log("Status:", response.status);
		console.log("Headers:", response.headers);
	} catch (error) {
		if (error instanceof TypeFetcherError) {
			// HTTP errors (404, 500, etc.)
			console.error(`HTTP Error: ${error.status} ${error.statusText}`);
			console.error("Response data:", error.data);
		} else if (error instanceof ValidationError) {
			// Schema validation errors
			console.error("Validation Error:", error.message);
			console.error("Issues:", error.issues);
		} else {
			// Other errors (network, abort, etc.)
			console.error("Unexpected error:", error);
		}
	}
}

/**
 * Working with raw Response object
 */
async function rawResponseExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
	});

	const api = client.addEndpoint("GET", "/download/{id}");

	const response = await api.request("GET /download/{id}", {
		params: { id: "file123" },
	});

	// Access raw Response for advanced operations
	const rawResponse = response["~raw"];
	
	// Stream the response body
	const reader = rawResponse.body?.getReader();
	
	// Check response headers
	const contentType = rawResponse.headers.get("content-type");
	const contentLength = rawResponse.headers.get("content-length");
	
	console.log(`Downloading ${contentType}, size: ${contentLength} bytes`);
	
	// Process stream...
	if (reader) {
		// Handle streaming...
	}

	return {
		data: response.data,
		contentType,
		contentLength: contentLength ? parseInt(contentLength) : undefined,
	};
}

// Export usage examples
export { 
	basicExample, 
	typeSafeExample, 
	advancedExample,
	errorHandlingExample,
	rawResponseExample 
};
