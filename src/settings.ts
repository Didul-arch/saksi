import * as vscode from 'vscode';
import type { Preferences } from './core/prompts';
import { endpoint as checkEndpoint, type ModelConfig } from './core/provider';
import type { ReviewScope } from './core/scope';
import type { Depth } from './core/types';

const config = (scope?: vscode.Uri) => vscode.workspace.getConfiguration('saksi', scope);

/**
 * Endpoint, model and JSON mode are read from User Settings only, so a repository's
 * workspace settings cannot redirect code or keys to another service (UR-04, UR-36).
 */
function userValue<T>(key: string): T | undefined {
  const inspected = config().inspect<T>(key);
  return inspected?.globalValue ?? inspected?.defaultValue;
}

export function modelSettings(): { endpoint: string; model: string; jsonMode: boolean; timeoutSeconds: number } {
  return {
    endpoint: userValue<string>('endpoint') ?? '',
    model: userValue<string>('model') ?? '',
    jsonMode: userValue<boolean>('jsonMode') ?? false,
    timeoutSeconds: config().get<number>('timeoutSeconds', 90),
  };
}

export async function updateModelSettings(endpoint: string, model: string): Promise<void> {
  await config().update('endpoint', endpoint, vscode.ConfigurationTarget.Global);
  await config().update('model', model, vscode.ConfigurationTarget.Global);
}

export const isConfigured = (): boolean => {
  const { endpoint, model } = modelSettings();
  return !!endpoint && !!model;
};

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function activeModelLabel(): string {
  const { endpoint, model } = modelSettings();
  return endpoint && model ? `${model} @ ${hostOf(endpoint)}` : 'Model belum diatur';
}

const secretName = (url: string) => 'key:' + checkEndpoint(url);

export async function modelConfig(secrets: vscode.SecretStorage): Promise<ModelConfig> {
  const settings = modelSettings();
  return { ...settings, apiKey: settings.endpoint ? await secrets.get(secretName(settings.endpoint)) : undefined };
}

export async function storeKey(secrets: vscode.SecretStorage, url: string, key: string | undefined): Promise<void> {
  if (key) await secrets.store(secretName(url), key);
  else await secrets.delete(secretName(url));
}

export async function hasKey(secrets: vscode.SecretStorage, url: string): Promise<boolean> {
  return !!(await secrets.get(secretName(url)));
}

export function reviewSettings(root: vscode.Uri) {
  const c = config(root);
  return {
    excludes: c.get<string[]>('excludePaths', []).filter(item => typeof item === 'string'),
    rules: c.get<boolean>('useProjectRules', true) ? c.get<string[]>('projectRules', []).filter(item => typeof item === 'string' && item.trim()) : [],
    maxContextChars: c.get<number>('maxContextChars', 140_000),
    maxChangedFiles: c.get<number>('maxChangedFiles', 24),
    maxRelatedFiles: c.get<number>('maxRelatedFiles', 8),
    confirmBeforeSend: c.get<'always' | 'whenChanged'>('confirmBeforeSend', 'whenChanged'),
  };
}

export function preferences(): Preferences {
  const c = config();
  return {
    style: (['terse', 'concise', 'educational'] as const).find(v => v === c.get<string>('explanationStyle', 'terse')) ?? 'terse',
    language: c.get<string>('explanationLanguage', 'id') === 'en' ? 'en' : 'id',
    showOptional: c.get<boolean>('showOptionalSuggestions', true),
  };
}

export const defaultDepth = (): Depth => {
  const value = config().get<string>('reviewDepth', 'standard');
  return value === 'quick' || value === 'deep' ? value : 'standard';
};

export const showCompanion = (): boolean => config().get<boolean>('showCompanion', true);
export const inlineHints = (): boolean => config().get<boolean>('inlineHints', true);

export type ScopeKind = ReviewScope['kind'];
