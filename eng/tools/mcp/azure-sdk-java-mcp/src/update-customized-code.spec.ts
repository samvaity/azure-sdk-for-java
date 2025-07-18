import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCustomizedCode } from "./update-customized-code.js";
import fs from "fs/promises";
import { exec } from "child_process";

// Mock the dependencies
vi.mock("fs/promises");
vi.mock("child_process");

const mockFs = vi.mocked(fs);
const mockExec = vi.mocked(exec);

describe("update-customized-code", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("updateCustomizedCode", () => {
        it("should be defined", () => {
            expect(updateCustomizedCode).toBeDefined();
            expect(typeof updateCustomizedCode).toBe("function");
        });

        it("should return success when no compilation errors exist", async () => {
            // Mock file system operations
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue("mock content");
            
            // Mock successful compilation (no errors)
            const mockExecAsync = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
            vi.doMock("util", () => ({
                promisify: () => mockExecAsync
            }));

            const result = await updateCustomizedCode("/mock/module/directory");
            
            expect(result.content[0].type).toBe("text");
            expect(result.content[0].text).toContain("✅ No compilation errors found");
        });

        it("should handle module directory parameter correctly", async () => {
            // Mock file access failure to trigger error path
            mockFs.access.mockRejectedValue(new Error("File not found"));
            
            const result = await updateCustomizedCode("/invalid/path");
            
            expect(result.content[0].type).toBe("text");
            expect(result.content[0].text).toContain("❌ Error updating customized code");
        });

        it("should analyze customization types correctly", async () => {
            // Mock tsp-location.yaml exists
            mockFs.access.mockResolvedValue(undefined);
            
            // Mock tsp-location.yaml content
            mockFs.readFile.mockImplementation((path: any) => {
                if (path.toString().endsWith("tsp-location.yaml")) {
                    return Promise.resolve("directory: ../../../azure-rest-api-specs/specification/keyvault/KeyVault.Keys");
                }
                if (path.toString().endsWith("tspconfig.yaml")) {
                    return Promise.resolve(`
options:
  "@azure-tools/typespec-java":
    partial-update: true
    customization-class: customization/src/main/java/KeysCustomization.java
                    `);
                }
                return Promise.resolve("mock content");
            });

            // Mock compilation with errors
            const mockExecAsync = vi.fn().mockRejectedValue({
                stdout: "[ERROR] /path/to/file.java:10: error: cannot find symbol - symbol: class BinaryData",
                stderr: ""
            });
            vi.doMock("util", () => ({
                promisify: () => mockExecAsync
            }));

            const result = await updateCustomizedCode("/mock/module/directory");
            
            // Should detect both partial-update and customization-class
            expect(result.content[0].text).toContain("Customization type: Partial Update + Customization Class");
        });
    });

    describe("error categorization", () => {
        it("should categorize missing symbol errors correctly", async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue("mock tsp config");
            
            const mockExecAsync = vi.fn().mockRejectedValue({
                stdout: "[ERROR] /path/to/file.java:10: error: cannot find symbol - symbol: class BinaryData",
                stderr: ""
            });
            vi.doMock("util", () => ({
                promisify: () => mockExecAsync
            }));

            const result = await updateCustomizedCode("/mock/module/directory");
            
            // Should attempt to fix import-related errors
            expect(result.content[0].text).toContain("compilation errors");
        });
    });

    describe("fix suggestions", () => {
        it("should suggest fixes for common Azure SDK import issues", async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readFile.mockImplementation((path: any) => {
                if (path.toString().endsWith(".java")) {
                    return Promise.resolve(`
package com.azure.example;

public class TestClass {
    public void usesBinaryData() {
        BinaryData data = null; // This should trigger missing import
    }
}
                    `);
                }
                return Promise.resolve("mock content");
            });
            
            mockFs.writeFile.mockResolvedValue(undefined);

            const mockExecAsync = vi.fn().mockRejectedValue({
                stdout: "[ERROR] /path/to/TestClass.java:5: error: cannot find symbol - symbol: class BinaryData",
                stderr: ""
            });
            vi.doMock("util", () => ({
                promisify: () => mockExecAsync
            }));

            const result = await updateCustomizedCode("/mock/module/directory");
            
            // Should attempt to add missing imports
            expect(result.content[0].text).toContain("errors");
        });
    });
});
