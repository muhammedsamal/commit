#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { CommitGenerator } from "./lib/commit-generator";

const displayBanner = () => {
  console.log(
    chalk.cyan(`
   ______                          _ __
  / ____/___  ____ ___  ____ ___  (_) /_
 / /   / __ \\/ __ \`__ \\/ __ \`__ \\/ / __/
/ /___/ /_/ / / / / / / / / / / / / /_
\\____/\\____/_/ /_/ /_/_/ /_/ /_/_/\\__/
`),
  );

  console.log(chalk.dim("✨ AI-Powered Git Commit Message Generator ✨\n"));
  console.log(chalk.white.bold("Version: ") + chalk.green("0.1.0"));
  console.log(chalk.white.bold("Author: ") + chalk.green("Muhammed Samal"));
  console.log(chalk.white.bold("License: ") + chalk.green("MIT\n"));
};

const displayHelp = () => {
  console.log(chalk.yellow.bold("\nExample Usage:"));
  console.log(chalk.dim("─────────────"));
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit")}                ${chalk.dim("# Generate commit message for staged changes")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -a")}             ${chalk.dim("# Auto-stage and commit all changes")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -i")}             ${chalk.dim("# Use interactive mode")}`,
  );
  console.log(
    `${chalk.cyan("$")} ${chalk.green("commit -a -i")}          ${chalk.dim("# Interactive mode with auto-staging")}\n`,
  );
};

// Display banner before setting up CLI
displayBanner();

// Set up CLI with enhanced descriptions
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
  .action(async (options) => {
    try {
      const generator = new CommitGenerator();
      await generator.generateCommitMessage(options);
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
