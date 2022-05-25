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

  function buildGetLikeRequest<ReturnObject = {}>(
    method: "GET" | "DELETE"
  ): (config: GetRequestConfig) => Promise<ReturnObject>;
  function buildGetLikeRequest<ReturnObject = {}>(
    method: "GET" | "DELETE"
  ): (config: SafeGetRequestConfig) => Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function buildGetLikeRequest<ReturnObject = {}>(method: "GET" | "DELETE") {
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

  function buildPostLikeRequest<RequestBody = {}, ReturnObject = {}>(
    method: "POST" | "PUT" | "PATCH"
  ): (config: PostRequestConfig<RequestBody>) => Promise<ReturnObject>;
  function buildPostLikeRequest<RequestBody = {}, ReturnObject = {}>(
    method: "POST" | "PUT" | "PATCH"
  ): (config: SafePostRequestConfig<RequestBody>) => Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function buildPostLikeRequest<RequestBody = {}, ReturnObject = {}>(method: "POST" | "PUT" | "PATCH") {
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

  function get<ReturnObject>(config: GetRequestConfig): Promise<ReturnObject>;
  function get<ReturnObject>(config: SafeGetRequestConfig): Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function get<ReturnObject>(config: GetRequestConfig | SafeGetRequestConfig) {
    return buildGetLikeRequest<ReturnObject>("GET")(config);
  }

  function post<RequestBody, ReturnObject>(config: PostRequestConfig<RequestBody>): Promise<ReturnObject>;
  function post<RequestBody, ReturnObject>(
    config: SafePostRequestConfig<RequestBody>
  ): Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function post<RequestBody, ReturnObject>(
    config: PostRequestConfig<RequestBody> | SafePostRequestConfig<RequestBody>
  ) {
    return buildPostLikeRequest<RequestBody, ReturnObject>("POST")(config);
  }

  function put<RequestBody, ReturnObject>(config: PostRequestConfig<RequestBody>): Promise<ReturnObject>;
  function put<RequestBody, ReturnObject>(
    config: SafePostRequestConfig<RequestBody>
  ): Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function put<RequestBody, ReturnObject>(config: PostRequestConfig<RequestBody> | SafePostRequestConfig<RequestBody>) {
    return buildPostLikeRequest<RequestBody, ReturnObject>("PUT")(config);
  }

  function patch<RequestBody, ReturnObject>(config: PostRequestConfig<RequestBody>): Promise<ReturnObject>;
  function patch<RequestBody, ReturnObject>(
    config: SafePostRequestConfig<RequestBody>
  ): Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function patch<RequestBody, ReturnObject>(
    config: PostRequestConfig<RequestBody> | SafePostRequestConfig<RequestBody>
  ) {
    return buildPostLikeRequest<RequestBody, ReturnObject>("PATCH")(config);
  }

  function del<ReturnObject>(config: GetRequestConfig): Promise<ReturnObject>;
  function del<ReturnObject>(config: SafeGetRequestConfig): Promise<TypesafeResponse<ReturnObject, ErrorCodes>>;
  function del<ReturnObject>(config: GetRequestConfig | SafeGetRequestConfig) {
    return buildGetLikeRequest<ReturnObject>("DELETE")(config);
  }

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    //
    getConfig() {
      return config;
    }
  };
}
