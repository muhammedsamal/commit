package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/atotto/clipboard"
	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/googlegenai"
)

type Style string

const (
	StyleConventional Style = "conventional" // fix: message
	StyleSimple       Style = "simple"       // message
	StyleDetailed     Style = "detailed"     // git commit -m "title" -m "description"
)

type Action string

const (
	ActionCommit    Action = "commit"    // git add + git commit
	ActionClipboard Action = "clipboard" // copy to clipboard only
)

type ClipFormat string

const (
	ClipFormatMessage ClipFormat = "message" // just the commit message text
	ClipFormatCommand ClipFormat = "command" // git commit -m "..." [-m "..."]
)

type Config struct {
	Style      Style      `json:"style"`
	Action     Action     `json:"action"`
	ClipFormat ClipFormat `json:"clip_format"`
}

func configPath() string {
	dir, _ := os.UserCacheDir()
	return filepath.Join(dir, "commit", "config.json")
}

func loadConfig() Config {
	var c Config
	data, err := os.ReadFile(configPath())
	if err != nil {
		return c
	}
	json.Unmarshal(data, &c)
	return c
}

func saveConfig(c Config) {
	path := configPath()
	os.MkdirAll(filepath.Dir(path), 0700)
	data, _ := json.MarshalIndent(c, "", "  ")
	os.WriteFile(path, data, 0600)
}

func askStyle(reader *bufio.Reader) Style {
	fmt.Println("\nCommit message style:")
	fmt.Println("  1) Conventional  (fix: add validation)")
	fmt.Println("  2) Simple        (add validation)")
	fmt.Println("  3) Detailed      (title + description)")
	for {
		fmt.Print("Choose (1-3): ")
		input, _ := reader.ReadString('\n')
		switch strings.TrimSpace(input) {
		case "1":
			return StyleConventional
		case "2":
			return StyleSimple
		case "3":
			return StyleDetailed
		default:
			fmt.Println("Invalid choice. Enter 1, 2, or 3.")
		}
	}
}

func askAction(reader *bufio.Reader) Action {
	fmt.Println("\nAfter generating the commit message:")
	fmt.Println("  1) Run commit  (git add + git commit automatically)")
	fmt.Println("  2) Copy only   (copy to clipboard)")
	for {
		fmt.Print("Choose (1-2): ")
		input, _ := reader.ReadString('\n')
		switch strings.TrimSpace(input) {
		case "1":
			return ActionCommit
		case "2":
			return ActionClipboard
		default:
			fmt.Println("Invalid choice. Enter 1 or 2.")
		}
	}
}

func askClipFormat(reader *bufio.Reader) ClipFormat {
	fmt.Println("\nClipboard copy format:")
	fmt.Println("  1) Message only  (fix: add validation)")
	fmt.Println("  2) Command       (git commit -m \"fix: add validation\")")
	for {
		fmt.Print("Choose (1-2): ")
		input, _ := reader.ReadString('\n')
		switch strings.TrimSpace(input) {
		case "1":
			return ClipFormatMessage
		case "2":
			return ClipFormatCommand
		default:
			fmt.Println("Invalid choice. Enter 1 or 2.")
		}
	}
}

