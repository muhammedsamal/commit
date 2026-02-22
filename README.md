# commit

AI-powered git commit message generator using Google Gemini.

## Installation

```bash
git clone https://github.com/muhammedsamal/commit
cd commit
go install .
```

Set your Gemini API key:
```bash
echo 'export GOOGLE_GENAI_API_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

```bash
commit        # Generate commit message for all changes
commit -a     # Auto-stage all changes, then generate
commit -s     # Staged changes only
commit -i     # Interactive: pick from 3 suggestions
```

Generated message is automatically copied to clipboard.
