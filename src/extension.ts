import * as vscode from 'vscode';
import { Controller } from './controller';
import { codeActions, EditorUi } from './editorUi';
import { PreviewProvider } from './preview';
import { clearKey, configure, setKey, testConnection } from './setup';
import { Companion } from './view';

export function activate(context: vscode.ExtensionContext): void {
  const editorUi = new EditorUi(vscode.Uri.joinPath(context.extensionUri, 'media', 'owl.svg'));
  const previewer = new PreviewProvider();
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  status.command = 'saksi.show';
  status.show();
  const controller = new Controller(context, editorUi, status, previewer);
  const companion = new Companion(context.extensionUri, controller);
  controller.attach(companion);

  const register = (name: string, fn: (...args: never[]) => unknown) => context.subscriptions.push(vscode.commands.registerCommand(name, fn));
  register('saksi.review', () => controller.review());
  register('saksi.reviewFile', () => controller.review({ scopeKind: 'files' }));
  register('saksi.reviewSelection', () => controller.review({ scopeKind: 'selection' }));
  register('saksi.reviewStaged', () => controller.review({ scopeKind: 'staged' }));
  register('saksi.setIntent', async () => {
    const value = await vscode.window.showInputBox({
      title: 'Saksi · Tujuan perubahan',
      prompt: 'Berlaku untuk review berikutnya, dari tombol maupun shortcut. Kosongkan untuk menghapus.',
      value: controller.intent,
      ignoreFocusOut: true,
    });
    if (value !== undefined) await controller.setIntent(value);
  });
  register('saksi.cancel', () => controller.cancel());
  register('saksi.clear', () => controller.clear());
  register('saksi.show', () => companion.show());
  register('saksi.copySummary', () => controller.copySummary());
  register('saksi.configure', () => configure(context.secrets).then(() => controller.publish()));
  register('saksi.setApiKey', () => setKey(context.secrets));
  register('saksi.clearApiKey', () => clearKey(context.secrets));
  register('saksi.testConnection', () => testConnection(context.secrets));
  register('saksi.forgetFeedback', () => controller.forgetAllFeedback());
  register('saksi.showFinding', (id: string) => controller.open(id));
  register('saksi.openEvidence', (id: string, index: number) => controller.open(id, index));
  register('saksi.markFinding', (id: string, kind: 'intentional' | 'wrong') => controller.setFeedback(id, kind));
  const threadId = (thread: vscode.CommentThread) => editorUi.idOf(thread);
  register('saksi.inlineAsk', (reply: vscode.CommentReply) => { const id = threadId(reply.thread); return id && controller.ask(id, reply.text, 'question'); });
  register('saksi.inlineClarify', (reply: vscode.CommentReply) => { const id = threadId(reply.thread); return id && controller.ask(id, reply.text, 'clarification'); });
  register('saksi.inlineFeedback', (thread: vscode.CommentThread) => { const id = threadId(thread); return id && controller.feedbackFromThread(id); });

  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  const changed = (uri: vscode.Uri) => void controller.onChanged(uri);
  context.subscriptions.push(
    editorUi, previewer, status, watcher, controller,
    vscode.workspace.registerTextDocumentContentProvider(PreviewProvider.scheme, previewer),
    vscode.window.registerWebviewViewProvider(Companion.id, companion, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, codeActions(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
    watcher.onDidChange(changed), watcher.onDidCreate(changed), watcher.onDidDelete(changed),
    vscode.workspace.onDidChangeTextDocument(event => { if (event.contentChanges.length) changed(event.document.uri); }),
    vscode.window.onDidChangeVisibleTextEditors(() => editorUi.decorate()),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('saksi.excludePaths') || event.affectsConfiguration('saksi.endpoint') || event.affectsConfiguration('saksi.model')) {
        controller.invalidate('Pengaturan layanan atau pengecualian berubah. Jalankan review lagi agar hasil sesuai pengaturan baru.');
      }
      if (event.affectsConfiguration('saksi')) controller.publish();
    }),
  );
}

export function deactivate(): void {}
