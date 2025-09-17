import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Settings, Boxes, ExternalLink, CheckCircle, Image as ImageIcon, X, AlertCircle, Info, Trash2 } from 'lucide-react'

type Agent = { id: string; name: string; mcpConfigPath?: string | null }
type Catalog = Record<string, { id: string; name: string; description: string }[]>

// Custom hook for image loading with automatic retry logic
const useImageLoad = (src: string, imagePool: string[] = []) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setLoaded(true)
      setError(false)
    }
    img.onerror = () => {
      setError(true)
      setLoaded(false)
      
      // Automatically try the next image if available
      if (imagePool.length > 1 && retryCount < imagePool.length - 1) {
        const nextIndex = (imagePool.indexOf(currentSrc) + 1) % imagePool.length
        setCurrentSrc(imagePool[nextIndex])
        setRetryCount(prev => prev + 1)
        setError(false)
      }
    }
    img.src = currentSrc
  }, [currentSrc, imagePool, retryCount])

  const retryWithNewImage = (newImagePool: string[]) => {
    if (newImagePool.length > 1) {
      const nextIndex = (newImagePool.indexOf(currentSrc) + 1) % newImagePool.length
      setCurrentSrc(newImagePool[nextIndex])
      setError(false)
      setLoaded(false)
      setRetryCount(prev => prev + 1)
    }
  }

  return { loaded, error, currentSrc, retryWithNewImage }
}

