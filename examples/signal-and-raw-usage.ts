/**
 * TypeFetcher AbortSignal and ~raw Response Examples
 *
 * This file demonstrates how to use AbortSignal for request cancellation
 * and how to access raw response data through the ~raw property.
 */

import { TypeFetcher, TypeFetcherError } from "../dist";
import { z } from "zod";

/**
 * AbortSignal usage example for request cancellation
 */
async function abortSignalExample() {
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	const api = client.addEndpoint("GET", "/posts/{id}", {
		params: z.object({ id: z.string() }),
		response: z.object({
			id: z.number(),
			title: z.string(),
			body: z.string(),
			userId: z.number(),
		}),
	});

	// Create an AbortController for cancellation
	const controller = new AbortController();

	// Cancel the request after 1 second
	setTimeout(() => {
		controller.abort();
		console.log("Request cancelled");
	}, 1000);

	try {
		const response = await api.request("GET /posts/{id}", {
			params: { id: "1" },
			signal: controller.signal, // Pass the abort signal
		});
		console.log("Post received:", response.data);
		console.log("Response status:", response.status);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.log("Request was cancelled");
		} else {
			console.error("Request failed:", error);
		}
	}
}

/**
 * Raw response access example using ~raw property
 */
async function rawResponseExample() {
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	const api = client.addEndpoint("GET", "/posts/{id}", {
		params: z.object({ id: z.string() }),
		response: z.object({
			id: z.number(),
			title: z.string(),
			body: z.string(),
			userId: z.number(),
		}),
	});

	try {
		// Use regular request method - it now returns structured response
		const response = await api.request("GET /posts/{id}", {
			params: { id: "1" },
		});

		// Access parsed, validated data directly
		console.log("Post ID:", response.data.id);
		console.log("Post title:", response.data.title);

		// Access response metadata directly
		console.log("Response status:", response.status);
		console.log("Response URL:", response.url);
		console.log("Response headers:");
		for (const [key, value] of response.headers.entries()) {
			console.log(`  ${key}: ${value}`);
		}

		// Access raw response for advanced operations
		console.log("Raw response type:", response["~raw"].type);
		console.log("Response redirected:", response["~raw"].redirected);

		// You can also access the raw body again if needed
		// Note: response.clone() is used internally so this won't conflict
		const rawText = await response["~raw"].text();
		console.log("Raw response body length:", rawText.length);
	} catch (error) {
		console.error("Request failed:", error);
	}
}

/**
 * Combined example with both signal and ~raw response access
 */
async function combinedExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.github.com",
		headers: {
			"User-Agent": "TypeFetcher Example",
		},
	});

	const api = client.addEndpoint("GET", "/users/{username}", {
		params: z.object({ username: z.string() }),
		response: z.object({
			id: z.number(),
			login: z.string(),
			name: z.string().nullable(),
			public_repos: z.number(),
			followers: z.number(),
		}),
	});

	const controller = new AbortController();

	// Set up a timeout for demonstration
	setTimeout(() => {
		controller.abort();
	}, 5000); // 5 second timeout

	try {
		const response = await api.request("GET /users/{username}", {
			params: { username: "octocat" },
			signal: controller.signal,
			headers: {
				"Accept": "application/vnd.github.v3+json",
			},
		});

		console.log("GitHub user:", response.data.login);
		console.log("Name:", response.data.name);
		console.log("Public repos:", response.data.public_repos);

		// Check rate limiting headers directly from response
		const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
		const rateLimitReset = response.headers.get("x-ratelimit-reset");

		console.log("Rate limit remaining:", rateLimitRemaining);
		if (rateLimitReset) {
			const resetDate = new Date(parseInt(rateLimitReset) * 1000);
			console.log("Rate limit resets at:", resetDate.toISOString());
		}

		// Check if response was cached
		const cacheStatus = response.headers.get("x-served-by");
		if (cacheStatus) {
			console.log("Served by cache:", cacheStatus);
		}
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.log("Request was cancelled due to timeout");
		} else if (error instanceof TypeFetcherError) {
			console.error(`GitHub API error: ${error.status} ${error.statusText}`);
			console.error("Error data:", error.data);
		} else {
			console.error("Unexpected error:", error);
		}
	}
}

/**
 * Long-polling example with cancellation
 */
async function longPollingExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
		timeout: 30000, // 30 second timeout
	});

	const api = client.addEndpoint("GET", "/events", {
		query: z.object({
			since: z.string().optional(),
			timeout: z.string().optional(),
		}),
		response: z.array(z.object({
			id: z.string(),
			type: z.string(),
			timestamp: z.string(),
		})),
	});

	const controller = new AbortController();

	// Cancel if user presses Ctrl+C or after 25 seconds
	const cancelTimeout = setTimeout(() => {
		controller.abort();
		console.log("Long polling cancelled due to timeout");
	}, 25000);

	try {
		console.log("Starting long polling for events...");

		const response = await api.request("GET /events", {
			query: {
				timeout: "30", // Server-side timeout
			},
			signal: controller.signal,
		});

		clearTimeout(cancelTimeout);

		console.log("Received events:", response.data.length);
		response.data.forEach(event => {
			console.log(`Event ${event.id}: ${event.type} at ${event.timestamp}`);
		});

		// Check if the connection was kept alive through headers
		const connection = response.headers.get("connection");
		console.log("Connection:", connection);
	} catch (error) {
		clearTimeout(cancelTimeout);

		if (error instanceof Error && error.name === "AbortError") {
			console.log("Long polling was cancelled");
		} else {
			console.error("Long polling failed:", error);
		}
	}
}

/**
 * Example showing type inference with ~raw property
 */
async function typeInferenceExample() {
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	const api = client.addEndpoint("GET", "/posts/{id}", {
		params: z.object({ id: z.string() }),
		response: z.object({
			id: z.number(),
			title: z.string(),
			body: z.string(),
			userId: z.number(),
		}),
	});

	// TypeScript knows the exact shape of the structured response
	const response = await api.request("GET /posts/{id}", {
		params: { id: "1" },
	});

	// All these have full type inference:
	console.log("Post ID:", response.data.id); // number
	console.log("Post title:", response.data.title); // string
	console.log("User ID:", response.data.userId); // number

	// Structured response properties also have proper typing:
	console.log("Status:", response.status); // number
	console.log("Headers:", response.headers); // Headers object
	console.log("URL:", response.url); // string
	console.log("Content-Type:", response.headers.get("content-type")); // string | null

	// Raw response access also available:
	console.log("Raw response status:", response["~raw"].status); // number

	// Clean separation of data and metadata
	const { data, status, headers, url, "~raw": rawResponse } = response;
	console.log("Post data:", data); // { id: number, title: string, body: string, userId: number }
	console.log("Response metadata:", { status, url }); // { status: number, url: string }
}

// Export usage examples
export {
	abortSignalExample,
	rawResponseExample,
	combinedExample,
	longPollingExample,
	typeInferenceExample,
};
