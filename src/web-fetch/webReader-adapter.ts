/**
 * webReader Adapter: Fetch URL content via Gemini CLI
 *
 * Problem: Bot runs in isolated environment without direct network access.
 * Solution: Use Gemini CLI which has internet access via Google's API.
 *
 * This is similar to how web_search works - both use gemini CLI as a proxy.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface GeminiResponse {
  response: string;
  model?: string;
  timestamp?: string;
}

/**
 * Fetch URL content via Gemini CLI
 *
 * The gemini CLI has network access (connects to Google's API) and can
 * fetch URLs even when direct HTTP requests are blocked in the bot environment.
 */
export async function fetchViaWebReader(
  url: string,
  options: { timeout?: number; goal?: string } = {}
): Promise<string> {
  const { timeout = 120000, goal } = options; // 120s default (longer pages)

  // Validate URL format
  if (!url || typeof url !== 'string') {
    return "❌ Ошибка: неверный URL - ссылка должна быть непустой строкой";
  }

  // Basic URL validation
  if (!url.match(/^https?:\/\/.+/i)) {
    return "❌ Ошибка: неверный формат URL - должен начинаться с http:// или https://";
  }

  try {
    // Use gemini CLI to fetch the URL (similar to how web_search works)
    const scriptPath = "/home/almaz/zoo_flow/clawdis/scripts/web_fetch_with_gemini.sh";

    const goalLabel = goal ? ` (goal: ${goal})` : "";
    console.log(`[webReader-adapter] Fetching via gemini: ${url}${goalLabel}`);

    const goalArg = goal ? `--goal "${goal}" ` : "";
    const { stdout, stderr } = await execAsync(
      `"${scriptPath}" ${goalArg}"${url}"`,
      {
        timeout,
        env: { ...process.env, PATH: process.env.PATH },
      }
    );

    if (stderr) {
      console.error(`[webReader-adapter] stderr: ${stderr}`);
    }

    console.log(`[webReader-adapter] stdout length: ${stdout.length}`);
    console.log(`[webReader-adapter] stdout preview: ${stdout.slice(0, 300)}`);

    // Parse gemini JSON response
    let jsonStr = stdout.trim();
    const jsonStart = jsonStr.indexOf('{');
    if (jsonStart > 0) {
      jsonStr = jsonStr.slice(jsonStart);
    }

    let result: GeminiResponse;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(`[webReader-adapter] JSON parse failed:`, parseError);
      console.error(`[webReader-adapter] jsonStr preview:`, jsonStr.slice(0, 500));
      // Raw output fallback (gemini sometimes returns plain text)
      if (stdout.length > 50) {
        return `📄 **Содержимое страницы**

${stdout.slice(0, 5000)}${stdout.length > 5000 ? '\n\n...(контент обрезан)' : ''}`;
      }
      return "❌ Ошибка: не удалось получить содержимое страницы";
    }

    if (!result || !result.response) {
      console.error(`[webReader-adapter] Invalid result:`, result);
      return "❌ Ошибка: пустой ответ от gemini";
    }

    const content = result.response.trim();

    // Truncate if too long
    const truncated = content.slice(0, 5000);
    const suffix = content.length > 5000 ? '\n\n...(контент обрезан)' : '';
    const prefix = goal === "full" ? "📄 " : "";

    return `${prefix}${truncated}${suffix}`;

  } catch (error) {
    const errorStr = String(error);
    console.error(`[webReader-adapter] Error details:`, {
      message: (error as any).message,
      code: (error as any).code,
      signal: (error as any).signal,
      killed: (error as any).killed,
      stdout: (error as any).stdout?.slice(0, 200),
      stderr: (error as any).stderr?.slice(0, 200),
    });

    // Provide user-friendly error messages
    if (errorStr.includes('ENOTFOUND') || errorStr.includes('getaddrinfo')) {
      return `❌ Ошибка: домен не найден - ${url}`;
    } else if (errorStr.includes('ETIMEDOUT') || errorStr.includes('timeout')) {
      return `❌ Ошибка: превышено время ожидания запроса`;
    } else if (errorStr.includes('ECONNREFUSED')) {
      return `❌ Ошибка: соединение отклонено`;
    } else if (errorStr.includes('exit code')) {
      return `❌ Ошибка: не удалось выполнить запрос через gemini`;
    }

    return `❌ Ошибка загрузки URL: ${errorStr.slice(0, 200)}`;
  }
}
