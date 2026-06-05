import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("info usa console.log con el prefijo de scope", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("auth", "ok");
    expect(spy).toHaveBeenCalledWith("[civicsys:auth] ok");
  });

  it("warn usa console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("net", "lento");
    expect(spy).toHaveBeenCalledWith("[civicsys:net] lento");
  });

  it("error usa console.error y adjunta data cuando se pasa", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const data = { code: 500 };
    logger.error("rpc", "fallo", data);
    expect(spy).toHaveBeenCalledWith("[civicsys:rpc] fallo", data);
  });

  it("NEXT_PUBLIC_LOG=off silencia toda salida", async () => {
    vi.stubEnv("NEXT_PUBLIC_LOG", "off");
    vi.resetModules();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger: silent } = await import("./logger");
    silent.info("x", "y");
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
