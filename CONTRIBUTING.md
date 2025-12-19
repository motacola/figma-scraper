# Contributing to FigmaSnap

Thank you for your interest in contributing to FigmaSnap! We welcome contributions from everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Submitting Changes](#submitting-changes)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Issue Reporting](#issue-reporting)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the expected behavior.

## ✨ How Can I Contribute?

### Reporting Bugs

- Check existing issues to avoid duplicates
- Provide clear, reproducible steps
- Include system information (OS, Node.js version, Chrome version)
- Add screenshots if applicable

### Suggesting Enhancements

- Describe the problem you're trying to solve
- Explain why current solutions are insufficient
- Provide mockups or examples if possible

### Writing Code

- Fix bugs
- Implement new features
- Improve documentation
- Write tests

### Improving Documentation

- Fix typos
- Clarify confusing sections
- Add missing documentation
- Improve examples

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/motacola/figma-scraper.git

# Navigate to the project directory
cd figma-scraper

# Install dependencies
npm install

# Install development dependencies
npm install --only=dev

# Run the development version
npm run dev
```

## 📤 Submitting Changes

1. **Fork the repository** on GitHub
2. **Create a feature branch** from the main branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them with clear messages:

   ```bash
   git commit -m "Add feature: your feature description"
   ```

4. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** to the main repository

## 📝 Pull Request Guidelines

- Use clear, descriptive titles
- Provide detailed descriptions of changes
- Reference related issues (e.g., "Fixes #123")
- Keep PRs focused on a single feature or bug fix
- Include tests if applicable
- Update documentation if needed
- Be responsive to feedback

## 💻 Coding Standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Use async/await for asynchronous code
- Handle errors appropriately

### CSS

- Use consistent naming conventions
- Add comments for complex styles
- Organize styles logically
- Use CSS variables for colors and common values

### HTML

- Use semantic HTML5 elements
- Add appropriate ARIA attributes
- Keep templates clean and readable

### Git

- Use present tense in commit messages
- Keep commits focused and atomic
- Write descriptive commit messages
- Reference issues when applicable

## 🐛 Issue Reporting

When reporting issues, please include:

1. **Description**: Clear description of the problem
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Screenshots**: If applicable
6. **Environment**:
   - Operating System
   - Node.js version
   - Chrome version
   - FigmaSnap version

## 🙏 Thank You

Your contributions help make FigmaSnap better for everyone. We appreciate your time and effort!
