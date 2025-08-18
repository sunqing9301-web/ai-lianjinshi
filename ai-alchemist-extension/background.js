/**
 * AI炼金师 - 产品优化专家 Background Service Worker
 * @version 2.0.43
 */

console.log('🚀 AI炼金师 Background Service Worker 启动');

// 扩展安装/更新处理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 扩展安装/更新:', details.reason);
    
    if (details.reason === 'install') {
        // 首次安装
        console.log('🎉 首次安装AI炼金师扩展');
        
        // 设置默认配置
        chrome.storage.local.set({
            ozonOptimizerConfig: {
                api: {
                    platform: 'deepseek',
                    deepseek: { apiKey: '' },
                    tongyi: { apiKey: '' },
                    bailian: { apiKey: '' }
                },
                presets: {
                    configuration: '',
                    manufacturer: '中国',
                    packageQuantity: '',
                    targetAudience: ''
                },
                ui: {
                    showFloatingButton: true
                },
                batch: {
                    enabled: true,
                    autoNavigate: true,
                    skipOptimized: true,
                    delayBetweenProducts: 3000,
                    maxRetries: 3
                },
                optimization: {
                    enableImageOptimization: true,
                    imageOptimizationType: 'smart_ecommerce',
                    targetImageSize: '1000x1000',
                    imageQuality: 'high'
                }
            }
        });
        
        // 可选：首次安装欢迎页（当前移除以避免缺失资源）
        
    } else if (details.reason === 'update') {
        // 更新
        console.log('🔄 扩展已更新到新版本');
        
        // 检查配置兼容性
        checkConfigCompatibility();
    }
});

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 收到消息:', request);
    
    switch (request.action) {
        case 'getConfig':
            handleGetConfig(sendResponse);
            return true; // 保持消息通道开放
            
        case 'updateConfig':
            handleUpdateConfig(request.config, sendResponse);
            return true;
            
        case 'validateAPI':
            handleValidateAPI(request.platform, request.apiKey, sendResponse);
            return true;
            
        case 'getPerformanceStats':
            handleGetPerformanceStats(sendResponse);
            return true;
            
        case 'clearCache':
            handleClearCache(sendResponse);
            return true;
        
        case 'proxyFetch':
            handleProxyFetch(request.request, sendResponse);
            return true;
        case 'callAI':
            handleCallAI(request.platform, request.prompt, request.options || {}, sendResponse);
            return true;
            
        default:
            console.warn('⚠️ 未知消息类型:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// 长连接端口：用于代理跨域请求，避免SW在长耗时期间被回收
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'proxy') return;
    port.onMessage.addListener(async (msg) => {
        if (!msg || !msg.id) return;
        if (msg.type === 'proxyFetch') {
            const req = msg.request || {};
            try {
                const response = await fetch(req.url, req.options || {});
                const text = await response.text();
                const headersObj = {};
                response.headers.forEach((v, k) => { headersObj[k] = v; });
                port.postMessage({ id: msg.id, success: true, ok: response.ok, status: response.status, headers: headersObj, body: text });
            } catch (error) {
                port.postMessage({ id: msg.id, success: false, error: error?.message || String(error) });
            }
        } else if (msg.type === 'callAI') {
            try {
                const { platform, prompt, options } = msg;
                const content = await callAIBackground(platform, prompt, options || {});
                port.postMessage({ id: msg.id, success: true, content });
            } catch (error) {
                port.postMessage({ id: msg.id, success: false, error: error?.message || String(error) });
            }
        }
    });
});

// 标签页更新处理
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // 检查是否是支持的网站
        if (isSupportedSite(tab.url)) {
            console.log('🌐 检测到支持的网站:', tab.url);
            
            // 注入内容脚本（如果需要）
            // 已通过 manifest 的 content_scripts 注入，避免重复注入导致脚本重复定义
        }
    }
});

