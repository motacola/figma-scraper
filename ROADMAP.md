# 🗺️ FigmaSnap Roadmap

This document outlines the vision and strategic direction for FigmaSnap. Our goal is to move beyond simple captures and become the definitive tool for **automated, flow-aware design communication**.

## 🎯 Core Vision
**"Record once, reuse forever."** FigmaSnap aims to remove the confusion between designers and non-designer stakeholders by providing flat, high-fidelity, and easily shareable "Stakeholder Packs" without the complexity of the Figma UI.

---

## 🛠️ v0.2: Tactical UX & Polish (Next Up)

### 🚀 Smart Flow Integration
- **Auto-Discovery**: Use Figma's "Flows and starting points" metadata to automatically discover all defined flows in a file.
- **Selective Capture**: Let users pick specific flows to capture (e.g., "Login Flow", "Checkout") instead of manual URL entry.
- **Enhanced Timing**: Add "Wait for Animation" detection to ensure transitions like smart-animates are fully finished before the snap.

### 🍱 Export Presets
- **Stakeholder Pack**: High-res PDF with cover page, timestamp, and frame names.
- **Dev Handoff**: 2x resolution PNGs with frame IDs in the filename.
- **Clean Deck**: Minimalist PDF without technical metadata, optimized for presentations.

### 🛡️ Privacy & Compliance
- **Local-First PII Masking**: Option to automatically blur or redact specific layers (e.g., by name like `[mask]`) before capture.
- **Offline Integrity**: Clearer messaging that all auth and capture happens locally on the machine.

---

## 🏗️ v0.3: Format & Collaboration

### 🎬 Multi-Format Output
- **Video Walkthroughs**: Export captured flows as MP4 or high-quality GIFs for Slack and pitch decks.
- **Interactive Offline HTML**: Generate a static, offline-capable HTML deck that mimics prototype clicking without needing a Figma link.

### ✍️ Annotation & Review
- **Comment Injection**: Allow users to add inline comments during capture that appear as annotations in the final PDF.
- **Auto-Labeling**: Automatically add page labels and indices to every slide for easy referencing in meetings.

---

## 🌐 v1.0: Enterprise & Automation

### ⚙️ CI/CD Integration
- **Headless CLI for Devs**: A lightweight CLI optimized for running in GitHub Actions to export prototypes on every PR merge.
- **Visual Regression**: Simple visual diffing between the "Current" capture and the "Previous" capture to highlight what changed for QA teams.

### 🔐 Advanced Compliance
- **Agency Profiles**: Pre-defined security settings (telemetry off, total air-gap) for agencies working under strict NDAs.

---
> *FigmaSnap: Designed to save designers 2 hours every week and save stakeholders from Figma's complexity.*
