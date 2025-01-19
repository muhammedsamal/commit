#!/usr/bin/env bun
import { program } from "commander";
import { CommitGenerator } from "./lib/commit-generator";

// Set up CLI
program
  .name("commit")
  .description("AI-powered git commit message generator")
  .version("0.1.0");

program
  .command("commit")
  .description("Generate commit message from git diff")
  .option("-s, --staged", "Use staged changes only", false)
  .option("-i, --interactive", "Interactive mode", false)
  .action(async (options) => {
    const generator = new CommitGenerator();
    await generator.generateCommitMessage(options);
  });

program.parse();
