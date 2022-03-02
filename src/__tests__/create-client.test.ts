import { createClient } from "../create-client";

describe("Create Client", () => {
  const client = createClient();

  test("should have all methods", () => {
    expect(typeof client.get).toEqual("function");
    expect(typeof client.post).toEqual("function");
    expect(typeof client.put).toEqual("function");
    expect(typeof client.patch).toEqual("function");
    expect(typeof client.delete).toEqual("function");
    expect(typeof client.getConfig).toEqual("function");
  });
});
