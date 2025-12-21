/**
 * TypeFetcher Skip Validation (Suggestions Only) Usage Examples
 *
 * This file demonstrates how to use schemas for type inference only,
 * without performing runtime validation. This is useful for:
 * - Performance-critical production environments
 * - APIs where validation is handled server-side
 * - Legacy APIs with evolving schemas
 */

import { TypeFetcher } from "../dist";
import { z } from "zod";

/**
 * Global skip validation example
 * All endpoints will skip validation by default
 */
function globalSkipValidationExample() {
	// Define schemas for type inference
	const UserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
	});

	const CreateUserSchema = z.object({
		name: z.string(),
		email: z.string().email(),
	});

	// Create client with global skipValidation
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
		skipValidation: true, // Skip validation for all endpoints
	});

	// Register endpoints with schemas
	// Schemas provide TypeScript types but no runtime validation
	const api = client
		.addEndpoint("GET", "/users", {
			response: z.array(UserSchema),
		})
		.addEndpoint("GET", "/users/{id}", {
			params: z.object({ id: z.string() }),
			response: UserSchema,
		})
		.addEndpoint("POST", "/users", {
			body: CreateUserSchema,
			response: UserSchema,
		});

	return {
		async getUsers() {
			// Response is typed as User[] but not validated at runtime
			const response = await api.request("GET /users");
			// response.data has type User[] from schema
			return response.data;
		},

		async getUser(id: string) {
			// Params are typed but not validated at runtime
			const response = await api.request("GET /users/{id}", {
				params: { id }, // Type-safe but no validation
			});
			return response.data;
		},

		async createUser(userData: { name: string; email: string }) {
			// Body is typed but not validated at runtime
			const response = await api.request("POST /users", {
				body: userData, // Type-safe but no validation
			});
			return response.data;
		},
	};
}

/**
 * Per-endpoint skip validation example
 * Fine-grained control over which endpoints skip validation
 */
function perEndpointSkipValidationExample() {
	const UserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
	});

	// Create client with validation enabled by default
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
		skipValidation: false, // Default: validate
	});

	const api = client
		.addEndpoint("GET", "/users", {
			response: z.array(UserSchema),
			skipValidation: true, // Skip validation for this endpoint
		})
		.addEndpoint("POST", "/users", {
			body: z.object({
				name: z.string(),
				email: z.string().email(),
			}),
			response: UserSchema,
			// This endpoint WILL validate (uses global default: false)
		});

	return {
		async getUsers() {
			// No validation - even if response doesn't match schema
			const response = await api.request("GET /users");
			return response.data;
		},

		async createUser(userData: { name: string; email: string }) {
			// This WILL validate - throws ValidationError if invalid
			const response = await api.request("POST /users", {
				body: userData,
			});
			return response.data;
		},
	};
}

/**
 * Mixed validation example
 * Use validation for critical endpoints, skip for others
 */
function mixedValidationExample() {
	const UserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
	});

	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
		skipValidation: true, // Skip validation by default
	});

	const api = client
		// Analytics endpoint - skip validation for performance
		.addEndpoint("POST", "/analytics/track", {
			body: z.object({
				event: z.string(),
				data: z.record(z.unknown()),
			}),
			skipValidation: true,
		})
		// User creation - validate for data integrity
		.addEndpoint("POST", "/users", {
			body: z.object({
				name: z.string().min(1),
				email: z.string().email(),
			}),
			response: UserSchema,
			skipValidation: false, // Override global setting
		})
		// Profile fetch - skip validation for performance
		.addEndpoint("GET", "/profile", {
			response: UserSchema,
			// Uses global default: skipValidation: true
		});

	return {
		async trackEvent(event: string, data: Record<string, unknown>) {
			// High-performance, no validation overhead
			await api.request("POST /analytics/track", {
				body: { event, data },
			});
		},

		async createUser(name: string, email: string) {
			// Validated for data integrity
			const response = await api.request("POST /users", {
				body: { name, email },
			});
			return response.data;
		},

		async getProfile() {
			// Fast fetch without validation
			const response = await api.request("GET /profile");
			return response.data;
		},
	};
}

/**
 * Production environment example
 * Skip validation in production, enable in development
 */
function environmentBasedValidationExample() {
	const isProd = process.env.NODE_ENV === "production";

	const UserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
	});

	// Skip validation in production for performance
	// Enable validation in development for debugging
	const client = new TypeFetcher({
		baseURL: process.env.API_BASE_URL || "https://api.example.com",
		skipValidation: isProd, // Skip in prod, validate in dev
	});

	const api = client
		.addEndpoint("GET", "/users", {
			response: z.array(UserSchema),
		})
		.addEndpoint("GET", "/users/{id}", {
			params: z.object({ id: z.string() }),
			response: UserSchema,
		});

	console.log(
		isProd ? "Running in production mode (validation skipped)" : "Running in development mode (validation enabled)"
	);

	return api;
}

/**
 * Legacy API example
 * Skip validation for evolving API responses
 */
function legacyApiExample() {
	// Define the "ideal" schema, but skip validation
	// because the legacy API might return extra or missing fields
	const LegacyUserSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().optional(), // Email might not always be present
		// Legacy API might return other unexpected fields
	});

	const client = new TypeFetcher({
		baseURL: "https://legacy-api.example.com",
		skipValidation: true, // Don't break on unexpected fields
	});

	const api = client.addEndpoint("GET", "/users/{id}", {
		params: z.object({ id: z.string() }),
		response: LegacyUserSchema,
	});

	return {
		async getUser(id: string) {
			// Won't throw error even if response has extra fields
			// or missing optional fields
			const response = await api.request("GET /users/{id}", {
				params: { id },
			});

			// Still get TypeScript type safety
			const user = response.data;
			console.log(`User ID: ${user.id}, Name: ${user.name}`);

			// Handle optional fields safely
			if (user.email) {
				console.log(`Email: ${user.email}`);
			}

			return user;
		},
	};
}

// Export usage examples
export {
	globalSkipValidationExample,
	perEndpointSkipValidationExample,
	mixedValidationExample,
	environmentBasedValidationExample,
	legacyApiExample,
};
