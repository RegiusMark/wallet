export class Logger {
  public readonly prefix: string;

  public constructor(namespace: string) {
    this.prefix = `[${namespace}]`;
  }

  public info(...args: any) {
    console.log(this.formatArgs(args));
  }

  public error(...args: any) {
    console.error(this.formatArgs(args));
  }

  private formatArgs(args: any[]): string {
    let str = this.prefix;
    for (const arg of args) {
      if (arg instanceof Error) {
        str += ' ' + arg.stack + '\n';
      } else {
        str += ' ' + arg;
      }
    }
    return str;
  }
}
