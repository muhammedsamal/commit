import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import fs from "fs";
import path from "path";
import os from "os";

export const spinner = ora({
  spinner: "dots",
  color: "blue",
});

export const formatSuccess = (text: string) => chalk.green("✓ ") + text;
export const formatError = (text: string) => chalk.red("✗ ") + text;
export const formatInfo = (text: string) => chalk.blue("ℹ ") + text;

export interface CommitChoice {
  message: string;
  analysis: string;
}

export type ProviderType = "openai" | "anthropic" | "google" | "groq";

export interface Config {
  provider: ProviderType;
  model: string;
  apiKey?: string;
}

function getConfigPath(): string {
  return path.join(os.homedir(), ".commitrc");
}

export function isFirstRun(): boolean {
  return !fs.existsSync(getConfigPath());
}

export function loadConfig(): Config {
  const defaultConfig: Config = {
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
  };

  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return { ...defaultConfig, ...config };
    }
  } catch (error) {
    console.warn(formatInfo("Failed to load config, using defaults"));
  }

  return defaultConfig;
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(formatSuccess("Configuration saved successfully"));
  } catch (error) {
    console.error(formatError("Failed to save configuration"));
    throw error;
  }
}

export async function firstRunSetup(): Promise<Config> {
  console.log(chalk.cyan.bold("\n🎉 Welcome to Commit!"));
  console.log(chalk.dim("Let's get you set up with an AI provider to generate commit messages.\n"));

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Which AI provider would you like to use?",
      choices: [
        { 
          name: "Groq (Fast, Free tier available) [Default]", 
          value: "groq",
          short: "Groq"
        },
        { 
          name: "Google Gemini (Free tier available)", 
          value: "google",
          short: "Google"
        },
        { 
          name: "OpenAI GPT (Paid)", 
          value: "openai",
          short: "OpenAI"
        },
        { 
          name: "Anthropic Claude (Paid)", 
          value: "anthropic",
          short: "Anthropic"
        },
      ],
    },
  ]);

  // Get API key from environment variables
  const envKeyMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY", 
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
    groq: "GROQ_API_KEY",
  };

  const providerNames = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    groq: "Groq",
  };

  console.log(chalk.yellow(`\n📋 Make sure you have set the ${envKeyMap[provider as keyof typeof envKeyMap]} environment variable.`));
  console.log(chalk.dim(`You can add it to your .zshrc file: export ${envKeyMap[provider as keyof typeof envKeyMap]}=your_api_key_here\n`));

  // Get model selection
  const modelChoices = {
    openai: [
      { name: "GPT-4.1 Mini", value: "gpt-4.1-mini" },
    ],
    anthropic: [
      { name: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    ],
    google: [
      { name: "Gemini 2.0 Flash (Experimental)", value: "gemini-2.0-flash-001" },
    ],
    groq: [
      { name: "Llama 4 Scout 17B", value: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { name: "Llama 3.1 70B Versatile", value: "llama-3.1-70b-versatile" },
      { name: "Llama 3.1 8B Instant", value: "llama-3.1-8b-instant" },
    ],
  };

      const { model } = await inquirer.prompt([
      {
        type: "list",
        name: "model",
        message: `Select ${providerNames[provider as keyof typeof providerNames]} model:`,
        choices: modelChoices[provider as keyof typeof modelChoices],
      },
    ]);

  const config: Config = {
    provider,
    model,
  };

  await saveConfig(config);
  
  console.log(chalk.green.bold("\n✅ Setup complete!"));
  console.log(chalk.dim("You can now use 'commit' to generate commit messages."));
  console.log(chalk.dim("Run 'commit config' anytime to change your settings.\n"));

  return config;
}

export async function promptForCommitMessage(
  choices: CommitChoice[],
): Promise<string> {
  const { message } = await inquirer.prompt([
    {
      type: "list",
      name: "message",
      message: "Select a commit message:",
      choices: choices.map((choice) => ({
        name: `${choice.message}\n${chalk.dim(choice.analysis)}`,
        value: choice.message,
      })),
      pageSize: 10,
    },
  ]);

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: "Would you like to edit this message?",
      default: false,
    },
  ]);

  if (confirmed) {
    const { editedMessage } = await inquirer.prompt([
      {
        type: "input",
        name: "editedMessage",
        message: "Edit commit message:",
        default: message,
      },
    ]);
    return editedMessage;
  }

  return message;
}

export async function confirmCommit(
  message: string,
  diff: string,
): Promise<boolean> {
  console.log("\nChanges to be committed:");
  console.log(chalk.dim(diff.slice(0, 500) + (diff.length > 500 ? "..." : "")));

  console.log("\nCommit message:");
  console.log(chalk.yellow(message));

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: "Do you want to commit these changes?",
      default: true,
    },
  ]);

  return confirmed;
}

export function displayGenerationError(error: Error): void {
  console.error(formatError("Failed to generate commit message:"));
  console.error(chalk.red(error.message));
  process.exit(1);
}

export async function setupConfig(): Promise<Config> {
  const currentConfig = loadConfig();

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Select the AI provider:",
      choices: [
        { name: "Google (Gemini)", value: "google" },
        { name: "OpenAI (GPT)", value: "openai" },
        { name: "Anthropic (Claude)", value: "anthropic" },
        { name: "Groq (Fast inference)", value: "groq" },
      ],
      default: currentConfig.provider,
    },
  ]);

  let config: Config = {
    provider,
    model: currentConfig.model,
  };

  // API keys will be read from environment variables
  const envKeyMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY", 
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
    groq: "GROQ_API_KEY",
  };

  console.log(chalk.yellow(`\n📋 Make sure you have set the ${envKeyMap[provider as keyof typeof envKeyMap]} environment variable.`));
  console.log(chalk.dim(`You can add it to your .zshrc file: export ${envKeyMap[provider as keyof typeof envKeyMap]}=your_api_key_here\n`));

  // Get model selection
  const modelChoices = {
    openai: [
      { name: "GPT-4.1 Mini", value: "gpt-4.1-mini" },
    ],
    anthropic: [
      { name: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    ],
    google: [
      { name: "Gemini 2.0 Flash (Experimental)", value: "gemini-2.0-flash-001" },
    ],
    groq: [
      { name: "Llama 4 Scout 17B", value: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { name: "Llama 3.1 70B Versatile", value: "llama-3.1-70b-versatile" },
      { name: "Llama 3.1 8B Instant", value: "llama-3.1-8b-instant" },
    ],
  };

  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: `Select ${provider} model:`,
      choices: modelChoices[provider as keyof typeof modelChoices],
      default: currentConfig.model,
    },
  ]);

  config.model = model;

  await saveConfig(config);
  return config;
}

export async function ensureApiKey(config: Config): Promise<void> {
  const envKeyMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY", 
    groq: "GROQ_API_KEY",
  };

  const envKey = envKeyMap[config.provider];
  const hasEnvKey = !!process.env[envKey];
  const hasConfigKey = !!config.apiKey;

  if (!hasEnvKey && !hasConfigKey) {
    throw new Error(
      `No API key found for ${config.provider}. Please set ${envKey} environment variable or run 'commit config' to configure it.`
    );
  }
}
