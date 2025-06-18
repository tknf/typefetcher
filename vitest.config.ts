import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/index.ts"],
			thresholds: {
				lines: 95,
				statements: 95,
				functions: 100,
				branches: 90,
			},
		},
	},
});
