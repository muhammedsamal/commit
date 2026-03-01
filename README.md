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
commit              # Generate commit message for all changes
commit -a           # Auto-stage all changes, then generate
commit -s           # Staged changes only
commit -i           # Interactive: pick from 3 suggestions
commit --style      # Change commit message style
commit --action     # Change post-generate action
commit --clipformat # Change clipboard copy format
```

On first run, you'll be prompted to choose your style, action, and clipboard format. Preferences are saved to your cache directory.

### Styles

| Style | Example |
|-------|---------|
| `conventional` | `fix: handle nil pointer in auth` |
| `simple` | `handle nil pointer in auth` |
| `detailed` | title + short description (two `-m` flags) |

### Actions

| Action | Behavior |
|--------|----------|
| `commit` | Runs `git add .` + `git commit` automatically |
| `clipboard` | Copies to clipboard in the chosen format |

### Clipboard formats

| Format | Example |
|--------|---------|
| `message` | `fix: handle nil pointer` |
| `command` | `git commit -m "fix: handle nil pointer"` (or with `-m "description"` for detailed style) |
