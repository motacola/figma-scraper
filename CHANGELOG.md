# Changelog

All notable changes to FigmaSnap Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-22

### Added
- Initial release of FigmaSnap Chrome Extension
- Browser-native Figma prototype capture (no Electron required)
- Automatic flow detection and multi-flow support
- Smart duplicate detection (3 consecutive duplicates = end of flow)
- Redaction mode for sensitive content with `[mask]` tags
- Real-time progress tracking with status updates
- Client-side PDF generation using pdf-lib
- Input validation and security hardening
- XSS protection for flow names
- Complete error handling and recovery
- Timeout protection for all async operations
- Memory leak prevention
- Upper bounds validation (max 1000 slides, 60s wait time)
- Comprehensive documentation

### Fixed
- Empty PDF bug (duplicates now properly included)
- Broken CSS path in popup
- Missing error recovery mechanisms
- Incorrect redaction mask positioning
- Invisible element masking
- Race conditions in message passing
- Navigation timeout issues
- Keyboard event simulation for Figma
- Visual stability detection

### Security
- XSS protection via safe DOM manipulation
- Input sanitization on all user inputs
- Maximum z-index for redaction masks
- No external data transmission
- Local-only processing

## [Unreleased]

### Planned
- Options page for default settings
- Keyboard shortcuts for power users
- Internationalization (i18n) support
- Multiple icon sizes optimization
- Error reporting (opt-in)

---

## Version History

- **1.0.0** (2024-12-22) - Initial public release
