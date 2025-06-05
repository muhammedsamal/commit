# Commit - AI-Powered Git Commit Message Generator

Commit is a command-line tool that leverages AI to generate meaningful, conventional commit messages by analyzing your git diffs. It helps maintain consistent commit message formatting across your projects while saving time and ensuring clarity.

## ✨ Features

- Generate conventional commit messages using AI (OpenAI, Anthropic, Google, Groq)
- Auto-stage and commit changes with a single command
- Smart analysis of repository context and recent commit history
- Support for both staged and unstaged changes
- Multiple commit message suggestions in interactive mode
- Beautiful CLI interface with color-coded output
- Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- Detailed analysis of changes and their impact
- Seamless integration with your git workflow

## 🚀 Installation

### Prerequisites
- [Bun](https://bun.sh) runtime installed
- Git repository initialized
- API key for your chosen AI provider

### Install globally using Bun:

```bash
bun install -g commit
```

That's it! The `commit` command is now available globally in your terminal.

## 🎯 First Run Setup

The first time you run `commit`, it will guide you through a quick setup:

1. Choose your AI provider (Google Gemini, OpenAI, Anthropic, or Groq)
2. Enter your API key (or configure environment variable)
3. Select your preferred model

That's it! The tool will remember your preferences.

## 🛠️ Usage

### Basic Commands

```bash
# Generate commit message for staged changes
commit

# Auto-stage and commit all changes
commit -a

# Interactive mode with multiple suggestions
commit -i

# Interactive mode with auto-staging
commit -a -i
```

### Command Options

```bash
Options:
  -a, --add         Auto-stage all changes before commit
  -i, --interactive Use interactive mode with multiple suggestions
  -s, --staged      Use staged changes only (default: false)
  -h, --help        Display help information
  -v, --version     Display version information
```

### Configuration

```bash
# Reconfigure AI provider and model
commit config
```

## 🤖 Supported AI Providers

- **Groq** - Fast inference, free tier available (Default)
- **Google Gemini** - Free tier available
- **OpenAI GPT** - Paid service
- **Anthropic Claude** - Paid service

## 🔧 Environment Variables

The recommended way is to set API keys in your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
# Add to your ~/.zshrc or ~/.bashrc
export GROQ_API_KEY="your_groq_api_key_here"
export OPENAI_API_KEY="your_openai_api_key_here"
export ANTHROPIC_API_KEY="your_anthropic_api_key_here"
export GOOGLE_GENERATIVE_AI_API_KEY="your_google_api_key_here"

# Then reload your shell
source ~/.zshrc  # or source ~/.bashrc
```

Available environment variables:
- `GROQ_API_KEY` - For Groq (Default provider)
- `OPENAI_API_KEY` - For OpenAI
- `ANTHROPIC_API_KEY` - For Anthropic
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Google Gemini

If environment variables are set, the tool will use them automatically without needing to store API keys in the config.

## 📝 How It Works

1. Analyzes your git diff and repository context
2. Sends information to your chosen AI provider
3. Generates conventional commit messages following best practices
4. Provides multiple options in interactive mode
5. Commits your changes with the selected message

Generated messages follow the Conventional Commits specification:
- Format: `type(scope): subject`
- Types: feat, fix, refactor, style, docs, test, chore, perf, ci, build
- Scope: derived from changed files and context
- Subject: clear, concise description in imperative mood

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/muhammedsamal/commit.git
cd commit

# Install dependencies
bun install

# Run in development mode
bun run start

# Build the project
bun run build
```

## 🔧 Troubleshooting

### Common Issues

**"No API key found" error:**
```bash
# Set the environment variable in your shell profile
echo 'export GROQ_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

**"Not a git repository" error:**
```bash
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

**"Command not found" after global install:**
```bash
# Ensure Bun's global bin directory is in your PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [AI SDK](https://sdk.vercel.ai/) for unified AI provider integration
- [Conventional Commits](https://www.conventionalcommits.org/) for commit message specification
- [Commander.js](https://github.com/tj/commander.js/) for CLI framework

## 🤔 Support

If you encounter any issues or have questions:
1. Check the error messages for helpful suggestions
2. Review the documentation above
3. File an issue on the GitHub repository
