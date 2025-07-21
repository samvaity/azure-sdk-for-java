import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateWithCustomizations, SDK_GENERATION_CONTRACT } from "./generate-with-customizations.js";
import { spawnAsync } from "./utils/index.js";
import * as fs from "fs";
import * as path from "path";

// Mock external dependencies
vi.mock("./utils/index.js");
vi.mock("fs");
vi.mock("path");

const mockSpawnAsync = vi.mocked(spawnAsync);
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe("generate-with-customizations", () => {
    const testModuleDir = "/test/module/directory";
    const testCustomizationFile = "/test/module/directory/customization.json";

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock process.chdir
        vi.spyOn(process, "chdir").mockImplementation(() => {});
        
        // Mock path.join
        mockPath.join.mockImplementation((...segments) => segments.join("/"));
        
        // Default mock for fs.existsSync
        mockFs.existsSync.mockReturnValue(false);
        
        // Default mock for successful tsp-client generate
        mockSpawnAsync.mockResolvedValue({
            success: true,
            exitCode: 0,
            stdout: "TypeSpec generation completed successfully",
            stderr: ""
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("basic functionality", () => {
        it("should be defined", () => {
            expect(generateWithCustomizations).toBeDefined();
            expect(typeof generateWithCustomizations).toBe("function");
        });

        it("should export SDK_GENERATION_CONTRACT", () => {
            expect(SDK_GENERATION_CONTRACT).toBeDefined();
            expect(SDK_GENERATION_CONTRACT.SCOPES).toBeDefined();
            expect(SDK_GENERATION_CONTRACT.REQUIRED_INPUTS).toBeDefined();
            expect(SDK_GENERATION_CONTRACT.OUTPUT_CONTRACT).toBeDefined();
        });
    });

    describe("contract validation", () => {
        it("should have correct scope definitions", () => {
            const scopes = SDK_GENERATION_CONTRACT.SCOPES;
            expect(scopes["code-only"]).toContain("source code files only");
            expect(scopes["code-with-changelog"]).toContain("changelog");
            expect(scopes["full-package"]).toContain("build validation");
        });

        it("should define required inputs", () => {
            const inputs = SDK_GENERATION_CONTRACT.REQUIRED_INPUTS;
            expect(inputs.moduleDirectory).toBeDefined();
            expect(inputs.scope).toBeDefined();
        });

        it("should define output contract for all scopes", () => {
            const outputs = SDK_GENERATION_CONTRACT.OUTPUT_CONTRACT;
            expect(outputs["code-only"]).toContain("Generated source files");
            expect(outputs["code-with-changelog"]).toContain("Updated CHANGELOG.md");
            expect(outputs["full-package"]).toContain("Package metadata");
        });
    });

    describe("generation workflow", () => {
        it("should complete successfully with default options", async () => {
            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content).toBeDefined();
            expect(result.content[0].type).toBe("text");
            expect(result.content[0].text).toContain("TypeSpec SDK Generation with Customizations");
            expect(result.content[0].text).toContain("Generation with customizations completed");
        });

        it("should handle code-only scope", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-only",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).toContain("Scope: code-only");
            expect(result.content[0].text).toContain("Preserve Customizations: false");
            expect(result.content[0].text).toContain("Validate Build: false");
        });

        it("should handle full-package scope", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "full-package",
                preserveCustomizations: true,
                validateBuild: true,
                interactiveMode: true
            });

            expect(result.content[0].text).toContain("Scope: full-package");
            expect(result.content[0].text).toContain("Preserve Customizations: true");
            expect(result.content[0].text).toContain("Validate Build: true");
        });
    });

    describe("customization handling", () => {
        beforeEach(() => {
            // Mock customization file exists
            mockFs.existsSync.mockImplementation((filePath) => {
                return filePath === testCustomizationFile;
            });

            // Mock reading customization file
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                "MediaMessageContent.mediaUri": "rename to mediaUrl",
                "WhatsAppMessageButton.payload": "rename to data"
            }));

            // Mock copyFileSync for backup
            mockFs.copyFileSync.mockImplementation(() => {});
        });

        it("should detect existing customization file", async () => {
            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content[0].text).toContain("Found customization file");
            expect(result.content[0].text).toContain("Existing customizations: 2");
        });

        it("should backup customizations when preserveCustomizations is true", async () => {
            await generateWithCustomizations(testModuleDir, {
                scope: "code-with-changelog",
                preserveCustomizations: true,
                validateBuild: false,
                interactiveMode: false
            });

            expect(mockFs.copyFileSync).toHaveBeenCalled();
        });

        it("should skip backup when preserveCustomizations is false", async () => {
            await generateWithCustomizations(testModuleDir, {
                scope: "code-only",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(mockFs.copyFileSync).not.toHaveBeenCalled();
        });

        it("should handle missing customization file gracefully", async () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content[0].text).toContain("No existing customization file found");
        });
    });

    describe("build validation", () => {
        it("should run build validation when validateBuild is true", async () => {
            // Mock successful Maven build
            mockSpawnAsync.mockImplementation((command, args) => {
                if (command === "tsp-client") {
                    return Promise.resolve({
                        success: true,
                        exitCode: 0,
                        stdout: "TypeSpec generation completed",
                        stderr: ""
                    });
                } else if (command === "mvn") {
                    return Promise.resolve({
                        success: true,
                        exitCode: 0,
                        stdout: "BUILD SUCCESS",
                        stderr: ""
                    });
                }
                return Promise.reject(new Error("Unexpected command"));
            });

            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-with-changelog",
                preserveCustomizations: false,
                validateBuild: true,
                interactiveMode: false
            });

            expect(result.content[0].text).toContain("Build validation passed");
            expect(mockSpawnAsync).toHaveBeenCalledWith("mvn", ["compile", "-q"], expect.any(Object));
        });

        it("should handle build validation failures", async () => {
            // Mock failed Maven build
            mockSpawnAsync.mockImplementation((command, args) => {
                if (command === "tsp-client") {
                    return Promise.resolve({
                        success: true,
                        exitCode: 0,
                        stdout: "TypeSpec generation completed",
                        stderr: ""
                    });
                } else if (command === "mvn") {
                    return Promise.resolve({
                        success: false,
                        exitCode: 1,
                        stdout: "",
                        stderr: "[ERROR] cannot find symbol: mediaUri()"
                    });
                }
                return Promise.reject(new Error("Unexpected command"));
            });

            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-with-changelog",
                preserveCustomizations: false,
                validateBuild: true,
                interactiveMode: true
            });

            expect(result.content[0].text).toContain("Build validation found issues");
            expect(result.content[0].text).toContain("cannot find symbol: mediaUri()");
            expect(result.content[0].text).toContain("LLM Assistance Required");
        });

        it("should skip build validation when validateBuild is false", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-only",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).not.toContain("Build Validation");
            expect(mockSpawnAsync).not.toHaveBeenCalledWith("mvn", expect.any(Array), expect.any(Object));
        });
    });

    describe("TypeSpec generation", () => {
        it("should call tsp-client generate with correct parameters", async () => {
            await generateWithCustomizations(testModuleDir);

            expect(mockSpawnAsync).toHaveBeenCalledWith(
                "tsp-client",
                ["generate", "--debug", "--save-inputs"],
                {
                    cwd: testModuleDir,
                    shell: true,
                    timeout: 600000
                }
            );
        });

        it("should handle tsp-client generation failure", async () => {
            mockSpawnAsync.mockResolvedValue({
                success: false,
                exitCode: 1,
                stdout: "",
                stderr: "TypeSpec compilation failed"
            });

            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content[0].text).toContain("tsp-client generate failed");
            expect(result.content[0].text).toContain("TypeSpec compilation failed");
            expect(result.content[0].text).toContain("Please fix TypeSpec issues before proceeding");
        });

        it("should change to module directory", async () => {
            const processChdirSpy = vi.spyOn(process, "chdir");

            await generateWithCustomizations(testModuleDir);

            expect(processChdirSpy).toHaveBeenCalledWith(testModuleDir);
        });
    });

    describe("interactive mode", () => {
        beforeEach(() => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                "MediaMessageContent.mediaUri": "rename to mediaUrl"
            }));
        });

        it("should provide LLM assistance when interactiveMode is true", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-with-changelog",
                preserveCustomizations: true,
                validateBuild: false,
                interactiveMode: true
            });

            expect(result.content[0].text).toContain("AI-Assisted Customization Analysis Required");
            expect(result.content[0].text).toContain("Analysis Needed");
            expect(result.content[0].text).toContain("Common Customization Updates");
        });

        it("should skip interactive assistance when interactiveMode is false", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-only",
                preserveCustomizations: true,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).not.toContain("AI-Assisted Customization Analysis");
        });
    });

    describe("changelog handling", () => {
        it("should mention changelog update for code-with-changelog scope", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-with-changelog",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).toContain("Changelog Update");
            expect(result.content[0].text).toContain("use update_java_sdk_changelog tool");
        });

        it("should mention changelog update for full-package scope", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "full-package",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).toContain("Changelog Update");
        });

        it("should not mention changelog for code-only scope", async () => {
            const result = await generateWithCustomizations(testModuleDir, {
                scope: "code-only",
                preserveCustomizations: false,
                validateBuild: false,
                interactiveMode: false
            });

            expect(result.content[0].text).not.toContain("Changelog Update");
        });
    });

    describe("error handling", () => {
        it("should handle unexpected errors gracefully", async () => {
            mockSpawnAsync.mockRejectedValue(new Error("Unexpected network error"));

            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content[0].text).toContain("Unexpected error during SDK generation");
            expect(result.content[0].text).toContain("Unexpected network error");
        });

        it("should handle file system errors", async () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error("Permission denied");
            });
            mockFs.existsSync.mockReturnValue(true);

            const result = await generateWithCustomizations(testModuleDir);

            // Should not crash and should complete successfully despite file read error
            expect(result.content[0].text).toContain("Generation with customizations completed");
        });
    });

    describe("contract compliance", () => {
        it("should generate standardized output for all scopes", async () => {
            for (const scope of ["code-only", "code-with-changelog", "full-package"] as const) {
                const result = await generateWithCustomizations(testModuleDir, {
                    scope,
                    preserveCustomizations: true,
                    validateBuild: false,
                    interactiveMode: false
                });

                expect(result.content[0].text).toContain("Generation Contract Summary");
                expect(result.content[0].text).toContain(`Scope: ${scope}`);
                expect(result.content[0].text).toContain("Standardized Output Contract");
            }
        });

        it("should include all required contract elements", async () => {
            const result = await generateWithCustomizations(testModuleDir);

            expect(result.content[0].text).toContain("Module Directory:");
            expect(result.content[0].text).toContain("Scope:");
            expect(result.content[0].text).toContain("Preserve Customizations:");
            expect(result.content[0].text).toContain("Validate Build:");
            expect(result.content[0].text).toContain("Interactive Mode:");
        });
    });
});
