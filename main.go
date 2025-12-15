package main

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/atotto/clipboard"
	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/googlegenai"
)

func main() {
	// this is the the main function that uses to generate git commit message

	// to generate commit message we need to get the status if no change exist immediately

	// git diff-index --quiet HEAD runs the check silently
	start := time.Now()
	cmd := exec.Command("git", "diff-index", "--quiet", "HEAD")

	err := cmd.Run()
	fmt.Println("Time taken to check for changes: ", time.Since(start))

	if err == nil {
		fmt.Println("No changes detected")
		return // early exit
	}

	// Run git commands in parallel
	start = time.Now()
	var wg sync.WaitGroup
	var gitStatus, currentBranch, gitLog, diff string
	var statusErr, branchErr, logErr, diffErr error

	wg.Add(4)

	go func() {
		defer wg.Done()
		cmd := exec.Command("git", "status")
		output, err := cmd.Output()
		if err != nil {
			statusErr = err
			return
		}
		gitStatus = strings.TrimSpace(string(output))
	}()

	go func() {
		defer wg.Done()
		cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
		output, err := cmd.Output()
		if err != nil {
			branchErr = err
			return
		}
		currentBranch = strings.TrimSpace(string(output))
	}()

	go func() {
		defer wg.Done()
		cmd := exec.Command("git", "log", "-n", "10", "--oneline")
		output, err := cmd.Output()
		if err != nil {
			logErr = err
			return
		}
		gitLog = strings.TrimSpace(string(output))
	}()

	go func() {
		defer wg.Done()
		cmd := exec.Command("git", "diff", "HEAD")
		output, err := cmd.Output()
		if err != nil {
			diffErr = err
			return
		}
		diff = strings.TrimSpace(string(output))
	}()

	wg.Wait()
	fmt.Println("Time taken to get all git data in parallel: ", time.Since(start))

	// Check for errors
	if statusErr != nil {
		log.Fatalf("Git status failed: %v", statusErr)
	}
	if branchErr != nil {
		log.Fatalf("Git branch failed: %v", branchErr)
	}
	if logErr != nil {
		log.Fatalf("Git log failed: %v", logErr)
	}
	if diffErr != nil {
		log.Fatalf("Git diff failed: %v", diffErr)
	}

	start = time.Now()
	// init genkit
	ctx := context.Background()

	g := genkit.Init(ctx,
		genkit.WithPlugins(&googlegenai.GoogleAI{}),
		genkit.WithDefaultModel("googleai/gemini-2.5-flash"),
	)

	res, err := genkit.Generate(ctx, g,
		ai.WithSystem(`Be extremely concise. Sacrifice grammar for the sake of concision. 
			You are a semantic git commit message generator
			Follow Conventional Commits format.
			Use imperative mood. Keep subject under 50 chars.
			Consider the branch context when choosing message type (feat, fix, refactor, etc.)`),
		ai.WithPrompt("Generate a commit message for the following git status:\n"+gitStatus+"\nCurrent branch name is: "+currentBranch+"\nGit log is: "+gitLog+"\nDiff is: "+diff),
	)
	fmt.Println("Time taken to generate commit message: ", time.Since(start))

	if err != nil {
		log.Fatalf("Genkit failed: %v\nError output:\n%s", err, err.Error())
	}

	commitMessage := res.Text()
	log.Println(commitMessage)

	// Copy to clipboard
	err = clipboard.WriteAll(commitMessage)
	if err != nil {
		log.Fatalf("Failed to copy to clipboard: %v", err)
	}

	fmt.Println("\nCommit message copied to clipboard!")

}
