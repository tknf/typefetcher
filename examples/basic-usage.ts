/**
 * TypeFetcher基本的な使用例
 *
 * このファイルはTypeFetcherの基本的な使い方を示すサンプルです。
 * 実際のプロジェクトでは、Zodなどのスキーマライブラリと組み合わせて使用します。
 */

import { TypeFetcher, createStandardSchemaFromZod } from "../dist";

// Zodがインストールされている場合の例（実際にはimportする）
declare const z: any;

/**
 * 基本的な使用例（スキーマなし）
 */
function basicExample() {
	// クライアントを作成
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
		headers: {
			"User-Agent": "TypeFetcher Example",
		},
	});

	// エンドポイントを登録
	const api = client
		.addEndpoint("GET", "/users")
		.addEndpoint("GET", "/users/{id}")
		.addEndpoint("POST", "/users")
		.addEndpoint("PUT", "/users/{id}")
		.addEndpoint("DELETE", "/users/{id}");

	// Octokitライクな呼び出し
	return {
		async getUsers() {
			// TypeScript: Promise<unknown>
			return await api.request("GET /users");
		},

		async getUser(id: string) {
			// パスパラメータを渡す
			return await api.request("GET /users/{id}", {
				pathParams: { id },
			});
		},

		async createUser(userData: any) {
			return await api.request("POST /users", {
				body: userData,
			});
		},

		async updateUser(id: string, userData: any) {
			return await api.request("PUT /users/{id}", {
				pathParams: { id },
				body: userData,
			});
		},

		async deleteUser(id: string) {
			return await api.request("DELETE /users/{id}", {
				pathParams: { id },
			});
		},
	};
}

/**
 * スキーマ付きの型安全な使用例
 */
function typeSafeExample() {
	// Zodスキーマを定義（実際のプロジェクトでzodを使用）
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

	// クライアントを作成
	const client = new TypeFetcher({
		baseURL: "https://jsonplaceholder.typicode.com",
	});

	// スキーマ付きでエンドポイントを登録
	const api = client
		.addEndpoint("GET", "/users", {
			response: createStandardSchemaFromZod(z.array(UserSchema)),
		})
		.addEndpoint("GET", "/users/{id}", {
			pathParams: createStandardSchemaFromZod(PathIdSchema),
			response: createStandardSchemaFromZod(UserSchema),
		})
		.addEndpoint("POST", "/users", {
			body: createStandardSchemaFromZod(CreateUserSchema),
			response: createStandardSchemaFromZod(UserSchema),
		})
		.addEndpoint("PUT", "/users/{id}", {
			pathParams: createStandardSchemaFromZod(PathIdSchema),
			body: createStandardSchemaFromZod(CreateUserSchema),
			response: createStandardSchemaFromZod(UserSchema),
		});

	return {
		async getUsers() {
			// TypeScript: Promise<{ id: number; name: string; email: string; username: string; }[]>
			// 実行時にレスポンスが検証される
			return await api.request("GET /users");
		},

		async getUser(id: string) {
			// pathParamsが型チェック・実行時検証される
			// TypeScript: Promise<{ id: number; name: string; email: string; username: string; }>
			return await api.request("GET /users/{id}", {
				pathParams: { id }, // string型が期待される
			});
		},

		async createUser(userData: { name: string; email: string; username: string }) {
			// bodyが型チェック・実行時検証される
			return await api.request("POST /users", {
				body: userData, // CreateUserSchemaの型が期待される
			});
		},

		async updateUser(id: string, userData: { name: string; email: string; username: string }) {
			return await api.request("PUT /users/{id}", {
				pathParams: { id },
				body: userData,
			});
		},
	};
}

/**
 * エラーハンドリングの例
 */
async function errorHandlingExample() {
	const client = new TypeFetcher({
		baseURL: "https://api.example.com",
	});

	const api = client.addEndpoint("GET", "/users/{id}");

	try {
		const user = await api.request("GET /users/{id}", {
			pathParams: { id: "123" },
		});
		console.log(user);
	} catch (error) {
		if (error instanceof TypeFetcherError) {
			// HTTPエラー（404, 500など）
			console.error(`HTTP Error: ${error.status} ${error.statusText}`);
			console.error("Response data:", error.data);
		} else if (error instanceof ValidationError) {
			// スキーマ検証エラー
			console.error("Validation Error:", error.message);
			console.error("Issues:", error.issues);
		} else {
			// その他のエラー
			console.error("Unexpected error:", error);
		}
	}
}

// 使用例のエクスポート
export { basicExample, typeSafeExample, errorHandlingExample };
