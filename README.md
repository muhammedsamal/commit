# Commit - AI-Powered Git Commit Message Generator

Commit is a command-line tool that leverages AI (Claude and Gemini) to generate meaningful, conventional commit messages by analyzing your git diffs. It helps maintain consistent commit message formatting across your projects while saving time and ensuring clarity.

## Features

- Generate conventional commit messages using AI (Claude or Gemini)
- Interactive mode enabled by default with multiple commit message suggestions
- Auto-staging of changes enabled by default
- Smart analysis of repository context and recent commit history
- Beautiful CLI interface with color-coded output
- Follows [Conventional Commits](https://www.conventionalcommits.org/) specification
- Detailed analysis of changes and their impact
- Seamless integration with your git workflow
- Ability to cancel interactive commits with empty messages
- Clean process exit after successful commits

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- Git initialized repository
- Anthropic API key (for Claude AI) or Google API key (for Gemini AI)

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
# For Claude AI
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env.local
# For Gemini AI
echo "GOOGLE_API_KEY=your_api_key_here" >> .env.local
```

4. Build and install globally:
```bash
bun run build
```

## Usage

### Basic Commands

```bash
# Generate commit message (interactive mode and auto-staging enabled by default)
commit

# Use only staged changes without auto-staging
commit -s

# Change AI model to Gemini
commit --model gemini
```

### Command Options

```bash
Options:
  -s, --staged      Use staged changes only (default: false)
  -n, --non-interactive Disable interactive mode
  --model <model>   Choose AI model (claude/gemini)
  -h, --help        Display help information
  -v, --version     Display version information
```

### Interactive Mode (Default)

Interactive mode is now enabled by default and provides:
- Multiple commit message suggestions
- Detailed analysis of changes
- Option to review changes
- Confirmation before committing
- Ability to cancel commit with empty message
- Clean exit after successful commit

## How It Works

1. When you run the command, the tool:
   - Auto-stages all changes by default
   - Collects git diff information
   - Gathers repository context and recent commit history
   - Sends information to selected AI model (Claude or Gemini)
   - Generates multiple commit message options
   - Handles the commit process interactively
   - Exits cleanly after successful commit

[Rest of the README remains the same from "The generated messages follow..." section onwards]

## Configuration

Environment variables:
- `ANTHROPIC_API_KEY`: Your Anthropic API key (for Claude AI)
- `GOOGLE_API_KEY`: Your Google API key (for Gemini AI)

[Rest of the sections remain the same]

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
