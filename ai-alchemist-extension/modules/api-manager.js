/**
 * API 管理模块 - 统一封装各平台的调用与代理请求
 * @version 1.0.87
 */

class APIManager {
    static initialized = false;

    static async init() {
        try {
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('APIManager 初始化失败:', error);
            return false;
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

        switch (platform) {
            case 'deepseek':
                return await this.callDeepSeek(apiKey, prompt, { maxTokens, temperature });
            case 'tongyi':
                return await this.callTongyi(apiKey, prompt, { maxTokens, temperature });
            case 'bailian':
                return await this.callBailian(apiKey, prompt, { maxTokens, temperature });
            default:
                throw new Error('不支持的AI平台');
        }
    }

    static async callDeepSeek(apiKey, prompt, { maxTokens, temperature }) {
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
        });

        if (!res || !res.choices || !res.choices[0] || !res.choices[0].message) {
            throw new Error('DeepSeek API返回格式错误');
        }
        return res.choices[0].message.content;
    }

    static async callTongyi(apiKey, prompt, { maxTokens, temperature }) {
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
        });

        if (!res || !res.output || !res.output.choices || !res.output.choices[0] || !res.output.choices[0].message) {
            throw new Error('通义千问 API返回格式错误');
        }
        return res.output.choices[0].message.content;
    }

    static async callBailian(apiKey, prompt, { maxTokens, temperature }) {
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
        });

        if (!res || !res.choices || !res.choices[0] || !res.choices[0].message) {
            throw new Error('阿里云百炼 API返回格式错误');
        }
        return res.choices[0].message.content;
    }

    /**
     * 通过后台代理发起请求，返回文本
     */
    static async proxyFetch(url, options) {
        // 首选通过SW代理，避免CORS
        const response = await new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'proxyFetch', request: { url, options } }, (res) => {
                    resolve(res);
                });
            } catch (e) {
                resolve(null);
            }
        });

        if (response && response.success) {
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
            }
            return response.body || '';
        }

        // 退化为直接fetch（在某些允许的环境中可用）
        const direct = await fetch(url, options).catch(() => null);
        if (!direct) throw new Error('网络请求失败');
        if (!direct.ok) throw new Error(`请求失败: ${direct.status}`);
        return await direct.text();
    }

    /**
     * 通过后台代理发起请求并解析为JSON
     */
    static async proxyFetchJSON(url, options) {
        const text = await this.proxyFetch(url, options);
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('API返回非JSON内容');
        }
    }
}

// 暴露到全局以供内容脚本调用
window.APIManager = APIManager;

export {};

