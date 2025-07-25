import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { updateCustomizationClass } from './update-customization-class.js';
import { spawnAsync } from './utils/process.js';

// Mock dependencies
vi.mock('fs', () => ({
    promises: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        stat: vi.fn(),
        access: vi.fn(),
    },
}));

vi.mock('./utils/process.js', () => ({
    spawnAsync: vi.fn(),
}));

const mockFs = fs as any;
const mockSpawnAsync = spawnAsync as any;

describe('updateCustomizationClass', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate input files exist', async () => {
        // Mock file doesn't exist
        mockFs.stat.mockRejectedValue(new Error('File not found'));

        const result = await updateCustomizationClass({
            customizationFile: '/path/to/NonExistent.java',
            moduleDirectory: '/path/to/module',
        });

        expect(result.content[0].text).toContain('❌ Validation failed');
        expect(result.content[0].text).toContain('Customization file not accessible');
    });

    it('should return success if customization already compiles', async () => {
        // Mock file exists
        mockFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => true });
        mockFs.readFile.mockResolvedValue('public class TestCustomizations {}');
        mockFs.access.mockResolvedValue(undefined);

        // Mock successful compilation
        mockSpawnAsync.mockResolvedValue({
            success: true,
            stdout: '',
            stderr: '',
            exitCode: 0,
        });

        const result = await updateCustomizationClass({
            customizationFile: '/path/to/TestCustomizations.java',
            moduleDirectory: '/path/to/module',
        });

        expect(result.content[0].text).toContain('✅ Customization class already compiles successfully');
    });

    it('should handle compilation errors and suggest fixes', async () => {
        // Mock file exists
        mockFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => true });
        mockFs.readFile.mockResolvedValue(`
public class TestCustomizations {
    public void method() {
        OldClassName oldClass = new OldClassName();
    }
}
        `);
        mockFs.access.mockResolvedValue(undefined);

        // Mock compilation failure first, then success after fix
        mockSpawnAsync
            .mockResolvedValueOnce({
                success: false,
                stdout: '',
                stderr: '[ERROR] cannot find symbol - class OldClassName',
                exitCode: 1,
            })
            .mockResolvedValueOnce({
                success: false,
                stdout: '',
                stderr: 'Class not found in generated code',
                exitCode: 1,
            })
            .mockResolvedValueOnce({
                success: true,
                stdout: '',
                stderr: '',
                exitCode: 0,
            });

        mockFs.writeFile.mockResolvedValue(undefined);

        const result = await updateCustomizationClass({
            customizationFile: '/path/to/TestCustomizations.java',
            moduleDirectory: '/path/to/module',
        });

        expect(result.content[0].text).toContain('No automatic fixes available');
    });

    it('should preview changes in dry run mode', async () => {
        // Mock file exists
        mockFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => true });
        mockFs.readFile.mockResolvedValue('public class TestCustomizations {}');
        mockFs.access.mockResolvedValue(undefined);

        // Mock compilation failure
        mockSpawnAsync.mockResolvedValue({
            success: false,
            stdout: '',
            stderr: '[ERROR] cannot find symbol - class OldClassName',
            exitCode: 1,
        });

        const result = await updateCustomizationClass({
            customizationFile: '/path/to/TestCustomizations.java',
            moduleDirectory: '/path/to/module',
            dryRun: true,
        });

        expect(result.content[0].text).toContain('🔍 **DRY RUN**');
        expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle non-Java files', async () => {
        const result = await updateCustomizationClass({
            customizationFile: '/path/to/NotJava.txt',
            moduleDirectory: '/path/to/module',
        });

        expect(result.content[0].text).toContain('❌ Validation failed');
        expect(result.content[0].text).toContain('must be a .java file');
    });

    it('should handle errors gracefully', async () => {
        // Mock file exists but reading fails
        mockFs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => true });
        mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

        const result = await updateCustomizationClass({
            customizationFile: '/path/to/TestCustomizations.java',
            moduleDirectory: '/path/to/module',
        });

        expect(result.content[0].text).toContain('❌ Error updating customization class');
        expect(result.content[0].text).toContain('Permission denied');
    });
});
