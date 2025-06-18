/**
 * TypeFetcher Valibot Usage Example
 *
 * Valibot 1.0+ is Standard Schema compliant, so it can be used directly.
 */

import { TypeFetcher } from "../dist";
import * as v from "valibot";

/**
 * Example using Valibot schemas directly
 */
function valibotDirectExample() {
	// Define Valibot schemas (Valibot 1.0+ is Standard Schema compliant)
	const UserSchema = v.object({
		id: v.number(),
		name: v.string(),
		email: v.pipe(v.string(), v.email()),
		username: v.string(),
	});

	const CreateUserSchema = v.object({
		name: v.string(),
		email: v.pipe(v.string(), v.email()),
		username: v.string(),
	});

	const PathIdSchema = v.object({
		id: v.string(),
	});

	// Create client instance
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	// Register endpoints using schemas directly
	const api = client
		.addEndpoint("GET", "/users", {
			response: v.array(UserSchema),
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
				body: userData,
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

export { valibotDirectExample };
