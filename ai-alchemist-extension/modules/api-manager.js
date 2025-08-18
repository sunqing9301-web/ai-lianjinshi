/**
 * API 管理模块 - 统一封装各平台的调用与代理请求
 * @version 1.0.87
 */

class APIManager {
    static initialized = false;
    static defaultTimeoutMs = 30000;
    static port = null;
    static pending = new Map();
    static reqIdSeq = 1;

    static async init() {
        try {
            this.initialized = true;
            this.ensurePort();
            return true;
        } catch (error) {
            console.error('APIManager 初始化失败:', error);
            return false;
        }
    }

    static ensurePort() {
        try {
            if (this.port) return;
            if (!chrome?.runtime?.connect) return;
            const port = chrome.runtime.connect({ name: 'proxy' });
            port.onMessage.addListener((msg) => {
                const id = msg && msg.id;
                if (!id) return;
                const pending = this.pending.get(id);
                if (pending) {
                    this.pending.delete(id);
                    pending.resolve(msg);
                }
            });
            port.onDisconnect.addListener(() => {
                this.port = null;
            });
            this.port = port;
        } catch (_) {
            // ignore
        }
    }

    /**
     * 统一调用入口
     * @param {('deepseek'|'tongyi'|'bailian')} platform
     * @param {string} apiKey
     * @param {string} prompt
     * @param {{timeout?: number, maxTokens?: number, temperature?: number}} options
     * @returns {Promise<string>} AI返回的文本内容
     */
    static async callAPI(platform, apiKey, prompt, options = {}) {
        const maxTokens = options.maxTokens || 2000;
        const temperature = typeof options.temperature === 'number' ? options.temperature : 0.7;
        const timeout = typeof options.timeout === 'number' ? options.timeout : this.defaultTimeoutMs;

        // 优先走后台直调，保持更高稳定性
        try {
            const content = await this.callAIInBackground(platform, prompt, { maxTokens, temperature, timeout });
            if (content) return content;
        } catch (e) {
            console.warn('[APIManager] 后台直调失败，降级到前台代理:', e?.message || e);
        }

        // 降级到前台代理
        if (platform === 'deepseek') return await this.callDeepSeek(apiKey, prompt, { maxTokens, temperature, timeout });
        if (platform === 'tongyi') return await this.callTongyi(apiKey, prompt, { maxTokens, temperature, timeout });
        if (platform === 'bailian') return await this.callBailian(apiKey, prompt, { maxTokens, temperature, timeout });
        throw new Error('不支持的AI平台');
    }

    static async callAIInBackground(platform, prompt, options) {
        // 通过持久端口优先
        try {
            this.ensurePort();
            if (this.port) {
                const id = `c${Date.now()}_${this.reqIdSeq++}`;
                const msg = { type: 'callAI', id, platform, prompt, options };
                const result = await this.withTimeout(new Promise((resolve) => {
                    this.pending.set(id, { resolve });
                    this.port.postMessage(msg);
                }), options.timeout || this.defaultTimeoutMs);
                if (result && result.success) return result.content;
                if (result && !result.success) throw new Error(result.error || '后台调用失败');
            }
        } catch (e) {}

        // 短消息退化
        const result = await this.withTimeout(new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'callAI', platform, prompt, options }, (res) => resolve(res));
            } catch (e) {
                resolve(null);
            }
        }), options.timeout || this.defaultTimeoutMs);
        if (result && result.success) return result.content;
        if (result) throw new Error(result.error || '后台调用失败');
        throw new Error('后台未响应');
    }

    static async callDeepSeek(apiKey, prompt, { maxTokens, temperature, timeout }) {
        const url = 'https://api.deepseek.com/v1/chat/completions';
        const body = {
            model: 'deepseek-chat',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature
        };

        const res = await this.proxyFetchJSON(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        }, timeout);

        if (!res || !res.choices || !res.choices[0] || !res.choices[0].message) {
            throw new Error('DeepSeek API返回格式错误');
        }
        console.log('[APIManager] DeepSeek 返回成功');
        return res.choices[0].message.content;
    }

    static async callTongyi(apiKey, prompt, { maxTokens, temperature, timeout }) {
        const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        const body = {
            model: 'qwen-turbo',
            input: {
                messages: [
                    { role: 'user', content: prompt }
                ]
            },
            parameters: {
                max_tokens: maxTokens,
                temperature
            }
        };

        const res = await this.proxyFetchJSON(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        }, timeout);

        if (!res || !res.output || !res.output.choices || !res.output.choices[0] || !res.output.choices[0].message) {
            throw new Error('通义千问 API返回格式错误');
        }
        console.log('[APIManager] 通义千问 返回成功');
        return res.output.choices[0].message.content;
    }

    static async callBailian(apiKey, prompt, { maxTokens, temperature, timeout }) {
        const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        const body = {
            model: 'deepseek-r1',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature
        };

        const res = await this.proxyFetchJSON(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        }, timeout);

        if (!res || !res.choices || !res.choices[0] || !res.choices[0].message) {
            throw new Error('阿里云百炼 API返回格式错误');
        }
        console.log('[APIManager] 阿里云百炼 返回成功');
        return res.choices[0].message.content;
    }

    /**
     * 通过后台代理发起请求，返回文本
     */
    static async proxyFetch(url, options, timeoutMs) {
        // 优先使用长连接端口，避免SW在长请求中被回收
        try {
            this.ensurePort();
            if (this.port) {
                const id = `r${Date.now()}_${this.reqIdSeq++}`;
                const msg = { type: 'proxyFetch', id, request: { url, options } };
                const result = await this.withTimeout(new Promise((resolve) => {
                    this.pending.set(id, { resolve });
                    this.port.postMessage(msg);
                }), timeoutMs || this.defaultTimeoutMs).catch(() => null);
                if (result) {
                    if (result.success) {
                        if (!result.ok) throw new Error(`请求失败: ${result.status}`);
                        return result.body || '';
                    }
                    throw new Error(`代理请求失败: ${result.error || '未知错误'}`);
                }
            }
        } catch (e) {
            // 端口不可用，降级
        }

        // 次选：短消息代理
        const response = await this.withTimeout(new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'proxyFetch', request: { url, options } }, (res) => resolve(res));
            } catch (e) {
                resolve(null);
            }
        }), timeoutMs || this.defaultTimeoutMs).catch(() => null);

        if (response) {
            if (response.success) {
                if (!response.ok) throw new Error(`请求失败: ${response.status}`);
                return response.body || '';
            }
            throw new Error(`代理请求失败: ${response.error || '未知错误'}`);
        }

        // 退化为直接fetch（在某些允许的环境中可用）
        const direct = await this.withTimeout(fetch(url, options), timeoutMs || this.defaultTimeoutMs).catch(() => null);
        if (!direct) throw new Error('网络请求失败');
        if (!direct.ok) throw new Error(`请求失败: ${direct.status}`);
        return await direct.text();
    }

    /**
     * 通过后台代理发起请求并解析为JSON
     */
    static async proxyFetchJSON(url, options, timeoutMs) {
        const text = await this.proxyFetch(url, options, timeoutMs);
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('API返回非JSON内容');
        }
    }

    static async withTimeout(promise, timeoutMs) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('请求超时')), timeoutMs);
        });
        try {
            const res = await Promise.race([promise, timeoutPromise]);
            return res;
        } finally {
            clearTimeout(timer);
        }
    }
}

// 暴露到全局以供内容脚本调用
window.APIManager = APIManager;

export {};

