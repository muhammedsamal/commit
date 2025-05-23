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
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  type: "anthropic" | "ollama" | "gemini";
  model: string;
  apiKey?: string;
  host?: string;
  port?: number;
}

export class CommitGenerator {
  private anthropic: Anthropic | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private config: ModelConfig;

  constructor(config?: Partial<ModelConfig>) {
    // Default configuration
    this.config = {
      type: "gemini",
      model: "gemini-2.0-flash",
      ...config,
    };

    if (this.config.type === "anthropic") {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || this.config.apiKey,
      });
    } else if (this.config.type === "gemini") {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || this.config.apiKey || "");
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

  private async generateWithGemini(prompt: string): Promise<GeneratedCommit> {
    if (!this.genAI) {
      throw new Error("Gemini client not initialized");
    }

    const model = this.genAI.getGenerativeModel({ model: this.config.model });
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const diff = prompt;

    const chatPrompt = `You are an expert developer analyzing git diffs to generate commit messages. Your response must be in valid JSON format only.

Input Git Diff:
${diff}

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "message": "type(scope): description",
}

Do not include any other text, markdown formatting, or explanation. The response must be parseable JSON.`;

    const result = await chatSession.sendMessage(chatPrompt);
    const response = result.response.text();
    
    try {
      // Clean up the response by removing markdown code block syntax
      const cleanedResponse = response.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (e) {
        // If JSON parsing fails, try to extract the commit message and create JSON
        const lines = cleanedResponse.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          parsedResponse = {
            message: lines[0].trim()
          };
        } else {
          throw new Error('Could not parse response into valid format');
        }
      }
      
      // Validate the response structure
      if (!parsedResponse.message) {
        throw new Error("Invalid response format from Gemini: missing message field");
      }

      // Convert details field to analysis if present
      const analysis = parsedResponse.details ? 
        (Array.isArray(parsedResponse.details) ? parsedResponse.details.join('\n') : parsedResponse.details) :
        'No analysis provided';
      
      return {
        message: parsedResponse.message,
        analysis
      } as GeneratedCommit;
    } catch (error: unknown) {
      console.error("Raw Gemini response:", response);
      throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : String(error)}`);
    }
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

      let responseText: string;
      
      if (this.config.type === "ollama") {
        responseText = await this.generateWithOllama(prompt);
      } else if (this.config.type === "anthropic") {
        responseText = await this.generateWithAnthropic(prompt);
      } else if (this.config.type === "gemini") {
        const response = await this.generateWithGemini(diff);
        return [response];
      } else {
        throw new Error("Unsupported model type");
      }

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

      spinner.stop();
      console.log(formatSuccess("\n✓ Changes committed successfully!"));
      process.exit(0);
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
        if (selectedMessage) {
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
