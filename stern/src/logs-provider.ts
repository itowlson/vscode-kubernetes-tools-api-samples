import * as vscode from 'vscode';
import { LogEntry } from './log-entry';
import { Observable } from 'rxjs';

export const LOGS_SCHEME = "sternlogs";
export const LOGS_AUTHORITY = "sternlogs";  // TODO: should probably be a context

const header = [
    '| Pod | Container | Timestamp | Message |',
    '|-----|-----------|-----------|---------|'
];

export class LogsDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private readonly registry: { [key: string]: [Observable<LogEntry>, LogEntry[]] } = {};

    private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const resourceId = uri.path.substring(1);
        const logEntries = this.registry[resourceId][1];
        const logEntriesText = logEntries.map((le) => `| ${le.podName} | ${le.containerName} | ${le.timestamp} | ${le.message} |`);
        const rows = header.concat(...logEntriesText);
        return rows.join('\n');
    }

    register(resourceId: string, logs: Observable<LogEntry>): void {
        this.registry[resourceId] = [logs, []];
        const uri = uriOf(resourceId);
        logs.subscribe((l) => {
            this.registry[resourceId][1].push(l);
            this.onDidChangeEmitter.fire(uri);
        });
    }
}

export function uriOf(resourceId: string): vscode.Uri {
    return vscode.Uri.parse(`${LOGS_SCHEME}://${LOGS_AUTHORITY}/${resourceId}`);
}
