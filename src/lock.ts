export class Lock {
  private _locked: boolean = false;
  private handles: Function[] = [];

  get locked(): boolean {
    return this._locked;
  }

  lock(): Promise<void> {
    return new Promise(resolve => {
      if (this._locked) {
        return this.handles.push(resolve);
      }
      this._locked = true;
      resolve();
    });
  }

  unlock(): void {
    const resolver = this.handles.shift();
    if (resolver) {
      setImmediate(() => {
        resolver();
      });
    } else {
      this._locked = false;
    }
  }
}
