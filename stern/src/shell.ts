import * as rx from 'rxjs';
import * as spawnrx from 'spawn-rx';

// TODO: can probably get rid of this now though would be nice
// to have a kill feature
export interface RunningProcess {
    readonly lines: rx.Observable<string>;
}

export function invokeTracking(command: string, args: string[]): RunningProcess {
    const linesSubject = new rx.Subject<string>();
    let pending = '';
    const stdout = spawnrx.spawn(command, args);
    stdout.subscribe((chunk) => {
        const todo = pending + chunk;
        const lines = todo.split('\n').map((l) => l.trim());
        const lastIsWholeLine = todo.endsWith('\n');
        pending = lastIsWholeLine ? '' : lines.pop()!;
        for (const line of lines) {
            linesSubject.next(line);
        }
    });
    return { lines: linesSubject };
}
