// Minimal stand-in for the 'vscode' module so the extension wiring can run under Vitest.
// Only the API surface Saksi uses is implemented; behaviour is scriptable from tests.

import * as fs from 'node:fs';
import * as path from 'node:path';

type Listener<T> = (value: T) => unknown;

export class EventEmitter<T> {
  private listeners: Listener<T>[] = [];
  event = (listener: Listener<T>) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
  };
  fire(value: T): void {
    for (const l of this.listeners) l(value);
  }
  dispose(): void {
    this.listeners = [];
  }
}

export class Uri {
  private constructor(readonly scheme: string, readonly fsPath: string) {}
  static file(p: string): Uri { return new Uri('file', path.resolve(p)); }
  static parse(value: string): Uri { const [scheme, rest] = value.split(':'); return new Uri(scheme ?? '', rest ?? ''); }
  static joinPath(base: Uri, ...parts: string[]): Uri { return new Uri(base.scheme, path.join(base.fsPath, ...parts)); }
  get path(): string { return this.fsPath; }
  toString(): string { return `${this.scheme}://${this.fsPath}`; }
}

export class Position { constructor(readonly line: number, readonly character: number) {} }
export class Range {
  readonly start: Position;
  readonly end: Position;
  constructor(sl: number, sc: number, el: number, ec: number) { this.start = new Position(sl, sc); this.end = new Position(el, ec); }
}
export class Selection extends Range {
  constructor(start: Position, end: Position) { super(start.line, start.character, end.line, end.character); }
  get isEmpty(): boolean { return this.start.line === this.end.line && this.start.character === this.end.character; }
}
export class Location { constructor(readonly uri: Uri, readonly range: Range) {} }
export class DiagnosticRelatedInformation { constructor(readonly location: Location, readonly message: string) {} }
export enum DiagnosticSeverity { Error = 0, Warning = 1, Information = 2, Hint = 3 }
export class Diagnostic {
  source?: string;
  code?: string | number;
  relatedInformation?: DiagnosticRelatedInformation[];
  constructor(readonly range: Range, readonly message: string, readonly severity: DiagnosticSeverity) {}
}
export class ThemeColor { constructor(readonly id: string) {} }
export class MarkdownString {
  value = '';
  isTrusted: boolean | { enabledCommands: string[] } = false;
  supportHtml = false;
  /** Escapes markdown like VS Code does, so tests can check that model text stays inert. */
  appendText(text: string): this { this.value += text.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, '\\$&'); return this; }
  appendMarkdown(text: string): this { this.value += text; return this; }
}
export enum CommentMode { Editing = 0, Preview = 1 }
export enum CommentThreadCollapsibleState { Collapsed = 0, Expanded = 1 }

export interface MockThread {
  uri: Uri;
  range: Range;
  comments: { body: MarkdownString; author: { name: string } }[];
  canReply: boolean;
  label?: string;
  contextValue?: string;
  collapsibleState: CommentThreadCollapsibleState;
  disposed: boolean;
  dispose(): void;
}
export class CodeActionKind { static readonly QuickFix = new CodeActionKind(); }
export class CodeAction {
  command?: unknown;
  diagnostics?: Diagnostic[];
  constructor(readonly title: string, readonly kind: CodeActionKind) {}
}
export enum StatusBarAlignment { Left = 1, Right = 2 }
export enum ConfigurationTarget { Global = 1, Workspace = 2 }
export enum TextEditorRevealType { InCenterIfOutsideViewport = 2 }
export enum ProgressLocation { Notification = 15 }

const disposable = { dispose: () => undefined };

// --- Scriptable state

export const mock = {
  settings: {} as Record<string, unknown>,
  workspaceFolders: [] as { uri: Uri; name: string; index: number }[],
  /** Answers for modal/notification prompts, matched by substring of the message. */
  answers: [] as { match: string; answer: string | undefined }[],
  prompts: [] as string[],
  diagnostics: new Map<string, Diagnostic[]>(),
  threads: [] as MockThread[],
  commands: new Map<string, (...args: unknown[]) => unknown>(),
  webviewProviders: new Map<string, { resolveWebviewView(view: unknown): void }>(),
  clipboard: '',
  watchers: [] as { change: EventEmitter<Uri> }[],
  textDocuments: [] as unknown[],
  shown: [] as string[],
  /** Scripted answers for input boxes (in order) and quick picks (matched by label). */
  inputs: [] as (string | undefined)[],
  picks: [] as string[],
  reset(): void {
    this.settings = {};
    this.workspaceFolders = [];
    this.answers = [];
    this.prompts = [];
    this.diagnostics.clear();
    this.threads = [];
    this.commands.clear();
    this.webviewProviders.clear();
    this.clipboard = '';
    this.watchers = [];
    this.textDocuments = [];
    this.shown = [];
    this.inputs = [];
    this.picks = [];
  },
};

