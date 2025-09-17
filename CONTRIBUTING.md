# Contributing to MCP Kit

Thank you for your interest in contributing to MCP Kit! This project is a client for the [official MCP Registry](https://github.com/modelcontextprotocol/registry) and follows the specifications outlined in the Model Context Protocol ecosystem.

## 🎯 What is MCP Kit?

MCP Kit is a lightweight UI console that serves as a client for the official MCP Registry. It helps users:
- Detect MCP-capable agents on their system
- Browse and install MCP servers from the official registry
- Manage MCP integrations across various AI assistants and code editors

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcpkit.git
   cd mcpkit
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd web && npm install && cd ..
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build Web Assets**
   ```bash
   npm run build:web
   ```

## 📋 How to Contribute

### 🐛 Bug Reports

When reporting bugs, please include:
- **Environment**: OS, Node.js version, MCP Kit version
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Logs**: Any error messages

### ✨ Feature Requests

For new features, please:
- Check existing [issues](https://github.com/cybertheory/mcpkit/issues) first
- Describe the use case and benefits
- Consider how it fits with the MCP Registry ecosystem
- Provide mockups or examples if applicable

### 🔧 Code Contributions

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run build:web
   npm start
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🏗️ Project Structure

```
mcpkit/
├── bin/                    # CLI entry point
│   └── mcp-kit.js
├── web/                    # Web UI (React + Vite)
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── main.tsx        # Entry point
│   │   └── styles.css      # Global styles
│   ├── dist/               # Built web assets
│   └── package.json
├── assets/                 # Static assets
├── mcp-registry.json       # Cached registry data
├── package.json            # Main package configuration
└── README.md
```

## 🎨 Code Style Guidelines

### JavaScript/TypeScript
- Use ES6+ features
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for functions
- Follow existing formatting patterns

### React Components
- Use functional components with hooks
- Keep components focused and small
- Use TypeScript for type safety
- Follow React best practices

### CSS/Styling
- Use Tailwind CSS classes
- Keep styles modular
- Follow mobile-first approach
- Ensure accessibility compliance

## 🔗 MCP Registry Integration

MCP Kit integrates with the official MCP Registry following these principles:

### Registry API Usage
- **Primary Source**: Always use `registry.modelcontextprotocol.io` as the primary data source
- **Caching**: Implement proper caching with fallback mechanisms
- **Error Handling**: Graceful degradation when registry is unavailable
- **Rate Limiting**: Respect API rate limits and implement retry logic

### Server Installation
- **Official Packages**: Only install packages from the official registry
- **Version Management**: Use registry-specified versions
- **Environment Variables**: Apply registry-provided environment configurations
- **Validation**: Validate server configurations before installation

### Registry Compliance
- Follow the [MCP Registry specifications](https://github.com/modelcontextprotocol/registry)
- Implement proper authentication flows (OAuth, DNS verification)
- Support all registry-defined server metadata
- Maintain compatibility with registry API changes

## 🧪 Testing

### Manual Testing
- Test on different operating systems (Windows, macOS, Linux)
- Verify agent detection across supported platforms
- Test registry integration and offline fallback
- Validate installation processes

### Automated Testing
- Unit tests for core functionality
- Integration tests for registry API
- End-to-end tests for critical user flows
- Performance tests for large registry datasets

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Document complex algorithms and business logic
- Include examples in code comments
- Maintain inline documentation

### User Documentation
- Update README.md for user-facing changes
- Add screenshots for UI changes
- Document new features and configuration options
- Keep installation instructions current

## 🚀 Release Process

### Version Management
- Follow [Semantic Versioning](https://semver.org/)
- Update version in `package.json`
- Create release notes
- Tag releases appropriately

### Publishing
```bash
# Update version
npm version patch  # or minor, major

# Build and publish
npm run build:web
npm publish
```

## 🤝 Community Guidelines

### Communication
- Be respectful and inclusive
- Use clear, constructive language
- Help others learn and grow
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

### Pull Request Process
- Keep PRs focused and atomic
- Write clear, descriptive commit messages
- Request reviews from maintainers
- Address feedback promptly
- Update documentation as needed

### Issue Management
- Use appropriate labels
- Assign issues to contributors
- Close issues when resolved
- Link related issues and PRs

## 🔍 Review Process

### Code Review Checklist
- [ ] Code follows project style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes without discussion
- [ ] Registry integration is maintained
- [ ] Error handling is appropriate
- [ ] Performance impact is considered

### Review Timeline
- Initial review within 48 hours
- Follow-up reviews as needed
- Merge when approved by maintainers
- Release coordination for significant changes

## 🆘 Getting Help

### Resources
- [MCP Registry Documentation](https://github.com/modelcontextprotocol/registry)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [GitHub Issues](https://github.com/cybertheory/mcpkit/issues)
- [GitHub Discussions](https://github.com/cybertheory/mcpkit/discussions)

### Contact
- **Maintainers**: MCP Kit Team
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Discord**: Join the MCP community Discord for real-time chat

## 📄 License

By contributing to MCP Kit, you agree that your contributions will be licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Thank you for contributing to MCP Kit and the MCP ecosystem! 🚀**
