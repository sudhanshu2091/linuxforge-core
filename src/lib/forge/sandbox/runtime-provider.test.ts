import { describe, expect, test, afterEach } from "vitest";
import {
  realLinuxProviderAvailability,
  readRealLinuxProviderConfig,
} from "./real-linux-provider.server";

const saved = {
  endpoint: process.env["FORGE_SANDBOX_ENDPOINT"],
  credential: process.env["FORGE_SANDBOX_CREDENTIAL"],
  image: process.env["FORGE_SANDBOX_IMAGE"],
  mode: process.env["FORGE_SANDBOX_RUNTIME_MODE"],
  runtimeClass: process.env["FORGE_SANDBOX_RUNTIME_CLASS"],
};

function restore() {
  const values: Record<string, string | undefined> = {
    FORGE_SANDBOX_ENDPOINT: saved.endpoint,
    FORGE_SANDBOX_CREDENTIAL: saved.credential,
    FORGE_SANDBOX_IMAGE: saved.image,
    FORGE_SANDBOX_RUNTIME_MODE: saved.mode,
    FORGE_SANDBOX_RUNTIME_CLASS: saved.runtimeClass,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restore);

describe("real runtime provider admission", () => {
  test("accepts a development container runtime explicitly", () => {
    process.env["FORGE_SANDBOX_ENDPOINT"] = "http://127.0.0.1:18080";
    process.env["FORGE_SANDBOX_CREDENTIAL"] = "test-token";
    process.env["FORGE_SANDBOX_IMAGE"] = "kali-rolling";
    process.env["FORGE_SANDBOX_RUNTIME_MODE"] = "development";
    process.env["FORGE_SANDBOX_RUNTIME_CLASS"] = "container-dev";
    const config = readRealLinuxProviderConfig();
    expect(config?.production).toBe(false);
    expect(config?.runtimeClass).toBe("container-dev");
  });

  test("rejects production over plain HTTP", () => {
    process.env["FORGE_SANDBOX_ENDPOINT"] = "http://runtime.internal";
    process.env["FORGE_SANDBOX_CREDENTIAL"] = "test-token";
    process.env["FORGE_SANDBOX_IMAGE"] = "kali@sha256:" + "a".repeat(64);
    process.env["FORGE_SANDBOX_RUNTIME_MODE"] = "production";
    process.env["FORGE_SANDBOX_RUNTIME_CLASS"] = "microvm";
    expect(() => readRealLinuxProviderConfig()).toThrow(/HTTPS/);
  });

  test("reports an invalid production configuration as unavailable", () => {
    process.env["FORGE_SANDBOX_ENDPOINT"] = "http://runtime.internal";
    process.env["FORGE_SANDBOX_CREDENTIAL"] = "test-token";
    process.env["FORGE_SANDBOX_IMAGE"] = "kali-rolling";
    process.env["FORGE_SANDBOX_RUNTIME_MODE"] = "production";
    process.env["FORGE_SANDBOX_RUNTIME_CLASS"] = "container-dev";
    const result = realLinuxProviderAvailability();
    expect(result.available).toBe(false);
  });
});
