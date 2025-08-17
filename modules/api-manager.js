/**
 * API管理模块 - 统一管理多个AI平台的API调用
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class APIManager {
    static cache = new Map();
    static rateLimits = new Map();
    static defaultTimeout = 30000;
    
    /**
     * 调用DeepSeek API
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项
     * @returns {Promise<string>} API响应
     */
    static async callDeepSeekAPI(apiKey, prompt, options = {}) {
        const cacheKey = `deepseek_${this.hashString(prompt)}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey) && !options.skipCache) {
            console.log('🎯 使用DeepSeek缓存结果');
            return this.cache.get(cacheKey);
        }
        
        // 检查速率限制
        if (this.isRateLimited('deepseek')) {
            throw new Error('DeepSeek API调用过于频繁，请稍后重试');
        }
        
        const requestData = {
            model: options.model || 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: options.systemPrompt || '你是一个专业的产品信息优化助手，请根据用户提供的产品信息进行优化。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
            stream: false
        };
        
        try {
            this.updateRateLimit('deepseek');
            
            const response = await this.makeRequest('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestData)
            }, options.timeout);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`DeepSeek API错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            const result = data.choices?.[0]?.message?.content;
            
            if (!result) {
                throw new Error('DeepSeek API返回数据格式异常');
            }
            
            // 缓存结果
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('DeepSeek API调用失败:', error);
            throw new Error(`DeepSeek API调用失败: ${error.message}`);
        }
    }
    
    /**
     * 调用通义千问API
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项
     * @returns {Promise<string>} API响应
     */
    static async callTongyiAPI(apiKey, prompt, options = {}) {
        const cacheKey = `tongyi_${this.hashString(prompt)}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey) && !options.skipCache) {
            console.log('🎯 使用通义千问缓存结果');
            return this.cache.get(cacheKey);
        }
        
        // 检查速率限制
        if (this.isRateLimited('tongyi')) {
            throw new Error('通义千问API调用过于频繁，请稍后重试');
        }
        
        const requestData = {
            model: options.model || 'qwen-turbo',
            input: {
                messages: [
                    {
                        role: 'system',
                        content: options.systemPrompt || '你是一个专业的产品信息优化助手，请根据用户提供的产品信息进行优化。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7,
                top_p: options.topP || 0.8
            }
        };
        
        try {
            this.updateRateLimit('tongyi');
            
            const response = await this.makeRequest('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-DashScope-SSE': 'disable'
                },
                body: JSON.stringify(requestData)
            }, options.timeout);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`通义千问API错误 (${response.status}): ${errorData.message || response.statusText}`);
            }
            
            const data = await response.json();
            const result = data.output?.text;
            
            if (!result) {
                throw new Error('通义千问API返回数据格式异常');
            }
            
            // 缓存结果
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('通义千问API调用失败:', error);
            throw new Error(`通义千问API调用失败: ${error.message}`);
        }
    }
    
    /**
     * 调用百炼API
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项
     * @returns {Promise<string>} API响应
     */
    static async callBailianAPI(apiKey, prompt, options = {}) {
        const cacheKey = `bailian_${this.hashString(prompt)}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey) && !options.skipCache) {
            console.log('🎯 使用百炼缓存结果');
            return this.cache.get(cacheKey);
        }
        
        // 检查速率限制
        if (this.isRateLimited('bailian')) {
            throw new Error('百炼API调用过于频繁，请稍后重试');
        }
        
        const requestData = {
            model: options.model || 'qwen-plus',
            input: {
                messages: [
                    {
                        role: 'system',
                        content: options.systemPrompt || '你是一个专业的产品信息优化助手，请根据用户提供的产品信息进行优化。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7
            }
        };
        
        try {
            this.updateRateLimit('bailian');
            
            const response = await this.makeRequest('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-DashScope-SSE': 'disable'
                },
                body: JSON.stringify(requestData)
            }, options.timeout);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`百炼API错误 (${response.status}): ${errorData.message || response.statusText}`);
            }
            
            const data = await response.json();
            const result = data.output?.text;
            
            if (!result) {
                throw new Error('百炼API返回数据格式异常');
            }
            
            // 缓存结果
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('百炼API调用失败:', error);
            throw new Error(`百炼API调用失败: ${error.message}`);
        }
    }
    
    /**
     * 统一API调用接口
     * @param {string} platform - 平台名称 (deepseek, tongyi, bailian)
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项
     * @returns {Promise<string>} API响应
     */
    static async callAPI(platform, apiKey, prompt, options = {}) {
        if (!apiKey || !apiKey.trim()) {
            throw new Error(`${platform} API密钥未配置`);
        }
        
        if (!prompt || !prompt.trim()) {
            throw new Error('提示词不能为空');
        }
        
        switch (platform.toLowerCase()) {
            case 'deepseek':
                return await this.callDeepSeekAPI(apiKey, prompt, options);
            case 'tongyi':
                return await this.callTongyiAPI(apiKey, prompt, options);
            case 'bailian':
                return await this.callBailianAPI(apiKey, prompt, options);
            default:
                throw new Error(`不支持的API平台: ${platform}`);
        }
    }
    
    /**
     * 发起HTTP请求（带超时控制）
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @param {number} timeout - 超时时间
     * @returns {Promise<Response>} 响应对象
     */
    static async makeRequest(url, options, timeout = this.defaultTimeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`请求超时 (${timeout}ms)`);
            }
            throw error;
        }
    }
    
    /**
     * 检查是否受速率限制
     * @param {string} platform - 平台名称
     * @returns {boolean} 是否受限
     */
    static isRateLimited(platform) {
        const limit = this.rateLimits.get(platform);
        if (!limit) return false;
        
        const now = Date.now();
        const timeDiff = now - limit.lastCall;
        const minInterval = limit.minInterval || 1000; // 默认1秒间隔
        
        return timeDiff < minInterval;
    }
    
    /**
     * 更新速率限制
     * @param {string} platform - 平台名称
     */
    static updateRateLimit(platform) {
        this.rateLimits.set(platform, {
            lastCall: Date.now(),
            minInterval: 1000 // 1秒间隔
        });
    }
    
    /**
     * 生成字符串哈希值（用于缓存键）
     * @param {string} str - 输入字符串
     * @returns {string} 哈希值
     */
    static hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 清除缓存
     * @param {string} platform - 平台名称（可选，不指定则清除所有）
     */
    static clearCache(platform = null) {
        if (platform) {
            const keysToDelete = [];
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${platform}_`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key));
            console.log(`已清除${platform}平台的缓存`);
        } else {
            this.cache.clear();
            console.log('已清除所有API缓存');
        }
    }
    
    /**
     * 获取缓存统计
     * @returns {Object} 缓存统计信息
     */
    static getCacheStats() {
        const stats = {
            total: this.cache.size,
            deepseek: 0,
            tongyi: 0,
            bailian: 0
        };
        
        for (const key of this.cache.keys()) {
            if (key.startsWith('deepseek_')) stats.deepseek++;
            else if (key.startsWith('tongyi_')) stats.tongyi++;
            else if (key.startsWith('bailian_')) stats.bailian++;
        }
        
        return stats;
    }
    
    /**
     * 验证API密钥格式
     * @param {string} platform - 平台名称
     * @param {string} apiKey - API密钥
     * @returns {boolean} 是否有效
     */
    static validateAPIKey(platform, apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return false;
        
        switch (platform.toLowerCase()) {
            case 'deepseek':
                return apiKey.startsWith('sk-') && apiKey.length > 20;
            case 'tongyi':
            case 'bailian':
                return apiKey.length > 10; // 阿里云API密钥格式较灵活
            default:
                return apiKey.length > 10;
        }
    }
    
    /**
     * 获取平台状态
     * @returns {Object} 各平台状态
     */
    static getPlatformStatus() {
        const now = Date.now();
        const status = {};
        
        ['deepseek', 'tongyi', 'bailian'].forEach(platform => {
            const limit = this.rateLimits.get(platform);
            status[platform] = {
                available: !this.isRateLimited(platform),
                lastCall: limit ? new Date(limit.lastCall).toLocaleTimeString() : '从未调用',
                cacheCount: Array.from(this.cache.keys()).filter(key => key.startsWith(`${platform}_`)).length
            };
        });
        
        return status;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
} else if (typeof window !== 'undefined') {
    window.APIManager = APIManager;
}