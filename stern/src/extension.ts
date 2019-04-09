import { filter, map } from 'rxjs/operators';
import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import { invokeTracking } from './shell';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('stern.followLogs', followLogs);
    context.subscriptions.push(disposable);
}

async function followLogs(target?: any) {
    const explorer = await k8s.extension.clusterExplorer.v1;
    if (!explorer.available) {
        vscode.window.showErrorMessage(`Command not available: ${explorer.reason}`);
        return;
    }

    const targetNode = explorer.api.resolveCommandTarget(target);
    if (!targetNode) {
        // vscode.window.showInformationMessage('TODO: handle the case where command is invoked from the palette');

        // const tracker = invokeTracking(`stern -l run=logspouter --tail 10 --color never --template "[[{{ .PodName}}/{{ .ContainerName}}]]{{ .Message}}" --timestamps`);
        const tracker = invokeTracking(`stern`, [ '-l', 'run=logspouter', '--tail', '10', '--color', 'never', '--template', '[[{{ .PodName}}/{{ .ContainerName}}]]{{ .Message}}', '--timestamps' ]);
        const logs = tracker.lines.pipe(
            filter((l) => l.startsWith('[[')),
            map((l) => parseLogLine(l)),
            filter((e) => !!e),
            map((e) => e!)
        );
        logs.subscribe((le) => console.log(`|P>> ${le.podName} |C>> ${le.containerName} |T>> ${le.timestamp} |M>> ${le.message}`));

        return;
    }
    if (targetNode.nodeType !== 'resource') {
        vscode.window.showErrorMessage(`Error: unexpected Follow Logs command on a ${targetNode.nodeType} tree node`);
        return;
    }

    if (targetNode.resourceKind.manifestKind === 'Pod') {
        // TODO: tail pod logs
    } else if (targetNode.resourceKind.manifestKind === 'Deployment') {
        // TODO: tail deployment logs
    } else if (targetNode.resourceKind.manifestKind === 'Service') {
        // TODO: tail service logs - probably the same logic as deployment
    } else {
        vscode.window.showErrorMessage(`Error: unexpected Follow Logs command on a ${targetNode.resourceKind.manifestKind} tree node`);
    }
}

interface LogEntry {
    readonly podName: string;
    readonly containerName: string;
    readonly timestamp: string;
    readonly message: string;
}

const LOG_LINE_FORMAT = /\[\[([^/]+)\/([^\]]+)\]\](.+)/;

function parseLogLine(line: string): LogEntry | undefined {
    const match = LOG_LINE_FORMAT.exec(line);
    if (match) {
        const podName = match[1];
        const containerName = match[2];
        const timestampAndMessage = match[3];
        const timestampLength = timestampAndMessage.indexOf(' ');
        const timestamp = timestampAndMessage.substring(0, timestampLength);
        const message = timestampAndMessage.substring(timestampLength + 1).trim();
        return { podName, containerName, timestamp, message };
    }
    return undefined;
}

export function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}
