import { RequestError } from "../error";

describe("RequestError", () => {
  test("No message", () => {
    const err = new RequestError({
      status: 400,
      statusText: "Test Error"
    });

    expect(err.message).toMatch("Test Error");
    expect(err.status).toBe(400);
  });
});
