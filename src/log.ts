export class Logger {
  public readonly prefix: string;

  public constructor(namespace: string) {
    this.prefix = `[${namespace}]`;
  }

  public info(...args: any): void {
    console.log(this.formatArgs(args));
  }

  public error(...args: any): void {
    console.error(this.formatArgs(args));
  }

  private formatArgs(args: any[]): string {
    let str = this.prefix;
    for (const arg of args) {
      if (arg instanceof Error) {
        str += ' ' + arg.stack + '\n';
      } else if (typeof arg === 'object') {
        str += ' ' + JSON.stringify(arg, undefined, '  ');
      } else {
        str += ' ' + arg;
      }
    }
    return str;
  }
}