function answer(message: string, ...rest: unknown[]): Promise<string | undefined> {
  mock.prompts.push(message);
  const index = mock.answers.findIndex(a => message.includes(a.match));
  if (index >= 0) return Promise.resolve(mock.answers.splice(index, 1)[0]!.answer);
  const items = rest.filter(item => typeof item === 'string') as string[];
  void items;
  return Promise.resolve(undefined);
}

function textDocument(uri: Uri) {
  const text = uri.scheme === 'file' ? fs.readFileSync(uri.fsPath, 'utf8') : '';
  return { uri, isDirty: false, getText: () => text, save: async () => true };
}

export const window = {
  activeTextEditor: undefined as unknown,
  visibleTextEditors: [] as unknown[],
  createStatusBarItem: () => ({ text: '', tooltip: '', command: '', show: () => undefined, dispose: () => undefined }),
  createTextEditorDecorationType: () => disposable,
  showInformationMessage: answer,
  showWarningMessage: answer,
  showErrorMessage: answer,
  showInputBox: async () => mock.inputs.shift(),
  showQuickPick: async <T extends { label: string }>(items: T[] | Thenable<T[]>) => {
    const list = await items;
    return list.find(item => item.label === mock.picks[0]) && list.find(item => item.label === mock.picks.shift());
  },
  showTextDocument: async (doc: { uri: Uri }) => {
    mock.shown.push(doc.uri.fsPath);
    return { selection: undefined, revealRange: () => undefined, document: doc };
  },
  withProgress: async (_o: unknown, task: (p: unknown, t: unknown) => unknown) => task({}, { onCancellationRequested: () => disposable }),
  registerWebviewViewProvider: (id: string, provider: { resolveWebviewView(view: unknown): void }) => {
    mock.webviewProviders.set(id, provider);
    return disposable;
  },
  onDidChangeVisibleTextEditors: () => disposable,
};

export const workspace = {
  isTrusted: true,
  get workspaceFolders() { return mock.workspaceFolders; },
  get textDocuments() { return mock.textDocuments; },
  getWorkspaceFolder: (uri: Uri) => mock.workspaceFolders.find(f => uri.fsPath.startsWith(f.uri.fsPath)),
  getConfiguration: (section: string) => ({
    get: <T>(key: string, fallback?: T): T => (mock.settings[`${section}.${key}`] as T) ?? (fallback as T),
    inspect: <T>(key: string) => ({ globalValue: mock.settings[`${section}.${key}`] as T | undefined, defaultValue: undefined }),
    update: async (key: string, value: unknown) => { mock.settings[`${section}.${key}`] = value; },
  }),
  openTextDocument: async (uri: Uri) => textDocument(uri),
  createFileSystemWatcher: () => {
    const change = new EventEmitter<Uri>();
    mock.watchers.push({ change });
    return { onDidChange: change.event, onDidCreate: () => disposable, onDidDelete: () => disposable, dispose: () => undefined };
  },
  onDidChangeTextDocument: () => disposable,
  onDidChangeConfiguration: () => disposable,
  registerTextDocumentContentProvider: () => disposable,
};

export const languages = {
  createDiagnosticCollection: () => ({
    set: (uri: Uri, entries: Diagnostic[]) => mock.diagnostics.set(uri.fsPath, entries),
    clear: () => mock.diagnostics.clear(),
    dispose: () => undefined,
  }),
  registerCodeActionsProvider: () => disposable,
  getDiagnostics: () => [],
};

export const comments = {
  createCommentController: () => ({
    options: {},
    createCommentThread: (uri: Uri, range: Range, list: MockThread['comments']) => {
      const thread: MockThread = {
        uri, range, comments: list, canReply: true, collapsibleState: CommentThreadCollapsibleState.Collapsed, disposed: false,
        dispose() { this.disposed = true; },
      };
      mock.threads.push(thread);
      return thread;
    },
    dispose: () => undefined,
  }),
};

export const commands = {
  registerCommand: (id: string, fn: (...args: unknown[]) => unknown) => {
    mock.commands.set(id, fn);
    return disposable;
  },
  executeCommand: async (id: string, ...args: unknown[]) => {
    const fn = mock.commands.get(id);
    return fn ? fn(...args) : undefined;
  },
};

export const env = {
  clipboard: { writeText: async (text: string) => { mock.clipboard = text; } },
};