// Banner image component with loading state and automatic retry logic
const BannerImage = ({ src, alt, className, imagePool }: { 
  src: string; 
  alt: string; 
  className?: string;
  imagePool?: string[];
}) => {
  const { loaded, error, currentSrc, retryWithNewImage } = useImageLoad(src, imagePool || [])

  const handleRetry = () => {
    if (imagePool && imagePool.length > 1) {
      retryWithNewImage(imagePool)
    }
  }

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center`}>
        <div className="text-center text-slate-400">
          <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-2">No images available</p>
          {imagePool && imagePool.length > 1 && (
            <button 
              onClick={handleRetry}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className={`${className} bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center`}>
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto mb-2"></div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return <img src={currentSrc} alt={alt} className={className} />
}

// OAuth authentication popup component
const OAuthAuthPopup = ({ 
  isOpen, 
  onClose, 
  mcp, 
  agent, 
  onAuthComplete 
}: { 
  isOpen: boolean
  onClose: () => void
  mcp: any
  agent: Agent
  onAuthComplete: (authData: any) => void
}) => {
  const [authStep, setAuthStep] = useState<'instructions' | 'oauth' | 'complete'>('instructions')
  const [authData, setAuthData] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      setAuthStep('instructions')
      setAuthData(null)
    }
  }, [isOpen])

  const handleStartOAuth = () => {
    if (!mcp.oauth_flow) return
    
    const { auth_url, scopes, client_id_env } = mcp.oauth_flow
    const clientId = process.env[client_id_env] || 'your-client-id'
    const redirectUri = `${window.location.origin}/oauth/callback`
    const scopeString = scopes.join(' ')
    
    const oauthUrl = `${auth_url}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeString)}&response_type=code&state=${mcp.id}`
    
    // Open OAuth flow in new window
    const oauthWindow = window.open(oauthUrl, 'oauth', 'width=600,height=700')
    
    // Listen for OAuth completion (this would need to be implemented with a callback endpoint)
    const checkClosed = setInterval(() => {
      if (oauthWindow?.closed) {
        clearInterval(checkClosed)
        // In a real implementation, you'd poll for the auth result
        setAuthStep('complete')
      }
    }, 1000)
  }

  if (!isOpen || !mcp) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Authenticate {mcp.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Install to {agent.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {authStep === 'instructions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg p-3">
                <Info size={16} />
                <span className="text-sm font-medium">OAuth Authentication Required</span>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Setup Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                  {mcp.setup_instructions.map((instruction: string, index: number) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-200 mb-2">Required Environment Variables:</h4>
                <div className="space-y-2">
                  {Object.entries(mcp.env).map(([key, config]: [string, any]) => (
                    <div key={key} className="text-xs">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-300 ml-2">{config.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStartOAuth}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Start OAuth Flow
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {authStep === 'oauth' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-slate-300">Completing OAuth authentication...</p>
            </div>
          )}

          {authStep === 'complete' && (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-400 mx-auto" />
              <h3 className="text-lg font-medium text-white">Authentication Complete!</h3>
              <p className="text-slate-300">You can now install this MCP.</p>
              <button
                onClick={() => onAuthComplete(authData)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Install MCP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Notification popup component
const NotificationPopup = ({ 
  isOpen, 
  onClose, 
  type, 
  title, 
  message 
}: { 
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} className="text-green-400 mx-auto" />
      case 'error':
        return <AlertCircle size={48} className="text-red-400 mx-auto" />
      case 'warning':
        return <AlertCircle size={48} className="text-yellow-400 mx-auto" />
      case 'info':
        return <Info size={48} className="text-blue-400 mx-auto" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700'
      case 'error':
        return 'bg-red-600 hover:bg-red-700'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="text-center space-y-4">
            {getIcon()}
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <p className="text-slate-300">{message}</p>
            <button
              onClick={onClose}
              className={`w-full ${getBgColor()} text-white px-4 py-2 rounded-md font-medium transition-colors`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Installation success popup component
const InstallSuccessPopup = ({ 
  isOpen, 
  onClose, 
  mcp, 
  agent, 
  mcpConfigPath 
}: { 
  isOpen: boolean
  onClose: () => void
  mcp: any
  agent: Agent
  mcpConfigPath: string
}) => {
  const handleRefresh = () => {
    window.location.reload()
  }

  if (!isOpen || !mcp) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-400 mx-auto" />
            <h3 className="text-lg font-medium text-white">Installation Successful!</h3>
            <p className="text-slate-300">
              {mcp.name} has been successfully installed to {agent.name}.
            </p>
            <div className="bg-slate-800 rounded-lg p-3 text-left">
              <p className="text-xs text-slate-400 mb-1">Configuration file:</p>
              <p className="text-sm text-slate-200 font-mono break-all">{mcpConfigPath}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Environment variable configuration popup
const EnvConfigPopup = ({ 
  isOpen, 
  onClose, 
  mcp, 
  agent, 
  onInstall, 
  existingConfig 
}: { 
  isOpen: boolean
  onClose: () => void
  mcp: any
  agent: Agent
  onInstall: (envVars: Record<string, string>) => void
  existingConfig?: any
}) => {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && mcp?.env) {
      const initialVars: Record<string, string> = {}
      Object.keys(mcp.env).forEach(key => {
        initialVars[key] = existingConfig?.env?.[key] || ''
      })
      setEnvVars(initialVars)
      setErrors({})
    }
  }, [isOpen, mcp, existingConfig])

  const handleInputChange = (key: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }))
    }
  }

  const handleSubmit = async () => {
    if (!mcp?.env) {
      onInstall({})
      return
    }

    const newErrors: Record<string, string> = {}
    Object.entries(mcp.env).forEach(([key, config]: [string, any]) => {
      if (config.required && (!envVars[key] || envVars[key].trim() === '')) {
        newErrors[key] = 'This field is required'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onInstall(envVars)
  }

  if (!isOpen || !mcp) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {existingConfig ? 'Configure' : 'Install'} {mcp.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {existingConfig ? 'Update configuration for' : 'Install to'} {agent.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {mcp.env && Object.keys(mcp.env).length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">Environment Variables Required</span>
              </div>
              
              {Object.entries(mcp.env).map(([key, config]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">
                    {key}
                    {config.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="password"
                    value={envVars[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={config.placeholder || `Enter ${key}`}
                    className={`w-full px-3 py-2 rounded-md bg-slate-800 border ${
                      errors[key] ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {config.description && (
                    <p className="text-xs text-slate-400">{config.description}</p>
                  )}
                  {config.help && (
                    <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded p-2">
                      <Info size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{config.help}</span>
                    </div>
                  )}
                  {errors[key] && (
                    <p className="text-xs text-red-400">{errors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-3">
              <CheckCircle size={16} />
              <span className="text-sm">No environment variables required for this MCP</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {existingConfig ? 'Update Configuration' : 'Install MCP'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// MCP Clients catalog
const mcpClients = [
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-powered code editor with MCP support',
    website: 'https://cursor.sh',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'AI coding assistant by Codeium',
    website: 'https://windsurf.ai',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'continue',
    name: 'Continue',
    description: 'Open-source AI coding assistant',
    website: 'https://continue.dev',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'cline',
    name: 'Cline',
    description: 'AI-powered coding assistant for VS Code',
    website: 'https://cline.ghost.io',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    website: 'https://aider.chat',
    installed: false,
    category: 'Terminal Tools'
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    description: 'Anthropic\'s Claude AI assistant with MCP support',
    website: 'https://claude.ai',
    installed: false,
    category: 'AI Assistants'
  },
  {
    id: 'neovim',
    name: 'Neovim',
    description: 'Modern Vim with MCP support',
    website: 'https://neovim.io',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'emacs',
    name: 'Emacs',
    description: 'Extensible text editor with MCP integration',
    website: 'https://www.gnu.org/software/emacs',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'jetbrains',
    name: 'JetBrains IDEs',
    description: 'IntelliJ IDEA, PyCharm, WebStorm with MCP',
    website: 'https://www.jetbrains.com',
    installed: false,
    category: 'Code Editors'
  },
  {
    id: 'openai-chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI\'s ChatGPT with MCP integration',
    website: 'https://chat.openai.com',
    installed: false,
    category: 'AI Assistants'
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'AI-powered search and research assistant',
    website: 'https://perplexity.ai',
    installed: false,
    category: 'AI Assistants'
  },
  {
    id: 'notion-ai',
    name: 'Notion AI',
    description: 'AI-powered workspace and productivity tool',
    website: 'https://notion.so',
    installed: false,
    category: 'Productivity'
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Knowledge management with AI plugins',
    website: 'https://obsidian.md',
    installed: false,
    category: 'Productivity'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication with AI integrations',
    website: 'https://slack.com',
    installed: false,
    category: 'Communication'
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Community platform with bot integrations',
    website: 'https://discord.com',
    installed: false,
    category: 'Communication'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automation platform connecting apps and services',
    website: 'https://zapier.com',
    installed: false,
    category: 'Automation'
  }
]

// Unsplash banner images with fallbacks
const getBannerImagePool = (theme: 'discovery' | 'robots') => {
  const discoveryImages = [
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=300&fit=crop&crop=center'
  ]
  const robotImages = [
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=300&fit=crop&crop=center'
  ]
  
  return theme === 'discovery' ? discoveryImages : robotImages
}

const getBannerImage = (theme: 'discovery' | 'robots') => {
  const images = getBannerImagePool(theme)
  return images[Math.floor(Math.random() * images.length)]
}

// News ticker component
const NewsTicker = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news')
        const data = await response.json()
        
        if (data.error) {
          // Handle API key not configured or other errors
          console.warn('News API error:', data.error)
          setNews([]) // Show empty ticker instead of error
        } else {
          setNews(data.articles || [])
        }
      } catch (error) {
        console.error('Failed to fetch news:', error)
        setNews([]) // Show empty ticker on network error
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="news-ticker">
        <div className="news-ticker-content">
          <span>Loading tech news...</span>
        </div>
      </div>
    )
  }

  // Don't show ticker if no news available (API key not configured)
  if (!news || news.length === 0) {
    return null
  }

  return (
    <div className="news-ticker">
      <div className="news-ticker-content">
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item"
          >
            {article.title}
          </a>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [catalog, setCatalog] = useState<Catalog>({})
  const [q, setQ] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('cursor')
  const [manualPath, setManualPath] = useState('')
  const [activeTab, setActiveTab] = useState<'catalog' | 'agents'>('catalog')
  
  // Environment configuration popup state
  const [envPopupOpen, setEnvPopupOpen] = useState(false)
  const [selectedMcp, setSelectedMcp] = useState<any>(null)
  const [selectedAgentForInstall, setSelectedAgentForInstall] = useState<Agent | null>(null)
  const [existingConfig, setExistingConfig] = useState<any>(null)
  const [installationStatus, setInstallationStatus] = useState<Record<string, boolean>>({})
  
  // OAuth authentication popup state
  const [oauthPopupOpen, setOauthPopupOpen] = useState(false)
  
  // Installation success popup state
  const [successPopupOpen, setSuccessPopupOpen] = useState(false)
  const [successData, setSuccessData] = useState<{
    mcp: any
    agent: Agent
    mcpConfigPath: string
  } | null>(null)
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  
  // Notification popup state
  const [notification, setNotification] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'info' | 'warning'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/catalog').then(r => r.json()),
    ]).then(([a, c]) => {
      setAgents(a.agents || [])
      setCatalog(c.catalog || {})
      if ((a.agents||[]).length) setSelectedAgent(a.agents[0].id)
      
      // Update installed status for MCP clients
      const installedIds = (a.agents || []).map(agent => agent.id)
      mcpClients.forEach(client => {
        client.installed = installedIds.includes(client.id)
      })
    })
  }, [])

  // Check installation status when agent or catalog changes
  useEffect(() => {
    if (selectedAgent && Object.keys(catalog).length > 0) {
      checkInstallationStatus()
    }
  }, [selectedAgent, catalog])

  const filtered = useMemo(() => {
    if (!q) return catalog
    const out: Catalog = {}
    Object.entries(catalog).forEach(([cat, items]) => {
      const f = items.filter(i => (i.name + ' ' + i.description).toLowerCase().includes(q.toLowerCase()))
      if (f.length) out[cat] = f
    })
    return out
  }, [catalog, q])

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  async function handleInstallClick(mcpId: string) {
    if (!selectedAgent) {
      showNotification('warning', 'No Agent Selected', 'Please select an agent before installing MCPs.')
      return
    }
    
    const agent = agents.find(a => a.id === selectedAgent)
    if (!agent) {
      showNotification('error', 'Agent Not Found', 'The selected agent could not be found.')
      return
    }
    
    // Find the MCP in the catalog
    const allMcps = Object.values(catalog).flat()
    const mcp = allMcps.find(m => m.id === mcpId)
    if (!mcp) {
      showNotification('error', 'MCP Not Found', 'The selected MCP could not be found in the catalog.')
      return
    }
    
    // Check if MCP is already installed
    try {
      const configRes = await fetch(`/api/mcp-config/${agent.id}/${mcpId}`)
      const configData = await configRes.json()
      
      setSelectedMcp(mcp)
      setSelectedAgentForInstall(agent)
      setExistingConfig(configData.config)
      
      // Determine which popup to show based on auth type
      if (mcp.auth_type === 'oauth') {
        setOauthPopupOpen(true)
      } else {
        setEnvPopupOpen(true)
      }
    } catch (e) {
      console.error('Failed to check existing config:', e)
      setSelectedMcp(mcp)
      setSelectedAgentForInstall(agent)
      setExistingConfig(null)
      
      // Determine which popup to show based on auth type
      if (mcp.auth_type === 'oauth') {
        setOauthPopupOpen(true)
      } else {
        setEnvPopupOpen(true)
      }
    }
  }

  async function handleInstall(envVars: Record<string, string>) {
    if (!selectedMcp || !selectedAgentForInstall) return
    
    try {
      const res = await fetch('/api/install', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          agentId: selectedAgentForInstall.id, 
          mcpId: selectedMcp.id,
          envVars 
        }) 
      })
      const data = await res.json()
      
      if (!res.ok) {
        if (data.missing) {
          // Show validation errors in popup
          return
        }
        showNotification('error', 'Installation Failed', `Install failed: ${data.error || res.status}`)
        return
      }
      
      // Show success popup instead of alert
      setSuccessData({
        mcp: selectedMcp,
        agent: selectedAgentForInstall,
        mcpConfigPath: data.mcpConfigPath
      })
      setSuccessPopupOpen(true)
      setEnvPopupOpen(false)
      
    } catch (e) {
      showNotification('error', 'Installation Failed', `Install failed: ${e.message}`)
    }
  }

  async function checkInstallationStatus() {
    if (!selectedAgent) return
    
    const allMcps = Object.values(catalog).flat()
    console.log('Checking installation status for:', allMcps.length, 'MCPs')
    
    const statusPromises = allMcps.map(async (mcp) => {
      try {
        const res = await fetch(`/api/mcp-status/${selectedAgent}/${mcp.id}`)
        const data = await res.json()
        console.log(`Status for ${mcp.id}:`, data)
        return { mcpId: mcp.id, installed: data.installed }
      } catch (e) {
        console.error(`Error checking status for ${mcp.id}:`, e)
        return { mcpId: mcp.id, installed: false }
      }
    })
    
    const results = await Promise.all(statusPromises)
    const statusMap: Record<string, boolean> = {}
    results.forEach(result => {
      statusMap[result.mcpId] = result.installed
    })
    console.log('Installation status map:', statusMap)
    setInstallationStatus(statusMap)
  }

  async function handleUninstall(mcpId: string) {
    if (!selectedAgent) {
      showNotification('warning', 'No Agent Selected', 'Please select an agent before uninstalling MCPs.')
      return
    }
    
    if (!confirm('Are you sure you want to uninstall this MCP?')) return
    
    try {
      const res = await fetch('/api/uninstall', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          agentId: selectedAgent, 
          mcpId 
        }) 
      })
      const data = await res.json()
      
      if (!res.ok) {
        showNotification('error', 'Uninstall Failed', `Uninstall failed: ${data.error || res.status}`)
        return
      }
      
      showNotification('success', 'Uninstall Successful', 'MCP has been uninstalled successfully!')
      checkInstallationStatus() // Refresh status
    } catch (e) {
      showNotification('error', 'Uninstall Failed', `Uninstall failed: ${e.message}`)
    }
  }

  async function addCustomAgent() {
    if (!manualPath) {
      showNotification('warning', 'Path Required', 'Please enter a path for the custom agent.')
      return
    }
    
    try {
      const res = await fetch('/api/add-agent', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          name: `Custom Agent ${agents.length + 1}`,
          mcpConfigPath: manualPath 
        }) 
      })
      const data = await res.json()
      
      if (!res.ok) {
        showNotification('error', 'Failed to Add Agent', `Failed: ${data.error || res.status}`)
        return
      }
      
      // Refresh agents
      const agentsRes = await fetch('/api/agents')
      const agentsData = await agentsRes.json()
      setAgents(agentsData.agents || [])
      setManualPath('')
      showNotification('success', 'Agent Added', 'Custom agent added successfully!')
    } catch (e) {
      showNotification('error', 'Failed to Add Agent', `Failed: ${e.message}`)
    }
  }

  async function handleRefreshRegistry() {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/refresh-registry', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      
      if (!res.ok) {
        console.warn('Registry refresh failed:', data.error || res.status)
        return
      }
      
      // Refresh the catalog to show updated data
      const catalogRes = await fetch('/api/catalog')
      const catalogData = await catalogRes.json()
      setCatalog(catalogData.catalog || {})
      
      // Show brief success indicator
      setTimeout(() => setIsRefreshing(false), 1000)
    } catch (e) {
      console.warn('Registry refresh failed:', e.message)
      setIsRefreshing(false)
    }
  }

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setIsPulling(true)
      setPullDistance(0)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return
    
    const touch = e.touches[0]
    const pullDistance = Math.max(0, touch.clientY - (e.currentTarget as any).getBoundingClientRect().top)
    
    if (pullDistance > 0) {
      e.preventDefault()
      setPullDistance(Math.min(pullDistance, 100))
    }
  }

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) {
      handleRefreshRegistry()
    }
    setIsPulling(false)
    setPullDistance(0)
  }

  async function handleOAuthComplete(authData: any) {
    if (!selectedMcp || !selectedAgentForInstall) return
    
    try {
      const res = await fetch('/api/install', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          agentId: selectedAgentForInstall.id, 
          mcpId: selectedMcp.id,
          envVars: authData || {}
        }) 
      })
      const data = await res.json()
      
      if (!res.ok) {
        showNotification('error', 'Installation Failed', `Install failed: ${data.error || res.status}`)
        return
      }
      
      showNotification('success', 'Installation Successful', `MCP installed successfully! Edited: ${data.mcpConfigPath}`)
      setOauthPopupOpen(false)
      
      // Refresh agents to show updated state
      const agentsRes = await fetch('/api/agents')
      const agentsData = await agentsRes.json()
      setAgents(agentsData.agents || [])
      checkInstallationStatus()
    } catch (e) {
      showNotification('error', 'Installation Failed', `Install failed: ${e.message}`)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-slate-950 text-slate-100">
      <aside className="border-r border-slate-800 p-4">
        <div className="text-xl font-semibold mb-2">MCP Kit</div>
        <div className="text-sm text-slate-400 mb-6">Your local MCP Console</div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('catalog')} 
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
              activeTab === 'catalog' ? 'bg-indigo-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Boxes size={16}/> Catalog
          </button>
          <button 
            onClick={() => setActiveTab('agents')} 
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
              activeTab === 'agents' ? 'bg-indigo-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings size={16}/> Agents
          </button>
        </nav>

        {activeTab === 'catalog' && (
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Detected Agents</div>
            <div className="space-y-2">
              {agents.length ? agents.map(a => (
                <button key={a.id} onClick={() => setSelectedAgent(a.id)} className={`w-full text-left px-3 py-2 rounded-md border ${selectedAgent===a.id?'border-indigo-400 bg-indigo-950/40':'border-slate-800 bg-slate-900'}`}>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-slate-400 break-all">{a.mcpConfigPath || 'mcp.json not found (set manually)'}</div>
                </button>
              )) : (
                <div className="text-xs text-slate-400">No compatible agents detected.</div>
              )}
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-2">Add Custom Agent</div>
              <input value={manualPath} onChange={e=>setManualPath(e.target.value)} placeholder="C:\\Users\\you\\.cursor\\mcp.json" className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-800 text-sm" />
              <button onClick={addCustomAgent} className="mt-2 w-full px-3 py-2 rounded-md bg-indigo-500 text-slate-950 text-sm">Add Agent</button>
            </div>
          </div>
        )}
      </aside>
      
      <main 
        className="p-6 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div 
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
            isPulling || isRefreshing ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
            height: `${Math.max(60, pullDistance)}px`
          }}
        >
          <div className="bg-slate-900 border-b border-slate-700 h-full flex items-center justify-center">
            {isRefreshing ? (
              <div className="flex items-center gap-2 text-indigo-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400"></div>
                <span className="text-sm">Refreshing registry...</span>
              </div>
            ) : pullDistance > 60 ? (
              <div className="flex items-center gap-2 text-green-400">
                <Download size={16} />
                <span className="text-sm">Release to refresh</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <Download size={16} />
                <span className="text-sm">Pull to refresh</span>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'catalog' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search MCPs..." className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-900 border border-slate-800" />
              </div>
            </div>
            
            <NewsTicker />
            
            <div className="relative mb-6 rounded-xl overflow-hidden">
              <BannerImage 
                src={getBannerImage('discovery')} 
                alt="Discovery" 
                className="w-full h-48 object-cover"
                imagePool={getBannerImagePool('discovery')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-2xl font-bold text-white mb-1">Discover MCPs</h1>
                <p className="text-slate-200">Explore and install powerful Model Context Protocol servers</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(filtered).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <div className="text-sm text-slate-300">{cat}</div>
                  {items.map(i => (
                    <div key={i.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-2">
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-sm text-slate-400">{i.description}</div>
                      <div className="flex gap-2 mt-2">
                        {installationStatus[i.id] ? (
                          <>
                            <button 
                              onClick={() => handleInstallClick(i.id)} 
                              className="inline-flex items-center gap-2 rounded-md bg-blue-500 text-white px-3 py-1.5 text-sm"
                            >
                              <Settings size={16}/> Configure
                            </button>
                            <button 
                              onClick={() => handleUninstall(i.id)} 
                              className="inline-flex items-center gap-2 rounded-md bg-red-500 text-white px-3 py-1.5 text-sm"
                            >
                              <Trash2 size={16}/> Uninstall
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleInstallClick(i.id)} 
                            className="inline-flex items-center gap-2 rounded-md bg-indigo-500 text-slate-950 px-3 py-1.5 text-sm"
                          >
                            <Download size={16}/> Install
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'agents' && (
          <div>
            <div className="relative mb-6 rounded-xl overflow-hidden">
              <BannerImage 
                src={getBannerImage('robots')} 
                alt="Robots" 
                className="w-full h-48 object-cover"
                imagePool={getBannerImagePool('robots')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-2xl font-bold text-white mb-1">MCP Clients</h1>
                <p className="text-slate-200">AI agents and applications that support Model Context Protocol</p>
              </div>
            </div>
            
            {Object.entries(
              mcpClients.reduce((acc, client) => {
                acc[client.category] = acc[client.category] || []
                acc[client.category].push(client)
                return acc
              }, {} as Record<string, typeof mcpClients>)
            ).map(([category, clients]) => (
              <div key={category} className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">{category}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {clients.map(client => (
                    <div key={client.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold">{client.name}</div>
                        {client.installed && (
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle size={14} />
                            Installed
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">{client.description}</div>
                      <div className="flex gap-2 mt-auto">
                        <a 
                          href={client.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink size={14} />
                          Website
                        </a>
                        {client.installed && (
                          <button className="px-3 py-1.5 rounded-md bg-indigo-500 text-slate-950 text-sm">
                            Configure
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Environment Configuration Popup */}
      <EnvConfigPopup
        isOpen={envPopupOpen}
        onClose={() => setEnvPopupOpen(false)}
        mcp={selectedMcp}
        agent={selectedAgentForInstall}
        onInstall={handleInstall}
        existingConfig={existingConfig}
      />
      
      {/* OAuth Authentication Popup */}
      <OAuthAuthPopup
        isOpen={oauthPopupOpen}
        onClose={() => setOauthPopupOpen(false)}
        mcp={selectedMcp}
        agent={selectedAgentForInstall}
        onAuthComplete={handleOAuthComplete}
      />
      
      {/* Installation Success Popup */}
      {successData && (
        <InstallSuccessPopup
          isOpen={successPopupOpen}
          onClose={() => {
            setSuccessPopupOpen(false)
            setSuccessData(null)
          }}
          mcp={successData.mcp}
          agent={successData.agent}
          mcpConfigPath={successData.mcpConfigPath}
        />
      )}
      
      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  )
}



