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
			return await api.request("GET /users/{id}", {
				params: { id },
			});
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
			return await api.request("GET /users/{id}", {
				params: { id },
			});
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
			return await api.request("GET /users");
		},
	};
}

export { nodeJsModernExample, nodeJsCustomFetchExample, nodeJsUndiciExample };
