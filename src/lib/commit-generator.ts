import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import {
  spinner,
  promptForCommitMessage,
  confirmCommit,
  formatSuccess,
  formatError,
  formatInfo,
} from "./cli-utils";
import fetch from "node-fetch";

type CommitOptions = {
  staged: boolean;
  interactive: boolean;
  add: boolean;
  useOllama?: boolean;
  model?: string;
};

interface GeneratedCommit {
  message: string;
  analysis: string;
}

interface ModelConfig {
  type: "anthropic" | "ollama";
  model: string;
  apiKey?: string;
  host?: string;
  port?: number;
}

export class CommitGenerator {
  private anthropic: Anthropic | null = null;
  private config: ModelConfig;

  constructor(config?: Partial<ModelConfig>) {
    // Default configuration
    this.config = {
      type: "anthropic",
      model: "claude-3-sonnet-20240229",
      ...config,
    };

    if (this.config.type === "anthropic") {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || this.config.apiKey,
      });
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

  private async generateWithOllama(prompt: string): Promise<string> {
    const host = this.config.host || "http://localhost";
    const port = this.config.port || 11434;
    const model = this.config.model || "codellama:7b-instruct";

    try {
      const response = await fetch(`${host}:${port}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Failed to generate with Ollama: ${error}`);
    }
  }

  private async generateWithAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized");
    }

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = response.content.filter(
      (block) => block.type === "text",
    )[0]?.text;

    if (!responseText) {
      throw new Error("No response content found");
    }

    return responseText;
  }

  private buildPrompt(
    repoContext: string,
    recentCommits: string,
    diff: string,
  ): string {
    return `You are an expert git commit message generator tasked with creating concise, single-line conventional commit messages. Your goal is to analyze the provided repository context and git diff to produce accurate and informative commit messages.

First, examine the following repository context and git diff:

<repository_context>
Current branch: ${repoContext}
Recent commits:
${recentCommits}
</repository_context>

<git_diff>
${diff}
</git_diff>

Now, follow these steps to generate commit messages:

1. Wrap your analysis in <commit_analysis> tags. In your analysis:
   - List all modified files and summarize their changes
   - Categorize each change into potential commit types (feat, fix, refactor, style, docs, test, chore, or perf)
   - Identify the most specific scope based on the file paths and changes
   - Evaluate if there are any breaking changes or security implications

2. Based on your analysis, create three different commit messages that adhere to the following rules:
   - Use this format exactly: <type>(<scope>): <subject>
   - The message MUST be a single line with no line breaks
   - Use imperative mood in the subject (e.g., "add" not "added")
   - Do not capitalize the first letter of the subject
   - Do not end the subject with a period
   - Be specific but concise (aim for 50 characters or less in the subject)
   - Ensure the message is readable and meaningful

3. Present your commit messages wrapped in <commit_message> tags, with one message per tag.`;
  }

  private async generateMessages(diff: string): Promise<GeneratedCommit[]> {
    try {
      const repoContext = await this.getRepoContext();
      const recentCommits = await this.getRecentCommits();
      const prompt = this.buildPrompt(repoContext, recentCommits, diff);

      spinner.start("Generating commit messages...");

      const responseText =
        this.config.type === "ollama"
          ? await this.generateWithOllama(prompt)
          : await this.generateWithAnthropic(prompt);

      spinner.succeed("Generated commit messages");

      // Extract analysis
      const analysisMatch = responseText.match(
        /<commit_analysis>(.*?)<\/commit_analysis>/s,
      );
      const analysis = analysisMatch ? analysisMatch[1].trim() : "";

      // Extract all commit messages
      const messageMatches = responseText.matchAll(
        /<commit_message>(.*?)<\/commit_message>/gs,
      );

      const messages = Array.from(messageMatches).map((match) => ({
        message: match[1].trim(),
        analysis: analysis,
      }));

      if (messages.length === 0) {
        throw new Error("No commit messages found in response");
      }

      return messages;
    } catch (error) {
      spinner.fail("Failed to generate commit messages");
      throw error;
    }
  }

  private async commitChanges(
    message: string,
    options: CommitOptions,
  ): Promise<void> {
    try {
      if (options.add) {
        execSync("git add -A", {
          stdio: ["inherit", "inherit", "inherit"],
          encoding: "utf-8",
        });
        console.log(formatSuccess("✓ All changes staged"));
      }

      const stagedChanges = execSync(
        'git diff --staged --quiet || echo "has changes"',
        {
          encoding: "utf-8",
        },
      ).trim();

      if (!stagedChanges) {
        throw new Error(
          "No changes staged for commit. Use -a flag to auto-stage changes or git add to stage manually.",
        );
      }

      const escapedMessage = message.replace(/"/g, '\\"');

      execSync('git commit -m "' + escapedMessage + '"', {
        stdio: ["inherit", "inherit", "inherit"],
        encoding: "utf-8",
      });

      console.log(formatSuccess("\n✓ Changes committed successfully!"));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (errorMessage.includes("not a git repository")) {
        throw new Error(
          "Not a git repository. Initialize git first with: git init",
        );
      } else if (errorMessage.includes("no changes added to commit")) {
        throw new Error(
          options.add
            ? "No changes to commit. Your working directory is clean."
            : "No changes staged for commit. Use -a flag to auto-stage changes or git add to stage manually.",
        );
      } else if (errorMessage.includes("please tell me who you are")) {
        throw new Error(
          'Git user not configured. Run:\ngit config --global user.email "you@example.com"\ngit config --global user.name "Your Name"',
        );
      }

      throw new Error(`Failed to commit changes: ${errorMessage}`);
    }
  }

  async generateCommitMessage(options: CommitOptions): Promise<void> {
    try {
      try {
        execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
      } catch (error) {
        throw new Error(
          "Not a git repository. Initialize git first with: git init",
        );
      }

      const diff = await this.getGitDiff(options.add ? false : options.staged);

      if (!diff) {
        console.log(formatInfo("No changes to commit"));
        return;
      }

      // Update config if options specify different model
      if (options.useOllama) {
        this.config.type = "ollama";
        if (options.model) {
          this.config.model = options.model;
        }
      }

      const messages = await this.generateMessages(diff);

      if (options.interactive) {
        const selectedMessage = await promptForCommitMessage(messages);
        const confirmed = await confirmCommit(selectedMessage, diff);

        if (confirmed) {
          await this.commitChanges(selectedMessage, options);
        } else {
          console.log(formatInfo("Commit cancelled"));
        }
      } else {
        await this.commitChanges(messages[0].message, options);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error(formatError("\n✗ Error: ") + errorMsg);
      process.exit(1);
    }
  }
}
