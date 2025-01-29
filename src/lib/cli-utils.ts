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

export interface Config {
  type: "anthropic" | "ollama";
  model: string;
  apiKey?: string;
  host?: string;
  port?: number;
}

export function loadConfig(): Config {
  const defaultConfig: Config = {
    type: "ollama",
    model: "deepseek-r1:latest",
    host: "http://localhost",
    port: 11434,
  };

  try {
    const configPath = path.join(os.homedir(), ".commitrc");
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
    const configPath = path.join(os.homedir(), ".commitrc");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(formatSuccess("Configuration saved successfully"));
  } catch (error) {
    console.error(formatError("Failed to save configuration"));
    throw error;
  }
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
  console.log(chalk.dim(diff));

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

  const { type } = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "Select the model type:",
      choices: [
        { name: "Anthropic (Claude)", value: "anthropic" },
        { name: "Ollama (Local)", value: "ollama" },
      ],
      default: currentConfig.type,
    },
  ]);

  let config: Config = {
    type,
    model: currentConfig.model,
  };

  if (type === "anthropic") {
    const { apiKey } = await inquirer.prompt([
      {
        type: "input",
        name: "apiKey",
        message:
          "Enter your Anthropic API key (or leave empty to use ANTHROPIC_API_KEY env variable):",
        default: currentConfig.apiKey || "",
      },
    ]);

    if (apiKey) {
      config.apiKey = apiKey;
    }

    const { model } = await inquirer.prompt([
      {
        type: "list",
        name: "model",
        message: "Select Claude model:",
        choices: [
          { name: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
          { name: "Claude 3 Opus", value: "claude-3-opus-20240229" },
        ],
        default: currentConfig.model,
      },
    ]);

    config.model = model;
  } else if (type === "ollama") {
    const { model } = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Enter Ollama model name:",
        default: currentConfig.model || "deepseek-coder:6.7b",
      },
    ]);

    const { host } = await inquirer.prompt([
      {
        type: "input",
        name: "host",
        message: "Enter Ollama host:",
        default: currentConfig.host || "http://localhost",
      },
    ]);

    const { port } = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: "Enter Ollama port:",
        default: currentConfig.port || 11434,
        validate: (value) => {
          const port = parseInt(value);
          if (isNaN(port) || port < 1 || port > 65535) {
            return "Please enter a valid port number (1-65535)";
          }
          return true;
        },
      },
    ]);

    config = {
      ...config,
      model,
      host,
      port: parseInt(port),
    };
  }

  await saveConfig(config);
  return config;
}

export async function checkModelAvailability(config: Config): Promise<boolean> {
  if (config.type === "ollama") {
    try {
      const response = await fetch(`${config.host}:${config.port}/api/tags`);
      if (!response.ok) {
        throw new Error("Failed to connect to Ollama");
      }

      const data = await response.json();
      const models = data.models || [];
      return models.some((m: any) => m.name === config.model);
    } catch (error) {
      console.error(
        formatError(
          `Failed to connect to Ollama at ${config.host}:${config.port}`,
        ),
      );
      return false;
    }
  }

  // For Anthropic, we'll check if the API key is available
  if (config.type === "anthropic") {
    return !!(config.apiKey || process.env.ANTHROPIC_API_KEY);
  }

  return false;
}

export async function ensureModelAvailable(config: Config): Promise<void> {
  if (!(await checkModelAvailability(config))) {
    if (config.type === "ollama") {
      console.log(
        formatInfo(`Model ${config.model} not found. Pulling from Ollama...`),
      );
      try {
        const response = await fetch(`${config.host}:${config.port}/api/pull`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: config.model,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to pull model: ${response.statusText}`);
        }

        console.log(formatSuccess(`Successfully pulled ${config.model}`));
      } catch (error) {
        throw new Error(`Failed to pull model ${config.model}: ${error}`);
      }
    } else {
      throw new Error(
        'No valid API key found for Anthropic. Please run "commit config" to set up your configuration.',
      );
    }
  }
}
