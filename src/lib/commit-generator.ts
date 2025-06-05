import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { execSync } from "child_process";
import {
  spinner,
  promptForCommitMessage,
  confirmCommit,
  formatSuccess,
  formatError,
  formatInfo,
  type Config,
  type ProviderType,
} from "./cli-utils";

type CommitOptions = {
  staged: boolean;
  interactive: boolean;
  add: boolean;
  quick?: boolean;
  provider?: ProviderType;
  model?: string;
};

interface GeneratedCommit {
  message: string;
  analysis: string;
}

export class CommitGenerator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  private getModel() {
    const apiKey = this.config.apiKey || this.getEnvApiKey();
    
    switch (this.config.provider) {
      case "openai":
        return openai(this.config.model as any);
      case "anthropic":
        return anthropic(this.config.model as any);
      case "google":
        return google(this.config.model as any);
      case "groq":
        return groq(this.config.model as any);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  private getEnvApiKey(): string {
    const envKeyMap = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GOOGLE_GENERATIVE_AI_API_KEY",
      groq: "GROQ_API_KEY",
    };

    const envKey = envKeyMap[this.config.provider];
    const apiKey = process.env[envKey];
    
    if (!apiKey) {
      throw new Error(
        `No API key found for ${this.config.provider}. Please set ${envKey} environment variable or configure it with 'commit config'.`
      );
    }
    
    return apiKey;
  }

  private async getGitDiff(staged: boolean, includeAll: boolean = false): Promise<string> {
    try {
      let cmd: string;
      
      if (includeAll) {
        // Get both staged and unstaged changes
        const stagedDiff = execSync("git diff --staged").toString();
        const unstagedDiff = execSync("git diff").toString();
        const diff = stagedDiff + unstagedDiff;
        
        if (!diff.trim()) {
          throw new Error("No changes found in the repository.");
        }
        
        return diff;
      } else {
        cmd = staged ? "git diff --staged" : "git diff";
        const diff = execSync(cmd).toString();
        
        if (!diff.trim()) {
          throw new Error(
            staged 
              ? "No staged changes found. Use 'git add' to stage changes or use -a flag to auto-stage."
              : "No changes found in the repository."
          );
        }
        
        return diff;
      }
    } catch (error) {
      if (error instanceof Error && (error.message.includes("No staged changes") || error.message.includes("No changes found"))) {
        throw error;
      }
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
      const commits = execSync("git log -5 --oneline").toString().trim();
      return commits;
    } catch {
      return "";
    }
  }

  private buildPrompt(repoContext: string, recentCommits: string, diff: string): string {
    return `You are an expert developer tasked with generating a high-quality commit message based on the git diff provided. 

**Context:**
${repoContext}

**Recent Commits:**
${recentCommits}

**Git Diff:**
${diff}

**Instructions:**
1. Analyze the changes and generate a commit message following the Conventional Commits specification
2. Format: type(scope): description
3. Types: feat, fix, refactor, style, docs, test, chore, perf, ci, build
4. Use imperative mood (e.g., "add feature" not "added feature")
5. Keep the description concise but descriptive
6. Include scope when applicable (e.g., component, file, module)
7. Provide a brief analysis of what the changes accomplish

**Response Format:**
Return your response as a JSON object with exactly this structure:
{
  "message": "type(scope): concise description of changes",
  "analysis": "Brief explanation of what these changes do and why they were made"
}

**Examples:**
- feat(auth): add JWT token validation middleware
- fix(user-profile): resolve avatar upload issue with large files  
- refactor(database): extract query utilities into separate module
- docs(api): update authentication endpoints documentation

Focus on clarity, accuracy, and following conventional commit standards.`;
  }

  private async generateWithAI(prompt: string): Promise<GeneratedCommit> {
    const model = this.getModel();
    const apiKey = this.config.apiKey || this.getEnvApiKey();
    
    // Define the schema for the expected response
    const commitSchema = z.object({
      message: z.string().describe("The commit message following conventional commits format"),
      analysis: z.string().describe("Brief explanation of what these changes do and why they were made")
    });
    
    // Set environment variable for the AI SDK
    const envKeyMap = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GOOGLE_GENERATIVE_AI_API_KEY",
      groq: "GROQ_API_KEY",
    };
    
