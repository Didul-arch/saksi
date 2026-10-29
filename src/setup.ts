// Model setup, following requirements/diagrams/03-flow-setup-model.md.

import * as vscode from 'vscode';
import { chat, endpoint as checkEndpoint, listModels } from './core/provider';
import { errorMessage } from './core/text';
import { hasKey, hostOf, modelConfig, modelSettings, storeKey, updateModelSettings } from './settings';

export async function configure(secrets: vscode.SecretStorage): Promise<boolean> {
  const current = modelSettings();
  const url = await vscode.window.showInputBox({
    title: 'Saksi · Layanan model (1/3)',
    prompt: 'URL chat-completions lengkap. Kode hanya dikirim ke sini saat kamu menjalankan review.',
    value: current.endpoint || 'http://localhost:1234/v1/chat/completions',
    ignoreFocusOut: true,
    validateInput: value => {
      try {
        checkEndpoint(value);
        return null;
      } catch (error) {
        return errorMessage(error);
      }
    },
  });
  if (url === undefined) return false;
  const endpoint = checkEndpoint(url);

  if (!(await askKey(secrets, endpoint, '2/3'))) return false;

  const model = await pickModel(secrets, endpoint, current.endpoint === endpoint ? current.model : '');
  if (!model) return false;
  await updateModelSettings(endpoint, model);

  const test = await vscode.window.showInformationMessage(
    `Saksi memakai model "${model}" di ${hostOf(endpoint)}. Periksa apakah konfigurasi ini bisa dipakai?`,
    'Periksa sekarang', 'Nanti',
  );
  if (test === 'Periksa sekarang') await testConnection(secrets);
  return true;
}

async function askKey(secrets: vscode.SecretStorage, endpoint: string, step: string): Promise<boolean> {
  if (await hasKey(secrets, endpoint)) {
    const choice = await vscode.window.showQuickPick([
      { label: 'Pakai key yang tersimpan', action: 'keep' },
      { label: 'Ganti key', action: 'replace' },
      { label: 'Hapus key', description: 'untuk server tanpa autentikasi', action: 'delete' },
    ], { title: `Saksi · API key (${step})`, ignoreFocusOut: true });
    if (!choice) return false;
    if (choice.action === 'keep') return true;
    if (choice.action === 'delete') {
      await storeKey(secrets, endpoint, undefined);
      return true;
    }
  }
  const key = await vscode.window.showInputBox({
    title: `Saksi · API key (${step})`,
    prompt: 'Disimpan di penyimpanan rahasia VS Code dan tidak pernah ditampilkan lagi. Kosongkan untuk server tanpa autentikasi.',
    password: true,
    ignoreFocusOut: true,
  });
  if (key === undefined) return false;
  await storeKey(secrets, endpoint, key.trim() || undefined);
  return true;
}

export async function setKey(secrets: vscode.SecretStorage): Promise<void> {
  const { endpoint } = modelSettings();
  if (!endpoint) {
    await configure(secrets);
    return;
  }
  if (await askKey(secrets, endpoint, hostOf(endpoint))) void vscode.window.showInformationMessage('Saksi: API key diperbarui.');
}

export async function clearKey(secrets: vscode.SecretStorage): Promise<void> {
  const { endpoint } = modelSettings();
  if (!endpoint) return;
  await storeKey(secrets, endpoint, undefined);
  void vscode.window.showInformationMessage(`Saksi: API key untuk ${hostOf(endpoint)} dihapus.`);
}

async function pickModel(secrets: vscode.SecretStorage, endpoint: string, current: string): Promise<string | undefined> {
  const how = await vscode.window.showQuickPick([
    { label: 'Pilih dari daftar model layanan', description: 'meminta daftar model ke layanan', action: 'list' },
    { label: 'Ketik model ID', action: 'manual' },
  ], { title: 'Saksi · Model (3/3)', ignoreFocusOut: true });
  if (!how) return undefined;
  if (how.action === 'list') {
    try {
      const config = { ...(await modelConfig(secrets)), endpoint, model: '' };
      const models = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Saksi: mengambil daftar model…', cancellable: true },
        (_progress, token) => {
          const controller = new AbortController();
          token.onCancellationRequested(() => controller.abort());
          return listModels(config, controller.signal);
        },
      );
      if (models.length) {
        const picked = await vscode.window.showQuickPick(models.map(id => ({ label: id, picked: id === current })), { title: 'Saksi · Model (3/3)', ignoreFocusOut: true });
        return picked?.label;
      }
      void vscode.window.showWarningMessage('Layanan tidak mengembalikan daftar model. Ketik model ID secara manual.');
    } catch (error) {
      void vscode.window.showWarningMessage(`Daftar model tidak tersedia: ${errorMessage(error)}`);
    }
  }
  const typed = await vscode.window.showInputBox({
    title: 'Saksi · Model ID (3/3)',
    value: current,
    prompt: 'Model ID yang diterima layananmu.',
    ignoreFocusOut: true,
    validateInput: value => (value.trim() ? null : 'Model ID diperlukan.'),
  });
  return typed?.trim() || undefined;
}

/** Sends one tiny request; the user is told first because paid services may bill it (UR-02). */
export async function testConnection(secrets: vscode.SecretStorage): Promise<void> {
  const config = await modelConfig(secrets);
  if (!config.endpoint || !config.model) {
    await configure(secrets);
    return;
  }
  const go = await vscode.window.showWarningMessage(
    `Pemeriksaan mengirim satu permintaan kecil (tanpa kode proyek) ke ${hostOf(config.endpoint)}. Layanan berbayar mungkin menagihnya.`,
    { modal: true }, 'Periksa',
  );
  if (go !== 'Periksa') return;
  try {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Saksi: memeriksa konfigurasi…' }, () =>
      chat({ ...config, timeoutSeconds: 30 }, [
        { role: 'system', content: 'Reply with the JSON object {"ok":true} and nothing else.' },
        { role: 'user', content: 'ping' },
      ]));
    void vscode.window.showInformationMessage(`Saksi: konfigurasi bisa dipakai (${config.model} @ ${hostOf(config.endpoint)}).`);
  } catch (error) {
    const action = await vscode.window.showErrorMessage(`Saksi: konfigurasi belum bisa dipakai. ${errorMessage(error)}`, 'Ubah konfigurasi');
    if (action) await configure(secrets);
  }
}
