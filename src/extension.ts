import * as vscode from 'vscode';
import { describeScope } from './core/scope';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('saksi.review', () => {
      void vscode.window.showInformationMessage(`Saksi: ${describeScope({ kind: 'saved-since-commit' })} (belum diimplementasikan).`);
    }),
    vscode.commands.registerCommand('saksi.configure', () => {
      void vscode.window.showInformationMessage('Saksi: konfigurasi model belum diimplementasikan.');
    }),
  );
}

export function deactivate(): void {}
