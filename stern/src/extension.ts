import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('stern.followLogs', followLogs);
    context.subscriptions.push(disposable);
}

function followLogs(_target?: any) {
    vscode.window.showInformationMessage("Let the games begin");
}
