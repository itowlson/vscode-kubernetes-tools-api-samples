import * as rx from 'rxjs';
import * as spawnrx from 'spawn-rx';

// TODO: can probably get rid of this now though would be nice
// to have a kill feature
export interface RunningProcess {
    readonly lines: rx.Observable<string>;
}

export function invokeTracking(command: string, args: string[]): RunningProcess {
    console.log("INVOKING " + command);
    const linesSubject = new rx.Subject<string>();
    let PENDING = '';
    const obs = spawnrx.spawn(command, args);
    obs.subscribe((chunk) => {
        const todo = PENDING + chunk;
        const lines = todo.split('\n').map((l) => l.trim());
        const isWhole = todo.endsWith('\n');
        PENDING = isWhole ? '' : lines.pop()!;
        for (const line of lines) {
            linesSubject.next(line);
        }
    });
    return { lines: linesSubject };
}
