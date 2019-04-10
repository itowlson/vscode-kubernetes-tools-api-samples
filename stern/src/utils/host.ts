import * as vscode from 'vscode';

import { Cancellable, CANCELLED } from "./cancellable";

export async function promptMany<T>(optionsPrompt: string, options: { [key in keyof T]: vscode.InputBoxOptions }): Promise<Cancellable<{ [key in keyof T]?: string }>> {
    const selectedOptions = await vscode.window.showQuickPick(Object.keys(options), { canPickMany: true, placeHolder: optionsPrompt });
    if (!selectedOptions || selectedOptions.length === 0) {
        return CANCELLED;
    }
    const result: { [key in keyof T]?: string } = {};
    for (const option of (Object.keys(options) as (keyof T)[])) {
        result[option] = undefined;
    }
    for (const option of (selectedOptions as (keyof T)[])) {
        const optionValue = await vscode.window.showInputBox(options[option]);
        if (optionValue === undefined) {
            return CANCELLED;
        }
        result[option] = optionValue;
    }
    return { cancelled: false, value: result };
}
