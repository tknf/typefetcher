import axios from "axios";
import { RequestError } from "./error";
import {
  ClientConfig,
  GetRequestConfig,
  PostRequestConfig,
  SafeGetRequestConfig,
  SafePostRequestConfig,
  TypesafeResponse
} from "./types";

function createError<T extends string>(e: unknown | any): RequestError<T> {
  if (axios.isAxiosError(e) && e.response) {
    return new RequestError({
      status: e.response.status,
      statusText: e.response.statusText,
      stack: e.stack,
      message:
        e.response.data?.message || e.response.data?.error?.message || e.response.data?.err?.message || undefined,
      code: e.response.data?.code || e.response.data?.error?.code || e.response.data?.err?.code || undefined
    });
  }

  return new RequestError({
    status: e?.status || 0,
    statusText: e?.statusText || "Unknown Error",
    message: "Unhandled Rejection"
  });
}

export function createClient<ErrorCodes extends string = "">(config: ClientConfig = {}) {
  const client = axios.create(config);

  function buildGetLikeRequest<ReturnObject extends object = {}>(
    method: "GET" | "DELETE"
  ): (config: GetRequestConfig) => Promise<ReturnObject>;
  function buildGetLikeRequest<ReturnObject extends object = {}>(
    method: "GET" | "DELETE"
  ): (config: SafeGetRequestConfig) => Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function buildGetLikeRequest<ReturnObject extends object = {}>(method: "GET" | "DELETE") {
    return async ({ url, query, ...config }: GetRequestConfig | SafeGetRequestConfig) => {
      if ("safe" in config) {
        try {
          const response = await client.request<ReturnObject>({
            ...config,
            url,
            method,
            params: query
          });
          return [null, response.data as ReturnObject] as const;
        } catch (e) {
          return [createError<ErrorCodes>(e), null] as const;
        }
      }

      const response = await client.request<ReturnObject>({
        ...config,
        url,
        method,
        params: query
      });
      return response.data as ReturnObject;
    };
  }

  function buildPostLikeRequest<RequestBody extends object = {}, ReturnObject extends object = {}>(
    method: "POST" | "PUT" | "PATCH"
  ): (config: PostRequestConfig<RequestBody>) => Promise<ReturnObject>;
  function buildPostLikeRequest<RequestBody extends object = {}, ReturnObject extends object = {}>(
    method: "POST" | "PUT" | "PATCH"
  ): (config: SafePostRequestConfig<RequestBody>) => Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function buildPostLikeRequest<RequestBody extends object = {}, ReturnObject extends object = {}>(
    method: "POST" | "PUT" | "PATCH"
  ) {
    return async ({
      url,
      query,
      body,
      ...config
    }: PostRequestConfig<RequestBody> | SafePostRequestConfig<RequestBody>) => {
      if ("safe" in config) {
        try {
          const response = await client.request<ReturnObject>({
            ...config,
            url,
            method,
            data: body,
            params: query
          });
          return [null, response.data] as const;
        } catch (e) {
          return [createError<ErrorCodes>(e), null] as const;
        }
      }

      const response = await client.request<ReturnObject>({
        ...config,
        url,
        method,
        data: body,
        params: query
      });
      return response.data;
    };
  }

  return {
    get: buildGetLikeRequest("GET"),
    post: buildPostLikeRequest("POST"),
    put: buildPostLikeRequest("PUT"),
    patch: buildPostLikeRequest("PATCH"),
    delete: buildGetLikeRequest("DELETE"),
    //
    getConfig() {
      return config;
    }
  };
}
