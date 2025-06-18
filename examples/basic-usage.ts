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
			// TypeScript: Promise<unknown>
			return await api.request("GET /users");
		},

		async getUser(id: string) {
			// Pass path parameters
			return await api.request("GET /users/{id}", {
				params: { id },
			});
		},

		async createUser(userData: any) {
			return await api.request("POST /users", {
				body: userData,
			});
		},

		async updateUser(id: string, userData: any) {
			return await api.request("PUT /users/{id}", {
				params: { id },
				body: userData,
			});
		},

		async deleteUser(id: string) {
			return await api.request("DELETE /users/{id}", {
				params: { id },
			});
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
			pathParams: PathIdSchema,
			response: UserSchema,
		})
		.addEndpoint("POST", "/users", {
			body: CreateUserSchema,
			response: UserSchema,
		})
		.addEndpoint("PUT", "/users/{id}", {
			pathParams: PathIdSchema,
			body: CreateUserSchema,
			response: UserSchema,
		});

	return {
		async getUsers() {
			// TypeScript: Promise<{ id: number; name: string; email: string; username: string; }[]>
			// Response is validated at runtime
			return await api.request("GET /users");
		},

		async getUser(id: string) {
			// params are type-checked and validated at runtime
			// TypeScript: Promise<{ id: number; name: string; email: string; username: string; }>
			return await api.request("GET /users/{id}", {
				params: { id }
			});
		},

		async createUser(userData: { name: string; email: string; username: string }) {
			// body is type-checked and validated at runtime
			return await api.request("POST /users", {
				body: userData, // Expects CreateUserSchema type
			});
		},

		async updateUser(id: string, userData: { name: string; email: string; username: string }) {
			return await api.request("PUT /users/{id}", {
				params: { id },
				body: userData,
			});
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
		const user = await api.request("GET /users/{id}", {
			params: { id: "123" },
		});
		console.log(user);
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
			// Other errors
			console.error("Unexpected error:", error);
		}
	}
}

// Export usage examples
export { basicExample, typeSafeExample, errorHandlingExample };
