import { defineConfig } from "tsup";

export default defineConfig([
	// Main library (ESM/CJS)
	{
		entry: ["src/index.ts"],
		format: ["esm", "cjs"],
		dts: true,
		clean: true,
		target: "es2020",
		platform: "neutral",
		external: ["axios", "node-fetch"],
	},
]);
