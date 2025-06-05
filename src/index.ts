#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { CommitGenerator } from "./lib/commit-generator";
import {
  loadConfig,
  setupConfig,
  ensureApiKey,
  formatError,
  formatSuccess,
  isFirstRun,
  firstRunSetup,
} from "./lib/cli-utils";

const displayBanner = () => {
  console.log(
    chalk.cyan(`
   ______                          *_*
  / ____/___  ____ ___  ____ ___  (_) /_
 / /   / ** \\/ ** \`__ \\/ ** \`__ \\/ / __/
/ /___/ /_/ / / / / / / / / / / / / /_
\\____/\\____/_/ /_/ /_/_/ /_/ /_/_/\\__/
`),
  );
  console.log(chalk.dim("✨ AI-Powered Git Commit Message Generator ✨\n"));
  console.log(chalk.white.bold("Version: ") + chalk.green("1.0.1"));
  console.log(chalk.white.bold("Author: ") + chalk.green("Muhammed Samal"));
  console.log(chalk.white.bold("License: ") + chalk.green("MIT\n"));
};

const displayHelp = () => {
  console.log(chalk.yellow.bold("\nExample Usage:"));
  console.log(chalk.dim("─────────────"));
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit")}                ${chalk.dim("# Generate commit message")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -a")}             ${chalk.dim("# Auto-stage and commit all changes")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -i")}             ${chalk.dim("# Interactive mode with multiple suggestions")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -q")}             ${chalk.dim("# Quick mode with Groq model for all changes")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit config")}         ${chalk.dim("# Configure AI provider and model")}\n`,
  );
};

// Add config command
program
  .command("config")
  .description(chalk.dim("Configure AI provider and model settings"))
  .action(async () => {
    try {
      displayBanner();
      const config = await setupConfig();
      console.log(formatSuccess("Configuration updated successfully!"));
      // Verify API key is available
      await ensureApiKey(config);
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

// Set up main CLI command
program
  .name("commit")
  .description(chalk.yellow("Generate meaningful commit messages using AI"))
  .version("1.0.1", "-v, --version", chalk.blue("Output the current version"))
  .option("-a, --add", chalk.dim("Auto-stage all changes before commit"), false)
  .option(
    "-i, --interactive",
    chalk.dim("Interactive mode with multiple suggestions"),
    false,
  )
  .option("-s, --staged", chalk.dim("Use staged changes only"), false)
  .option("-q, --quick", chalk.dim("Quick mode: use all changes with Groq model directly"), false)
  .action(async (options) => {
    try {
      let config;
      
      // Handle quick mode with groq
      if (options.quick) {
        // Use groq directly without config setup
        config = {
          provider: "groq" as const,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
        };
        
        // Verify groq API key is available
        if (!process.env.GROQ_API_KEY) {
          throw new Error("GROQ_API_KEY environment variable is required for quick mode. Please set it in your .zshrc file.");
        }
      } else {
        // Check if this is the first run
        if (isFirstRun()) {
          displayBanner();
          config = await firstRunSetup();
        } else {
          // Load existing configuration
          config = loadConfig();
          // Verify API key is available
          await ensureApiKey(config);
        }
      }

      // Initialize generator with config
      const generator = new CommitGenerator(config);

      // Generate commit message
      await generator.generateCommitMessage(options);
    } catch (error) {
      console.error(
        chalk.red.bold("Error: ") + chalk.red((error as Error).message),
      );
      process.exit(1);
    }
  });

// Show help for no arguments
if (process.argv.length <= 2) {
  if (!isFirstRun()) {
    displayBanner();
    displayHelp();
  }
}

program.parse();
