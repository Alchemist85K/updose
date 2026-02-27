import chalk from 'chalk';

const SPINNER_INTERVAL_MS = 80;

export function success(message: string): void {
  console.log(`${chalk.green('✓')} ${message}`);
}

export function error(message: string): void {
  console.error(`${chalk.red('✗')} ${message}`);
}

export function warn(message: string): void {
  console.log(`${chalk.yellow('⚠')} ${message}`);
}

export function info(message: string): void {
  console.log(`${chalk.blue('ℹ')} ${message}`);
}

export function createSpinner(message: string) {
  const isTTY = process.stderr.isTTY ?? false;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (!isTTY) return this;
      intervalId = setInterval(() => {
        const frame = frames[i++ % frames.length]!;
        process.stderr.write(`\r${chalk.cyan(frame)} ${message}`);
      }, SPINNER_INTERVAL_MS);
      return this;
    },
    success(msg?: string) {
      this.clear();
      success(msg ?? message);
    },
    fail(msg?: string) {
      this.clear();
      error(msg ?? message);
    },
    stop() {
      this.clear();
    },
    clear() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (isTTY) {
        process.stderr.write('\r\x1b[K');
      }
    },
  };
}
