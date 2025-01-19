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

  private async getGitDiff(staged: boolean): Promise<string> {
    try {
      const cmd = staged ? "git diff --staged" : "git diff";
      return execSync(cmd).toString();
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error}`);
    }
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
      return commits;
    } catch {
      return "";
    }
  }

  private buildPrompt(
    repoContext: string,
    recentCommits: string,
    diff: string,
  ): string {
    return `You are an expert git commit message generator tasked with creating concise, single-line conventional commit messages. Your goal is to analyze the provided repository context and git diff to produce an accurate and informative commit message.

First, examine the following repository context and git diff:

<repository_context>
Current branch: ${repoContext}
Recent commits:
${recentCommits}
</repository_context>

<git_diff>
${diff}
</git_diff>

Now, follow these steps to generate the commit message:

1. Wrap your analysis in <commit_analysis> tags. In your analysis:
   - List all modified files and summarize their changes
   - Categorize each change into potential commit types (feat, fix, refactor, style, docs, test, chore, or perf)
   - Identify the most specific scope based on the file paths and changes
   - Evaluate if there are any breaking changes or security implications
   - Draft 3-5 potential subject lines that capture the essence of the change
   - Choose the best subject line and justify your choice

2. Based on your analysis, create a commit message that adheres to the following rules:
   - Use this format exactly: <type>(<scope>): <subject>
   - The message MUST be a single line with no line breaks
   - Use imperative mood in the subject (e.g., "add" not "added")
   - Do not capitalize the first letter of the subject
   - Do not end the subject with a period
   - Be specific but concise (aim for 50 characters or less in the subject)
   - Ensure the message is readable and meaningful

3. Present your final commit message wrapped in <commit_message> tags.`;
  }

  private async generateMessage(diff: string): Promise<string> {
    try {
      const repoContext = await this.getRepoContext();
      const recentCommits = await this.getRecentCommits();
      const prompt = this.buildPrompt(repoContext, recentCommits, diff);

      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Extract the commit message from the response
      const responseText = response.content.filter(
        (block) => block.type === "text",
      )[0]?.text;
      if (!responseText) {
        throw new Error("No response content found");
      }

      const match = responseText.match(
        /<commit_message>(.*?)<\/commit_message>/s,
      );
      if (!match) {
        throw new Error("No commit message found in response");
      }

      return match[1].trim();
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
      console.error("Error:", (error as Error).message);
      process.exit(1);
    }
  }
}
