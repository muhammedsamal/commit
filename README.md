# Commit - AI-Powered Git Commit Message Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Commit is a command-line tool that leverages Claude AI to generate meaningful, conventional commit messages by analyzing your git diffs. It helps maintain consistent commit message formatting across your projects while saving time and ensuring clarity.

## Features

- Generate conventional commit messages using AI
- Auto-stage and commit changes with a single command
- Smart analysis of repository context and recent commit history
- Support for both staged and unstaged changes
- Multiple commit message suggestions in interactive mode
- Beautiful CLI interface with color-coded output
- Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- Detailed analysis of changes and their impact
- Seamless integration with your git workflow

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- Git initialized repository
- Anthropic API key (for Claude AI)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/muhammedsamal/commit.git
cd commit
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables:
```bash
# Create .env.local file
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env.local
```

4. Build and install globally:
```bash
bun run build
```

## Usage

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

### Interactive Mode

When using interactive mode (-i), you'll get:
- Multiple commit message suggestions
- Detailed analysis of changes
- Option to review changes
- Confirmation before committing

## How It Works

1. When you run the command, the tool:
   - Collects git diff information
   - Gathers repository context and recent commit history
   - Auto-stages changes if requested
   - Sends information to Claude AI
   - Generates multiple commit message options
   - Handles the commit process

2. The generated messages follow the Conventional Commits specification:
   - Format: `type(scope): subject`
   - Types: feat, fix, refactor, style, docs, test, chore, perf
   - Scope: derived from changed files and context
   - Subject: clear, concise description in imperative mood

## Project Structure

```
commit/
├── src/
│   ├── index.ts                # CLI entry point
│   └── lib/
│       ├── commit-generator.ts # Core logic
│       └── cli-utils.ts        # CLI utilities
├── .env.local                  # Environment variables
├── package.json                # Project configuration
└── tsconfig.json              # TypeScript configuration
```

## Configuration

Environment variables:
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

## Error Handling

The tool provides helpful error messages for common issues:
- Not a git repository
- No staged changes
- Git user not configured
- API key missing
- Network issues
- Invalid commands

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch: `git checkout -b feature/amazing-feature`
3. Commit your Changes: `git commit -am 'feat: add amazing feature'`
4. Push to the Branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Development

To start development:

```bash
# Install dependencies
bun install

# Run in development mode
bun run start

# Build the project
bun run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Anthropic's Claude](https://www.anthropic.com/claude) for AI capabilities
- [Conventional Commits](https://www.conventionalcommits.org/) for commit message specification
- [Commander.js](https://github.com/tj/commander.js/) for CLI framework

## Support

If you encounter any issues or have questions:
1. Check the error messages for helpful suggestions
2. Review the documentation above
3. File an issue on the GitHub repository
