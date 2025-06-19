/**
 * TypeFetcher Node.js Usage Examples
 *
 * Shows how to use TypeFetcher in Node.js environments
 */

import { TypeFetcher } from "../dist";
import { z } from "zod";

/**
 * Node.js 18+ usage (built-in fetch)
 */
function nodeJsModernExample() {
	// Node.js 18+ has built-in fetch, so no additional config needed
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	const api = client.addEndpoint("GET", "/users/{id}", {
		params: z.object({ id: z.string() }),
		response: z.object({
			id: z.number(),
			name: z.string(),
			email: z.string(),
		}),
	});

	return {
		async getUser(id: string) {
			const response = await api.request("GET /users/{id}", {
				params: { id },
			});

			console.log("User data:", response.data);
			console.log("Response status:", response.status);
			console.log("Content-Type:", response.headers.get("content-type"));

			return response.data;
		},
	};
}

/**
 * Node.js with custom fetch implementation
 */
async function nodeJsCustomFetchExample() {
	// For Node.js < 18 or custom fetch implementation
	const { default: nodeFetch } = await import("node-fetch");

	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
		fetch: nodeFetch as unknown as typeof globalThis.fetch,
	});

	const api = client.addEndpoint("GET", "/users/{id}", {
		params: z.object({ id: z.string() }),
		response: z.object({
			id: z.number(),
			name: z.string(),
			email: z.string(),
		}),
	});

	return {
		async getUser(id: string) {
			const response = await api.request("GET /users/{id}", {
				params: { id },
			});

			return {
				user: response.data,
				status: response.status,
				url: response.url
			};
		},
	};
}

/**
 * Using with undici (another fetch implementation)
 */
async function nodeJsUndiciExample() {
	// Using undici as fetch implementation
	const { fetch } = await import("undici");

	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
		fetch: fetch as unknown as typeof globalThis.fetch,
	});

	const api = client.addEndpoint("GET", "/users");

	return {
		async getUsers() {
			const response = await api.request("GET /users");

			console.log("Fetched", (response.data as any)?.length || 0, "users");
			console.log("Response headers:");
			for (const [key, value] of response.headers.entries()) {
				console.log(`  ${key}: ${value}`);
			}

			return response.data;
		},
	};
}

export { nodeJsModernExample, nodeJsCustomFetchExample, nodeJsUndiciExample };
