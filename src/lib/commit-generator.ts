import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";

type CommitOptions = {
  staged: boolean;
  interactive: boolean;
};

export class CommitGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private async getRepoContext(): Promise<string> {
    try {
      const branch = execSync("git branch --show-current").toString().trim();
      const remoteUrl = execSync("git remote get-url origin").toString().trim();
      return `Current branch: ${branch}\nRepository: ${remoteUrl}\n`;
    } catch {
      return "";
    }
  }

  private async getRecentCommits(): Promise<string> {
    try {
      const commits = execSync("git log -3 --oneline").toString().trim();
      return `Recent commits:\n${commits}\n`;
    } catch {
      return "";
    }
  }

  private async getGitDiff(staged: boolean): Promise<string> {
    try {
      const cmd = staged ? "git diff --staged" : "git diff";
      return execSync(cmd).toString();
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error}`);
    }
  }

  private async generateMessage(diff: string): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "assistant",
            content: `You are a commit message generator that creates concise, single-line conventional commit messages. Follow these rules:

1. Always use this format exactly:
   <type>(<scope>): <subject>

2. Types (use the most significant one):
   feat: new features
   fix: bug fixes
   refactor: code changes that neither fix bugs nor add features
   style: formatting, semicolons, etc
   docs: documentation only
   test: adding/updating tests
   chore: dependencies, build tasks
   perf: performance improvements

3. Strict Rules:
   - MUST be a single line, no line breaks
   - Use imperative: "add" not "added"
   - No capitalization at start of description
   - No period at end
   - Be specific but concise
   - Keep it readable and meaningful

4. For multiple changes, pick the most important one and be specific
   Example: "feat(auth): add google oauth login" not "feat: add multiple features"

Analyze file paths and extensions for accurate scope.`,
          },
          {
            role: "user",
            content: `Repository context:
${await this.getRepoContext()}
Recent commits:
${await this.getRecentCommits()}

Based on this git diff, generate a commit message following the above rules:
${diff}`,
          },
        ],
      });

      return response.content;
    } catch (error) {
      throw new Error(`Failed to generate commit message: ${error}`);
    }
  }

  async generateCommitMessage(options: CommitOptions): Promise<void> {
    try {
      const diff = await this.getGitDiff(options.staged);

      if (!diff) {
        console.log("No changes to commit");
        return;
      }

      const message = await this.generateMessage(diff);

      if (options.interactive) {
        // TODO: Add interactive mode
        console.log("Suggested commit message:");
        console.log(message);
      } else {
        console.log(message);
      }
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  }
}
