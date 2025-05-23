# Commit - AI-Powered Git Commit Message Generator

Commit is a powerful command-line tool that leverages AI to generate meaningful, conventional commit messages by analyzing your git diffs. It supports multiple AI providers including local models (Ollama/Deepseek) and cloud APIs (Claude, Gemini), helping you maintain consistent commit message formatting while saving time and ensuring clarity.

## ✨ Features

- **Multiple AI Provider Support**: Ollama/Deepseek (local, default), Anthropic Claude, and Google Gemini
- **Interactive Mode**: Multiple commit message suggestions with detailed analysis
- **Auto-staging**: Automatically stage changes before committing (enabled by default)
- **Smart Analysis**: Repository context and recent commit history analysis
- **Beautiful CLI**: Color-coded output with intuitive interface
- **Conventional Commits**: Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- **Flexible Configuration**: Easy setup and model switching
- **Local-First**: Works offline with local AI models
- **Seamless Integration**: Drop-in replacement for `git commit`

## 🏗️ Prerequisites

### Required
- [Bun](https://bun.sh) runtime installed
- Git initialized repository

### AI Provider Setup (Choose one or more)

#### Option 1: Ollama/Deepseek (Local, Default)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Deepseek model (recommended)
ollama pull deepseek-r1:latest
# Or other models like:
# ollama pull codellama:7b-instruct
# ollama pull deepseek-coder:6.7b
```

#### Option 2: Anthropic Claude (Cloud)
- Get API key from [Anthropic Console](https://console.anthropic.com/)

#### Option 3: Google Gemini (Cloud)  
- Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## 📦 Installation

### Method 1: Clone and Build (Recommended)
```bash
git clone https://github.com/muhammedsamal/commit.git
cd commit
bun install
bun run build

# Add to PATH for global use
sudo ln -s $(pwd)/commit /usr/local/bin/commit
```

### Method 2: Direct Installation
```bash
# Using bun
bun install -g https://github.com/muhammedsamal/commit.git

# Or clone and install
git clone https://github.com/muhammedsamal/commit.git
cd commit && bun install && bun run build
```

## ⚙️ Configuration

### Quick Setup
```bash
# Run interactive configuration
commit config
```

### Manual Setup

Create `.env.local` file for API keys (if using cloud providers):
```bash
# For Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For Google Gemini  
GEMINI_API_KEY=your_google_api_key_here
```

### Configuration Options

The tool supports multiple configuration methods:

1. **Default**: Ollama/Deepseek running locally on `http://localhost:11434`
2. **Cloud APIs**: Claude or Gemini with API keys
3. **Custom Ollama**: Different host/port for Ollama instance

## 🚀 Usage

### Basic Commands

```bash
# Generate commit message (uses Deepseek locally by default)
commit

# Auto-stage all changes and commit (default behavior)
commit -a

# Use only staged changes
commit -s

# Use Anthropic Claude instead
commit --cloud

# Specify a different model
commit -m "deepseek-coder:6.7b"
```

### Command Options

```bash
Options:
  -a, --add             Auto-stage all changes before commit (default: true)
  -i, --interactive     Interactive mode with multiple suggestions (default: true)  
  -s, --staged          Use staged changes only (default: false)
  --cloud               Use Anthropic Claude instead of local Deepseek
  -m, --model <model>   Specify model to use (e.g., deepseek-coder:6.7b)
  -h, --help            Display help information
  -v, --version         Display version information

Commands:
  config                Configure AI model settings
```

### Interactive Mode (Default)

Interactive mode provides:
- **Multiple Options**: 3 different commit message suggestions
- **Detailed Analysis**: Breakdown of changes and their impact
- **Review Changes**: Option to review diff before committing
- **Confirmation**: Confirm before final commit
- **Cancellation**: Cancel with empty message or Ctrl+C
- **Clean Exit**: Proper cleanup after successful commit

## 🤖 AI Models

### Local Models (Ollama)
- **deepseek-r1:latest** (default) - Latest Deepseek reasoning model
- **deepseek-coder:6.7b** - Optimized for code analysis
- **codellama:7b-instruct** - Code-focused Llama model
- **Any Ollama model** - Specify with `-m` flag

### Cloud Models
- **Claude 3 Sonnet** - Anthropic's balanced model (use `--cloud`)
- **Gemini 2.0 Flash** - Google's fast model
- **Custom models** - Specify with `--model` flag

## 📋 How It Works

1. **Analysis Phase**:
   - Auto-stages changes (unless `-s` used)
   - Collects git diff information
   - Gathers repository context and recent commit history
   - Analyzes file changes and their scope

2. **Generation Phase**:
   - Sends context to selected AI model
   - Generates multiple conventional commit message options
   - Provides detailed analysis of changes

3. **Interactive Selection**:
   - Presents options with explanations
   - Allows review of changes
   - Confirms selection before committing

4. **Commit Phase**:
   - Executes git commit with selected message
   - Provides success confirmation
   - Exits cleanly

## 🛠️ Troubleshooting

### Common Issues

**"Not a git repository"**
```bash
git init  # Initialize git in your project
```

**"No changes to commit"**
```bash
# Make some changes first, or use:
git add .  # Stage changes manually
commit -s  # Use staged changes only
```

**"Ollama connection failed"**
```bash
# Check if Ollama is running
ollama serve

# Or specify different host
commit -m "your-model" --host http://localhost:11434
```

**"API key missing"**
```bash
# Set up environment variables in .env.local
echo "ANTHROPIC_API_KEY=your_key" > .env.local
# or
echo "GEMINI_API_KEY=your_key" > .env.local
```

**"Model not found"**
```bash
# List available Ollama models
ollama list

# Pull a model
ollama pull deepseek-r1:latest
```

### Environment Setup Issues

**Git user not configured**
```bash
git config --global user.email "you@example.com"
git config --global user.name "Your Name"
```

**Permission issues**
```bash
# Make sure the binary is executable
chmod +x ./commit

# For global installation
sudo ln -sf $(pwd)/commit /usr/local/bin/commit
```

## 🔄 Development

To contribute or modify the tool:

```bash
# Clone and setup
git clone https://github.com/muhammedsamal/commit.git
cd commit
bun install

# Run in development mode
bun run start

# Build the project
bun run build

# Test locally
./commit --help
```

### Project Structure
```
commit/
├── src/
│   ├── index.ts           # Main CLI entry point
│   ├── cli.ts             # CLI utilities
│   └── lib/
│       ├── commit-generator.ts  # Core commit generation logic
│       └── cli-utils.ts         # Helper utilities
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the Project**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'feat: add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Contribution Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- Add tests for new features
- Update documentation as needed
- Ensure all existing tests pass

## 📝 Examples

### Real-world Usage Examples

```bash
# Working on a new feature
git add src/new-feature.ts
commit -s  # Use staged changes only

# Quick fix with auto-staging
echo "console.log('debug');" >> src/utils.ts
commit  # Auto-stages and commits

# Using different AI models
commit --cloud  # Use Claude
commit -m "gemini-2.0-flash"  # Use specific Gemini model
commit -m "codellama:13b"  # Use local CodeLlama model
```

### Sample Generated Messages

The tool generates conventional commit messages like:

```
feat(auth): implement OAuth2 authentication flow
fix(api): resolve rate limiting issue in user endpoint  
docs(readme): update installation instructions
refactor(utils): simplify error handling logic
test(auth): add unit tests for login validation
```

## 🎯 Best Practices

### Getting Better Results

1. **Stage Related Changes**: Group related changes for better context
2. **Clear Diffs**: Avoid mixing unrelated changes in one commit
3. **Descriptive Filenames**: Use clear, descriptive file and function names
4. **Small Commits**: Make focused, atomic commits
5. **Review Before Commit**: Use interactive mode to review suggestions

### Model Selection Tips

- **Deepseek-R1**: Best for complex reasoning and analysis
- **Deepseek-Coder**: Optimized for code-specific commits
- **Claude**: Excellent for nuanced understanding
- **Gemini**: Fast and efficient for most use cases

## 📊 Performance

### Speed Comparison

| Model | Avg Response Time | Quality | Offline |
|-------|------------------|---------|---------|
| Deepseek (Local) | 2-5s | ⭐⭐⭐⭐⭐ | ✅ |
| Claude (Cloud) | 1-3s | ⭐⭐⭐⭐⭐ | ❌ |
| Gemini (Cloud) | 1-2s | ⭐⭐⭐⭐ | ❌ |

*Times vary based on hardware and network conditions*

## 🛡️ Privacy & Security

- **Local Models**: Your code never leaves your machine
- **Cloud APIs**: Only git diff sent to AI providers (no full source code)
- **API Keys**: Stored locally in `.env.local` (never committed)
- **No Telemetry**: Tool doesn't collect or send usage data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic's Claude](https://www.anthropic.com/claude) for AI capabilities
- [Google's Gemini](https://ai.google.dev/) for AI capabilities  
- [Ollama](https://ollama.ai/) for local AI model hosting
- [Deepseek](https://deepseek.com/) for excellent coding models
- [Conventional Commits](https://www.conventionalcommits.org/) for commit message specification
- [Commander.js](https://github.com/tj/commander.js/) for CLI framework
- [Bun](https://bun.sh/) for fast JavaScript runtime

## 📞 Support

If you encounter any issues or have questions:

1. **Check Error Messages**: The tool provides helpful suggestions
2. **Review Documentation**: Check the sections above
3. **Search Issues**: Look for similar issues on GitHub
4. **Create Issue**: File a detailed issue with:
   - Your operating system
   - Bun version (`bun --version`)
   - Command you ran
   - Full error message
   - Steps to reproduce

## 🚀 What's Next?

### Planned Features

- [ ] Configuration file support
- [ ] Custom prompt templates
- [ ] Commit message history
- [ ] Integration with Git hooks
- [ ] VS Code extension
- [ ] Multi-language support
- [ ] Commit analytics

### Roadmap

- **v1.1**: Custom templates and Git hooks
- **v1.2**: VS Code integration
- **v1.3**: Advanced analytics and insights

---

⭐ **Star this project** if you find it helpful!

**Made with ❤️ by [Muhammed Samal](https://github.com/muhammedsamal)**