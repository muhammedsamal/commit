#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { CommitGenerator } from "./lib/commit-generator";
import {
  loadConfig,
  setupConfig,
  ensureModelAvailable,
  formatError,
  formatSuccess,
} from "./lib/cli-utils";

const displayBanner = () => {
  console.log(
    chalk.cyan(`
   ______                          *_*
  / ____/___  ____ ___  ____ ___  (_) /_
 / /   / ** \\/ ** \`__ \\/ ** \`** \\/ / __/
/ /___/ /_/ / / / / / / / / / / / / /_
\\____/\\____/_/ /_/ /_/_/ /_/ /_/_/\\__/
`),
  );
  console.log(chalk.dim("✨ AI-Powered Git Commit Message Generator ✨\n"));
  console.log(chalk.white.bold("Version: ") + chalk.green("1.0.2"));
  console.log(chalk.white.bold("Author: ") + chalk.green("Muhammed Samal"));
  console.log(chalk.white.bold("License: ") + chalk.green("MIT\n"));
};

const displayHelp = () => {
  console.log(chalk.yellow.bold("\nExample Usage:"));
  console.log(chalk.dim("─────────────"));
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit")}                ${chalk.dim("# Generate commit message using Deepseek (default)")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -a")}             ${chalk.dim("# Auto-stage and commit all changes")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -i")}             ${chalk.dim("# Use interactive mode")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit --cloud")}        ${chalk.dim("# Use Anthropic Claude instead of Deepseek")}\n`,
  );
};

// Display banner before setting up CLI
displayBanner();

// Add config command
program
  .command("config")
  .description(chalk.dim("Configure model settings"))
  .action(async () => {
    try {
      const config = await setupConfig();
      console.log(formatSuccess("Configuration updated successfully!"));
      // Verify model availability
      await ensureModelAvailable(config);
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

// Set up main CLI command with enhanced descriptions
program
  .name("commit")
  .description(chalk.yellow("Generate meaningful commit messages using AI"))
  .version("0.1.0", "-v, --version", chalk.blue("Output the current version"))
  .option("-a, --add", chalk.dim("Auto-stage all changes before commit"), false)
  .option(
    "-i, --interactive",
    chalk.dim("Interactive mode with multiple suggestions"),
    false,
  )
  .option("-s, --staged", chalk.dim("Use staged changes only"), false)
  .option(
    "--cloud",
    chalk.dim("Use Anthropic Claude instead of Deepseek"),
    false,
  )
  .option(
    "-m, --model <model>",
    chalk.dim("Specify model to use (e.g., deepseek-coder:6.7b)"),
  )
  .action(async (options) => {
    try {
      // Load configuration with Deepseek as default
      const defaultConfig = {
        type: "ollama",
        model: "deepseek-r1:latest",
        host: "http://localhost",
        port: 11434,
      };

      const config = { ...defaultConfig, ...loadConfig() };

      // Override config with CLI options if provided
      if (options.cloud) {
        config.type = "anthropic";
        config.model = "claude-3-sonnet-20240229";
      }
      if (options.model) {
        config.model = options.model;
      }

      // Verify model availability
      await ensureModelAvailable(config);

      // Initialize generator with config
      const generator = new CommitGenerator(config);

      // Add model-specific options to the commit options
      const commitOptions = {
        ...options,
        useOllama: config.type === "ollama",
        model: config.model,
      };

      await generator.generateCommitMessage(commitOptions);
    } catch (error) {
      console.error(
        chalk.red.bold("Error: ") + chalk.red((error as Error).message),
      );
      process.exit(1);
    }
  });

// Add custom help text
if (process.argv.length <= 2) {
  displayHelp();
}

program.parse();
