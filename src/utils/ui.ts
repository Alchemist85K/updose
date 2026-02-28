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

type LineStatus = 'pending' | 'success' | 'fail';

export function createMultiSpinner(labels: string[]) {
  const isTTY = process.stderr.isTTY ?? false;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const statuses: LineStatus[] = labels.map(() => 'pending');
  let frameIdx = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let started = false;

  function truncate(text: string): string {
    const cols = process.stderr.columns ?? 80;
    return text.length > cols ? `${text.slice(0, cols - 1)}…` : text;
  }

  function render(): void {
    if (!isTTY) return;
    // Move cursor up to overwrite previous render (except on first render)
    if (started) {
      process.stderr.write(`\x1b[${labels.length}A`);
    }
    started = true;
    const frame = frames[frameIdx++ % frames.length]!;
    for (let i = 0; i < labels.length; i++) {
      const status = statuses[i]!;
      let icon: string;
      if (status === 'success') {
        icon = chalk.green('✓');
      } else if (status === 'fail') {
        icon = chalk.red('✗');
      } else {
        icon = chalk.cyan(frame);
      }
      process.stderr.write(`\x1b[K${icon} ${truncate(labels[i]!)}\n`);
    }
  }

  return {
    start() {
      if (isTTY) {
        render();
        intervalId = setInterval(render, SPINNER_INTERVAL_MS);
      }
      return this;
    },
    markSuccess(index: number) {
      statuses[index] = 'success';
      if (!isTTY) {
        process.stderr.write(`${chalk.green('✓')} ${labels[index]!}\n`);
      }
    },
    markFail(index: number) {
      statuses[index] = 'fail';
      if (!isTTY) {
        process.stderr.write(`${chalk.red('✗')} ${labels[index]!}\n`);
      }
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (isTTY) {
        // Final render to show completed state
        render();
      }
    },
  };
}
