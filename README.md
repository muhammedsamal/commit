# Commit - AI-Powered Git Commit Message Generator

Commit is a command-line tool that leverages Claude AI to generate meaningful, conventional commit messages by analyzing your git diffs. It helps maintain consistent commit message formatting across your projects while saving time and ensuring clarity.

## Features

- Generate conventional commit messages from git diffs
- Smart analysis of repository context and recent commit history
- Support for staged and unstaged changes
- Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- Interactive mode for commit message review (coming soon)
- Seamless integration with your git workflow

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- Git initialized repository
- Anthropic API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/commit.git
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

Basic usage:
```bash
commit
```

Available options:
```bash
Options:
  -s, --staged      Use staged changes only (default: true)
  -i, --interactive Interactive mode (default: false)
  -h, --help        Display help information
  -v, --version     Display version information
```

Examples:
```bash
# Generate commit message for staged changes
commit

# Generate commit message for all changes (staged and unstaged)
commit --staged false

# Use interactive mode (coming soon)
commit --interactive
```

## How It Works

1. When you run `clip commit`, the tool:
   - Collects git diff information from your repository
   - Gathers repository context and recent commit history
   - Sends this information to Claude AI with a carefully crafted prompt
   - Processes the AI response to generate a conventional commit message
   - Returns a formatted commit message following the convention: `type(scope): subject`

2. The generated messages follow the Conventional Commits specification:
   - Types: feat, fix, refactor, style, docs, test, chore, perf
   - Scope: derived from the changed files and context
   - Subject: clear, concise description in imperative mood

## Development

To contribute or modify:

1. Fork the repository
2. Create your feature branch:
```bash
git checkout -b feature/amazing-feature
```

3. Run the development server:
```bash
bun run start
```

4. Commit your changes:
```bash
git commit -am 'feat: add amazing feature'
```

5. Push to the branch:
```bash
git push origin feature/amazing-feature
```

6. Open a Pull Request

## Configuration

Environment variables:
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

## Project Structure

```
commit/
├── src/
│   ├── index.ts           # CLI entry point
│   └── lib/
│       └── commit-generator.ts  # Core logic
├── .env.local             # Environment variables
├── package.json           # Project configuration
└── tsconfig.json          # TypeScript configuration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Anthropic's Claude](https://www.anthropic.com/claude) for AI capabilities
- [Conventional Commits](https://www.conventionalcommits.org/) for commit message specification
- [Commander.js](https://github.com/tj/commander.js/) for CLI framework

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
