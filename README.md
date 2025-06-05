# Commit - AI-Powered Git Commit Message Generator

Generate conventional commit messages using AI. Super fast with quick mode.

## Installation

```bash
bun install -g @muhammedsamal/commit
```

## Quick Start

Set your Groq API key:
```bash
echo 'export GROQ_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

Then just run:
```bash
commit -q    # Analyzes all changes and auto-commits
```

## Usage

```bash
commit -q    # Quick mode (recommended)
commit       # Interactive mode
commit -a    # Auto-stage all changes
commit -i    # Multiple suggestions
```

## Environment Variables

```bash
export GROQ_API_KEY="your_key"                    # For quick mode
export OPENAI_API_KEY="your_key"                  # For OpenAI
export ANTHROPIC_API_KEY="your_key"               # For Anthropic  
export GOOGLE_GENERATIVE_AI_API_KEY="your_key"    # For Google
```

## Quick Mode

- Uses Groq's Llama 4 Scout model
- Analyzes all changes (staged + unstaged)  
- Auto-commits without confirmation
- Requires only `GROQ_API_KEY`

Perfect for rapid development workflows.