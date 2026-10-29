import type { ChatMessage } from './prompts';

export interface ModelConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
  jsonMode?: boolean;
  timeoutSeconds?: number;
}

export interface ModelReply {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export type Fetcher = typeof fetch;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Validates a chat-completions URL: HTTPS, or HTTP on localhost only. */
export function endpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Isi URL endpoint lengkap, misalnya http://localhost:1234/v1/chat/completions.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('Gunakan HTTPS, atau HTTP hanya untuk localhost.');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('URL tidak boleh berisi credential, query, atau fragment.');
  return url.toString();
}

/** Best-effort models listing URL for OpenAI-compatible servers. */
export function modelsUrl(chatUrl: string): string | null {
  const url = new URL(endpoint(chatUrl));
  if (!/\/chat\/completions\/?$/.test(url.pathname)) return null;
  url.pathname = url.pathname.replace(/\/chat\/completions\/?$/, '/models');
  return url.toString();
}

export async function readLimited(response: Response, limit = 1024 * 1024): Promise<string> {
  if (!response.body) throw new Error('Layanan mengembalikan body kosong.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Respons layanan terlalu besar (> 1 MB).');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseEnvelope(text: string): ModelReply {
  let envelope: { choices?: { finish_reason?: string; message?: { content?: unknown } }[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } };
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('Layanan tidak mengembalikan JSON chat-completions.');
  }
  const choice = envelope.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('Output model terpotong. Persempit cakupan review atau naikkan batas output di server.');
  const content = choice?.message?.content;
  if (typeof content !== 'string') throw new Error('Respons perlu choices[0].message.content berupa teks.');
  const prompt = envelope.usage?.prompt_tokens;
  const completion = envelope.usage?.completion_tokens;
  return {
    content,
    usage: typeof prompt === 'number' && typeof completion === 'number' ? { promptTokens: prompt, completionTokens: completion } : undefined,
  };
}

/** Parses JSON from model text, tolerating a surrounding ```json fence. */
export function parseJsonContent(content: string): unknown {
  const stripped = content.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    throw new Error('Model tidak menghasilkan JSON valid. Coba aktifkan saksi.jsonMode bila server mendukung.');
  }
}

async function request(url: string, init: RequestInit, config: ModelConfig, signal: AbortSignal | undefined, fetcher: Fetcher): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, (config.timeoutSeconds ?? 90) * 1000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    // Redirects are refused so source code and keys never follow to another host (UR-36).
    const response = await fetcher(url, { ...init, headers, signal: controller.signal, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(httpHint(response.status));
    }
    return await readLimited(response);
  } catch (error) {
    if (controller.signal.aborted) {
      const out = new Error(signal?.aborted ? 'Review dibatalkan.' : 'Request ke layanan model timeout. Coba lagi atau naikkan saksi.timeoutSeconds.');
      if (signal?.aborted) out.name = 'AbortError';
      throw out;
    }
    if (error instanceof TypeError) throw new Error('Tidak dapat menghubungi layanan model. Periksa koneksi, sertifikat, dan URL; redirect tidak diikuti.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function httpHint(status: number): string {
  if (status === 401 || status === 403) return `Layanan menolak akses (HTTP ${status}). Periksa API key dengan "Saksi: Set API Key".`;
  if (status === 404) return 'Endpoint atau model tidak ditemukan (HTTP 404). Periksa URL dan model ID.';
  if (status === 429) return 'Batas penggunaan layanan tercapai (HTTP 429). Tunggu sebentar atau periksa kuota akunmu.';
  if (status >= 500) return `Layanan model sedang bermasalah (HTTP ${status}). Coba lagi nanti.`;
  return `Layanan mengembalikan HTTP ${status}. Periksa URL, key, model, atau log server.`;
}

export async function chat(config: ModelConfig, messages: ChatMessage[], signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<ModelReply> {
  const url = endpoint(config.endpoint);
  if (!config.model.trim()) throw new Error('Model belum dipilih. Jalankan "Saksi: Configure Model".');
  const body: Record<string, unknown> = { model: config.model.trim(), stream: false, messages };
  if (config.jsonMode) body.response_format = { type: 'json_object' };
  return parseEnvelope(await request(url, { method: 'POST', body: JSON.stringify(body) }, config, signal, fetcher));
}

export async function listModels(config: ModelConfig, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<string[]> {
  const url = modelsUrl(config.endpoint);
  if (!url) return [];
  const text = await request(url, { method: 'GET' }, { ...config, timeoutSeconds: 15 }, signal, fetcher);
  const data = (JSON.parse(text) as { data?: { id?: unknown }[] }).data;
  return Array.isArray(data) ? data.map(item => item.id).filter((id): id is string => typeof id === 'string').slice(0, 200) : [];
}
