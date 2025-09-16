#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const { spawn } = require('child_process');
const { PostHog } = require('posthog-node');

const POSTHOG_KEY = process.env.MCPKIT_POSTHOG_KEY || '';

const ph = POSTHOG_KEY ? new PostHog(POSTHOG_KEY, { host: process.env.MCPKIT_POSTHOG_HOST || 'https://us.i.posthog.com' }) : null;

// Persistence file for manually added agents
const PERSISTENCE_FILE = path.join(os.homedir(), '.mcpkit', 'agents.json');

// MCP registry file
const MCP_REGISTRY_FILE = path.join(__dirname, '..', 'mcp-registry.json');

function ensurePersistenceDir() {
  const dir = path.dirname(PERSISTENCE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadPersistedAgents() {
  ensurePersistenceDir();
  if (fs.existsSync(PERSISTENCE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
    } catch (e) {
      console.warn('Failed to load persisted agents:', e.message);
    }
  }
  return {};
}

function savePersistedAgents(agents) {
  ensurePersistenceDir();
  try {
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(agents, null, 2));
  } catch (e) {
    console.warn('Failed to save persisted agents:', e.message);
  }
}

async function loadMcpRegistry() {
  // Try to fetch from GitHub first, but silently fall back to local if it fails
  try {
    const githubRegistry = await fetchCatalogFromGitHub();
    if (githubRegistry && githubRegistry.mcps) {
      // Save the fetched registry locally for offline use
      saveMcpRegistry(githubRegistry);
      return githubRegistry;
    }
  } catch (e) {
    // Silently fall back to local registry - don't log errors to avoid noise
  }
  
  // Fallback to local file
  try {
    if (fs.existsSync(MCP_REGISTRY_FILE)) {
      const registry = JSON.parse(fs.readFileSync(MCP_REGISTRY_FILE, 'utf8'));
      // Ensure the registry has the expected structure
      if (registry && typeof registry === 'object') {
        return {
          mcps: Array.isArray(registry.mcps) ? registry.mcps : []
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load local MCP registry:', e.message);
  }
  return { mcps: [] };
}

function saveMcpRegistry(registry) {
  try {
    fs.writeFileSync(MCP_REGISTRY_FILE, JSON.stringify(registry, null, 2));
  } catch (e) {
    console.warn('Failed to save MCP registry:', e.message);
  }
}

// Synchronous version for fallback scenarios
function loadMcpRegistrySync() {
  try {
    if (fs.existsSync(MCP_REGISTRY_FILE)) {
      const registry = JSON.parse(fs.readFileSync(MCP_REGISTRY_FILE, 'utf8'));
      // Ensure the registry has the expected structure
      if (registry && typeof registry === 'object') {
        return {
          mcps: Array.isArray(registry.mcps) ? registry.mcps : []
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load local MCP registry:', e.message);
  }
  return { mcps: [] };
}

function updateMcpInstallationStatus(mcpId, agentId, installed = true) {
  const registry = loadMcpRegistrySync();
  const mcp = registry.mcps?.find(m => m.id === mcpId);
  if (mcp) {
    if (installed) {
      if (!mcp.installed_agents) mcp.installed_agents = [];
      if (!mcp.installed_agents.includes(agentId)) {
        mcp.installed_agents.push(agentId);
      }
      if (!mcp.installed) {
        mcp.installed = true;
        mcp.installation_date = new Date().toISOString();
      }
    } else {
      if (mcp.installed_agents) {
        mcp.installed_agents = mcp.installed_agents.filter(id => id !== agentId);
        if (mcp.installed_agents.length === 0) {
          mcp.installed = false;
          mcp.installation_date = null;
        }
      }
    }
    saveMcpRegistry(registry);
  }
}

function track(event, properties = {}) {
  if (!ph) return;
  try { ph.capture({ distinctId: os.userInfo().username || 'unknown', event, properties }); } catch {}
}

function resolveCursorMcpConfig() {
  // Cursor stores MCP config in ~/.cursor/mcp.json (global) and .cursor/mcp.json (project-specific)
  const candidates = [];
  const homeDir = os.homedir();
  
  // Global config
  candidates.push(path.join(homeDir, '.cursor', 'mcp.json'));
  
  // Project-specific config (current working directory)
  candidates.push(path.join(process.cwd(), '.cursor', 'mcp.json'));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveWindsurfMcpConfig() {
  // Windsurf likely follows similar pattern to Cursor
  const candidates = [];
  const homeDir = os.homedir();
  
  candidates.push(path.join(homeDir, '.windsurf', 'mcp.json'));
  candidates.push(path.join(process.cwd(), '.windsurf', 'mcp.json'));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveClaudeDesktopMcpConfig() {
  // Claude Desktop stores MCP config in various locations
  const candidates = [];
  const homeDir = os.homedir();
  
  // Use environment variables for user-agnostic paths
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    candidates.push(path.join(appData, 'Anthropic', 'Claude', 'mcp.json'));
    candidates.push(path.join(appData, 'Claude', 'mcp.json'));
    candidates.push(path.join(appData, 'Claude', 'config.json'));
    candidates.push(path.join(appData, 'Claude', 'settings.json'));
  } else if (process.platform === 'darwin') {
    candidates.push(path.join(homeDir, 'Library', 'Application Support', 'Claude', 'mcp.json'));
    candidates.push(path.join(homeDir, 'Library', 'Application Support', 'Anthropic', 'Claude', 'mcp.json'));
  } else {
    // Linux
    candidates.push(path.join(homeDir, '.claude', 'mcp.json'));
    candidates.push(path.join(homeDir, '.anthropic', 'claude', 'mcp.json'));
    candidates.push(path.join(homeDir, '.config', 'claude', 'mcp.json'));
  }
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveContinueMcpConfig() {
  // Continue stores MCP config in ~/.continue/config.json
  const candidates = [];
  const homeDir = os.homedir();
  
  candidates.push(path.join(homeDir, '.continue', 'config.json'));
  candidates.push(path.join(homeDir, '.continue', 'mcp.json'));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveAiderMcpConfig() {
  // Aider stores config in ~/.aiderrc or ~/.aider/config.json
  const candidates = [];
  const homeDir = os.homedir();
  
  candidates.push(path.join(homeDir, '.aiderrc'));
  candidates.push(path.join(homeDir, '.aider', 'config.json'));
  candidates.push(path.join(homeDir, '.aider', 'mcp.json'));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveClineMcpConfig() {
  // Cline stores MCP config in dedicated config file, NOT VS Code settings
  const candidates = [];
  const homeDir = os.homedir();
  
  // Dedicated Cline config locations
  candidates.push(path.join(homeDir, '.cline', 'config.json'));
  candidates.push(path.join(homeDir, '.cline', 'mcp.json'));
  candidates.push(path.join(homeDir, '.cline', 'settings.json'));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// VS Code is not an MCP-enabled AI agent, so we don't need this function
// MCP support in VS Code comes through extensions like Cline

function resolveGenericMcpConfig(platformName) {
  // Generic MCP config resolver for other platforms
  const candidates = [];
  const homeDir = os.homedir();
  
  // Common patterns
  candidates.push(path.join(homeDir, `.${platformName.toLowerCase()}`, 'mcp.json'));
  candidates.push(path.join(homeDir, `.${platformName.toLowerCase()}`, 'config.json'));
  candidates.push(path.join(homeDir, `.${platformName.toLowerCase()}rc`));
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function isApplicationInstalled(appName) {
  // Check if application is actually installed by looking for executable or installation directories
  const homeDir = os.homedir();
  
  if (process.platform === 'win32') {
    // Windows: Use environment variables for user-agnostic paths
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    
    const winPaths = [
      path.join(localAppData, 'Programs', appName),
      path.join(localAppData, 'Programs', `Microsoft ${appName}`), // VS Code
      path.join(appData, appName),
      path.join(appData, 'Anthropic'), // Claude Desktop
      path.join(appData, 'Claude'), // Claude Desktop alternative
      path.join(programFiles, appName),
      path.join(programFiles, `Microsoft ${appName}`),
      path.join(programFilesX86, appName),
      path.join(programFilesX86, `Microsoft ${appName}`)
    ];
    
    return winPaths.some(p => fs.existsSync(p));
  } else if (process.platform === 'darwin') {
    // macOS: Check Applications folder and user directories
    const macPaths = [
      path.join('/Applications', `${appName}.app`),
      path.join('/Applications', `Microsoft ${appName}.app`),
      path.join(homeDir, 'Applications', `${appName}.app`),
      path.join(homeDir, 'Applications', `Microsoft ${appName}.app`),
      path.join(homeDir, `.${appName.toLowerCase()}`)
    ];
    
    return macPaths.some(p => fs.existsSync(p));
  } else {
    // Linux: Check common installation paths
    const linuxPaths = [
      path.join('/usr/bin', appName.toLowerCase()),
      path.join('/usr/local/bin', appName.toLowerCase()),
      path.join(homeDir, `.${appName.toLowerCase()}`)
    ];
    
    return linuxPaths.some(p => fs.existsSync(p));
  }
}

function detectAgents() {
  const agents = [];
  const homeDir = os.homedir();
  
  // Check for Cursor MCP config
  const cursorMcpConfig = resolveCursorMcpConfig();
  if (cursorMcpConfig) {
    agents.push({ 
      id: 'cursor', 
      name: 'Cursor', 
      mcpConfigPath: cursorMcpConfig,
      type: 'mcp-config',
      category: 'Code Editors'
    });
  }
  
  // Check for Windsurf MCP config
  const windsurfMcpConfig = resolveWindsurfMcpConfig();
  if (windsurfMcpConfig) {
    agents.push({ 
      id: 'windsurf', 
      name: 'Windsurf', 
      mcpConfigPath: windsurfMcpConfig,
      type: 'mcp-config',
      category: 'Code Editors'
    });
  }
  
  // Check for Claude Desktop MCP config - also verify it's actually installed
  const claudeMcpConfig = resolveClaudeDesktopMcpConfig();
  if (claudeMcpConfig && (isApplicationInstalled('Claude') || isApplicationInstalled('Anthropic'))) {
    agents.push({ 
      id: 'claude-desktop', 
      name: 'Claude Desktop', 
      mcpConfigPath: claudeMcpConfig,
      type: 'mcp-config',
      category: 'AI Assistants'
    });
  }
  
  // Check for Continue MCP config
  const continueMcpConfig = resolveContinueMcpConfig();
  if (continueMcpConfig) {
    agents.push({ 
      id: 'continue', 
      name: 'Continue', 
      mcpConfigPath: continueMcpConfig,
      type: 'mcp-config',
      category: 'Code Editors'
    });
  }
  
  // Check for Aider MCP config
  const aiderMcpConfig = resolveAiderMcpConfig();
  if (aiderMcpConfig) {
    agents.push({ 
      id: 'aider', 
      name: 'Aider', 
      mcpConfigPath: aiderMcpConfig,
      type: 'mcp-config',
      category: 'Terminal Tools'
    });
  }
  
  // Check for Cline MCP config - only if Cline is actually installed
  const clineMcpConfig = resolveClineMcpConfig();
  if (clineMcpConfig && isApplicationInstalled('Cline')) {
    agents.push({ 
      id: 'cline', 
      name: 'Cline', 
      mcpConfigPath: clineMcpConfig,
      type: 'mcp-config',
      category: 'Code Editors'
    });
  }
  
  // VS Code is not an MCP-enabled AI agent - it's just an editor
  // MCP support comes through extensions like Cline, not VS Code itself
  
  // Check for other common platforms
  const otherPlatforms = [
    { id: 'neovim', name: 'Neovim', category: 'Code Editors' },
    { id: 'emacs', name: 'Emacs', category: 'Code Editors' },
    { id: 'jetbrains', name: 'JetBrains IDEs', category: 'Code Editors' }
  ];
  
  otherPlatforms.forEach(platform => {
    const configPath = resolveGenericMcpConfig(platform.id);
    if (configPath && isApplicationInstalled(platform.name)) {
      agents.push({
        id: platform.id,
        name: platform.name,
        mcpConfigPath: configPath,
        type: 'mcp-config',
        category: platform.category
      });
    }
  });
  
  // Load persisted manually added agents
  const persistedAgents = loadPersistedAgents();
  Object.values(persistedAgents).forEach(agent => {
    agents.push({
      ...agent,
      type: 'persisted'
    });
  });
  
  return agents;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJsonSafe(file, data) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const backup = file + '.bak.' + Date.now();
  try {
    if (fs.existsSync(file)) fs.copyFileSync(file, backup);
  } catch {}
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Mock MCP catalog - will be replaced with GitHub repo backend
const mockCatalog = [
  {
    id: 'supabase-mcp',
    name: 'Supabase MCP',
    category: 'Databases',
    description: 'Manage Supabase projects, SQL, and migrations from your agent.',
    install: {
      npm: 'supabase-mcp-server',
      command: 'npx supabase-mcp-server@latest start',
      env: { }
    }
  },
  {
    id: 'posthog-mcp',
    name: 'PostHog MCP',
    category: 'Analytics',
    description: 'Control feature flags and analytics via your agent.',
    install: {
      npm: '@posthog/mcp-server',
      command: 'npx @posthog/mcp-server@latest start',
      env: { }
    }
  },
  {
    id: 'filesystem-mcp',
    name: 'Filesystem MCP',
    category: 'Development',
    description: 'Read, write, and manage files and directories.',
    install: {
      npm: '@modelcontextprotocol/server-filesystem',
      command: 'npx @modelcontextprotocol/server-filesystem@latest',
      env: { }
    }
  },
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    category: 'Development',
    description: 'Interact with GitHub repositories, issues, and pull requests.',
    install: {
      npm: '@modelcontextprotocol/server-github',
      command: 'npx @modelcontextprotocol/server-github@latest',
      env: { 
        GITHUB_PERSONAL_ACCESS_TOKEN: {
          required: true,
          description: 'GitHub Personal Access Token with repo access',
          placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          help: 'Create at https://github.com/settings/tokens'
        }
      }
    }
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search MCP',
    category: 'Search',
    description: 'Search the web using Brave Search API.',
    install: {
      npm: '@modelcontextprotocol/server-brave-search',
      command: 'npx @modelcontextprotocol/server-brave-search@latest',
      env: { 
        BRAVE_API_KEY: {
          required: true,
          description: 'Brave Search API Key',
          placeholder: 'BSAxxxxxxxxxxxxxxxxxxxx',
          help: 'Get at https://brave.com/search/api/'
        }
      }
    }
  },
  {
    id: 'memory-mcp',
    name: 'Memory MCP',
    category: 'Utilities',
    description: 'Persistent memory storage for conversations and context.',
    install: {
      npm: '@modelcontextprotocol/server-memory',
      command: 'npx @modelcontextprotocol/server-memory@latest',
      env: { }
    }
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite MCP',
    category: 'Databases',
    description: 'Query SQLite databases from your agent.',
    install: {
      npm: '@modelcontextprotocol/server-sqlite',
      command: 'npx @modelcontextprotocol/server-sqlite@latest',
      env: { 
        SQLITE_DB_PATH: {
          required: true,
          description: 'Path to SQLite database file',
          placeholder: '/path/to/database.db',
          help: 'Absolute path to your SQLite database file'
        }
      }
    }
  }
];

// Fetch MCP registry from GitHub repository
async function fetchCatalogFromGitHub() {
  try {
    const https = require('https');
    const url = 'https://raw.githubusercontent.com/cybertheory/mcpkit/main/mcp-registry.json';
    
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const registry = JSON.parse(data);
            console.log('Successfully fetched registry from GitHub');
            resolve(registry);
          } catch (e) {
            console.warn('Failed to parse GitHub registry JSON:', e.message);
            reject(e);
          }
        });
      }).on('error', (e) => {
        console.warn('Failed to fetch registry from GitHub:', e.message);
        reject(e);
      });
    });
  } catch (e) {
    console.warn('Error in fetchCatalogFromGitHub:', e.message);
    return null;
  }
}

function ensureMcpServersInConfig(config, agentId) {
  // Different platforms use different config formats
  if (!config || typeof config !== 'object') {
    // Default to Cursor format
    return { mcpServers: {} };
  }
  
  // Cursor/Windsurf format: { mcpServers: { serverId: { command, args } } }
  if (agentId === 'cursor' || agentId === 'windsurf') {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    return config;
  }
  
  // Claude Desktop format: { mcpServers: { serverId: { command, args } } }
  if (agentId === 'claude-desktop') {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    return config;
  }
  
  // Continue format: { mcpServers: { serverId: { command, args } } }
  if (agentId === 'continue') {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    return config;
  }
  
  // Aider format: { mcpServers: { serverId: { command, args } } }
  if (agentId === 'aider') {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    return config;
  }
  
  // Cline format: VS Code settings with mcpServers
  if (agentId === 'cline') {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    return config;
  }
  
  // Generic format - try to detect
  if (config.mcpServers) {
    return config;
  }
  
  // Fallback to Cursor format
  config.mcpServers = {};
  return config;
}

function addServerToMcpConfig(mcpConfigPath, serverId, serverCommand, env = {}, agentId = 'cursor') {
  const config = ensureMcpServersInConfig(readJson(mcpConfigPath), agentId);
  
  // Parse command and args from the install command
  const parts = serverCommand.split(' ');
  const command = parts[0];
  const args = parts.slice(1);
  
  config.mcpServers[serverId] = {
    command,
    args,
    env
  };
  
  writeJsonSafe(mcpConfigPath, config);
}

function removeServerFromMcpConfig(mcpConfigPath, serverId, agentId = 'cursor') {
  const config = ensureMcpServersInConfig(readJson(mcpConfigPath), agentId);
  
  if (config.mcpServers && config.mcpServers[serverId]) {
    delete config.mcpServers[serverId];
    writeJsonSafe(mcpConfigPath, config);
    return true;
  }
  return false;
}

async function main() {
  const app = express();
  app.use(express.json());

  app.get('/api/agents', (req, res) => {
    const agents = detectAgents();
    track('agents_listed', { count: agents.length });
    res.json({ agents });
  });

  // Debug endpoint to help troubleshoot detection
  app.get('/api/debug-detection', (req, res) => {
    const homeDir = os.homedir();
    const debug = {
      platform: process.platform,
      homeDir: homeDir,
      claudePaths: [
        path.join(homeDir, '.claude', 'mcp.json'),
        path.join(homeDir, '.anthropic', 'claude', 'mcp.json'),
        path.join(homeDir, 'AppData', 'Roaming', 'Anthropic', 'Claude', 'mcp.json'),
        path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'mcp.json'),
        path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'config.json'),
        path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'settings.json')
      ],
      claudeExists: [
        fs.existsSync(path.join(homeDir, '.claude', 'mcp.json')),
        fs.existsSync(path.join(homeDir, '.anthropic', 'claude', 'mcp.json')),
        fs.existsSync(path.join(homeDir, 'AppData', 'Roaming', 'Anthropic', 'Claude', 'mcp.json')),
        fs.existsSync(path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'mcp.json')),
        fs.existsSync(path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'config.json')),
        fs.existsSync(path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'settings.json'))
      ],
      claudeInstalled: isApplicationInstalled('Claude'),
      claudeConfig: resolveClaudeDesktopMcpConfig()
    };
    res.json(debug);
  });

  // Allow manual override of MCP config path when detection fails
  app.post('/api/set-mcp-config-path', (req, res) => {
    const { agentId, mcpConfigPath } = req.body || {};
    if (!agentId || !mcpConfigPath) return res.status(400).json({ error: 'agentId and mcpConfigPath required' });
    try {
      if (!fs.existsSync(mcpConfigPath)) {
        return res.status(400).json({ error: 'mcpConfigPath does not exist' });
      }
      // Validate JSON if file ends with .json
      if (mcpConfigPath.toLowerCase().endsWith('.json')) {
        JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON at mcpConfigPath: ' + e.message });
    }
    const agents = detectAgents();
    const existing = agents.find(a => a.id === agentId);
    const merged = existing ? agents.map(a => a.id === agentId ? { ...a, mcpConfigPath } : a) : [...agents, { id: agentId, name: agentId === 'cursor' ? 'Cursor' : 'Windsurf', mcpConfigPath, type: 'mcp-config' }];
    track('mcp_config_path_overridden', { agentId });
    res.json({ agents: merged });
  });

  app.get('/api/catalog', async (req, res) => {
    try {
      const registry = await loadMcpRegistry();
      const catalog = registry.mcps || [];
      
      const grouped = catalog.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
      }, {});
      
      track('catalog_viewed', { source: 'registry', count: catalog.length });
      res.json({ catalog: grouped });
    } catch (e) {
      console.error('Error loading catalog:', e.message);
      res.status(500).json({ error: 'Failed to load catalog' });
    }
  });

  app.post('/api/install', async (req, res) => {
    const { agentId, mcpId, envVars } = req.body || {};
    const agents = detectAgents();
    const agent = agents.find(a => a.id === agentId);
    
    // Get MCP from registry
    const registry = await loadMcpRegistry();
    const mcp = registry.mcps?.find(m => m.id === mcpId);
    
    if (!agent || !mcp) {
      return res.status(400).json({ error: 'Invalid agent or MCP id' });
    }

    // Validate environment variables if required
    if (mcp.env) {
      const missing = [];
      Object.entries(mcp.env).forEach(([key, config]) => {
        if (config.required && (!envVars || !envVars[key] || envVars[key].trim() === '')) {
          missing.push({ key, ...config });
        }
      });
      
      if (missing.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required environment variables', 
          missing 
        });
      }
    }
    
    try {
      addServerToMcpConfig(agent.mcpConfigPath, mcp.id, mcp.command, envVars || {}, agentId);
      updateMcpInstallationStatus(mcpId, agentId, true);
      track('mcp_installed', { agentId, mcpId, source: 'registry' });
      return res.json({ ok: true, mcpConfigPath: agent.mcpConfigPath });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Uninstall MCP endpoint
  app.post('/api/uninstall', async (req, res) => {
    const { agentId, mcpId } = req.body || {};
    const agents = detectAgents();
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent || !mcpId) {
      return res.status(400).json({ error: 'Invalid agent or MCP id' });
    }
    
    try {
      // Remove from MCP config
      const removed = removeServerFromMcpConfig(agent.mcpConfigPath, mcpId, agentId);
      
      if (removed) {
        // Update registry
        updateMcpInstallationStatus(mcpId, agentId, false);
        
        track('mcp_uninstalled', { agentId, mcpId });
        return res.json({ ok: true, mcpConfigPath: agent.mcpConfigPath });
      } else {
        return res.status(404).json({ error: 'MCP not found in configuration' });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Manual registry refresh endpoint
  app.post('/api/refresh-registry', async (req, res) => {
    try {
      const githubRegistry = await fetchCatalogFromGitHub();
      if (githubRegistry && githubRegistry.mcps) {
        saveMcpRegistry(githubRegistry);
        track('registry_refreshed', { source: 'manual', count: githubRegistry.mcps.length });
        res.json({ 
          success: true, 
          message: 'Registry updated successfully',
          count: githubRegistry.mcps.length 
        });
      } else {
        // If GitHub fetch fails, return success with local registry info
        const localRegistry = loadMcpRegistrySync();
        res.json({ 
          success: true, 
          message: 'Using local registry (GitHub unavailable)',
          count: localRegistry.mcps ? localRegistry.mcps.length : 0,
          fromLocal: true
        });
      }
    } catch (e) {
      // If all else fails, return local registry info
      const localRegistry = loadMcpRegistrySync();
      res.json({ 
        success: true, 
        message: 'Using local registry (GitHub unavailable)',
        count: localRegistry.mcps ? localRegistry.mcps.length : 0,
        fromLocal: true
      });
    }
  });

  // Get MCP installation status endpoint
  app.get('/api/mcp-status/:agentId/:mcpId', (req, res) => {
    const { agentId, mcpId } = req.params;
    try {
      const agents = detectAgents();
      const agent = agents.find(a => a.id === agentId);
      if (!agent || !agent.mcpConfigPath) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const config = ensureMcpServersInConfig(readJson(agent.mcpConfigPath), agentId);
      const isInstalled = config.mcpServers && config.mcpServers[mcpId];
      
      res.json({ installed: !!isInstalled, config: isInstalled || null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Serve built React app if available
  const webDist = path.join(__dirname, '..', 'web', 'dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('/', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.get('/', (req, res) => {
    res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCP Kit</title>
  <style>
    :root { --bg:#0b0f19; --panel:#0f1629; --border:#1f2a44; --text:#e5e7eb; --muted:#9aa4b2; --accent:#7c9cff; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; color: var(--text); background: var(--bg); }
    .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
    .sidebar { background: var(--panel); border-right: 1px solid var(--border); padding: 20px; }
    .sidebar h1 { font-size: 22px; margin: 0 0 16px 0; }
    .nav a { display: block; padding: 10px 12px; margin-bottom: 6px; color: var(--text); text-decoration: none; border-radius: 8px; }
    .nav a.active, .nav a:hover { background: rgba(124,156,255,0.12); }
    .content { padding: 24px; }
    .section { margin-bottom: 24px; }
    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    button { background: var(--accent); color: #0b0f19; border: 0; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
    h2 { margin: 0 0 12px 0; font-size: 16px; }
    .muted { color: var(--muted); font-size: 12px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .badge { background: rgba(124,156,255,0.16); color: var(--accent); border-radius: 9999px; padding: 2px 8px; font-size: 12px; }
    .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .item { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .item .title { font-weight: 600; }
    .search { display: flex; gap: 8px; margin-bottom: 12px; }
    input[type="text"] { width: 100%; background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; color: var(--text); }
    .hint { font-size: 12px; color: var(--muted); margin-top: 8px; }
  </style>
  <script>
    async function load() {
      const agentsRes = await fetch('/api/agents');
      const agentsData = await agentsRes.json();
      const agents = agentsData.agents || [];
      const catRes = await fetch('/api/catalog');
      const catalogData = await catRes.json();
      const catalog = catalogData.catalog || {};
      const agentsEl = document.getElementById('agents');
      const catalogEl = document.getElementById('catalog');
      if (agents.length) {
        agentsEl.innerHTML = agents.map(function(a) {
          return '<div class="row">' +
            '<div><strong>' + a.name + '</strong><div class="muted">' + a.settingsPath + '</div></div>' +
            '<span class="badge">Detected</span>' +
          '</div>';
        }).join('');
      } else {
        agentsEl.innerHTML = '<div class="muted">No compatible agents detected.</div>' +
          '<div class="hint">Set your agent settings.json path manually:</div>' +
          '<div class="search"><input id="manualPath" type="text" placeholder="C:\\Users\\me\\AppData\\Roaming\\Cursor\\User\\settings.json"/><button onclick="savePath()">Save</button></div>' +
          '<div class="muted">Pick agent:</div>' +
          '<div class="search"><button onclick="setAgent(\'cursor\')">Cursor</button><button onclick="setAgent(\'windsurf\')">Windsurf</button></div>';
      }
      var html = '';
      Object.keys(catalog).forEach(function(cat) {
        var items = catalog[cat] || [];
        html += '<div class="card">';
        html += '<h2>' + cat + '</h2>';
        items.forEach(function(i) {
          var disabled = agents.length ? '' : 'disabled';
          var agentId = agents.length ? agents[0].id : '';
          var agentName = agents.length ? agents[0].name : 'Agent';
          html += '<div class="item">' +
                    '<div style="flex:1">' +
                      '<div><strong>' + i.name + '</strong></div>' +
                      '<div class="muted">' + i.description + '</div>' +
                    '</div>' +
                    '<button onclick="install(\'' + agentId + '\',\'' + i.id + '\')" ' + disabled + '>Install to ' + agentName + '</button>' +
                  '</div>';
        });
        html += '</div>';
      });
      catalogEl.innerHTML = '<div class="section"><div class="search"><input id="search" type="text" placeholder="Search MCPs..." oninput="filter()" /></div></div>' + html;
    }
    var selectedAgent = 'cursor';
    function setAgent(a){ selectedAgent = a; alert('Selected agent: ' + a); }
    async function savePath(){
      var p = document.getElementById('manualPath').value.trim();
      if(!p){ alert('Enter a path'); return; }
      const res = await fetch('/api/set-settings-path', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ agentId: selectedAgent, settingsPath: p }) });
      const data = await res.json();
      if(!res.ok){ alert('Failed: ' + (data.error || res.status)); return; }
      alert('Saved. Reloading...'); location.reload();
    }
    function filter(){
      var q = (document.getElementById('search').value||'').toLowerCase();
      document.querySelectorAll('.item').forEach(function(el){
        var text = el.textContent.toLowerCase();
        el.style.display = text.indexOf(q) !== -1 ? '' : 'none';
      });
    }
    async function install(agentId, mcpId) {
      if (!agentId) { alert('No agent detected.'); return; }
      const res = await fetch('/api/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agentId, mcpId: mcpId }) });
      const data = await res.json();
      if (!res.ok) { alert('Install failed: ' + (data.error || res.status)); return; }
      alert('Installed. You may need to restart your agent.\nEdited: ' + data.settingsPath);
    }
    window.addEventListener('DOMContentLoaded', load);
  </script>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <h1>MCP Kit</h1>
      <nav class="nav">
        <a class="active" href="#catalog">Catalog</a>
        <a href="#agents">Agents</a>
      </nav>
      <div class="section">
        <div class="card">
          <h2>Detected Agents</h2>
          <div id="agents"></div>
        </div>
      </div>
    </aside>
    <main class="content">
      <div class="section">
        <h2>App Store</h2>
        <div id="catalog" class="catalog"></div>
      </div>
    </main>
  </div>
</body>
</html>`);
  });

  // Add persisted agent endpoint
  app.post('/api/add-agent', (req, res) => {
    const { name, mcpConfigPath } = req.body || {};
    if (!name || !mcpConfigPath) return res.status(400).json({ error: 'name and mcpConfigPath required' });
    
    try {
      if (!fs.existsSync(mcpConfigPath)) {
        return res.status(400).json({ error: 'mcpConfigPath does not exist' });
      }
      
      const persistedAgents = loadPersistedAgents();
      const agentId = `custom-${Date.now()}`;
      persistedAgents[agentId] = {
        id: agentId,
        name,
        mcpConfigPath,
        type: 'persisted'
      };
      savePersistedAgents(persistedAgents);
      
      track('agent_added', { agentId, name, mcpConfigPath });
      res.json({ success: true, agentId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Validate environment variables endpoint
  app.post('/api/validate-env', (req, res) => {
    const { mcpId, envVars } = req.body || {};
    if (!mcpId || !envVars) return res.status(400).json({ error: 'mcpId and envVars required' });
    
    try {
      const registry = loadMcpRegistry();
      const mcp = registry.mcps.find(m => m.id === mcpId);
      if (!mcp || !mcp.env) {
        return res.json({ valid: true, missing: [] });
      }
      
      const missing = [];
      Object.entries(mcp.env).forEach(([key, config]) => {
        if (config.required && (!envVars[key] || envVars[key].trim() === '')) {
          missing.push({ key, ...config });
        }
      });
      
      res.json({ valid: missing.length === 0, missing });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get existing MCP configuration endpoint
  app.get('/api/mcp-config/:agentId/:mcpId', (req, res) => {
    const { agentId, mcpId } = req.params;
    try {
      const agents = detectAgents();
      const agent = agents.find(a => a.id === agentId);
      if (!agent || !agent.mcpConfigPath) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const config = ensureMcpServersInConfig(readJson(agent.mcpConfigPath), agentId);
      const mcpConfig = config.mcpServers?.[mcpId];
      
      res.json({ config: mcpConfig || null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Set up periodic registry updates (every 30 minutes)
  setInterval(async () => {
    try {
      const githubRegistry = await fetchCatalogFromGitHub();
      if (githubRegistry && githubRegistry.mcps) {
        saveMcpRegistry(githubRegistry);
        console.log(`Registry updated automatically - ${githubRegistry.mcps.length} MCPs available`);
        track('registry_refreshed', { source: 'automatic', count: githubRegistry.mcps.length });
      }
    } catch (e) {
      // Silently fail - don't log errors for automatic updates to avoid noise
    }
  }, 30 * 60 * 1000); // 30 minutes

  const port = process.env.PORT ? Number(process.env.PORT) : 4823;
  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('MCP Kit running at', url);
    try {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      }
    } catch {}
  });
}

main();