func gitCommit(msg string, style Style) error {
	var args []string
	if style == StyleDetailed {
		lines := strings.SplitN(msg, "\n", 2)
		args = []string{"commit", "-m", strings.TrimSpace(lines[0])}
		if len(lines) == 2 {
			args = append(args, "-m", strings.TrimSpace(lines[1]))
		}
	} else {
		args = []string{"commit", "-m", msg}
	}
	cmd := exec.Command("git", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runGit(args ...string) (string, error) {
	out, err := exec.Command("git", args...).Output()
	return strings.TrimSpace(string(out)), err
}

func collectGitData(staged bool) (gitStatus, currentBranch, gitLog, diff string) {
	var wg sync.WaitGroup
	var statusErr, branchErr, logErr, diffErr error

	wg.Add(4)

	go func() {
		defer wg.Done()
		gitStatus, statusErr = runGit("status")
	}()

	go func() {
		defer wg.Done()
		currentBranch, branchErr = runGit("rev-parse", "--abbrev-ref", "HEAD")
	}()

	go func() {
		defer wg.Done()
		gitLog, logErr = runGit("log", "-n", "10", "--oneline")
	}()

	go func() {
		defer wg.Done()
		if staged {
			diff, diffErr = runGit("diff", "--staged")
		} else {
			diff, diffErr = runGit("diff", "HEAD")
		}
	}()

	wg.Wait()

	if statusErr != nil {
		log.Fatalf("git status failed: %v", statusErr)
	}
	if branchErr != nil {
		log.Fatalf("git branch failed: %v", branchErr)
	}
	if logErr != nil {
		log.Fatalf("git log failed: %v", logErr)
	}
	if diffErr != nil {
		log.Fatalf("git diff failed: %v", diffErr)
	}

	return
}

func systemPromptForStyle(style Style) string {
	base := "Be extremely concise. Sacrifice grammar for the sake of concision.\nYou are a semantic git commit message generator.\nUse imperative mood.\nConsider the branch context when choosing message type.\nReturn ONLY the commit message, nothing else."

	switch style {
	case StyleSimple:
		return base + "\nDo NOT use any prefix like fix:, feat:, etc. Just write the message directly.\nKeep it under 50 chars."
	case StyleDetailed:
		return base + "\nFollow Conventional Commits format.\nReturn exactly two lines: first line is the short title (under 50 chars), second line is a brief description (under 100 chars).\nNo blank line between them."
	default: // conventional
		return base + "\nFollow Conventional Commits format.\nKeep subject under 50 chars."
	}
}

func generateMessage(ctx context.Context, g *genkit.Genkit, style Style, gitStatus, currentBranch, gitLog, diff string) (string, error) {
	res, err := genkit.Generate(ctx, g,
		ai.WithSystem(systemPromptForStyle(style)),
		ai.WithPrompt("Generate a commit message for the following git status:\n"+gitStatus+
			"\nCurrent branch: "+currentBranch+
			"\nRecent commits:\n"+gitLog+
			"\nDiff:\n"+diff),
	)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(res.Text()), nil
}

func formatForClipboard(msg string, format ClipFormat) string {
	if format == ClipFormatCommand {
		lines := strings.SplitN(msg, "\n", 2)
		if len(lines) == 2 && strings.TrimSpace(lines[1]) != "" {
			return fmt.Sprintf(`git commit -m %q -m %q`, strings.TrimSpace(lines[0]), strings.TrimSpace(lines[1]))
		}
		return fmt.Sprintf(`git commit -m %q`, strings.TrimSpace(lines[0]))
	}
	return msg
}

func pickInteractive(messages []string) string {
	fmt.Println("\nGenerated commit messages:")
	for i, msg := range messages {
		fmt.Printf("  %d) %s\n", i+1, msg)
	}

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("\nSelect a message (1-%d): ", len(messages))
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)
		n, err := strconv.Atoi(input)
		if err == nil && n >= 1 && n <= len(messages) {
			return messages[n-1]
		}
		fmt.Printf("Invalid choice. Enter a number between 1 and %d.\n", len(messages))
	}
}

