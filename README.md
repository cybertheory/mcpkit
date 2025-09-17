# MCP Kit

A lightweight UI console client for the [official MCP Registry](https://github.com/modelcontextprotocol/registry) that detects MCP-capable agents and installs MCP servers. Easily manage Model Context Protocol integrations for Cursor, Windsurf, Claude Desktop, Continue, Aider, Cline, Neovim, Emacs, JetBrains IDEs and other MCP-capable assistants.

> **🌐 Official Registry Client**: MCP Kit is built as a client for the official MCP Registry, following the specifications and standards defined by the Model Context Protocol community. All server data comes directly from [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io).

![MCP Kit Screenshot](assets/image.png)

## 🚀 Quick Start

### Option 1: NPX (Recommended - No Installation)
```bash
npx @cybertheory/mcpkit
```

### 📰 News Ticker (Free & Ready!)

The news ticker displays real tech headlines automatically - **no setup required!**

**Features:**
- ✅ **Completely Free** - No API key needed
- ✅ **Real Tech News** - Live headlines from major sources
- ✅ **Auto-Updates** - Refreshes every 5 minutes
- ✅ **Smart Filtering** - Only shows relevant tech content

**News Coverage Includes:**
- AI & Machine Learning (Claude, OpenAI, Anthropic, MCP)
- Programming Languages & Frameworks (JavaScript, Python, React, Node.js, etc.)
- Major Tech Companies (Google, Apple, Microsoft, Amazon, Meta, Tesla, SpaceX)
- Software Development & DevOps
- Cloud Computing & Cybersecurity
- Blockchain & Cryptocurrency
- Tech Startups & Innovation
- Tech Conferences & Events

The ticker uses a free news proxy service and works out of the box!
No installation required! Runs immediately and caches for faster subsequent runs.

### Option 2: Global Installation
```bash
npm install -g @cybertheory/mcpkit
mcpkit
```

### Option 3: Local Installation
```bash
npm install @cybertheory/mcpkit
npx @cybertheory/mcpkit
```

## ✨ Features

- **Official Registry Integration**: Built as a client for the [official MCP Registry](https://github.com/modelcontextprotocol/registry), ensuring all server data comes from the authoritative source
- **Registry-First Architecture**: All installations use official registry metadata including npm packages, versions, and environment variables
- **Auto-Detection**: Automatically finds Cursor, Windsurf, Claude Desktop, Continue, Aider, Cline, Neovim, Emacs, JetBrains IDEs and other MCP-capable agents
- **One-Click Install**: Install MCP servers directly from registry with proper environment variable configuration
- **OAuth Support**: Handle authentication flows for services like GitHub
- **Offline Fallback**: Works even when registry is unavailable using cached data
- **Cross-Platform**: Windows, macOS, and Linux support

## 🎯 Supported Agents

### Code Editors
- **Cursor** - AI-powered code editor
- **Windsurf** - AI coding assistant by Codeium
- **Continue** - Open-source AI coding assistant
- **Cline** - AI-powered coding assistant for VS Code
- **VS Code** - Visual Studio Code with MCP extensions
- **Neovim** - Modern Vim with MCP support
- **Emacs** - Extensible text editor with MCP integration
- **JetBrains IDEs** - IntelliJ IDEA, PyCharm, WebStorm with MCP

### AI Assistants
- **Claude Desktop** - Anthropic's Claude AI assistant
- **ChatGPT** - OpenAI's ChatGPT with MCP integration
- **Perplexity AI** - AI-powered search and research assistant

### Terminal Tools
- **Aider** - AI pair programming in your terminal

### Productivity & Communication
- **Notion AI** - AI-powered workspace and productivity tool
- **Obsidian** - Knowledge management with AI plugins
- **Slack** - Team communication with AI integrations
- **Discord** - Community platform with bot integrations
- **Zapier** - Automation platform connecting apps and services

### Custom Agents
- **Custom Agents** - Add your own MCP-compatible tools

## 📦 Installation Methods

### NPX (No Installation Required)
```bash
# Latest version
npx @cybertheory/mcpkit

# Specific version
npx @cybertheory/mcpkit@1.2.3

# Force update
npx @cybertheory/mcpkit@latest --force
```

**Pros:**
- ✅ No installation required
- ✅ Always latest version
- ✅ No system pollution
- ✅ Easy to try
- ✅ Works offline after first run

**Cons:**
- ❌ Requires Node.js
- ❌ Slower first run (downloads package)

### Global Installation
```bash
npm install -g @cybertheory/mcpkit
# or
yarn global add @cybertheory/mcpkit
```

**Pros:**
- ✅ Fast startup
- ✅ Works offline
- ✅ Version control
- ✅ Available as `mcp-kit` command

**Cons:**
- ❌ Requires Node.js
- ❌ Manual updates needed

### Local Installation
```bash
npm install @cybertheory/mcpkit
npx @cybertheory/mcpkit
```

**Pros:**
- ✅ Project-specific installation
- ✅ Version pinning
- ✅ Works offline

**Cons:**
- ❌ Requires Node.js
- ❌ Must run from project directory

## 🛠️ Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup
```bash
git clone https://github.com/cybertheory/mcpkit.git
cd mcpkit
npm install
npm run dev
```

### Building
```bash
# Build web assets
npm run build

# Publish to npm
npm publish
```

## 📋 Usage

1. **Start MCP Kit**: Run `npx @cybertheory/mcpkit` or `mcpkit` (if installed globally)
2. **Select Agent**: Choose your coding agent (Cursor, Windsurf, etc.)
3. **Browse Catalog**: Explore available MCP servers
4. **Install**: Click install and configure environment variables
5. **Use**: Restart your agent to use the new MCP servers

## 🔧 Configuration

MCP Kit automatically detects agent configurations, but you can manually specify paths if needed:

### Code Editors
- **Cursor**: `~/.cursor/mcp.json`
- **Windsurf**: `~/.windsurf/mcp.json`
- **Continue**: `~/.continue/config.json`
- **Cline**: `~/.cline/config.json` (VS Code extension with MCP support)
- **Neovim**: `~/.neovim/mcp.json`
- **Emacs**: `~/.emacs/mcp.json`
- **JetBrains**: `~/.jetbrains/mcp.json`

### AI Assistants
- **Claude Desktop**: `~/.claude/mcp.json`
- **ChatGPT**: Custom configuration file
- **Perplexity AI**: Custom configuration file

### Terminal Tools
- **Aider**: `~/.aiderrc` or `~/.aider/config.json`

### Custom Agents
- **Custom**: Specify any JSON configuration file

## 🌐 Official MCP Registry Integration

MCP Kit is designed as a client for the [official MCP Registry](https://github.com/modelcontextprotocol/registry), following the specifications and standards defined by the Model Context Protocol community. This ensures:

### ✅ Registry Compliance
- **Authentic Data**: All server information comes directly from the official registry at [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
- **Latest Versions**: Automatic updates with the most recent server versions from the registry
- **Proper Metadata**: Complete package information, environment variables, and installation commands as defined by the registry
- **Verified Sources**: Only officially registered and verified MCP servers are available for installation

### 🔄 Registry Synchronization
- **Real-time Updates**: Registry data is automatically updated every 30 minutes
- **Manual Refresh**: Use the "Refresh Registry" button in the UI to get the latest data
- **Offline Support**: Cached data ensures continued operation when the registry is unavailable
- **API Compliance**: Follows the official MCP Registry API specifications for data retrieval and server management

### 🏗️ Architecture Benefits
- **Standards Compliance**: Built according to MCP Registry specifications
- **Community Alignment**: Integrates seamlessly with the broader MCP ecosystem
- **Future-Proof**: Automatically adapts to registry API changes and improvements
- **Trust & Security**: Users can trust that all servers come from the official, verified registry

## 🚀 Publishing

To publish a new version:

```bash
# Update version
npm version patch  # or minor, major

# Build and publish
npm run build
npm publish
```

## 🤝 Contributing

We welcome contributions to MCP Kit! As a client for the official MCP Registry, we follow the specifications and standards defined by the Model Context Protocol community.

### Quick Start
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Detailed Guidelines
See our [CONTRIBUTING.md](CONTRIBUTING.md) for comprehensive contribution guidelines, including:
- Development setup and project structure
- Code style guidelines and testing requirements
- MCP Registry integration standards
- Review process and community guidelines

### Registry Compliance
When contributing, please ensure:
- All changes maintain compatibility with the official MCP Registry API
- Server installations follow registry specifications
- Error handling includes proper fallback mechanisms
- Documentation reflects registry integration features

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/cybertheory/mcpkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cybertheory/mcpkit/discussions)
- **Documentation**: [Wiki](https://github.com/cybertheory/mcpkit/wiki)

---

**Made with ❤️ for the MCP community** | **Built for the [Official MCP Registry](https://github.com/modelcontextprotocol/registry)**