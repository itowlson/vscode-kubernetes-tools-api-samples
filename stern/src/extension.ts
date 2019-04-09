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
    const kubectl = await k8s.extension.kubectl.v1;
    if (!kubectl.available) {
        vscode.window.showErrorMessage(`Command not available: ${kubectl.reason}`);
        return;
    }

    const targetNode = explorer.api.resolveCommandTarget(target);
    if (!targetNode) {
        vscode.window.showInformationMessage('TODO: handle the case where command is invoked from the palette');
        return;
    }
    if (targetNode.nodeType !== 'resource') {
        vscode.window.showErrorMessage(`Error: unexpected Follow Logs command on a ${targetNode.nodeType} tree node`);
        return;
    }

    const tailTarget = await tailTargetFor(targetNode, kubectl.api);

    if (!tailTarget) {
        vscode.window.showErrorMessage(`Error: unexpected Follow Logs command on a ${targetNode.resourceKind.manifestKind} tree node`);
        return;
    }

    tailLogsFor(tailTarget);
}

interface LogTailTarget {
    readonly podFilter: string | undefined;
    readonly selector: string | undefined;
}

async function tailTargetFor(node: k8s.ClusterExplorerV1.ClusterExplorerResourceNode, kubectl: k8s.KubectlV1): Promise<LogTailTarget | undefined> {
    if (node.resourceKind.manifestKind === 'Pod') {
        return { podFilter: node.name, selector: undefined };
    } else if (node.resourceKind.manifestKind === 'Deployment') {
        return await selectorTarget(`deployment/${node.name}`, (r) => r.spec.selector.matchLabels, kubectl);
    } else if (node.resourceKind.manifestKind === 'Service') {
        return await selectorTarget(`service/${node.name}`, (r) => r.spec.selector, kubectl);
    } else {
        return undefined;
    }
}

async function selectorQuery(resourceId: string, matchLabelExtractor: (o: any) => any, kubectl: k8s.KubectlV1): Promise<string | undefined> {
    const sr = await kubectl.invokeCommand(`get ${resourceId} -o json`);  // TODO: namespace
    if (!sr || sr.code !== 0) {
        return undefined;
    }
    const resource = JSON.parse(sr.stdout);
    const matchLabels: { [key: string]: string } = matchLabelExtractor(resource);
    const labels = Object.keys(matchLabels).map((k) => `${k}=${matchLabels[k]}`);
    const selector = labels.join(',');
    return selector;
}

async function selectorTarget(resourceId: string, matchLabelExtractor: (o: any) => any, kubectl: k8s.KubectlV1): Promise<LogTailTarget | undefined> {
    const selector = await selectorQuery(resourceId, matchLabelExtractor, kubectl);
    return selector ? { podFilter: undefined, selector: selector } : undefined;
}

function tailLogsFor(target: LogTailTarget): void {
    // const tracker = invokeTracking(`stern -l run=logspouter --tail 10 --color never --template "[[{{ .PodName}}/{{ .ContainerName}}]]{{ .Message}}" --timestamps`);
    const settings = [ '--tail', '10', '--color', 'never', '--template', '[[{{ .PodName}}/{{ .ContainerName}}]]{{ .Message}}', '--timestamps' ];
    const selectorArgs = target.selector ? [ '-l', target.selector ] : [];
    const podFilterArgs = target.podFilter ? [ target.podFilter ] : [];
    const args = podFilterArgs.concat(...selectorArgs, ...settings);
    const tracker = invokeTracking('stern', args);
    const logs = tracker.lines.pipe(
        filter((l) => l.startsWith('[[')),
        map((l) => parseLogLine(l)),
        filter((e) => !!e),
        map((e) => e!)
    );
    logs.subscribe((le) => console.log(`|P>> ${le.podName} |C>> ${le.containerName} |T>> ${le.timestamp} |M>> ${le.message}`));
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
