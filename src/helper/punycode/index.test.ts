import { Context, Hono } from "../../hono";
import { toPunyCode } from ".";

describe("PunyCode Helper", () => {
  describe("Parse PunyCode", () => {
    it("Parse PunyCode from string with no options", async () => {
      const test1 = "https://🔥.com";
      const test2 = "🔥.com";
      const test3 = "http://🔥.com/hono?is=cool";

      expect(toPunyCode(test1)).toBe("https://xn--4v8h.com/");
      expect(toPunyCode(test2)).toBe("🔥.com");
      expect(toPunyCode(test3)).toBe("http://xn--4v8h.com/hono?is=cool");
    });

    it("Parse PunyCode from string with options", async () => {
      const test1 = "https://🔥.com";
      const test2 = "🔥.com";
      const test3 = "http://🔥.com/hono?is=cool";
      const option1 = {
        strict: true,
      };
      const option2 = {
        strict: false,
      };

      expect(toPunyCode(test1, option1)).toBe("https://xn--4v8h.com/");
      expect(toPunyCode(test2, option1)).toBe("🔥.com");
      expect(toPunyCode(test3, option1)).toBe(
        "http://xn--4v8h.com/hono?is=cool",
      );

      expect(toPunyCode(test1, option2)).toBe("https://xn--4v8h.com/");
      expect(toPunyCode(test2, option2)).toBe("xn--4v8h.com");
      expect(toPunyCode(test3, option2)).toBe(
        "http://xn--4v8h.com/hono?is=cool",
      );
    });

    it("Redirect with PunyCode", async () => {
      const target = "https://🔥.com";
      const app = new Hono();

      app.get("/pass", (c: Context) => {
        return c.redirect(toPunyCode(target));
      });

      app.get("/fail", (c: Context) => {
        return c.redirect(target);
      });

      const res1 = await app.request("/pass");
      const res2 = await app.request("/fail");

      expect(res1).not.toBeNull();
      expect(res1.status).toBe(302);
      expect(res1.headers.get("location")).toBe("https://xn--4v8h.com/");
      expect(res2).not.toBeNull();
      expect(res2.status).toBe(500);
    });
  });
});
