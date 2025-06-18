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
			const response = await api.request("GET /users");
			return response.data; // Return just the users array
		},

		async getUser(id: string) {
			// params are type-checked and validated at runtime
			// TypeScript: Promise<StructuredResponse<User>>
			const response = await api.request("GET /users/{id}", {
				params: { id }
			});
			return response.data; // Return just the user object
		},

		async createUser(userData: { name: string; email: string; username: string }) {
			// body is type-checked and validated at runtime
			const response = await api.request("POST /users", {
				body: userData,
			});
			
			console.log("Created user with status:", response.status);
			console.log("Location header:", response.headers.get("location"));
			
			return response.data;
		},

		async updateUser(id: string, userData: { name: string; email: string; username: string }) {
			const response = await api.request("PUT /users/{id}", {
				params: { id },
				body: userData,
			});
			
			return {
				user: response.data,
				status: response.status,
				lastModified: response.headers.get("last-modified")
			};
		},
	};
}

export { valibotDirectExample };
