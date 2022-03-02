export class RequestError<ErrorCodeType extends string> extends Error {
  public status: number;
  public statusText: string;
  public message: string;
  public code?: ErrorCodeType;

  constructor({
    status,
    statusText,
    message,
    stack,
    code
  }: {
    status: number;
    statusText: string;
    message?: string;
    stack?: string;
    code?: ErrorCodeType;
  }) {
    super();
    this.status = status;
    this.statusText = statusText;
    this.message = message ?? statusText;
    this.stack = stack;
    this.code = code;
  }
}