func main() {
	interactive := flag.Bool("i", false, "Interactive mode: generate multiple suggestions and pick one")
	staged := flag.Bool("s", false, "Use staged changes only (git diff --staged)")
	autoAdd := flag.Bool("a", false, "Auto-stage all changes before generating")
	setStyle := flag.Bool("style", false, "Change commit message style")
	setAction := flag.Bool("action", false, "Change post-generate action (commit or clipboard)")
	setClipFormat := flag.Bool("clipformat", false, "Change clipboard copy format (message or command)")
	flag.Parse()

	cfg := loadConfig()
	reader := bufio.NewReader(os.Stdin)

	// --style: change style and exit
	if *setStyle {
		cfg.Style = askStyle(reader)
		saveConfig(cfg)
		fmt.Printf("Style saved: %s\n", cfg.Style)
		return
	}

	// --action: change action and exit
	if *setAction {
		cfg.Action = askAction(reader)
		if cfg.Action == ActionClipboard {
			cfg.ClipFormat = askClipFormat(reader)
		}
		saveConfig(cfg)
		fmt.Printf("Action saved: %s\n", cfg.Action)
		return
	}

	// --clipformat: change clip format and exit
	if *setClipFormat {
		cfg.ClipFormat = askClipFormat(reader)
		saveConfig(cfg)
		fmt.Printf("Clipboard format saved: %s\n", cfg.ClipFormat)
		return
	}

	// First-run setup
	if cfg.Style == "" || cfg.Action == "" {
		fmt.Println("Welcome! Let's set up your preferences.")
		if cfg.Style == "" {
			cfg.Style = askStyle(reader)
		}
		if cfg.Action == "" {
			cfg.Action = askAction(reader)
			if cfg.Action == ActionClipboard && cfg.ClipFormat == "" {
				cfg.ClipFormat = askClipFormat(reader)
			}
		}
		saveConfig(cfg)
		fmt.Printf("Setup complete! (style: %s, action: %s)\n\n", cfg.Style, cfg.Action)
	}

	// Auto-stage if requested
	if *autoAdd {
		if err := exec.Command("git", "add", ".").Run(); err != nil {
			log.Fatalf("git add failed: %v", err)
		}
		fmt.Println("All changes staged.")
		*staged = true
	}

	// Check for changes
	var checkArgs []string
	if *staged {
		checkArgs = []string{"diff", "--staged", "--quiet"}
	} else {
		checkArgs = []string{"diff-index", "--quiet", "HEAD"}
	}
	if err := exec.Command("git", checkArgs...).Run(); err == nil {
		if *staged {
			fmt.Println("No staged changes detected.")
		} else {
			fmt.Println("No changes detected.")
		}
		return
	}

	gitStatus, currentBranch, gitLog, diff := collectGitData(*staged)

	if diff == "" {
		fmt.Println("No diff found.")
		return
	}

	ctx := context.Background()
	g := genkit.Init(ctx,
		genkit.WithPlugins(&googlegenai.GoogleAI{}),
		genkit.WithDefaultModel("googleai/gemini-3-flash-preview"),
	)

	var commitMessage string

	if *interactive {
		fmt.Print("Generating 3 suggestions...")

		type result struct {
			msg string
			err error
		}
		results := make(chan result, 3)
		for range 3 {
			go func() {
				msg, err := generateMessage(ctx, g, cfg.Style, gitStatus, currentBranch, gitLog, diff)
				results <- result{msg, err}
			}()
		}

		var messages []string
		for range 3 {
			r := <-results
			if r.err == nil && r.msg != "" {
				messages = append(messages, r.msg)
			}
		}

		if len(messages) == 0 {
			log.Fatal("Failed to generate any commit messages.")
		}

		commitMessage = pickInteractive(messages)
	} else {
		fmt.Print("Generating commit message...")
		var err error
		commitMessage, err = generateMessage(ctx, g, cfg.Style, gitStatus, currentBranch, gitLog, diff)
		if err != nil {
			log.Fatalf("Generation failed: %v", err)
		}
		fmt.Printf("\n\n%s\n", commitMessage)
	}

	if cfg.Action == ActionCommit {
		if err := exec.Command("git", "add", ".").Run(); err != nil {
			log.Fatalf("git add failed: %v", err)
		}
		if err := gitCommit(commitMessage, cfg.Style); err != nil {
			log.Fatalf("git commit failed: %v", err)
		}
	} else {
		clipContent := formatForClipboard(commitMessage, cfg.ClipFormat)
		if err := clipboard.WriteAll(clipContent); err != nil {
			log.Fatalf("Failed to copy to clipboard: %v", err)
		}
		fmt.Println("\nCommit message copied to clipboard!")
	}
}