// 处理获取配置
async function handleGetConfig(sendResponse) {
    try {
        const result = await chrome.storage.local.get('ozonOptimizerConfig');
        sendResponse({ success: true, config: result.ozonOptimizerConfig || {} });
    } catch (error) {
        console.error('❌ 获取配置失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 处理更新配置
async function handleUpdateConfig(config, sendResponse) {
    try {
        await chrome.storage.local.set({ ozonOptimizerConfig: config });
        sendResponse({ success: true });
        
        // 通知所有相关标签页配置已更新
        notifyTabsOfConfigChange(config);
        
    } catch (error) {
        console.error('❌ 更新配置失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 处理API验证
async function handleValidateAPI(platform, apiKey, sendResponse) {
    try {
        // 这里可以添加API验证逻辑
        const isValid = await validateAPIKey(platform, apiKey);
        sendResponse({ success: true, isValid });
    } catch (error) {
        console.error('❌ API验证失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 处理获取性能统计
async function handleGetPerformanceStats(sendResponse) {
    try {
        const stats = await getPerformanceStats();
        sendResponse({ success: true, stats });
    } catch (error) {
        console.error('❌ 获取性能统计失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 处理清除缓存
async function handleClearCache(sendResponse) {
    try {
        await chrome.storage.local.remove(['apiCache', 'optimizationHistory']);
        sendResponse({ success: true });
    } catch (error) {
        console.error('❌ 清除缓存失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 代理跨域请求，解决内容脚本的CORS限制
async function handleProxyFetch(req, sendResponse) {
    try {
        const url = req?.url;
        const options = req?.options || {};
        const response = await fetch(url, options);
        const text = await response.text();
        const headersObj = {};
        response.headers.forEach((v, k) => { headersObj[k] = v; });
        sendResponse({
            success: true,
            ok: response.ok,
            status: response.status,
            headers: headersObj,
            body: text
        });
    } catch (error) {
        sendResponse({ success: false, error: error?.message || String(error) });
    }
}

// 检查配置兼容性
async function checkConfigCompatibility() {
    try {
        const result = await chrome.storage.local.get('ozonOptimizerConfig');
        const config = result.ozonOptimizerConfig;
        
        if (!config) {
            return; // 没有配置，使用默认值
        }
        
        // 检查是否需要迁移
        const needsMigration = !config.version || config.version < '2.0.2';
        
        if (needsMigration) {
            console.log('🔄 检测到配置需要迁移');
            
            // 执行配置迁移
            const migratedConfig = migrateConfig(config);
            
            await chrome.storage.local.set({ 
                ozonOptimizerConfig: migratedConfig 
            });
            
            console.log('✅ 配置迁移完成');
        }
        
    } catch (error) {
        console.error('❌ 配置兼容性检查失败:', error);
    }
}

// 配置迁移
function migrateConfig(oldConfig) {
    const newConfig = {
        ...oldConfig,
        version: '2.0.2',
        lastUpdated: new Date().toISOString()
    };
    
    // 添加新字段的默认值
    if (!newConfig.optimization) {
        newConfig.optimization = {
            enableImageOptimization: true,
            imageOptimizationType: 'smart_ecommerce',
            targetImageSize: '1000x1000',
            imageQuality: 'high'
        };
    }
    
    if (!newConfig.batch) {
        newConfig.batch = {
            enabled: true,
            autoNavigate: true,
            skipOptimized: true,
            delayBetweenProducts: 3000,
            maxRetries: 3
        };
    }
    
    return newConfig;
}

// ========= 后台直调AI =========
async function handleCallAI(platform, prompt, options, sendResponse) {
    try {
        const content = await callAIBackground(platform, prompt, options || {});
        sendResponse({ success: true, content });
    } catch (error) {
        sendResponse({ success: false, error: error?.message || String(error) });
    }
}

async function callAIBackground(platform, prompt, options) {
    const apiKey = await getApiKey(platform);
    if (!apiKey) throw new Error(`${platform} API密钥未配置`);
    const timeout = options.timeout || 30000;
    if (platform === 'deepseek') return await callDeepSeekBG(apiKey, prompt, options, timeout);
    if (platform === 'tongyi') return await callTongyiBG(apiKey, prompt, options, timeout);
    if (platform === 'bailian') return await callBailianBG(apiKey, prompt, options, timeout);
    throw new Error('不支持的AI平台');
}

async function getApiKey(platform) {
    const result = await chrome.storage.local.get('ozonOptimizerConfig');
    const cfg = result.ozonOptimizerConfig || {};
    return cfg.api && cfg.api[platform] ? (cfg.api[platform].apiKey || '') : '';
}

async function fetchJSONWithTimeout(url, init, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...(init || {}), signal: controller.signal });
        const text = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        try { return JSON.parse(text); } catch { throw new Error('API返回非JSON'); }
    } finally {
        clearTimeout(timer);
    }
}

async function callDeepSeekBG(apiKey, prompt, options, timeout) {
    const body = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 2000,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.7
    };
    const data = await fetchJSONWithTimeout('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
    }, timeout);
    if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('DeepSeek 返回格式错误');
    return data.choices[0].message.content;
}

async function callTongyiBG(apiKey, prompt, options, timeout) {
    const body = {
        model: 'qwen-turbo',
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { max_tokens: options.maxTokens || 2000, temperature: typeof options.temperature === 'number' ? options.temperature : 0.7 }
    };
    const data = await fetchJSONWithTimeout('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
    }, timeout);
    if (!data.output || !data.output.choices || !data.output.choices[0] || !data.output.choices[0].message) throw new Error('通义千问 返回格式错误');
    return data.output.choices[0].message.content;
}

async function callBailianBG(apiKey, prompt, options, timeout) {
    const body = {
        model: 'deepseek-r1',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 2000,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.7
    };
    const data = await fetchJSONWithTimeout('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
    }, timeout);
    if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('阿里云百炼 返回格式错误');
    return data.choices[0].message.content;
}

// 检查是否是支持的网站
function isSupportedSite(url) {
    const supportedPatterns = [
        /^https:\/\/erp\.91miaoshou\.com/,
        /^https:\/\/.*\.ozon\.ru/,
        /^https:\/\/seller\.ozon\.ru/
    ];
    
    return supportedPatterns.some(pattern => pattern.test(url));
}

// 通知标签页配置变化
async function notifyTabsOfConfigChange(config) {
    try {
        const tabs = await chrome.tabs.query({
            url: [
                'https://erp.91miaoshou.com/*',
                'https://*.ozon.ru/*',
                'https://seller.ozon.ru/*'
            ]
        });
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'configChanged',
                    config: config
                });
            } catch (error) {
                console.warn(`⚠️ 通知标签页 ${tab.id} 失败:`, error);
            }
        }
        
    } catch (error) {
        console.error('❌ 通知标签页失败:', error);
    }
}

// API密钥验证（示例实现）
async function validateAPIKey(platform, apiKey) {
    // 这里可以实现实际的API验证逻辑
    // 目前只是简单的格式检查
    
    if (!apiKey || apiKey.length < 10) {
        return false;
    }
    
    // 根据平台进行不同的验证
    switch (platform) {
        case 'deepseek':
            return apiKey.startsWith('sk-') && apiKey.length >= 20;
        case 'tongyi':
            return apiKey.length >= 20;
        case 'bailian':
            return apiKey.length >= 20;
        default:
            return false;
    }
}

// 获取性能统计
async function getPerformanceStats() {
    try {
        const result = await chrome.storage.local.get([
            'performanceStats',
            'errorLogs',
            'apiCallCount'
        ]);
        
        return {
            performanceStats: result.performanceStats || {},
            errorLogs: result.errorLogs || [],
            apiCallCount: result.apiCallCount || 0,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ 获取性能统计失败:', error);
        return {};
    }
}

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
    console.log('🔄 Background Service Worker 即将暂停');
});

// 定期清理任务
setInterval(async () => {
    try {
        // 清理过期的性能数据
        const result = await chrome.storage.local.get('performanceStats');
        const stats = result.performanceStats || {};
        
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // 删除超过1天的性能数据
        const cleanedStats = {};
        for (const [key, value] of Object.entries(stats)) {
            if (now - value.timestamp < oneDay) {
                cleanedStats[key] = value;
            }
        }
        
        await chrome.storage.local.set({ performanceStats: cleanedStats });
        
    } catch (error) {
        console.warn('⚠️ 清理任务失败:', error);
    }
}, 60 * 60 * 1000); // 每小时执行一次

console.log('✅ Background Service Worker 初始化完成'); 