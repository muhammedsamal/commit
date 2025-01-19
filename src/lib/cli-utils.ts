import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

export const spinner = ora({
  spinner: 'dots',
  color: 'blue',
});

export const formatSuccess = (text: string) => chalk.green('✓ ') + text;
export const formatError = (text: string) => chalk.red('✗ ') + text;
export const formatInfo = (text: string) => chalk.blue('ℹ ') + text;

export interface CommitChoice {
  message: string;
  analysis: string;
}

export async function promptForCommitMessage(choices: CommitChoice[]): Promise<string> {
  const { message } = await inquirer.prompt([
    {
      type: 'list',
      name: 'message',
      message: 'Select a commit message:',
      choices: choices.map(choice => ({
        name: `${choice.message}\n${chalk.dim(choice.analysis)}`,
        value: choice.message,
      })),
      pageSize: 10,
    },
  ]);

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Would you like to edit this message?',
      default: false,
    },
  ]);

  if (confirmed) {
    const { editedMessage } = await inquirer.prompt([
      {
        type: 'input',
        name: 'editedMessage',
        message: 'Edit commit message:',
        default: message,
      },
    ]);
    return editedMessage;
  }

  return message;
}

export async function confirmCommit(message: string, diff: string): Promise<boolean> {
  console.log('\nChanges to be committed:');
  console.log(chalk.dim(diff));
  
  console.log('\nCommit message:');
  console.log(chalk.yellow(message));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Do you want to commit these changes?',
      default: true,
    },
  ]);

  return confirmed;
}

export function displayGenerationError(error: Error): void {
  console.error(formatError('Failed to generate commit message:'));
  console.error(chalk.red(error.message));
  process.exit(1);
}