    const envKey = envKeyMap[this.config.provider];
    const originalEnvValue = process.env[envKey];
    process.env[envKey] = apiKey;
    
    try {
      const { object } = await generateObject({
        model,
        prompt,
        schema: commitSchema,
        temperature: 0.7,
      });
      
      // Restore original environment variable
      if (originalEnvValue !== undefined) {
        process.env[envKey] = originalEnvValue;
      } else {
        delete process.env[envKey];
      }

      if (!object.message) {
        throw new Error("AI response missing commit message");
      }

      return {
        message: object.message,
        analysis: object.analysis || "Generated commit message"
      };
    } catch (error) {
      throw new Error(`Failed to generate commit message: ${error}`);
    }
  }

  private async generateMessages(diff: string): Promise<GeneratedCommit[]> {
    const repoContext = await this.getRepoContext();
    const recentCommits = await this.getRecentCommits();
    const prompt = this.buildPrompt(repoContext, recentCommits, diff);

    spinner.start("Generating commit messages...");
    
    try {
      // Generate multiple variations by slightly modifying the prompt
      const prompts = [
        prompt,
        prompt + "\n\nFocus on the primary change and be specific about the impact.",
        prompt + "\n\nEmphasize the business value or user benefit of these changes.",
      ];

      const results = await Promise.allSettled(
        prompts.map(p => this.generateWithAI(p))
      );

      const commits = results
        .filter((result): result is PromiseFulfilledResult<GeneratedCommit> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      if (commits.length === 0) {
        throw new Error("Failed to generate any commit messages");
      }

      spinner.stop();
      return commits;
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private async commitChanges(message: string, options: CommitOptions): Promise<void> {
    try {
      if (options.add) {
        console.log(formatInfo("Staging all changes..."));
        execSync("git add .");
      }

      console.log(formatInfo("Committing changes..."));
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      console.log(formatSuccess("Changes committed successfully!"));
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error}`);
    }
  }

  private async ensureGitUser(): Promise<void> {
    try {
      execSync("git config user.name");
      execSync("git config user.email");
    } catch {
      throw new Error(
        "Git user not configured. Please set your git username and email:\n" +
        "git config --global user.name 'Your Name'\n" +
        "git config --global user.email 'your.email@example.com'"
      );
    }
  }

  private async ensureGitRepo(): Promise<void> {
    try {
      execSync("git rev-parse --git-dir");
    } catch {
      throw new Error("Not a git repository. Please run 'git init' first.");
    }
  }

  async generateCommitMessage(options: CommitOptions): Promise<void> {
    try {
      // Validate git setup
      await this.ensureGitRepo();
      await this.ensureGitUser();

      // Get git diff
      const diff = await this.getGitDiff(options.staged, options.quick);

      // Generate commit messages
      const commits = await this.generateMessages(diff);

      let selectedMessage: string;

      if (options.interactive && commits.length > 1) {
        // Interactive mode: let user choose from multiple options
        selectedMessage = await promptForCommitMessage(
          commits.map(c => ({ message: c.message, analysis: c.analysis }))
        );
      } else {
        // Use the first (best) generated message
        selectedMessage = commits[0].message;
        
        if (options.quick) {
          // Quick mode: only show the commit message
          console.log(selectedMessage);
        } else {
          // Normal mode: show detailed info
          console.log(formatInfo("Generated commit message:"));
          console.log(`${selectedMessage}\n`);
          console.log(formatInfo("Analysis:"));
          console.log(`${commits[0].analysis}\n`);
        }
      }

      // Confirm and commit
      if (options.quick) {
        // Quick mode: auto-stage and commit without confirmation
        await this.commitChanges(selectedMessage, { ...options, add: true });
      } else {
        // Normal mode: ask for confirmation
        if (await confirmCommit(selectedMessage, diff)) {
          await this.commitChanges(selectedMessage, options);
        } else {
          console.log(formatInfo("Commit cancelled."));
        }
      }
    } catch (error) {
      throw new Error(`${(error as Error).message}`);
    }
  }
}
