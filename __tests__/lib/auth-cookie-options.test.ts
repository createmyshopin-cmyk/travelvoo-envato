import { describe, it, expect, beforeEach } from "vitest";
import {
  getAuthCookieDomainForHostname,
  getAuthCookieOptionsForHostname,
} from "@/lib/auth-cookie-options";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  delete process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN;
});

describe("getAuthCookieDomainForHostname", () => {
  it("returns undefined on localhost and preview hosts", () => {
    expect(getAuthCookieDomainForHostname("localhost")).toBeUndefined();
    expect(getAuthCookieDomainForHostname("app.vercel.app")).toBeUndefined();
  });

  it("uses NEXT_PUBLIC_AUTH_COOKIE_DOMAIN when set", () => {
    process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN = "travelvoo.in";
    expect(getAuthCookieDomainForHostname("wa.travelvoo.in")).toBe(".travelvoo.in");
    process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN = ".travelvoo.in";
    expect(getAuthCookieDomainForHostname("www.travelvoo.in")).toBe(".travelvoo.in");
  });

  it("derives parent domain from NEXT_PUBLIC_PLATFORM_BASE_DOMAIN", () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    expect(getAuthCookieDomainForHostname("wa.travelvoo.in")).toBe(".travelvoo.in");
    expect(getAuthCookieDomainForHostname("www.travelvoo.in")).toBe(".travelvoo.in");
    expect(getAuthCookieDomainForHostname("travelvoo.in")).toBe(".travelvoo.in");
  });

  it("returns undefined when hostname is not under configured base", () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    expect(getAuthCookieDomainForHostname("other.com")).toBeUndefined();
  });
});

describe("getAuthCookieOptionsForHostname", () => {
  it("sets secure false on localhost", () => {
    const o = getAuthCookieOptionsForHostname("localhost");
    expect(o.secure).toBe(false);
    expect(o.path).toBe("/");
    expect(o.sameSite).toBe("lax");
  });

  it("sets domain and secure on production host when platform base is set", () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    const o = getAuthCookieOptionsForHostname("wa.travelvoo.in");
    expect(o.domain).toBe(".travelvoo.in");
    expect(o.secure).toBe(true);
  });
});
