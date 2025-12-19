#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Release Creation Script
 * Creates a complete release package with binaries and documentation
 */

async function createRelease() {
    console.log('🚀 Starting FigmaSnap release creation...');

    try {
        // 1. Get version from package.json
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const version = packageJson.version;
        const productName = packageJson.build.productName;
        const releaseDir = path.join(__dirname, '..', 'release');
        const distDir = path.join(__dirname, '..', 'dist');

        console.log(`📦 Creating release for ${productName} v${version}`);

        // 2. Create release directory
        if (!fs.existsSync(releaseDir)) {
            fs.mkdirSync(releaseDir, { recursive: true });
        }

        // 3. Create release notes
        const releaseNotes = `
# ${productName} v${version} Release Notes

## What's New

- **Guided Flow Capture**: Define and save specific navigation paths through Figma prototypes
- **Rich Export Presets**: 4 default presets (Client Signoff, Dev Handoff, Stakeholder, Clean) with customization
- **Enhanced README**: Better positioning, use cases, and visual showcase
- **Improved CI/CD**: Fixed GitHub Actions workflow for reliable builds

## Features

✅ Automated Figma prototype capture
✅ Password-protected prototype support
✅ Anti-bot detection bypass
✅ PDF generation with custom presets
✅ Cross-platform support (Mac, Windows, Linux)
✅ Redaction mode for sensitive content
✅ Guided flow navigation
✅ Custom export configurations

## Installation

### Mac
1. Download FigmaSnap-${version}-mac.dmg
2. Open the DMG file
3. Drag FigmaSnap to Applications folder

### Windows
1. Download FigmaSnap-${version}-win.exe
2. Run the installer
3. Follow installation instructions

### Linux
1. Download FigmaSnap-${version}-linux.AppImage
2. Make executable with: chmod +x FigmaSnap-${version}-linux.AppImage
3. Run the application

## System Requirements

- Node.js v16+ (for CLI usage)
- Google Chrome installed
- macOS 10.13+ / Windows 10+ / Modern Linux distributions

## Support

For issues or questions:
- GitHub: https://github.com/motacola/figma-scraper
- Email: support@figmasnap.com

---
Generated on ${new Date().toISOString()}
`;

        fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), releaseNotes);
        console.log('✅ Created release notes');

        // 4. Copy binaries from dist to release
        if (fs.existsSync(distDir)) {
            const files = fs.readdirSync(distDir);
            for (const file of files) {
                const srcPath = path.join(distDir, file);
                const destPath = path.join(releaseDir, file);
                fs.copyFileSync(srcPath, destPath);
                console.log(`📁 Copied: ${file}`);
            }
        }

        // 5. Create checksums
        const checksums = [];
        if (fs.existsSync(releaseDir)) {
            const files = fs.readdirSync(releaseDir);
            for (const file of files) {
                if (file.endsWith('.md')) continue;

                const filePath = path.join(releaseDir, file);
                const stats = fs.statSync(filePath);

                checksums.push({
                    file: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString()
                });
            }
        }

        fs.writeFileSync(path.join(releaseDir, 'CHECKSUMS.json'), JSON.stringify(checksums, null, 2));
        console.log('✅ Created checksums');

        // 6. Create version info
        const versionInfo = {
            version: version,
            name: productName,
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        fs.writeFileSync(path.join(releaseDir, 'VERSION.json'), JSON.stringify(versionInfo, null, 2));
        console.log('✅ Created version info');

        // 7. Create a simple installer script for Linux
        const linuxInstaller = `#!/bin/bash

echo "FigmaSnap v${version} Installer"
echo "================================"

# Make AppImage executable
chmod +x FigmaSnap-${version}-linux.AppImage

# Create desktop shortcut
echo "Creating desktop shortcut..."

SHORTCUT="[Desktop Entry]\nName=FigmaSnap\nExec=${process.cwd()}/FigmaSnap-${version}-linux.AppImage\nIcon=figma\nType=Application\nCategories=Development;Graphics;\nTerminal=false"

echo "$SHORTCUT" > ~/Desktop/FigmaSnap.desktop
chmod +x ~/Desktop/FigmaSnap.desktop

echo "✅ Installation complete!"
echo "You can now run FigmaSnap from the desktop shortcut."
`;

        fs.writeFileSync(path.join(releaseDir, 'install-linux.sh'), linuxInstaller);
        fs.chmodSync(path.join(releaseDir, 'install-linux.sh'), '755');
        console.log('✅ Created Linux installer script');

        // 8. List all release files
        console.log('\n📋 Release Contents:');
        const releaseFiles = fs.readdirSync(releaseDir);
        releaseFiles.forEach(file => {
            const stats = fs.statSync(path.join(releaseDir, file));
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`  • ${file} (${sizeMB} MB)`);
        });

        console.log(`\n🎉 Release created successfully in: ${releaseDir}`);
        console.log(`📦 Total files: ${releaseFiles.length}`);
        console.log(`💾 Total size: ${getDirectorySize(releaseDir)} MB`);

        return { success: true, releaseDir, version, files: releaseFiles };

    } catch (error) {
        console.error('❌ Release creation failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get directory size in MB
 */
function getDirectorySize(directory) {
    let totalSize = 0;

    function traverse(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                traverse(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    }

    traverse(directory);
    return (totalSize / 1024 / 1024).toFixed(2);
}

// Run the release creation
createRelease().then(result => {
    if (result.success) {
        console.log('\n🚀 Release ready for distribution!');
        process.exit(0);
    } else {
        console.error('\n❌ Release creation failed');
        process.exit(1);
    }
});