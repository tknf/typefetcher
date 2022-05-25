import type { RequestError } from "error";

export interface ClientConfig {
  auth?: {
    username: string;
    password: string;
  };
  baseURL?: string;
  headers?: Record<string, string>;
  maxBodyLength?: number;
  maxContentLength?: number;
}

export type TypesafeResponse<T, E extends string> = Readonly<[RequestError<E>, null] | [null, T]>;

interface SafeConfig {
  safe: true;
}

export interface GetRequestConfig extends ClientConfig {
  url: string;
  query?: Record<string, string>;
}

export interface SafeGetRequestConfig extends ClientConfig, SafeConfig, GetRequestConfig {}

export interface PostRequestConfig<T> extends ClientConfig {
  url: string;
  body: T;
  query?: Record<string, string>;
}

export interface SafePostRequestConfig<T> extends ClientConfig, SafeConfig, PostRequestConfig<T> {}
