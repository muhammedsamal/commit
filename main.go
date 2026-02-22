package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"

	"github.com/atotto/clipboard"
	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/googlegenai"
)

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

func generateMessage(ctx context.Context, g *genkit.Genkit, gitStatus, currentBranch, gitLog, diff string) (string, error) {
	res, err := genkit.Generate(ctx, g,
		ai.WithSystem(`Be extremely concise. Sacrifice grammar for the sake of concision.
You are a semantic git commit message generator.
Follow Conventional Commits format.
Use imperative mood. Keep subject under 50 chars.
Consider the branch context when choosing message type (feat, fix, refactor, etc.).
Return ONLY the commit message, nothing else.`),
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
	flag.Parse()

	// Auto-stage if requested
	if *autoAdd {
		if err := exec.Command("git", "add", ".").Run(); err != nil {
			log.Fatalf("git add failed: %v", err)
		}
		fmt.Println("All changes staged.")
		// After staging, treat as staged-only
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
				msg, err := generateMessage(ctx, g, gitStatus, currentBranch, gitLog, diff)
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
		commitMessage, err = generateMessage(ctx, g, gitStatus, currentBranch, gitLog, diff)
		if err != nil {
			log.Fatalf("Generation failed: %v", err)
		}
		fmt.Printf("\n\n%s\n", commitMessage)
	}

	if err := clipboard.WriteAll(commitMessage); err != nil {
		log.Fatalf("Failed to copy to clipboard: %v", err)
	}
	fmt.Println("\nCommit message copied to clipboard!")
}
