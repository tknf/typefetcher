# Typefetcher

This library provides a TypeScript-first and very simple wrapper around Axios.

[Axios](https://github.com/axios/axios)

## Usage

### Installation

```bash
$ yarn add @tknf/typefetcher@latest
# or
$ npm install --save-dev @tknf/typefetcher@latest
```

### Basic usage

```typescript
import { createClient } from "@tknf/typefechter";

type ErrorCodes = "BAD_REQUEST" | "DATABASE_ERROR"

const client = createClient<ErrorCodes>();

interface IResponse {
  items: {
    name: string
  }[]
}

// default request
const response = await client.get<IResponse>({
  url: "/",
  query: {
    q: "dog"
  }
});

console.log(response.items); // items: IResponse["items"]


// safe request
const [err, res] = await client.get<IResponse>({
  url: "/",
  safe: true
})

if (!err) {
  console.log(res); // IResponse
} else {
  console.log(err, res); // RequestError, null
}
```

### Configuration

```typescript
createClient<ErrorCodes extends string>(config: ClientConfig);

interface ClientConfig {
  auth?: {
    username: string;
    password: string;
  };
  baseURL?: string;
  headers?: Record<string, string>;
  maxBodyLength?: number;
  maxContentLength?: number;
}
```

`ErrorCodes` is optional TypeScript args.
If your request return some error codes, `err.code` will be the type you defined. `typefetcher` can read the property `code`, `err.code`, and `error.code` of the response object when it throws an error.