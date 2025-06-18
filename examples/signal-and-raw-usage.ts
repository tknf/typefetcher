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
		const post = await api.request("GET /posts/{id}", {
			params: { id: "1" },
			signal: controller.signal, // Pass the abort signal
		});
		console.log("Post received:", post);
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
		// Use regular request method - it now includes ~raw property
		const result = await api.request("GET /posts/{id}", {
			params: { id: "1" },
		});

		// Access parsed, validated data directly
		console.log("Post ID:", result.id);
		console.log("Post title:", result.title);

		// Access raw response metadata through ~raw property
		console.log("Response status:", result["~raw"].status);
		console.log("Response headers:");
		for (const [key, value] of result["~raw"].headers.entries()) {
			console.log(`  ${key}: ${value}`);
		}

		// Check response timing and other metadata
		console.log("Response URL:", result["~raw"].url);
		console.log("Response type:", result["~raw"].type);
		console.log("Response redirected:", result["~raw"].redirected);

		// You can also access the raw body again if needed
		// Note: response.clone() is used internally so this won't conflict
		const rawText = await result["~raw"].text();
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
		const result = await api.request("GET /users/{username}", {
			params: { username: "octocat" },
			signal: controller.signal,
			headers: {
				"Accept": "application/vnd.github.v3+json",
			},
		});

		console.log("GitHub user:", result.login);
		console.log("Name:", result.name);
		console.log("Public repos:", result.public_repos);

		// Check rate limiting headers through ~raw property
		const rateLimitRemaining = result["~raw"].headers.get("x-ratelimit-remaining");
		const rateLimitReset = result["~raw"].headers.get("x-ratelimit-reset");
		
		console.log("Rate limit remaining:", rateLimitRemaining);
		if (rateLimitReset) {
			const resetDate = new Date(parseInt(rateLimitReset) * 1000);
			console.log("Rate limit resets at:", resetDate.toISOString());
		}

		// Check if response was cached
		const cacheStatus = result["~raw"].headers.get("x-served-by");
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
		
		const result = await api.request("GET /events", {
			query: {
				timeout: "30", // Server-side timeout
			},
			signal: controller.signal,
		});

		clearTimeout(cancelTimeout);

		console.log("Received events:", result.length);
		result.forEach(event => {
			console.log(`Event ${event.id}: ${event.type} at ${event.timestamp}`);
		});

		// Check if the connection was kept alive through ~raw property
		const connection = result["~raw"].headers.get("connection");
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

	// TypeScript knows the exact shape of the response
	const post = await api.request("GET /posts/{id}", {
		params: { id: "1" },
	});

	// All these have full type inference:
	console.log("Post ID:", post.id); // number
	console.log("Post title:", post.title); // string
	console.log("User ID:", post.userId); // number

	// Raw response access also has proper typing:
	console.log("Status:", post["~raw"].status); // number
	console.log("Headers:", post["~raw"].headers); // Headers object
	console.log("Content-Type:", post["~raw"].headers.get("content-type")); // string | null

	// The ~raw property doesn't interfere with the main data structure
	const { "~raw": rawResponse, ...postData } = post;
	console.log("Clean post data:", postData); // { id: number, title: string, body: string, userId: number }
	console.log("Raw response status:", rawResponse.status); // number
}

// Export usage examples
export {
	abortSignalExample,
	rawResponseExample,
	combinedExample,
	longPollingExample,
	typeInferenceExample,
};
