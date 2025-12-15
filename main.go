package main

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"

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

	start = time.Now()
	// 1. Define command (executable name, args)
	cmd = exec.Command("git", "status")

	// 2. run and capture output
	output, err := cmd.Output()
	fmt.Println("Time taken to get git status: ", time.Since(start))

	if err != nil {
		log.Fatalf("Git command failed: %v\nError output:\n%s", err, err.Error())
	}

	gitStatus := strings.TrimSpace(string(output))

	// fmt.Println(gitStatus)

	start = time.Now()
	// get the current branch name
	cmd = exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")

	output, err = cmd.Output()
	fmt.Println("Time taken to get current branch name: ", time.Since(start))

	if err != nil {
		log.Fatalf("Git command failed: %v\nError output:\n%s", err, err.Error())
	}

	currentBranch := strings.TrimSpace(string(output))

	// fmt.Println("Current branch name is: ", currentBranch)

	start = time.Now()
	// get the git log
	cmd = exec.Command("git", "log", "-n", "10", "--oneline")

	output, err = cmd.Output()
	fmt.Println("Time taken to get git log: ", time.Since(start))

	if err != nil {
		log.Fatalf("Git command failed: %v\nError output:\n%s", err, err.Error())
	}

	gitLog := strings.TrimSpace(string(output))

	// fmt.Println("Git log is: ", gitLog)

	start = time.Now()
	// get the diff
	cmd = exec.Command("git", "diff", "HEAD")

	output, err = cmd.Output()
	fmt.Println("Time taken to get diff: ", time.Since(start))

	if err != nil {
		log.Fatalf("Git command failed: %v\nError output:\n%s", err, err.Error())
	}

	diff := strings.TrimSpace(string(output))

	// fmt.Println("Diff is: ", diff)

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

	log.Println(res.Text())

}
