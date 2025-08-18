console.log('【唯一标记】20240708-终极兼容调试');
console.log('content.js loaded');

let floatingBtn = null; // 全局变量存储悬浮按钮引用
let dragOffset = { x: 0, y: 0 }; // 存储拖拽偏移量
let isOptimizing = false; // 是否正在优化中
let progressIndicator = null; // 进度指示器
let isDragging = false; // 是否正在拖拽中

// 1. 初始化时从chrome.storage.local加载缓存
let aiResultCache = {};
chrome.storage && chrome.storage.local.get('aiResultCache', (data) => {
    if (data && data.aiResultCache) {
        aiResultCache = data.aiResultCache;
        console.log('已从chrome.storage.local加载AI结果缓存', aiResultCache);
    }
});

// 2. 写缓存时同步到chrome.storage.local
function setAiResultCache(key, value) {
    aiResultCache[key] = value;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ aiResultCache }, () => {
            console.log('AI结果缓存已写入chrome.storage.local', key);
        });
    }
}

// 3. 读缓存时优先内存，没有则从chrome.storage.local读
async function getAiResultCache(key) {
    if (aiResultCache[key]) return aiResultCache[key];
    return new Promise((resolve) => {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('aiResultCache', (data) => {
                if (data && data.aiResultCache && data.aiResultCache[key]) {
                    aiResultCache[key] = data.aiResultCache[key];
                    resolve(aiResultCache[key]);
                } else {
                    resolve(undefined);
                }
            });
        } else {
            resolve(undefined);
        }
    });
}

// =============================================================================
// 🛠️ 核心工具类和错误处理系统 v1.0.84
// =============================================================================

/**
 * DOM工具类 - 提供更强大的元素查找和等待功能
 */
class DOMUtils {
    /**
     * 等待元素出现，支持超时
     */
    static async waitForElement(selector, timeout = 5000, interval = 100) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                        return;
                    }
                    
                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未找到`));
                        return;
                    }
                    
                    setTimeout(checkElement, interval);
                } catch (error) {
                    reject(new Error(`查找元素时出错: ${error.message}`));
                }
            };
            
            checkElement();
        });
    }
    
    /**
     * 尝试多个选择器查找元素
     */
    static findElementBySelectors(selectors, container = document) {
        for (const selector of selectors) {
            try {
                const element = container.querySelector(selector);
                if (element) {
                    console.log(`✅ 使用选择器找到元素: ${selector}`);
                    return element;
                }
            } catch (error) {
                console.warn(`选择器 ${selector} 无效:`, error.message);
                continue;
            }
        }
        return null;
    }
    
    /**
     * 通过文本内容查找元素
     */
    static findElementByText(text, tagName = '*', exact = false) {
        const elements = document.querySelectorAll(tagName);
        for (const element of elements) {
            const elementText = element.textContent || element.innerText || '';
            if (exact ? elementText.trim() === text : elementText.includes(text)) {
                return element;
            }
        }
        return null;
    }
    
    /**
     * 检查元素是否可见和可操作
     */
    static isElementInteractable(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               !element.disabled && 
               !element.readOnly;
    }
}

/**
 * 增强的错误处理器
 */
class ErrorHandler {
    static log(message, data = null) {
        console.log(`🔧 [优化助手] ${message}`, data || '');
    }
    
    static warn(message, data = null) {
        console.warn(`⚠️ [优化助手] ${message}`, data || '');
    }
    
    static error(message, error = null) {
        console.error(`❌ [优化助手] ${message}`, error || '');
    }
    
    static async handleAsync(operation, fallback = null, context = '') {
        try {
            return await operation();
        } catch (error) {
            this.error(`${context}执行失败:`, error);
            if (typeof fallback === 'function') {
                try {
                    return await fallback();
                } catch (fallbackError) {
                    this.error(`${context}回退方案也失败:`, fallbackError);
                }
            }
            return fallback;
        }
    }
    
    static handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.error('Error:', errorInfo);
        
        // 用户友好的错误提示
        const userMessage = this.getUserFriendlyMessage(error);
        this.showUserNotification(userMessage, 'error');
        
        return errorInfo;
    }
    
    static getUserFriendlyMessage(error) {
        if (error.message.includes('网络')) return '网络连接异常，请检查网络后重试';
        if (error.message.includes('API')) return 'AI服务暂时不可用，请稍后重试';
        if (error.message.includes('超时')) return '操作超时，请检查网络或稍后重试';
        return '操作失败，请重试或联系技术支持';
    }
    
    static showUserNotification(message, type = 'info') {
        // 创建用户友好的通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : '#2ed573'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

/**
 * 重试管理器
 */
class RetryManager {
    static async retry(operation, maxRetries = 3, delay = 1000, context = '') {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) {
                    ErrorHandler.error(`${context}重试${maxRetries}次后仍失败:`, error);
                    throw error;
                }
                ErrorHandler.warn(`${context}第${i + 1}次尝试失败，${delay}ms后重试:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
}

/**
 * 防抖管理器
 */
class DebounceManager {
    static timers = new Map();
    
    static debounce(key, func, delay = 300) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.timers.delete(key);
        }, delay);
        
        this.timers.set(key, timer);
    }
}

/**
 * 调试工具和性能监控系统
 */
class DebugManager {
    static isEnabled = false;
    static performanceData = new Map();
    static debugLogs = [];
    
    static enable() {
        this.isEnabled = true;
        ErrorHandler.log('🛠️ 调试模式已启用');
        window.OzonOptimizerDebug = this;
    }
    
    static disable() {
        this.isEnabled = false;
        ErrorHandler.log('🛠️ 调试模式已禁用');
    }
    
    static startTimer(key) {
        if (this.isEnabled) {
            this.performanceData.set(key, { startTime: performance.now() });
        }
    }
    
    static endTimer(key) {
        if (this.isEnabled && this.performanceData.has(key)) {
            const data = this.performanceData.get(key);
            data.endTime = performance.now();
            data.duration = data.endTime - data.startTime;
            ErrorHandler.log(`⏱️ ${key}: ${data.duration.toFixed(2)}ms`);
            return data.duration;
        }
        return 0;
    }
    
    static logDebug(message, data = null) {
        if (this.isEnabled) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                message,
                data
            };
            this.debugLogs.push(logEntry);
            console.log(`🔍 [DEBUG] ${message}`, data || '');
            
            // 保持日志数量在合理范围内
            if (this.debugLogs.length > 1000) {
                this.debugLogs = this.debugLogs.slice(-500);
            }
        }
    }
    
    static getPerformanceReport() {
        const report = {};
        for (const [key, data] of this.performanceData) {
            if (data.duration) {
                report[key] = `${data.duration.toFixed(2)}ms`;
            }
        }
        return report;
    }
    
    static exportDebugInfo() {
        return {
            performanceData: this.getPerformanceReport(),
            debugLogs: this.debugLogs.slice(-100), // 最近100条日志
            fieldStatus: ProgressManager.getFieldsStatus(),
            timestamp: new Date().toISOString()
        };
    }
    
    static showDebugPanel() {
        const debugInfo = this.exportDebugInfo();
        console.group('🛠️ OZON优化助手调试信息');
        console.log('性能数据:', debugInfo.performanceData);
        console.log('字段状态:', debugInfo.fieldStatus);
        console.log('最近日志:', debugInfo.debugLogs);
        console.groupEnd();
        
        // 创建可视化调试面板
        this.createDebugUI(debugInfo);
    }
    
    static createDebugUI(debugInfo) {
        // 移除现有的调试面板
        const existingPanel = document.getElementById('ozon-debug-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'ozon-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10002;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-y: auto;
            border: 2px solid #667eea;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #667eea;">🛠️ 调试面板</h3>
                <button id="close-debug" style="background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">关闭</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ffa502; margin: 10px 0 5px 0;">⏱️ 性能数据</h4>
                <pre style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin: 0; white-space: pre-wrap;">${JSON.stringify(debugInfo.performanceData, null, 2)}</pre>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #26de81; margin: 10px 0 5px 0;">📊 字段状态</h4>
                <pre style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin: 0; white-space: pre-wrap;">${JSON.stringify(debugInfo.fieldStatus, null, 2)}</pre>
            </div>
            
            <div>
                <h4 style="color: #fd79a8; margin: 10px 0 5px 0;">📝 最近日志</h4>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;">
                    ${debugInfo.debugLogs.map(log => `
                        <div style="margin-bottom: 5px; padding: 5px; border-left: 3px solid #667eea;">
                            <span style="color: #ffa502;">${new Date(log.timestamp).toLocaleTimeString()}</span>
                            <br>
                            ${log.message}
                            ${log.data ? `<br><span style="color: #26de81; font-size: 11px;">${JSON.stringify(log.data)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 添加关闭按钮事件
        document.getElementById('close-debug').onclick = () => panel.remove();
        
        // 3秒后自动最小化
        setTimeout(() => {
            if (panel.parentNode) {
                panel.style.height = '50px';
                panel.style.overflow = 'hidden';
                panel.innerHTML = `
                    <div style="cursor: pointer;" onclick="this.parentNode.style.height='auto'; this.parentNode.style.overflow='auto'; location.reload();">
                        🛠️ 调试面板 (点击展开)
                    </div>
                `;
            }
        }, 10000);
    }
}

// 全局调试函数
window.enableOzonDebug = () => DebugManager.enable();
window.disableOzonDebug = () => DebugManager.disable();
window.showOzonDebug = () => DebugManager.showDebugPanel();
window.exportOzonDebug = () => DebugManager.exportDebugInfo();

// 2. 获取当前产品唯一标识（以产品URL为key）
function getCurrentProductKey() {
    // 1. 优先从来源URL提取
    let sourceUrl = '';
    // 先尝试标准input
    const urlInput = document.querySelector('input[name="sourceUrl"]');
    if (urlInput && urlInput.value) sourceUrl = urlInput.value;
    // 再尝试所有input中带"链接/url/URL"的placeholder或value
    if (!sourceUrl) {
        const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
        for (const input of urlInputs) {
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            if (placeholder.includes('链接') || placeholder.includes('url') || placeholder.includes('URL') || value.includes('http')) {
                sourceUrl = value;
                break;
            }
        }
    }
    if (sourceUrl) {
        // 1688
        let m = sourceUrl.match(/offer\/(\d+)\.html/);
        if (m) return `1688_${m[1]}`;
        // 拼多多
        m = sourceUrl.match(/goods_id=(\d+)/);
        if (m) return `pdd_${m[1]}`;
        // 淘宝
        m = sourceUrl.match(/item\.taobao\.com\/item\.htm.*[?&]id=(\d+)/);
        if (m) return `taobao_${m[1]}`;
        // 京东
        m = sourceUrl.match(/item\.jd\.com\/(\d+)\.html/);
        if (m) return `jd_${m[1]}`;
        // 阿里巴巴
        m = sourceUrl.match(/detail\.1688\.com\/offer\/(\d+)\.html/);
        if (m) return `alibaba_${m[1]}`;
        // 其它平台可继续补充
        // fallback: 直接用URL
        return `url_${encodeURIComponent(sourceUrl)}`;
    }
    // 2. 左侧产品列表的data-id
    const selected = document.querySelector('.goods-item.active, .goods-item.selected, .product-list .selected');
    if (selected && selected.dataset && selected.dataset.id) {
        return `local_${selected.dataset.id}`;
    }
    // 3. 标题+时间戳兜底
    let title = '';
    const titleInput = document.querySelector('input[name="title"]') || document.querySelector('input[placeholder*="标题"]');
    if (titleInput && titleInput.value) {
        title = titleInput.value;
    }
    return `name_${title || 'unknown'}_${Date.now()}`;
}

// 3. 重试填写功能已集成到圆形按钮中

// 4. 修改悬浮按钮点击逻辑，保证状态恢复
async function onFloatingBtnClick() {
    console.log('【唯一标记】onFloatingBtnClick 执行了');
    if (isOptimizing) {
        console.log('【唯一标记】正在优化中，忽略点击');
        return;
    }
    isOptimizing = true;
    const optimizeBtn = floatingBtn.querySelector('#optimizeBtn');
    if (optimizeBtn) {
        optimizeBtn.textContent = '暂停';
        optimizeBtn.style.background = 'rgba(255,107,107,0.3)';
    }
    floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
    let needRestore = true;
    try {
        const key = getCurrentProductKey();
        console.log('【唯一标记】当前产品key:', key);
        const cached = await getAiResultCache(key);
        if (cached) {
            console.log('【唯一标记】发现缓存结果');
            let cacheInfo = '📋 发现该产品的AI优化缓存：\n\n';
            if (cached.title) cacheInfo += `• 标题：${cached.title.substring(0, 50)}${cached.title.length > 50 ? '...' : ''}\n`;
            if (cached.description) cacheInfo += `• 描述：${cached.description.substring(0, 100)}${cached.description.length > 100 ? '...' : ''}\n`;
            if (cached.keywords) cacheInfo += `• 关键词：${cached.keywords.substring(0, 50)}${cached.keywords.length > 50 ? '...' : ''}\n`;
            cacheInfo += '\n请选择操作：\n';
            cacheInfo += '✅ 确认：使用缓存结果重试填写（节省API调用）\n';
            cacheInfo += '🔄 取消：重新请求AI优化（覆盖缓存）';
            if (window.confirm(cacheInfo)) {
                console.log('【唯一标记】用户选择重试填写');
                try {
                    const collectResult = await collectInfo();
                    const pageInfo = collectResult ? collectResult.pageInfo : null;
                    await fillFields(cached, pageInfo?.extractedDimensions, pageInfo);
                } catch (error) {
                    console.error('获取页面信息失败，使用默认参数:', error);
                    await fillFields(cached, null, null);
                }
                if (optimizeBtn) {
                    optimizeBtn.textContent = '完成✔';
                    optimizeBtn.style.background = 'rgba(40,167,69,0.3)';
                }
                floatingBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                setTimeout(() => {
                    if (optimizeBtn) {
                        optimizeBtn.textContent = '优化';
                        optimizeBtn.style.background = 'transparent';
                    }
                    floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    isOptimizing = false;
                    createFloatingBtn();
                }, 2000);
                needRestore = false;
                return;
            } else {
                console.log('【唯一标记】用户选择重新请求AI');
            }
        }
        
        // 只执行文案优化，不处理图片
        console.log('【唯一标记】开始执行文案优化...');
        showProgress('正在优化产品文案...');
        
        // 继续优化，重新请求AI
        console.log('【唯一标记】开始调用main()函数');
        const aiResult = await main();
        if (aiResult && (aiResult.title || aiResult.description || aiResult.keywords)) {
            console.log('【唯一标记】AI返回有效结果，保存到缓存');
            setAiResultCache(key, aiResult);
            // 获取页面信息用于智能匹配
            try {
                const collectResult = await collectInfo();
                const pageInfo = collectResult ? collectResult.pageInfo : null;
                await fillFields(aiResult, null, pageInfo);
            } catch (error) {
                ErrorHandler.error('获取页面信息失败:', error);
                await fillFields(aiResult, null, null);
            }
            if (optimizeBtn) {
                optimizeBtn.textContent = '完成✔';
                optimizeBtn.style.background = 'rgba(40,167,69,0.3)';
            }
            floatingBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            setTimeout(() => {
                if (optimizeBtn) {
                    optimizeBtn.textContent = '优化';
                    optimizeBtn.style.background = 'transparent';
                }
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
                createFloatingBtn();
            }, 3000);
            needRestore = false;
        } else {
            console.log('【唯一标记】AI返回结果无效');
            throw new Error('AI返回结果无效');
        }
    } catch (error) {
        console.error('【唯一标记】优化过程出错:', error);
        if (optimizeBtn) {
            optimizeBtn.textContent = '失败❌';
            optimizeBtn.style.background = 'rgba(255,107,107,0.3)';
        }
        floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
        showProgress('优化失败: ' + error.message);
        setTimeout(() => {
            if (optimizeBtn) {
                optimizeBtn.textContent = '优化';
                optimizeBtn.style.background = 'transparent';
            }
            floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            isOptimizing = false;
            createFloatingBtn();
        }, 2000);
        needRestore = false;
        return;
    }
    // 最后兜底恢复
    if (needRestore) {
        createFloatingBtn();
        isOptimizing = false;
    }
}
// 全局暴露主流程函数，兼容所有作用域
if (typeof window !== 'undefined') {
    window.onFloatingBtnClick = onFloatingBtnClick;
}

// 恢复为单一悬浮按钮（无重试按钮、无容器）
function createFloatingBtn() {
    if (floatingBtn) floatingBtn.remove();
    
    // 创建圆形按钮容器
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'floatingBtnContainer';
    floatingBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 10000;
        width: 80px;
        height: 120px;
        border-radius: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        cursor: pointer;
        user-select: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: all 0.3s ease;
    `;
    
    // 创建上半部分 - 优化按钮
    const optimizeBtn = document.createElement('div');
    optimizeBtn.id = 'optimizeBtn';
    optimizeBtn.textContent = '优化';
    optimizeBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-radius: 40px 40px 0 0;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-bottom: 0px;
        box-sizing: border-box;
        margin-bottom: -1px;
    `;
    
    // 创建中间部分 - 图片优化按钮
    const imageOptimizeBtn = document.createElement('div');
    imageOptimizeBtn.id = 'imageOptimizeBtn';
    imageOptimizeBtn.textContent = '图片';
    imageOptimizeBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-top: 0px;
        padding-bottom: 0px;
        box-sizing: border-box;
        margin-top: -1px;
        margin-bottom: -1px;
    `;
    
    // 创建下半部分 - 重试按钮
    const retryBtn = document.createElement('div');
    retryBtn.id = 'retryBtn';
    retryBtn.textContent = '重试';
    retryBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-radius: 0 0 40px 40px;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-top: 0px;
        box-sizing: border-box;
        margin-top: -1px;
    `;
    
    // 添加悬停效果
    optimizeBtn.addEventListener('mouseenter', function() {
        optimizeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    optimizeBtn.addEventListener('mouseleave', function() {
        optimizeBtn.style.background = 'transparent';
    });
    
    imageOptimizeBtn.addEventListener('mouseenter', function() {
        imageOptimizeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    imageOptimizeBtn.addEventListener('mouseleave', function() {
        imageOptimizeBtn.style.background = 'transparent';
    });
    
    retryBtn.addEventListener('mouseenter', function() {
        retryBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    retryBtn.addEventListener('mouseleave', function() {
        retryBtn.style.background = 'transparent';
    });
    
    // 绑定点击事件
    optimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isDragging) return;
        onFloatingBtnClick();
    });
    
    imageOptimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isDragging) return;
        onImageOptimizeClick();
    });
    
    retryBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (isDragging) return;
        console.log('点击了重试填写按钮');
        const key = getCurrentProductKey();
        const aiResult = await getAiResultCache(key);
        
        // 检查缓存是否存在
        if (!aiResult) {
            alert('❌ 当前产品还没有AI优化结果！\n\n请先点击"优化"按钮进行AI优化。');
            return;
        }
        
        // 检查缓存数据是否完善
        const hasTitle = aiResult.title && aiResult.title.trim().length > 0;
        const hasDescription = aiResult.description && aiResult.description.trim().length > 0;
        const hasKeywords = aiResult.keywords && aiResult.keywords.trim().length > 0;
        
        if (!hasTitle && !hasDescription && !hasKeywords) {
            alert('⚠️ 缓存数据不完善！\n\n当前缓存缺少有效的优化内容（标题、描述、关键词都为空）。\n\n建议重新点击"优化"按钮获取完整的AI优化结果。');
            return;
        }
        
        // 显示缓存信息
        let cacheInfo = '📋 使用缓存结果重试填写：\n\n';
        if (hasTitle) cacheInfo += `• 标题：${aiResult.title.substring(0, 50)}${aiResult.title.length > 50 ? '...' : ''}\n`;
        if (hasDescription) cacheInfo += `• 描述：${aiResult.description.substring(0, 100)}${aiResult.description.length > 100 ? '...' : ''}\n`;
        if (hasKeywords) cacheInfo += `• 关键词：${aiResult.keywords.substring(0, 50)}${aiResult.keywords.length > 50 ? '...' : ''}\n`;
        
        // 显示缺失的字段
        let missingFields = [];
        if (!hasTitle) missingFields.push('标题');
        if (!hasDescription) missingFields.push('描述');
        if (!hasKeywords) missingFields.push('关键词');
        
        if (missingFields.length > 0) {
            cacheInfo += `\n⚠️ 注意：缓存中缺少 ${missingFields.join('、')} 字段\n`;
        }
        
        cacheInfo += '\n✅ 正在使用缓存结果填写表单...';
        
        alert(cacheInfo);
        // 重试填写时也需要获取当前页面的尺寸信息
        const { pageInfo } = await collectInfo();
        await fillFields(aiResult, pageInfo.extractedDimensions, pageInfo);
        alert('✅ 已成功使用缓存结果重试填写！');
    });
    
    // 图片优化点击事件
    async function onImageOptimizeClick() {
        if (isOptimizing) {
            console.log('正在优化中，忽略点击');
            return;
        }
        
        try {
            isOptimizing = true;
            imageOptimizeBtn.textContent = '处理中...';
            imageOptimizeBtn.style.background = 'rgba(255,107,107,0.3)';
            
            // 获取图片优化设置
            const settings = await getImageOptimizationSettings();
            if (!settings.enableImageOptimization) {
                console.log('图片优化已禁用');
                showProgress('图片优化已禁用，请在设置中启用');
                setTimeout(() => hideProgress(), 2000);
                return;
            }
            
            console.log('先点击页面中的图片优化按钮...');
            showProgress('正在点击图片优化按钮...');
            
            // 先点击页面中的图片优化按钮
            await clickImageOptimizeButtons();
            
            // 等待一段时间让图片优化完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('执行插件图片优化...');
            showProgress('正在执行插件图片优化...');
            await optimizeImages();
            
            imageOptimizeBtn.textContent = '完成✔';
            imageOptimizeBtn.style.background = 'rgba(40,167,69,0.3)';
            
            setTimeout(() => {
                imageOptimizeBtn.textContent = '图片';
                imageOptimizeBtn.style.background = 'transparent';
                isOptimizing = false;
            }, 2000);
            
        } catch (error) {
            console.error('图片优化失败:', error);
            imageOptimizeBtn.textContent = '失败❌';
            imageOptimizeBtn.style.background = 'rgba(255,107,107,0.3)';
            showProgress('图片优化失败: ' + error.message);
            
            setTimeout(() => {
                imageOptimizeBtn.textContent = '图片';
                imageOptimizeBtn.style.background = 'transparent';
                isOptimizing = false;
            }, 3000);
        }
    }
    
    // 组装按钮
    floatingBtn.appendChild(optimizeBtn);
    floatingBtn.appendChild(imageOptimizeBtn);
    floatingBtn.appendChild(retryBtn);
    
    // 拖拽逻辑
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let startX = 0, startY = 0;
    floatingBtn.addEventListener('mousedown', function (e) {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        dragOffset.x = e.clientX - floatingBtn.offsetLeft;
        dragOffset.y = e.clientY - floatingBtn.offsetTop;
        floatingBtn.classList.add('dragging');
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    });
    
    function drag(e) {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 3 || dy > 3) isDragging = true;
        if (isDragging) {
            floatingBtn.style.transition = 'none';
            let left = e.clientX - dragOffset.x;
            let top = e.clientY - dragOffset.y;
            const minLeft = 0;
            const minTop = 0;
            const maxLeft = window.innerWidth - 80;
            const maxTop = window.innerHeight - 80;
            left = Math.max(minLeft, Math.min(left, maxLeft));
            top = Math.max(minTop, Math.min(top, maxTop));
            floatingBtn.style.left = left + 'px';
            floatingBtn.style.top = top + 'px';
        }
    }
    
    function dragEnd(e) {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        setTimeout(() => { isDragging = false; }, 50);
    }
    
    document.body.appendChild(floatingBtn);
    console.log('圆形悬浮按钮已创建');
}



// 优化字段识别调试输出，显示新查找逻辑
async function testFieldRecognition() {
    console.log('【唯一标记】testFieldRecognition新版');
    console.log('=== 字段识别测试 ===');
    
    // 测试标题输入框
    let titleInput = findTitleInput();
    if (titleInput) {
        console.log('✅ 找到 标题 输入框:', titleInput.outerHTML);
    } else {
        console.log('❌ 未找到 标题 输入框');
    }
    
    // 测试关键字输入框
    let keywordInput = findKeywordsInput();
    if (keywordInput) {
        console.log('✅ 找到 关键词 输入框（新结构适配）:', keywordInput.outerHTML);
    } else {
        console.log('❌ 未找到 关键词 输入框（新结构适配）');
    }
    
    // 输出所有input的详细信息
    console.log('=== 所有input详细信息 ===');
    const allInputs = document.querySelectorAll('input');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        const editFieldLabel = input.closest('.edit-field-label');
        const editFieldContent = input.closest('.edit-field-content');
        
        console.log('input:', {
            outerHTML: input.outerHTML,
            placeholder: input.placeholder,
            readOnly: input.readOnly,
            type: input.type,
            className: input.className,
            labelText: label?.textContent?.trim(),
            hasEditFieldLabel: !!editFieldLabel,
            hasEditFieldContent: !!editFieldContent
        });
    }
    
    console.log('=== 字段识别测试完成 ===');
}

// 创建进度指示器
function createProgressIndicator() {
    if (progressIndicator) {
        progressIndicator.remove();
    }
    
    progressIndicator = document.createElement('div');
    progressIndicator.id = 'optimizeProgressIndicator';
    progressIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: none;
        max-width: 300px;
        text-align: center;
    `;
    
    document.body.appendChild(progressIndicator);
    console.log('进度指示器已创建');
}

/**
 * 增强的进度管理系统
 */
class ProgressManager {
    static currentStep = 0;
    static totalSteps = 0;
    static fieldStatus = new Map();
    
    static startProgress(totalSteps = 10) {
        this.currentStep = 0;
        this.totalSteps = totalSteps;
        this.fieldStatus.clear();
        
        if (!progressIndicator) {
            createProgressIndicator();
        }
        
        this.updateProgressDisplay();
        progressIndicator.style.display = 'block';
        ErrorHandler.log(`🚀 开始进度跟踪 (总共 ${totalSteps} 步)`);
    }
    
    static updateStep(message, targetElement = null, success = null) {
        this.currentStep++;
        
        const progressText = `${message} (${this.currentStep}/${this.totalSteps})`;
        
        if (!progressIndicator) {
            createProgressIndicator();
        }
        
        progressIndicator.innerHTML = `
            <div style="margin-bottom: 8px;">${progressText}</div>
            <div style="background: rgba(255,255,255,0.3); border-radius: 10px; height: 6px; overflow: hidden;">
                <div style="background: #28a745; height: 100%; width: ${(this.currentStep / this.totalSteps) * 100}%; transition: width 0.3s ease;"></div>
            </div>
        `;
        progressIndicator.style.display = 'block';
        
        // 如果有目标元素，高亮显示
        if (targetElement) {
            highlightElement(targetElement);
        }
        
        ErrorHandler.log(`📈 进度更新: ${progressText}`);
    }
    
    static updateFieldStatus(fieldName, status, details = '') {
        this.fieldStatus.set(fieldName, { status, details, timestamp: Date.now() });
        this.updateProgressDisplay();
    }
    
    static updateProgressDisplay() {
        if (!progressIndicator) return;
        
        const successCount = Array.from(this.fieldStatus.values()).filter(s => s.status === 'success').length;
        const failCount = Array.from(this.fieldStatus.values()).filter(s => s.status === 'failed').length;
        
        const statusText = this.fieldStatus.size > 0 ? 
            `✅ ${successCount} 成功 | ❌ ${failCount} 失败` : '';
        
        const progressPercentage = this.totalSteps > 0 ? 
            Math.round((this.currentStep / this.totalSteps) * 100) : 0;
        
        progressIndicator.innerHTML = `
            <div style="margin-bottom: 8px;">
                步骤 ${this.currentStep}/${this.totalSteps} (${progressPercentage}%)
            </div>
            <div style="background: rgba(255,255,255,0.3); border-radius: 10px; height: 6px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: #28a745; height: 100%; width: ${progressPercentage}%; transition: width 0.3s ease;"></div>
            </div>
            ${statusText ? `<div style="font-size: 12px; opacity: 0.9;">${statusText}</div>` : ''}
        `;
    }
    
    static finish(message = '完成！', autoHide = true) {
        this.currentStep = this.totalSteps;
        this.updateProgressDisplay();
        
        if (progressIndicator) {
            progressIndicator.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 8px;">🎉 ${message}</div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        ${Array.from(this.fieldStatus.values()).filter(s => s.status === 'success').length} 个字段成功填写
                    </div>
                </div>
            `;
        }
        
        removeAllHighlights();
        ErrorHandler.log(`✅ 进度完成: ${message}`);
        
        if (autoHide) {
            setTimeout(() => this.hide(), 3000);
        }
    }
    
    static hide() {
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
            removeAllHighlights();
        }
    }
    
    static getFieldsStatus() {
        return Object.fromEntries(this.fieldStatus);
    }
}

// 兼容旧版的进度显示函数
function showProgress(message, targetElement = null) {
    ProgressManager.updateStep(message, targetElement);
}

// 兼容旧版的进度隐藏函数
function hideProgress() {
    ProgressManager.hide();
}

// 高亮元素
function highlightElement(element) {
    // 移除之前的高亮
    removeAllHighlights();
    
    // 添加高亮样式
    element.style.outline = '3px solid #ff6b6b';
    element.style.outlineOffset = '2px';
    element.style.transition = 'outline 0.3s ease';
    
    // 滚动到元素位置
    element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
    });
    
    console.log('高亮元素:', element);
}

// 移除所有高亮
function removeAllHighlights() {
    const highlightedElements = document.querySelectorAll('[style*="outline: 3px solid #ff6b6b"]');
    highlightedElements.forEach(el => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.transition = '';
    });
}

// 显示/隐藏悬浮按钮
function toggleFloatingBtn(show) {
    if (show) {
        if (!floatingBtn) {
            createFloatingBtn();
        } else {
            floatingBtn.style.display = 'block';
            // 恢复拖拽位置
            floatingBtn.style.transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`;
        }
        console.log('悬浮按钮已显示');
    } else {
        if (floatingBtn) {
            floatingBtn.style.display = 'none';
        }
        console.log('悬浮按钮已隐藏');
    }
}

// 初始化悬浮按钮（根据设置决定是否显示）
async function initFloatingBtn() {
    console.log('开始初始化悬浮按钮...');
    
    // 直接创建按钮，不依赖存储设置
    createFloatingBtn();
    
    return new Promise((resolve) => {
        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['showFloatingBtn'], function(result) {
                    console.log('存储查询结果:', result);
                    const showBtn = result.showFloatingBtn !== undefined ? result.showFloatingBtn : true;
                    console.log('是否显示按钮:', showBtn);
                    if (!showBtn) {
                        console.log('根据设置隐藏按钮');
                        if (floatingBtn) {
                            floatingBtn.style.display = 'none';
                        }
                    }
                    resolve();
                });
            } else {
                console.log('chrome.storage不可用，按钮已创建');
                resolve();
            }
        } catch (error) {
            console.error('初始化悬浮按钮时出错:', error);
            console.log('按钮已创建，继续执行');
            resolve();
        }
    });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleFloatingBtn') {
        toggleFloatingBtn(request.show);
        sendResponse({success: true});
    }
});

// =============================================================================
// 智能产品信息提取系统
// =============================================================================

/**
 * 从URL中提取完整的产品信息（尺寸、重量、材质、品牌等）
 */
function extractProductInfoFromUrl(url) {
    console.log('🔍 开始从URL提取完整产品信息:', url);
    
    const productInfo = {
        dimensions: null,    // 尺寸信息
        weight: null,        // 重量信息
        material: null,      // 材质信息
        brand: null,         // 品牌信息
        color: null,         // 颜色信息
        model: null,         // 型号信息
        style: null,         // 风格信息
        capacity: null,      // 容量信息
        power: null,         // 功率信息
        voltage: null        // 电压信息
    };
    
    try {
        // 1. 提取尺寸信息
        productInfo.dimensions = extractDimensionsFromUrl(url);
        
        // 2. 提取重量信息
        productInfo.weight = extractWeightFromUrl(url);
        
        // 3. 提取材质信息
        productInfo.material = extractMaterialFromUrl(url);
        
        // 4. 提取品牌信息
        productInfo.brand = extractBrandFromUrl(url);
        
        // 5. 提取颜色信息
        productInfo.color = extractColorFromUrl(url);
        
        // 6. 提取型号信息
        productInfo.model = extractModelFromUrl(url);
        
        // 7. 提取风格信息
        productInfo.style = extractStyleFromUrl(url);
        
        // 8. 提取容量信息
        productInfo.capacity = extractCapacityFromUrl(url);
        
        // 9. 提取功率信息
        productInfo.power = extractPowerFromUrl(url);
        
        // 10. 提取电压信息
        productInfo.voltage = extractVoltageFromUrl(url);
        
        console.log('✅ 完整产品信息提取结果:', productInfo);
        return productInfo;
        
    } catch (error) {
        console.error('❌ 提取产品信息时出错:', error);
        return productInfo;
    }
}

/**
 * 从URL中提取长宽高尺寸信息
 */
function extractDimensionsFromUrl(url) {
    console.log('🔍 从URL提取尺寸信息:', url);
    
    try {
        // 常见的尺寸模式匹配
        const patterns = [
            // 模式1: 200x300x400 或 200*300*400
            /(\d+)[x\*](\d+)[x\*](\d+)/i,
            // 模式2: 长200宽300高400
            /长(\d+).*?宽(\d+).*?高(\d+)/i,
            // 模式3: 200×300×400 (使用×符号)
            /(\d+)[×x](\d+)[×x](\d+)/i,
            // 模式4: 200mm x 300mm x 400mm
            /(\d+)\s*mm\s*[x\*×]\s*(\d+)\s*mm\s*[x\*×]\s*(\d+)\s*mm/i,
            // 模式5: 200cm x 300cm x 400cm
            /(\d+)\s*cm\s*[x\*×]\s*(\d+)\s*cm\s*[x\*×]\s*(\d+)\s*cm/i,
            // 模式6: 200*300*400mm
            /(\d+)\s*[x\*×]\s*(\d+)\s*[x\*×]\s*(\d+)\s*mm/i,
            // 模式7: 200*300*400cm
            /(\d+)\s*[x\*×]\s*(\d+)\s*[x\*×]\s*(\d+)\s*cm/i,
            // 模式8: 尺寸200x300x400
            /尺寸\s*(\d+)[x\*×](\d+)[x\*×](\d+)/i,
            // 模式9: 规格200x300x400
            /规格\s*(\d+)[x\*×](\d+)[x\*×](\d+)/i,
            // 模式10: 200mm*300mm*400mm
            /(\d+)mm\s*[x\*×]\s*(\d+)mm\s*[x\*×]\s*(\d+)mm/i
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const match = url.match(patterns[i]);
            if (match) {
                const length = parseInt(match[1]);
                const width = parseInt(match[2]);
                const height = parseInt(match[3]);
                
                // 验证数值合理性
                if (length > 0 && width > 0 && height > 0 && 
                    length < 10000 && width < 10000 && height < 10000) {
                    
                    console.log(`✅ 匹配模式${i + 1}成功:`, { length, width, height });
                    return { length, width, height };
                }
            }
        }
        
        // 如果没有找到标准模式，尝试查找单个尺寸信息
        const singlePatterns = [
            // 查找长度
            /长[度]*[：:]*\s*(\d+)/i,
            /length[：:]*\s*(\d+)/i,
            // 查找宽度
            /宽[度]*[：:]*\s*(\d+)/i,
            /width[：:]*\s*(\d+)/i,
            // 查找高度
            /高[度]*[：:]*\s*(\d+)/i,
            /height[：:]*\s*(\d+)/i
        ];
        
        let extractedLength = null, extractedWidth = null, extractedHeight = null;
        
        for (const pattern of singlePatterns) {
            const match = url.match(pattern);
            if (match) {
                const value = parseInt(match[1]);
                if (value > 0 && value < 10000) {
                    if (pattern.source.includes('长') || pattern.source.includes('length')) {
                        extractedLength = value;
                    } else if (pattern.source.includes('宽') || pattern.source.includes('width')) {
                        extractedWidth = value;
                    } else if (pattern.source.includes('高') || pattern.source.includes('height')) {
                        extractedHeight = value;
                    }
                }
            }
        }
        
        if (extractedLength || extractedWidth || extractedHeight) {
            console.log('✅ 提取到部分尺寸信息:', { 
                length: extractedLength, 
                width: extractedWidth, 
                height: extractedHeight 
            });
            return { 
                length: extractedLength, 
                width: extractedWidth, 
                height: extractedHeight 
            };
        }
        
        console.log('❌ 未找到有效的尺寸信息');
        return null;
        
    } catch (error) {
        console.error('提取尺寸信息时出错:', error);
        return null;
    }
}

/**
 * 从URL中提取重量信息
 */
function extractWeightFromUrl(url) {
    const weightPatterns = [
        // 重量500g, 500克
        /重量[：:]*\s*(\d+(?:\.\d+)?)\s*(g|克|kg|公斤|斤)/i,
        // 净重500g
        /净重[：:]*\s*(\d+(?:\.\d+)?)\s*(g|克|kg|公斤|斤)/i,
        // 毛重500g
        /毛重[：:]*\s*(\d+(?:\.\d+)?)\s*(g|克|kg|公斤|斤)/i,
        // weight:500g
        /weight[：:]*\s*(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)/i,
        // 500g, 500kg (独立的重量)
        /(\d+(?:\.\d+)?)\s*(g|克|kg|公斤|斤)(?![a-zA-Z])/i
    ];
    
    for (const pattern of weightPatterns) {
        const match = url.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            // 转换为标准单位(克)
            let weightInGrams = value;
            if (unit.includes('kg') || unit.includes('公斤') || unit.includes('斤')) {
                weightInGrams = value * 1000;
            }
            
            if (weightInGrams > 0 && weightInGrams < 100000) {  // 合理重量范围
                console.log('✅ 提取到重量信息:', { value, unit, weightInGrams });
                return { value, unit, weightInGrams };
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取材质信息
 */
function extractMaterialFromUrl(url) {
    const materialPatterns = [
        // 材质：不锈钢、塑料等
        /材质[：:]*\s*([^\/\?\&\s\d]+)/i,
        /material[：:]*\s*([^\/\?\&\s\d]+)/i,
        // 常见材质关键词
        /(不锈钢|塑料|金属|木材|玻璃|陶瓷|硅胶|橡胶|棉质|皮革|合金|铝|铁|钢|abs|pc|pp|pe|pvc|silicone|steel|aluminum|wood|glass|ceramic|plastic|metal)/i
    ];
    
    for (const pattern of materialPatterns) {
        const match = url.match(pattern);
        if (match) {
            const material = match[1].trim();
            if (material.length > 0 && material.length < 20) {
                console.log('✅ 提取到材质信息:', material);
                return material;
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取品牌信息
 */
function extractBrandFromUrl(url) {
    const brandPatterns = [
        // 品牌：小米、华为等
        /品牌[：:]*\s*([^\/\?\&\s\d]+)/i,
        /brand[：:]*\s*([^\/\?\&\s\d]+)/i,
        // 常见品牌关键词（需要根据实际情况调整）
        /(小米|华为|苹果|三星|索尼|松下|飞利浦|美的|格力|海尔|格兰仕|九阳|苏泊尔|爱仕达)/i
    ];
    
    for (const pattern of brandPatterns) {
        const match = url.match(pattern);
        if (match) {
            const brand = match[1].trim();
            if (brand.length > 0 && brand.length < 20) {
                console.log('✅ 提取到品牌信息:', brand);
                return brand;
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取颜色信息
 */
function extractColorFromUrl(url) {
    const colorPatterns = [
        // 颜色：红色、蓝色等
        /颜色[：:]*\s*([^\/\?\&\s\d]+)/i,
        /color[：:]*\s*([^\/\?\&\s\d]+)/i,
        // 常见颜色关键词
        /(红色|蓝色|绿色|黄色|黑色|白色|灰色|粉色|紫色|橙色|棕色|银色|金色|transparent|red|blue|green|yellow|black|white|gray|pink|purple|orange|brown|silver|gold)/i
    ];
    
    for (const pattern of colorPatterns) {
        const match = url.match(pattern);
        if (match) {
            const color = match[1].trim();
            if (color.length > 0 && color.length < 15) {
                console.log('✅ 提取到颜色信息:', color);
                return color;
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取型号信息
 */
function extractModelFromUrl(url) {
    const modelPatterns = [
        // 型号：ABC123
        /型号[：:]*\s*([A-Za-z0-9\-]+)/i,
        /model[：:]*\s*([A-Za-z0-9\-]+)/i,
        // 编号：XYZ456
        /编号[：:]*\s*([A-Za-z0-9\-]+)/i,
        /编码[：:]*\s*([A-Za-z0-9\-]+)/i
    ];
    
    for (const pattern of modelPatterns) {
        const match = url.match(pattern);
        if (match) {
            const model = match[1].trim();
            if (model.length > 0 && model.length < 30) {
                console.log('✅ 提取到型号信息:', model);
                return model;
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取风格信息
 */
function extractStyleFromUrl(url) {
    const stylePatterns = [
        // 风格：现代、简约等
        /风格[：:]*\s*([^\/\?\&\s\d]+)/i,
        /style[：:]*\s*([^\/\?\&\s\d]+)/i,
        // 常见风格关键词
        /(现代|简约|欧式|中式|美式|日式|北欧|地中海|田园|工业|复古|时尚|经典|vintage|modern|classic|rustic)/i
    ];
    
    for (const pattern of stylePatterns) {
        const match = url.match(pattern);
        if (match) {
            const style = match[1].trim();
            if (style.length > 0 && style.length < 15) {
                console.log('✅ 提取到风格信息:', style);
                return style;
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取容量信息
 */
function extractCapacityFromUrl(url) {
    const capacityPatterns = [
        // 容量：500ml, 1L
        /容量[：:]*\s*(\d+(?:\.\d+)?)\s*(ml|毫升|l|升|L)/i,
        /capacity[：:]*\s*(\d+(?:\.\d+)?)\s*(ml|l|liter)/i,
        // 独立的容量值
        /(\d+(?:\.\d+)?)\s*(ml|毫升|l|升|L)(?![a-zA-Z])/i
    ];
    
    for (const pattern of capacityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            if (value > 0 && value < 100000) {  // 合理容量范围
                console.log('✅ 提取到容量信息:', { value, unit });
                return { value, unit };
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取功率信息
 */
function extractPowerFromUrl(url) {
    const powerPatterns = [
        // 功率：100W, 1.5kW
        /功率[：:]*\s*(\d+(?:\.\d+)?)\s*(w|瓦|kw|千瓦)/i,
        /power[：:]*\s*(\d+(?:\.\d+)?)\s*(w|kw|watt)/i,
        // 独立的功率值
        /(\d+(?:\.\d+)?)\s*(w|瓦|kw|千瓦)(?![a-zA-Z])/i
    ];
    
    for (const pattern of powerPatterns) {
        const match = url.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            if (value > 0 && value < 100000) {  // 合理功率范围
                console.log('✅ 提取到功率信息:', { value, unit });
                return { value, unit };
            }
        }
    }
    
    return null;
}

/**
 * 从URL中提取电压信息
 */
function extractVoltageFromUrl(url) {
    const voltagePatterns = [
        // 电压：220V, 12V
        /电压[：:]*\s*(\d+(?:\.\d+)?)\s*v/i,
        /voltage[：:]*\s*(\d+(?:\.\d+)?)\s*v/i,
        // 独立的电压值
        /(\d+(?:\.\d+)?)\s*v(?![a-zA-Z])/i
    ];
    
    for (const pattern of voltagePatterns) {
        const match = url.match(pattern);
        if (match) {
            const value = parseFloat(match[1]);
            
            if (value > 0 && value < 1000) {  // 合理电压范围
                console.log('✅ 提取到电压信息:', { value, unit: 'V' });
                return { value, unit: 'V' };
            }
        }
    }
    
    return null;
}

// 收集页面信息
async function collectInfo() {
    console.log('开始收集页面信息...');
    
    // 获取预设信息
    showProgress('正在获取预设信息...');
    const presetInfo = await new Promise((resolve) => {
        chrome.storage.local.get([
            'configuration',
            'manufacturer', 
            'packageQuantity',
            'targetAudience',
            'apiPlatform',
            'deepseekApiKey',
            'tongyiApiKey',
            'bailianApiKey'
        ], resolve);
    });
    
    console.log('预设信息:', presetInfo);
    
    // 获取产品来源URL
    showProgress('正在获取产品来源URL...');
    let sourceUrl = '';
    const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
    for (const input of urlInputs) {
        const placeholder = input.placeholder || '';
        const value = input.value || '';
        if (placeholder.includes('链接') || placeholder.includes('url') || placeholder.includes('URL') || 
            value.includes('ozon.ru') || value.includes('ozon.com')) {
            sourceUrl = value;
            console.log('从输入框获取产品来源URL:', sourceUrl);
            break;
        }
    }
    console.log('产品来源URL:', sourceUrl);
    
    // 从来源URL提取完整产品信息
    let extractedProductInfo = null;
    if (sourceUrl) {
        extractedProductInfo = extractProductInfoFromUrl(sourceUrl);
        if (extractedProductInfo) {
            console.log('🎯 从URL提取的完整产品信息:', extractedProductInfo);
        } else {
            console.log('❌ URL中未找到产品信息');
        }
    }
    
    // 保持向后兼容，提取尺寸信息
    let extractedDimensions = extractedProductInfo?.dimensions || null;
    
    // 获取产品标题 - 使用更精确的选择器
    showProgress('正在获取产品标题...');
    let currentTitle = '';
    const titleLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('产品标题：'));
    if (titleLabel) {
        const titleInput = titleLabel.closest('.el-form-item')?.querySelector('input.el-input__inner');
        if (titleInput) {
            currentTitle = titleInput.value;
            console.log('从标题输入框获取标题:', currentTitle);
        }
    }
    console.log('当前产品标题:', currentTitle);
    
    // 获取产品描述 - 使用更精确的选择器
    showProgress('正在获取产品描述...');
    let currentDesc = '';
    const descLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('描述：'));
    if (descLabel) {
        const descTextarea = descLabel.closest('.el-form-item')?.querySelector('textarea.el-textarea__inner');
        if (descTextarea) {
            currentDesc = descTextarea.value;
            console.log('从描述文本框获取描述:', currentDesc);
        }
    }
    console.log('当前产品描述:', currentDesc);
    
    // 获取产品分类（类别）- 专门针对产品分类字段
    showProgress('正在获取产品分类...');
    let category = '';
    const categoryLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('产品分类：') || el.textContent.includes('产品分类'));
    if (categoryLabel) {
        const formItem = categoryLabel.closest('.el-form-item');
        if (formItem) {
            const inputElement = formItem.querySelector('input[readonly], input.el-input__inner, .el-cascader input');
            if (inputElement) {
                category = inputElement.value;
                console.log('从产品分类输入框获取类别:', category);
            }
        }
    }
    // Fallback for cascader if not found by label association
    if (!category) {
        const cascaderInput = document.querySelector('.el-cascader input, .jx-pro-input input');
        if (cascaderInput) {
            const parentText = cascaderInput.closest('.el-form-item')?.textContent || '';
            if (parentText.includes('产品分类') || parentText.includes('类别')) {
                category = cascaderInput.value;
                console.log('从cascader组件获取产品分类:', category);
            }
        }
    }
    // Fallback for any readonly input if not found by previous methods
    if (!category) {
        const readonlyInputs = document.querySelectorAll('input[readonly]');
        for (const input of readonlyInputs) {
            const parentText = input.closest('.el-form-item')?.textContent || '';
            if (parentText.includes('产品分类') || parentText.includes('类别')) {
                category = input.value;
                console.log('从readonly输入框获取产品分类:', category);
                break;
            }
        }
    }
    console.log('产品分类（类别）:', category);
    
    // 采集1688包装信息
    let packageInfo = '';
    if (sourceUrl && sourceUrl.includes('1688.com')) {
        try {
            packageInfo = await fetch1688PackageInfo(sourceUrl);
            if (packageInfo) {
                console.log('采集到1688包装信息:', packageInfo);
            } else {
                console.log('未采集到1688包装信息，尝试从页面内容解析...');
                // 备用方案：从当前页面的1688相关内容中提取
                packageInfo = extract1688PackageFromPageContent();
                if (packageInfo) {
                    console.log('从页面内容采集到1688包装信息:', packageInfo);
                }
            }
        } catch (e) {
            console.error('采集1688包装信息异常:', e);
            // 备用方案：从页面内容提取
            packageInfo = extract1688PackageFromPageContent();
            if (packageInfo) {
                console.log('异常后从页面内容采集到1688包装信息:', packageInfo);
            } else {
                // 最后尝试：检查是否有用户提供的原始HTML内容可以解析
                console.log('尝试从可能的原始HTML内容中解析包装信息...');
                // 查找可能包含1688 HTML内容的地方
                const hiddenInputs = document.querySelectorAll('input[type="hidden"], textarea[style*="display:none"]');
                for (const input of hiddenInputs) {
                    const content = input.value || '';
                    if (content.includes('1688') && content.includes('包装')) {
                        const extracted = extract1688PackageFromRawHTML(content);
                        if (extracted) {
                            packageInfo = extracted;
                            console.log('从隐藏内容解析到1688包装信息:', packageInfo);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // 返回收集的信息，包括提取的尺寸和完整产品信息
    return {
        presetInfo,
        pageInfo: {
            sourceUrl,
            currentTitle,
            currentDesc,
            category,
            extractedDimensions,
            packageInfo,
            extractedProductInfo  // 添加完整的产品信息
        }
    };
    
    // 获取产品尺寸信息（长宽高）
    showProgress('正在获取产品尺寸信息...');
    let productDimensions = {
        length: '',
        width: '',
        height: ''
    };
    
    // 查找包裹尺寸字段
    const dimensionInputs = document.querySelectorAll('input[type="number"][placeholder*="长"], input[type="number"][placeholder*="宽"], input[type="number"][placeholder*="高"]');
    dimensionInputs.forEach(input => {
        const placeholder = input.placeholder;
        const value = input.value;
        
        if (placeholder.includes('长')) {
            productDimensions.length = value;
            console.log('产品长度:', value);
        } else if (placeholder.includes('宽')) {
            productDimensions.width = value;
            console.log('产品宽度:', value);
        } else if (placeholder.includes('高')) {
            productDimensions.height = value;
            console.log('产品高度:', value);
        }
    });
    
    // 如果没找到具体的尺寸字段，尝试查找包含"包裹尺寸"的字段
    if (!productDimensions.length && !productDimensions.width && !productDimensions.height) {
        const dimensionLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
            const text = el.textContent;
            return text && text.includes('包裹尺寸') && text.length < 100; // 限制文本长度避免捕获大量HTML
        });
        
        for (const element of dimensionLabels) {
            const text = element.textContent;
            if (text && text.includes('包裹尺寸')) {
                console.log('找到包裹尺寸标签:', text);
                const formItem = element.closest('.el-form-item');
                if (formItem) {
                    const inputs = formItem.querySelectorAll('input[type="number"]');
                    inputs.forEach((input, index) => {
                        const placeholder = input.placeholder;
                        const value = input.value;
                        
                        if (placeholder.includes('长') || index === 0) {
                            productDimensions.length = value;
                            console.log('从包裹尺寸获取长度:', value);
                        } else if (placeholder.includes('宽') || index === 1) {
                            productDimensions.width = value;
                            console.log('从包裹尺寸获取宽度:', value);
                        } else if (placeholder.includes('高') || index === 2) {
                            productDimensions.height = value;
                            console.log('从包裹尺寸获取高度:', value);
                        }
                    });
                    break;
                }
            }
        }
    }
    
    // 检查尺寸是否为空或为0，如果为空则设置默认值
    if (!productDimensions.length || productDimensions.length === '0') {
        productDimensions.length = '200';
        console.log('设置默认长度: 200');
    } else {
        console.log('长度已有值，跳过默认填充:', productDimensions.length);
    }
    if (!productDimensions.width || productDimensions.width === '0') {
        productDimensions.width = '200';
        console.log('设置默认宽度: 200');
    } else {
        console.log('宽度已有值，跳过默认填充:', productDimensions.width);
    }
    if (!productDimensions.height || productDimensions.height === '0') {
        productDimensions.height = '200';
        console.log('设置默认高度: 200');
    } else {
        console.log('高度已有值，跳过默认填充:', productDimensions.height);
    }
    
    console.log('产品尺寸信息:', productDimensions);
    
    return {
        presetInfo,
        pageInfo: {
            sourceUrl,
            currentTitle,
            currentDesc,
            category,
            dimensions: productDimensions
        }
    };
}

// 构建AI提示词
function buildPrompt(presetInfo, pageInfo) {
    const { sourceUrl, currentTitle, currentDesc, category, dimensions, packageInfo } = pageInfo;
    const { configuration, manufacturer, packageQuantity, targetAudience } = presetInfo;
    
    // 构建尺寸信息文本
    let dimensionsText = '';
    if ((dimensions && typeof dimensions.length !== 'undefined' && dimensions.length) ||
        (dimensions && typeof dimensions.width !== 'undefined' && dimensions.width) ||
        (dimensions && typeof dimensions.height !== 'undefined' && dimensions.height)) {
        dimensionsText = `\n产品尺寸信息：\n- 长度: ${(dimensions && typeof dimensions.length !== 'undefined' && dimensions.length) ? dimensions.length : '未填写'}\n- 宽度: ${(dimensions && typeof dimensions.width !== 'undefined' && dimensions.width) ? dimensions.width : '未填写'}\n- 高度: ${(dimensions && typeof dimensions.height !== 'undefined' && dimensions.height) ? dimensions.height : '未填写'}`;
    }
    
    let prompt = `你是一个专业的Ozon电商产品优化专家。请根据以下产品信息，生成优化的产品属性：\n\n产品基本信息：\n- 产品来源URL: ${sourceUrl || '未提供'}\n- 产品分类: ${category || '未提供'}\n- 当前产品标题: ${currentTitle || '未提供'}\n- 当前产品描述: ${currentDesc || '未提供'}${dimensionsText}`;
    if (packageInfo) {
        prompt += `\n包装信息：\n${packageInfo}`;
    }
    prompt += `\n\n请生成以下内容（全部使用俄语）：\n\n产品标题（核心标题 + 长尾关键词）：\n产品描述（至少300字，不包含尺寸信息，要有标点符号）：\n产品关键词（至少20个，用分号分隔）：\n产品标签（俄语，社交媒体风格，不包含品牌名，安全词汇，以#开头，只能包含字母、数字、下划线，最大28字符，数量最少25个，数量最好30个，用空格分隔）：\n\n请严格按照以上格式输出，每个部分都要有明确的标题。注意：标题必须使用中文，内容使用俄语。**不要输出任何markdown语法，不要加粗，不要用**包裹内容。**`;
    
    console.log('构建的AI提示词:', prompt);
    return prompt;
}

// 调用DeepSeek API
async function callDeepSeek(apiKey, prompt) {
    console.log('开始调用DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('DeepSeek API返回:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('DeepSeek API返回格式错误');
    }
    
    const content = data.choices[0].message.content;
    console.log('DeepSeek AI返回内容:', content);
    
    return content;
}

// 调用通义千问 API
async function callTongyi(apiKey, prompt) {
    console.log('开始调用通义千问 API...');
    
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                max_tokens: 2000,
                temperature: 0.7
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`通义千问 API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('通义千问 API返回:', data);
    
    if (!data.output || !data.output.choices || !data.output.choices[0] || !data.output.choices[0].message) {
        throw new Error('通义千问 API返回格式错误');
    }
    
    const content = data.output.choices[0].message.content;
    console.log('通义千问 AI返回内容:', content);
    
    return content;
}

// 调用阿里云百炼 API
async function callBailian(apiKey, prompt) {
    console.log('开始调用阿里云百炼 API...');
    
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-r1',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`阿里云百炼 API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('阿里云百炼 API返回:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('阿里云百炼 API返回格式错误');
    }
    
    const content = data.choices[0].message.content;
    console.log('阿里云百炼 AI返回内容:', content);
    
    return content;
}

// 调用AI API（根据平台选择）
async function callAI(apiPlatform, apiKey, prompt) {
    if (apiPlatform === 'deepseek') {
        return await callDeepSeek(apiKey, prompt);
    } else if (apiPlatform === 'tongyi') {
        return await callTongyi(apiKey, prompt);
    } else if (apiPlatform === 'bailian') {
        return await callBailian(apiKey, prompt);
    } else {
        throw new Error('不支持的AI平台');
    }
}

// 解析AI响应
function parseAIResponse(response) {
    const result = { title: '', description: '', keywords: '', hashtags: '', dimensions: { length: '200', width: '200', height: '200' } };
    try {
        // 只识别中文小标题，括号和冒号都可选
        let titleMatch = response.match(/(?:###\s*)?产品标题(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品描述|$)/);
        if (titleMatch) result.title = titleMatch[1].replace(/\*\*/g, '').trim();

        let descMatch = response.match(/(?:###\s*)?产品描述(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品关键词|$)/);
        if (descMatch) result.description = descMatch[1].replace(/\*\*/g, '').trim();

        let keywordsMatch = response.match(/(?:###\s*)?产品关键词(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品标签|$)/);
        if (keywordsMatch) result.keywords = keywordsMatch[1].replace(/\*\*/g, '').trim();

        let hashtagsMatch = response.match(/(?:###\s*)?产品标签(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n|$)/);
        if (hashtagsMatch) result.hashtags = hashtagsMatch[1].replace(/\*\*/g, '').trim();

        return result;
    } catch (e) {
        console.error('AI解析失败', e);
        return result;
    }
}

function findInputByLabel(labelText) {
    // 统一处理labelText，去除空格、冒号、全角半角、转小写
    const norm = s => s ? s.replace(/[：:：\s]/g, '').toLowerCase() : '';
    const normLabelText = norm(labelText);
    // 1. 先找label或span
    const label = Array.from(document.querySelectorAll('label span, span')).find(
        el => norm(el.textContent) === normLabelText
    );
    if (label) {
        // 支持label的for属性
        const labelEl = label.closest('label');
        if (labelEl && labelEl.getAttribute('for')) {
            const forId = labelEl.getAttribute('for');
            const byId = document.getElementById(forId);
            if (byId) return byId;
            // 也支持name属性
            const byName = document.querySelector(`input[name='${forId}'], textarea[name='${forId}']`);
            if (byName) return byName;
        }
        // 2. 向上找.el-form-item，再找input/textarea
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const input = formItem.querySelector('input.el-input__inner, textarea.el-textarea__inner, input, textarea');
            if (input) return input;
        }
    }
    // 3. placeholder、aria-label、name、class、父级div文本模糊匹配
    const allInputs = document.querySelectorAll('input.el-input__inner, textarea.el-textarea__inner, input, textarea');
    for (const input of allInputs) {
        // placeholder
        if (input.placeholder && norm(input.placeholder).includes(normLabelText)) return input;
        // aria-label
        if (input.getAttribute('aria-label') && norm(input.getAttribute('aria-label')).includes(normLabelText)) return input;
        // name
        if (input.name && norm(input.name).includes(normLabelText)) return input;
        // class
        if (input.className && norm(input.className).includes(normLabelText)) return input;
        // 父级div的文本
        const parentDiv = input.closest('div');
        if (parentDiv && norm(parentDiv.textContent).includes(normLabelText)) return input;
        // 兜底：通过父级 .jx-pro-input 的 cid 唯一定位关键词输入框
        if (labelText.includes('关键字') || labelText.includes('关键词')) {
            const jxParent = input.closest('.jx-pro-input');
            if (jxParent && jxParent.getAttribute('cid') === '780113') {
                return input;
            }
        }
    }
    // 4. 兜底：遍历所有input/textarea，输出其父级和label内容，辅助调试
    console.log('【调试】所有input/textarea及父级：');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span, span') : null;
        console.log('input:', input, 'label:', label?.textContent);
    }
    return null;
}

function setNativeValue(element, value) {
    const lastValue = element.value;
    element.focus();
    element.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function setNativeValueWithPaste(element, value) {
    element.focus();
    // 尝试粘贴事件
    try {
        const clipboardEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        clipboardEvent.clipboardData.setData('text/plain', value);
        element.dispatchEvent(clipboardEvent);
    } catch (e) {
        // 某些浏览器不支持ClipboardEvent
    }
    // 兜底赋值
    const lastValue = element.value;
    element.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// 终极描述查找函数
function findDescTextarea() {
    console.log('【调试】开始查找描述输入框...');
    
    // 1. 通过label for="notes"属性查找
    const label = document.querySelector('label[for="notes"]');
    if (label) {
        console.log('找到label[for="notes"]:', label);
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const textarea = formItem.querySelector('textarea.el-textarea__inner');
            if (textarea) {
                console.log('通过label for找到描述textarea:', textarea);
                return textarea;
            }
        }
    }
    
    // 2. 通过label文本内容查找
    const allLabels = document.querySelectorAll('label');
    for (const label of allLabels) {
        if (label.textContent.includes('描述')) {
            console.log('找到包含"描述"的label:', label);
            const formItem = label.closest('.el-form-item');
            if (formItem) {
                const textarea = formItem.querySelector('textarea.el-textarea__inner');
                if (textarea) {
                    console.log('通过label文本找到描述textarea:', textarea);
                    return textarea;
                }
            }
        }
    }
    
    // 3. 通过父级结构查找
    const allTextareas = document.querySelectorAll('textarea.el-textarea__inner');
    for (const textarea of allTextareas) {
        const jxParent = textarea.closest('.jx-pro-input.el-textarea');
        if (jxParent) {
            console.log('通过父级结构找到描述textarea:', textarea);
            return textarea;
        }
    }
    
    // 4. 兜底：如果只有一个textarea，直接返回
    if (allTextareas.length === 1) {
        console.log('页面只有一个textarea，作为描述输入框:', allTextareas[0]);
        return allTextareas[0];
    }
    
    console.log('【调试】所有textarea及父级：');
    for (const textarea of allTextareas) {
        const formItem = textarea.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label') : null;
        console.log('textarea:', textarea, 'label:', label?.textContent);
    }
    
    return null;
}

// 备选填写方案 - 多种方法确保成功
function setNativeValueWithFallback(element, value) {
    console.log('【调试】备选填写开始:', element, '值:', value);
    
    // 方案1: 直接DOM操作
    try {
        element.setAttribute('value', value);
        element.value = value;
        console.log('【调试】方案1完成: 直接DOM操作');
    } catch (e) {
        console.log('【调试】方案1失败:', e);
    }
    
    // 方案2: 键盘输入模拟
    try {
        element.focus();
        element.value = '';
        for (let i = 0; i < value.length; i++) {
            element.value += value[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { key: value[i], code: 'Key' + value[i].toUpperCase(), bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: value[i], code: 'Key' + value[i].toUpperCase(), bubbles: true }));
        }
        console.log('【调试】方案2完成: 键盘输入模拟');
    } catch (e) {
        console.log('【调试】方案2失败:', e);
    }
    
    // 方案3: Vue组件操作
    try {
        if (element.__vue__) {
            element.__vue__.$emit('input', value);
            console.log('【调试】方案3完成: Vue组件操作');
        }
    } catch (e) {
        console.log('【调试】方案3失败:', e);
    }
    
    // 方案4: 使用execCommand
    try {
        element.focus();
        element.select();
        document.execCommand('insertText', false, value);
        console.log('【调试】方案4完成: execCommand');
    } catch (e) {
        console.log('【调试】方案4失败:', e);
    }
    
    // 方案5: 触发所有可能的事件
    try {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        console.log('【调试】方案5完成: 事件触发');
    } catch (e) {
        console.log('【调试】方案5失败:', e);
    }
    
    console.log('【调试】备选填写完成，最终值:', element.value);
}

// 终极填写函数 - 极限事件模拟，最大兼容 Element UI/Vue
function setNativeValueWithAllEvents(element, value) {
    console.log('【调试】极限填写开始:', element, '值:', value);
    console.log('【调试】元素类型:', element.tagName, 'class:', element.className);

    // 1. 聚焦
    element.click();
    element.focus();
    console.log('【调试】步骤1完成: 聚焦');

    // 2. 清空
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('【调试】步骤2完成: 清空');

    // 3. 组合事件模拟
    try {
        element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    } catch (e) {
        console.log('【调试】组合事件开始失败:', e);
    }
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    try {
        element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    } catch (e) {
        console.log('【调试】组合事件结束失败:', e);
    }
    console.log('【调试】步骤3完成: 组合事件');

    // 4. 粘贴事件
    try {
        const clipboardEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        clipboardEvent.clipboardData.setData('text/plain', value);
        element.dispatchEvent(clipboardEvent);
        console.log('【调试】步骤4完成: 粘贴事件');
    } catch (e) {
        console.log('【调试】粘贴事件失败:', e);
    }

    // 5. 再次赋值+事件
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    console.log('【调试】步骤5完成: 再次赋值');

    // 6. 模拟键盘事件
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true }));
    console.log('【调试】步骤6完成: 键盘事件');

    // 7. 选中内容再失焦
    if (element.select) element.select();
    element.blur();
    setTimeout(() => {
        element.focus();
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('【调试】极限填写完成，最终值:', element.value);
        console.log('【调试】元素当前状态:', {
            value: element.value,
            disabled: element.disabled,
            readOnly: element.readOnly,
            type: element.type
        });
    }, 100);
}

// 预设属性降级填写方案
async function fallbackPresetFill(fieldType, value) {
    console.log(`🔄 执行 ${fieldType} 的降级填写方案...`);
    
    const fieldMapping = {
        'CONFIGURATION': ['配置(Комплектация)', '配置'],
        'MANUFACTURER': ['制造国(Страна-изготовитель)', '制造国'],
        'PACKAGE_QUANTITY': ['原厂包装数量', '包装数量'],
        'TARGET_AUDIENCE': ['目标受众(Целевая аудитория)', '目标受众']
    };
    
    const labels = fieldMapping[fieldType];
    if (!labels) return false;
    
    for (const label of labels) {
        const input = findInputByLabel(label);
        if (input && (!input.value || input.value.trim() === '')) {
            try {
                setNativeValueWithFallback(input, value);
                console.log(`✅ ${fieldType} 降级填写成功:`, value);
                return true;
            } catch (error) {
                console.warn(`❌ ${fieldType} 降级填写失败:`, error);
            }
        }
    }
    return false;
}

// 原有预设属性填写方案（最后的降级方案）
async function legacyPresetFill(presetInfo) {
    console.log('🔄 执行原有预设属性填写方案...');
    
    if (presetInfo.configuration) {
        const configInput = findInputByLabel('配置(Комплектация)') || findInputByLabel('配置');
        if (configInput && (!configInput.value || configInput.value.trim() === '')) {
            setNativeValueWithFallback(configInput, presetInfo.configuration);
            console.log('✅ 配置降级填写成功:', presetInfo.configuration);
        }
    }

    if (presetInfo.manufacturer) {
        const manufacturerInput = findInputByLabel('制造国(Страна-изготовитель)') || findInputByLabel('制造国');
        if (manufacturerInput && (!manufacturerInput.value || manufacturerInput.value.trim() === '')) {
            setNativeValueWithFallback(manufacturerInput, presetInfo.manufacturer);
            console.log('✅ 制造国降级填写成功:', presetInfo.manufacturer);
        }
    }

    if (presetInfo.packageQuantity) {
        const packageInput = findInputByLabel('原厂包装数量') || findInputByLabel('包装数量');
        if (packageInput && (!packageInput.value || packageInput.value.trim() === '')) {
            setNativeValueWithFallback(packageInput, presetInfo.packageQuantity);
            console.log('✅ 包装数量降级填写成功:', presetInfo.packageQuantity);
        }
    }

    if (presetInfo.targetAudience) {
        const audienceInput = findInputByLabel('目标受众(Целевая аудитория)') || findInputByLabel('目标受众');
        if (audienceInput && (!audienceInput.value || audienceInput.value.trim() === '')) {
            setNativeValueWithFallback(audienceInput, presetInfo.targetAudience);
            console.log('✅ 目标受众降级填写成功:', presetInfo.targetAudience);
        }
    }
}

/**
 * 增强的字段填写验证系统
 */
class FieldValidator {
    static async validateField(element, expectedValue, fieldName) {
        if (!element) return { success: false, error: '元素不存在' };
        
        // 等待元素稳定
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const actualValue = element.value || element.textContent || '';
        const isValid = actualValue.trim() === expectedValue.trim();
        
        return {
            success: isValid,
            expectedValue,
            actualValue: actualValue.trim(),
            fieldName,
            element
        };
    }
    
    static async retryFillField(element, value, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try {
                // 清空字段
                element.value = '';
                element.focus();
                
                // 模拟用户输入
                for (const char of value) {
                    element.value += char;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                // 触发change事件
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.blur();
                
                // 验证结果
                await new Promise(resolve => setTimeout(resolve, 100));
                if (element.value.trim() === value.trim()) {
                    return { success: true, attempts: i + 1 };
                }
            } catch (error) {
                ErrorHandler.warn(`重试填写第${i + 1}次失败:`, error);
            }
        }
        
        return { success: false, attempts: retries };
    }
}

async function fillFields(aiResult, extractedDimensions = null, pageInfo = null) {
    ErrorHandler.log('🎯 开始增强版字段填写流程...');
    ErrorHandler.log('AI结果:', aiResult);
    ErrorHandler.log('提取的尺寸信息:', extractedDimensions);
    ErrorHandler.log('页面信息:', pageInfo);

    // 初始化字段填写统计
    const fillStats = {
        attempted: 0,
        successful: 0,
        failed: 0,
        details: []
    };

    // 获取预设信息
    const presetInfo = await new Promise((resolve) => {
        chrome.storage.local.get([
            'configuration',
            'manufacturer', 
            'packageQuantity',
            'targetAudience'
        ], resolve);
    });
    
    ErrorHandler.log('预设信息:', presetInfo);
    
    // =============================================================================
    // 🎯 智能字段匹配和填写
    // =============================================================================
    
    let smartMatchedValues = {};
    
    // =============================================================================
    // 🎯 阶段1: 智能字段匹配和填写
    // =============================================================================
    
    if (pageInfo && pageInfo.extractedProductInfo) {
        try {
            ErrorHandler.log('🚀 开始执行智能字段匹配...');
            ProgressManager.updateFieldStatus('智能匹配', 'processing', '正在分析产品信息');
            
            smartMatchedValues = ProductInfoMatcher.matchProductInfoToERPFields(
                pageInfo.extractedProductInfo,
                pageInfo.packageInfo,
                presetInfo
            );
            
            if (Object.keys(smartMatchedValues).length > 0) {
                ErrorHandler.log(`✅ 智能匹配成功，找到 ${Object.keys(smartMatchedValues).length} 个可填写字段`);
                ProgressManager.updateFieldStatus('智能匹配', 'processing', `找到${Object.keys(smartMatchedValues).length}个字段`);
                
                // 使用增强的MiaoshouERPHelper填写智能匹配的字段
                const smartFillResults = await ErrorHandler.handleAsync(
                    () => MiaoshouERPHelper.setFieldValues(smartMatchedValues, {
                        delay: 300,
                        validate: true,
                        retryOnFailure: true,
                        maxRetries: 2
                    }),
                    () => ({}),
                    '智能字段填写'
                );
                
                ErrorHandler.log('🎯 智能字段填写结果:', smartFillResults);
                
                // 统计成功和失败
                let successCount = 0;
                let failCount = 0;
                
                Object.keys(smartFillResults).forEach(fieldKey => {
                    fillStats.attempted++;
                    if (smartFillResults[fieldKey].success) {
                        successCount++;
                        fillStats.successful++;
                        ProgressManager.updateFieldStatus(fieldKey, 'success', smartFillResults[fieldKey].details || '智能匹配成功');
                    } else {
                        failCount++;
                        fillStats.failed++;
                        ProgressManager.updateFieldStatus(fieldKey, 'failed', smartFillResults[fieldKey].error || '智能匹配失败');
                    }
                    
                    fillStats.details.push({
                        field: fieldKey,
                        success: smartFillResults[fieldKey].success,
                        method: '智能匹配',
                        details: smartFillResults[fieldKey]
                    });
                });
                
                if (successCount > 0) {
                    ProgressManager.updateFieldStatus('智能匹配', 'success', `成功填写${successCount}个字段`);
                    ErrorHandler.log(`✨ 智能匹配填写了 ${successCount} 个字段，失败 ${failCount} 个`);
                } else {
                    ProgressManager.updateFieldStatus('智能匹配', 'failed', '所有字段填写失败');
                }
            } else {
                ErrorHandler.warn('⚠️ 智能匹配未找到可填写的字段');
                ProgressManager.updateFieldStatus('智能匹配', 'failed', '未找到可填写字段');
            }
            
        } catch (error) {
            ErrorHandler.error('❌ 智能字段匹配出错:', error);
            ProgressManager.updateFieldStatus('智能匹配', 'failed', error.message);
        }
    } else {
        ErrorHandler.log('⚠️ 没有页面信息或提取的产品信息，跳过智能匹配');
        ProgressManager.updateFieldStatus('智能匹配', 'skipped', '无产品信息可匹配');
    }

    // 使用妙手ERP专用工具填写预设属性
    console.log('🚀 开始使用妙手ERP专用工具填写预设属性...');
    
    try {
        const presetValues = {};
        
        // 准备预设属性数据
        if (presetInfo.configuration) {
            presetValues.CONFIGURATION = presetInfo.configuration;
            console.log('✅ 准备填写配置:', presetInfo.configuration);
        }
        
        if (presetInfo.manufacturer) {
            presetValues.MANUFACTURER = presetInfo.manufacturer;
            console.log('✅ 准备填写制造国:', presetInfo.manufacturer);
        }
        
        if (presetInfo.packageQuantity) {
            presetValues.PACKAGE_QUANTITY = presetInfo.packageQuantity;
            console.log('✅ 准备填写包装数量:', presetInfo.packageQuantity);
        }
        
        if (presetInfo.targetAudience) {
            presetValues.TARGET_AUDIENCE = presetInfo.targetAudience;
            console.log('✅ 准备填写目标受众:', presetInfo.targetAudience);
        }
        
        // 批量填写预设属性
        if (Object.keys(presetValues).length > 0) {
            ProgressManager.updateFieldStatus('预设属性', 'processing', '正在填写预设属性');
            
            const results = await MiaoshouERPHelper.setFieldValues(presetValues, {
                delay: 200,  // 每个字段间隔200ms
                validate: false  // 预设值不需要验证
            });
            
            // 输出填写结果
            for (const [fieldType, result] of Object.entries(results)) {
                if (result.success) {
                    console.log(`✅ ${fieldType} 填写成功`);
                    ProgressManager.updateFieldStatus(fieldType, 'success', '预设值填写成功');
                } else {
                    console.warn(`❌ ${fieldType} 填写失败:`, result.error);
                    ProgressManager.updateFieldStatus(fieldType, 'failed', result.error);
                    
                    // 失败时尝试降级方案
                    console.log(`🔄 尝试 ${fieldType} 的降级填写方案...`);
                    await fallbackPresetFill(fieldType, presetValues[fieldType]);
                }
            }
            
            console.log('🎯 预设属性填写完成，结果:', results);
        } else {
            console.log('ℹ️ 没有需要填写的预设属性');
        }
        
    } catch (error) {
        console.error('❌ 预设属性填写出错:', error);
        ProgressManager.updateFieldStatus('预设属性', 'failed', error.message);
        
        // 错误时使用原有方法作为降级方案
        try {
            await legacyPresetFill(presetInfo);
        } catch (legacyError) {
            console.error('❌ 降级填写也失败:', legacyError);
        }
    }

    // =============================================================================
    // 🎯 阶段2: AI内容填写
    // =============================================================================
    
    console.log('🚀 开始填写AI优化内容...');
    ProgressManager.updateFieldStatus('AI内容填写', 'processing', '开始填写AI生成的内容');

    // 标题 - 专门查找+备选填写方案
    ProgressManager.updateFieldStatus('标题', 'processing', '正在填写产品标题');
    const titleInput = findTitleInput();
    if (titleInput && aiResult.title) {
        try {
            await RetryManager.retry(
                () => setNativeValueWithFallback(titleInput, aiResult.title),
                3,
                500,
                '标题填写'
            );
            console.log('✅ 已填写标题:', aiResult.title);
            ProgressManager.updateFieldStatus('标题', 'success', `已填写: ${aiResult.title.substring(0, 50)}...`);
        } catch (error) {
            console.error('❌ 标题填写出错:', error);
            ProgressManager.updateFieldStatus('标题', 'failed', error.message);
        }
    } else {
        console.log('❌ 未找到标题输入框或AI结果为空');
        console.log('AI结果中的标题:', aiResult.title);
        ProgressManager.updateFieldStatus('标题', 'failed', '未找到输入框或AI结果为空');
    }

    // 描述 - 备选填写方案
    ProgressManager.updateFieldStatus('描述', 'processing', '正在填写产品描述');
    const descInput = findDescTextarea();
    if (descInput && aiResult.description) {
        try {
            await RetryManager.retry(
                () => setNativeValueWithFallback(descInput, aiResult.description),
                3,
                500,
                '描述填写'
            );
            console.log('✅ 已填写描述:', aiResult.description);
            ProgressManager.updateFieldStatus('描述', 'success', `已填写: ${aiResult.description.substring(0, 50)}...`);
        } catch (error) {
            console.error('❌ 描述填写出错:', error);
            ProgressManager.updateFieldStatus('描述', 'failed', error.message);
        }
    } else {
        console.log('❌ 未找到描述输入框或AI结果为空');
        ProgressManager.updateFieldStatus('描述', 'failed', '未找到输入框或AI结果为空');
    }

    // 关键词 - 使用多重填写策略
    ProgressManager.updateFieldStatus('关键词', 'processing', '正在填写产品关键词');
    const keywordsInput = findKeywordsInput();
    if (keywordsInput && aiResult.keywords) {
        try {
            console.log('🔄 开始关键词填写，使用多重策略');
            
            // 策略1: 标准填写
            await RetryManager.retry(
                () => setNativeValueWithFallback(keywordsInput, aiResult.keywords),
                2,
                300,
                '关键词标准填写'
            );
            
            // 验证填写结果
            await new Promise(resolve => setTimeout(resolve, 200));
            if (keywordsInput.value !== aiResult.keywords) {
                console.log('🔄 标准填写可能失败，尝试强化填写');
                
                // 策略2: 强化填写（多事件触发）
                keywordsInput.focus();
                keywordsInput.value = aiResult.keywords;
                ['input', 'change', 'blur', 'keyup', 'paste'].forEach(eventType => {
                    keywordsInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                
                // 最终验证
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            if (keywordsInput.value === aiResult.keywords) {
                console.log('✅ 关键词填写成功:', aiResult.keywords);
                ProgressManager.updateFieldStatus('关键词', 'success', `已填写: ${aiResult.keywords}`);
            } else {
                throw new Error('填写验证失败，实际值与预期不符');
            }
        } catch (error) {
            console.error('❌ 关键词填写出错:', error);
            ProgressManager.updateFieldStatus('关键词', 'failed', error.message);
        }
    } else {
        console.log('❌ 未找到关键词输入框或AI结果为空');
        console.log('AI结果中的关键词:', aiResult.keywords);
        ProgressManager.updateFieldStatus('关键词', 'failed', '未找到输入框或AI结果为空');
    }

    // 标签 - 备选填写方案
    ProgressManager.updateFieldStatus('标签', 'processing', '正在填写产品标签');
    const hashtagsInput = findInputByLabel('#主题标签(#Хештеги)') || findInputByLabel('标签');
    if (hashtagsInput && aiResult.hashtags) {
        try {
            await RetryManager.retry(
                () => setNativeValueWithFallback(hashtagsInput, aiResult.hashtags),
                3,
                500,
                '标签填写'
            );
            console.log('✅ 已填写标签:', aiResult.hashtags);
            ProgressManager.updateFieldStatus('标签', 'success', `已填写: ${aiResult.hashtags}`);
        } catch (error) {
            console.error('❌ 标签填写出错:', error);
            ProgressManager.updateFieldStatus('标签', 'failed', error.message);
        }
    } else {
        console.log('❌ 未找到标签输入框或AI结果为空');
        ProgressManager.updateFieldStatus('标签', 'failed', '未找到输入框或AI结果为空');
    }
    
    // 完成AI内容填写
    ProgressManager.updateFieldStatus('AI内容填写', 'success', '所有AI内容填写完成');
    console.log('🎯 AI内容填写阶段完成');

    // 尺寸逻辑 - 优化跳过条件
    const lengthInput = document.querySelector('input[type="number"][placeholder*="长"]');
    const widthInput = document.querySelector('input[type="number"][placeholder*="宽"]');
    const heightInput = document.querySelector('input[type="number"][placeholder*="高"]');

    // 检查长度字段
    if (lengthInput) {
        const lengthValue = lengthInput.value.trim();
        if (!lengthValue || lengthValue === '0' || lengthValue === '') {
            // 优先使用提取的尺寸信息
            let lengthToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.length !== 'undefined' && extractedDimensions.length) {
                lengthToFill = extractedDimensions.length.toString();
                console.log('使用从URL提取的长度:', lengthToFill);
            } else {
                console.log('使用默认长度:', lengthToFill);
            }
            
            ProgressManager.updateFieldStatus('长度', 'processing', `正在填写产品长度(${lengthToFill})`);
            
            // 检查输入框是否可编辑
            if (lengthInput.readOnly || lengthInput.disabled) {
                console.log('长度输入框被锁定，无法填写');
                ProgressManager.updateFieldStatus('长度', 'failed', '输入框被锁定');
                return;
            }
            
            try {
                setNativeValueWithFallback(lengthInput, lengthToFill);
                console.log(`已填写长度: ${lengthToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (lengthInput.value === lengthToFill) {
                        console.log('✅ 长度填写成功');
                        ProgressManager.updateFieldStatus('长度', 'success', `已填写: ${lengthToFill}`);
                    } else {
                        console.log('❌ 长度填写可能失败，当前值:', lengthInput.value);
                        ProgressManager.updateFieldStatus('长度', 'failed', '验证失败');
                    }
                }, 500);
                
            } catch (error) {
                console.error('❌ 填写长度时出错:', error);
                ProgressManager.updateFieldStatus('长度', 'failed', error.message);
            }
        } else {
            console.log('长度字段已有值，跳过填写:', lengthValue);
        }
    } else {
        console.log('未找到长度输入框');
    }

    // 检查宽度字段
    if (widthInput) {
        const widthValue = widthInput.value.trim();
        if (!widthValue || widthValue === '0' || widthValue === '') {
            // 优先使用提取的尺寸信息
            let widthToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.width !== 'undefined' && extractedDimensions.width) {
                widthToFill = extractedDimensions.width.toString();
                console.log('使用从URL提取的宽度:', widthToFill);
            } else {
                console.log('使用默认宽度:', widthToFill);
            }
            
            ProgressManager.updateFieldStatus('宽度', 'processing', `正在填写产品宽度(${widthToFill})`);
            
            // 检查输入框是否可编辑
            if (widthInput.readOnly || widthInput.disabled) {
                console.log('宽度输入框被锁定，无法填写');
                ProgressManager.updateFieldStatus('宽度', 'failed', '输入框被锁定');
                return;
            }
            
            try {
                setNativeValueWithFallback(widthInput, widthToFill);
                console.log(`已填写宽度: ${widthToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (widthInput.value === widthToFill) {
                        console.log('✅ 宽度填写成功');
                        ProgressManager.updateFieldStatus('宽度', 'success', `已填写: ${widthToFill}`);
                    } else {
                        console.log('❌ 宽度填写可能失败，当前值:', widthInput.value);
                        ProgressManager.updateFieldStatus('宽度', 'failed', '验证失败');
                    }
                }, 500);
                
            } catch (error) {
                console.error('❌ 填写宽度时出错:', error);
                ProgressManager.updateFieldStatus('宽度', 'failed', error.message);
            }
        } else {
            console.log('宽度字段已有值，跳过填写:', widthValue);
        }
    } else {
        console.log('未找到宽度输入框');
    }

    // 检查高度字段
    if (heightInput) {
        const heightValue = heightInput.value.trim();
        if (!heightValue || heightValue === '0' || heightValue === '') {
            // 优先使用提取的尺寸信息
            let heightToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.height !== 'undefined' && extractedDimensions.height) {
                heightToFill = extractedDimensions.height.toString();
                console.log('使用从URL提取的高度:', heightToFill);
            } else {
                console.log('使用默认高度:', heightToFill);
            }
            
            ProgressManager.updateFieldStatus('高度', 'processing', `正在填写产品高度(${heightToFill})`);
            
            // 检查输入框是否可编辑
            if (heightInput.readOnly || heightInput.disabled) {
                console.log('高度输入框被锁定，无法填写');
                ProgressManager.updateFieldStatus('高度', 'failed', '输入框被锁定');
                return;
            }
            
            try {
                setNativeValueWithFallback(heightInput, heightToFill);
                console.log(`已填写高度: ${heightToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (heightInput.value === heightToFill) {
                        console.log('✅ 高度填写成功');
                        ProgressManager.updateFieldStatus('高度', 'success', `已填写: ${heightToFill}`);
                    } else {
                        console.log('❌ 高度填写可能失败，当前值:', heightInput.value);
                        ProgressManager.updateFieldStatus('高度', 'failed', '验证失败');
                    }
                }, 500);
                
            } catch (error) {
                console.error('❌ 填写高度时出错:', error);
                ProgressManager.updateFieldStatus('高度', 'failed', error.message);
            }
        } else {
            console.log('高度字段已有值，跳过填写:', heightValue);
        }
    } else {
        console.log('未找到高度输入框');
    }
}

// 标记产品
function markProduct() {
    console.log('开始标记产品...');
    
    // 查找标记按钮，使用正确的JavaScript方法
    const allButtons = document.querySelectorAll('button');
    let markBtn = null;
    
    // 查找包含"标记"、"mark"、"Mark"的按钮
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('标记') || text.includes('mark')) {
            markBtn = btn;
            break;
        }
    }
    
    if (markBtn) {
        showProgress('正在标记产品...', markBtn);
        markBtn.click();
        console.log('已点击标记按钮');
    } else {
        console.log('未找到标记按钮');
    }
}

// 更新版本号
async function updateVersion() {
    console.log('开始更新版本号...');
    try {
        // 由于浏览器扩展的安全限制，我们无法直接修改manifest.json文件
        // 但我们可以将新版本号存储到storage中，供popup显示
        const currentTime = new Date().toLocaleString();
        
        // 从storage获取当前版本号
        chrome.storage.local.get(['currentVersion'], function(result) {
            let currentVersion = result.currentVersion || '1.0.86';
            const versionParts = currentVersion.split('.');
            const major = parseInt(versionParts[0]);
            const minor = parseInt(versionParts[1]);
            const patch = parseInt(versionParts[2]);
            
            // 增加patch版本号
            const newPatch = patch + 1;
            const newVersion = `${major}.${minor}.${newPatch}`;
            
            console.log(`版本号更新: ${currentVersion} -> ${newVersion}`);
            
            // 存储新版本号到storage
            chrome.storage.local.set({ 
                currentVersion: newVersion,
                lastUpdateTime: currentTime
            }, function() {
                console.log('版本号已存储到storage');
                
                // 显示版本更新提示
                if (floatingBtn) {
                    const originalText = floatingBtn.textContent;
                    floatingBtn.textContent = `版本已更新: ${newVersion}`;
                    setTimeout(() => {
                        floatingBtn.textContent = originalText;
                    }, 2000);
                }
                
                console.log('版本号更新完成');
            });
        });
        
    } catch (error) {
        console.error('更新版本号失败:', error);
        // 即使版本更新失败，也不影响主要功能
        console.log('版本更新失败，但不影响优化功能');
    }
}

// 检查产品是否已标记
function isProductMarked() {
    console.log('检查产品是否已标记...');
    
    // 查找标记按钮，使用正确的JavaScript方法
    const allButtons = document.querySelectorAll('button');
    let markBtn = null;
    
    // 查找包含"标记"、"mark"、"Mark"的按钮
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('标记') || text.includes('mark')) {
            markBtn = btn;
            break;
        }
    }
    
    if (markBtn) {
        // 检查按钮是否可点击（未标记状态）
        const isClickable = !markBtn.disabled && markBtn.style.display !== 'none';
        console.log('标记按钮状态:', isClickable ? '可点击（未标记）' : '不可点击（已标记）');
        return !isClickable; // 如果不可点击，说明已标记
    }
    
    // 如果没有找到标记按钮，尝试其他方式检查
    // 查找已标记的标识
    const markedIndicator = document.querySelector('[class*="marked"], [class*="collected"], [class*="signed"]');
    if (markedIndicator) {
        console.log('发现已标记标识');
        return true;
    }
    
    // 检查按钮文本是否包含"已标记"、"已收藏"等
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('已标记') || text.includes('已收藏') || text.includes('marked') || text.includes('collected')) {
            console.log('发现已标记按钮:', btn.textContent);
            return true;
        }
    }
    
    console.log('产品未标记');
    return false;
}

// 专门查找产品标题输入框
function findTitleInput() {
    console.log('【调试】开始查找产品标题输入框...');
    
    // 方案1: 通过label for="title"属性（最精确）
    const label = document.querySelector('label[for="title"]');
    if (label) {
        console.log('找到label[for="title"]:', label);
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const input = formItem.querySelector('input.el-input__inner');
            if (input) {
                console.log('通过label for找到标题input:', input);
                return input;
            }
        }
    }
    
    // 方案2: 通过包含"产品标题"的label文本（精确匹配）
    const allLabels = document.querySelectorAll('label');
    for (const label of allLabels) {
        const text = label.textContent.trim();
        if (text === '产品标题：' || text === '产品标题') {
            console.log('找到包含"产品标题"的label:', label);
            const formItem = label.closest('.el-form-item');
            if (formItem) {
                const input = formItem.querySelector('input.el-input__inner');
                if (input) {
                    console.log('通过label文本找到标题input:', input);
                    return input;
                }
            }
        }
    }
    
    // 方案3: 通过span文本精确查找
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
        const text = span.textContent.trim();
        if (text === '产品标题：' || text === '产品标题') {
            console.log('找到产品标题span:', span);
            const formItem = span.closest('.el-form-item');
            if (formItem) {
                const input = formItem.querySelector('input.el-input__inner');
                if (input) {
                    console.log('通过span文本找到标题input:', input);
                    return input;
                }
            }
        }
    }
    
    // 方案4: 兜底 - 查找所有input并输出调试信息
    console.log('【调试】所有input及父级：');
    const allInputs = document.querySelectorAll('input.el-input__inner');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        console.log('input:', input, 'label:', label?.textContent, 'for:', label?.closest('label')?.getAttribute('for'));
    }
    
    return null;
}

// 终极兼容：宽松查找关键词输入框
function findKeywordsInput() {
    console.log('=== 开始查找关键字输入框 ===');
    
    // 1. 找到包含"关键字(Ключевые слова)"的span
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
        const text = span.textContent.trim();
        if (text.includes('关键字') && text.includes('Ключевые слова')) {
            console.log('找到关键字标签span:', span.outerHTML);
            
            // 2. 找到包含这个span的edit-field-label
            const labelDiv = span.closest('.edit-field-label');
            if (labelDiv) {
                console.log('找到edit-field-label:', labelDiv.outerHTML);
                
                // 3. 找到edit-field-label的兄弟元素edit-field-content
                const contentDiv = labelDiv.nextElementSibling;
                if (contentDiv && contentDiv.classList.contains('edit-field-content')) {
                    console.log('找到edit-field-content:', contentDiv.outerHTML);
                    
                    // 4. 在edit-field-content中查找input
                    const input = contentDiv.querySelector('input.el-input__inner');
                    if (input) {
                        // 额外验证：确保不是标题输入框
                        if (input.placeholder === '请输入' && !input.readOnly) {
                            console.log('✅ 找到正确的关键字input:', input.outerHTML);
                            return input;
                        } else {
                            console.log('❌ 过滤掉input:', input.outerHTML, '原因:', input.readOnly ? 'readonly' : 'placeholder不是请输入');
                        }
                    } else {
                        console.log('❌ 在edit-field-content中未找到input');
                    }
                } else {
                    console.log('❌ 未找到edit-field-content兄弟元素');
                }
            } else {
                console.log('❌ 未找到edit-field-label父级');
            }
        }
    }
    
    console.log('=== 精确查找失败，尝试备用扫描 ===');
    
    // 备用方案：简化扫描
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        const text = element.textContent || '';
        if (text.includes('关键字') && text.includes('Ключевые слова')) {
            // 从这个元素开始，向上查找所有父级容器
            let current = element;
            while (current && current !== document.body) {
                // 在当前容器中查找所有input
                const inputs = current.querySelectorAll('input');
                for (const input of inputs) {
                    // 检查input是否在正确的容器中
                    if (input.closest('.el-form-item') || input.closest('.edit-field-content')) {
                        // 确保是真正的关键字输入框
                        if (!input.readOnly && input.placeholder === '请输入' && input.type === 'text') {
                            // 额外验证：检查这个input是否在包含关键字标签的容器中
                            const container = input.closest('.el-form-item, .edit-field-content');
                            if (container) {
                                const containerText = container.textContent || '';
                                if (containerText.includes('关键字') && containerText.includes('Ключевые слова')) {
                                    console.log('✅ 备用扫描找到关键字input:', input.outerHTML);
                                    return input;
                                }
                            }
                        }
                    }
                }
                current = current.parentElement;
            }
        }
    }
    
    console.log('=== 所有查找方法都失败了 ===');
    return null;
}

// 优化字段识别调试输出，显示新查找逻辑
async function testFieldRecognition() {
    console.log('【唯一标记】testFieldRecognition新版');
    console.log('=== 字段识别测试 ===');
    
    // 测试标题输入框
    let titleInput = findTitleInput();
    if (titleInput) {
        console.log('✅ 找到 标题 输入框:', titleInput.outerHTML);
    } else {
        console.log('❌ 未找到 标题 输入框');
    }
    
    // 测试关键字输入框
    let keywordInput = findKeywordsInput();
    if (keywordInput) {
        console.log('✅ 找到 关键词 输入框（新结构适配）:', keywordInput.outerHTML);
    } else {
        console.log('❌ 未找到 关键词 输入框（新结构适配）');
    }
    
    // 输出所有input的详细信息
    console.log('=== 所有input详细信息 ===');
    const allInputs = document.querySelectorAll('input');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        const editFieldLabel = input.closest('.edit-field-label');
        const editFieldContent = input.closest('.edit-field-content');
        
        console.log('input:', {
            outerHTML: input.outerHTML,
            placeholder: input.placeholder,
            readOnly: input.readOnly,
            type: input.type,
            className: input.className,
            labelText: label?.textContent?.trim(),
            hasEditFieldLabel: !!editFieldLabel,
            hasEditFieldContent: !!editFieldContent
        });
    }
    
    console.log('=== 字段识别测试完成 ===');
}

// 主函数 - 增强版
async function main() {
    if (!floatingBtn) {
        ErrorHandler.error('悬浮按钮不存在');
        return;
    }
    
    try {
        // 启动性能监控和进度跟踪
        DebugManager.startTimer('total_optimization');
        ProgressManager.startProgress(8);
        DebugManager.logDebug('开始优化流程');
        
        // 0. 测试字段识别
        floatingBtn.textContent = '测试字段识别...';
        ProgressManager.updateStep('测试字段识别');
        
        await ErrorHandler.handleAsync(
            () => testFieldRecognition(),
            () => ErrorHandler.warn('字段识别测试失败，继续执行'),
            '字段识别测试'
        );
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        // 1. 检查产品状态
        floatingBtn.textContent = '检查产品状态...';
        ProgressManager.updateStep('检查产品是否已标记');
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        if (isProductMarked()) {
            floatingBtn.textContent = '产品已标记❌';
            ProgressManager.finish('产品已标记，跳过优化');
            setTimeout(() => {
                floatingBtn.textContent = '开始优化';
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
                hideProgress();
            }, 3000);
            console.log('产品已标记，跳过优化');
            return;
        }
        
        // 2. 采集产品信息
        floatingBtn.textContent = '采集信息中...';
        ProgressManager.updateStep('采集产品信息和预设配置');
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        const collectResult = await ErrorHandler.handleAsync(
            () => collectInfo(),
            () => ({ presetInfo: {}, pageInfo: null }),
            '信息采集'
        );
        
        const { presetInfo, pageInfo } = collectResult || { presetInfo: {}, pageInfo: null };
        
        // 3. 验证API配置
        ProgressManager.updateStep('验证API配置');
        
        const apiValidation = {
            deepseek: presetInfo.apiPlatform === 'deepseek' && !presetInfo.deepseekApiKey,
            tongyi: presetInfo.apiPlatform === 'tongyi' && !presetInfo.tongyiApiKey,
            bailian: presetInfo.apiPlatform === 'bailian' && !presetInfo.bailianApiKey
        };
        
        if (apiValidation.deepseek) {
            throw new Error('请在插件设置中配置DeepSeek API Key');
        }
        if (apiValidation.tongyi) {
            throw new Error('请在插件设置中配置通义千问 API Key');
        }
        if (apiValidation.bailian) {
            throw new Error('请在插件设置中配置百炼 API Key');
        }
        
        // 4. 调用AI生成内容
        floatingBtn.textContent = '调用AI中...';
        ProgressManager.updateStep('调用AI生成优化内容');
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        const prompt = buildPrompt(presetInfo, pageInfo);
        
        // 获取API密钥
        const apiKeyMap = {
            deepseek: presetInfo.deepseekApiKey,
            tongyi: presetInfo.tongyiApiKey,
            bailian: presetInfo.bailianApiKey
        };
        const apiKey = apiKeyMap[presetInfo.apiPlatform] || '';
        
        // 调用AI（使用重试机制）
        const aiResponse = await RetryManager.retry(
            () => callAI(presetInfo.apiPlatform, apiKey, prompt),
            3,
            1000,
            'AI调用'
        );
        
        // 5. 解析AI结果
        ProgressManager.updateStep('解析AI生成的内容');
        floatingBtn.textContent = '解析内容中...';
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        const aiResult = await ErrorHandler.handleAsync(
            () => parseAIResponse(aiResponse),
            () => ({ title: '', description: '', keywords: '', hashtags: '' }),
            'AI结果解析'
        );
        
        ErrorHandler.log('=== AI解析结果 ===');
        ErrorHandler.log('标题:', aiResult.title);
        ErrorHandler.log('描述:', aiResult.description);
        ErrorHandler.log('关键词:', aiResult.keywords);
        ErrorHandler.log('标签:', aiResult.hashtags);
        ErrorHandler.log('=== AI解析结果结束 ===');
        
        // 6. 填写字段
        ProgressManager.updateStep('填写优化内容到表单');
        floatingBtn.textContent = '填写内容中...';
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        await ErrorHandler.handleAsync(
            () => fillFields(aiResult, pageInfo?.extractedDimensions, pageInfo),
            () => ErrorHandler.error('字段填写失败'),
            '字段填写'
        );
        
        // 7. 更新版本
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        await ErrorHandler.handleAsync(
            () => updateVersion(),
            () => ErrorHandler.warn('版本更新失败'),
            '版本更新'
        );
        
        // 8. 标记产品（只有在优化成功后才标记）
        ProgressManager.updateStep('标记产品完成状态');
        floatingBtn.textContent = '标记产品中...';
        
        if (!isOptimizing) {
            ErrorHandler.log('优化已暂停');
            ProgressManager.hide();
            return;
        }
        
        await ErrorHandler.handleAsync(
            () => markProduct(),
            () => ErrorHandler.warn('产品标记失败'),
            '产品标记'
        );
        
        // 完成所有步骤
        floatingBtn.textContent = '优化完成✔';
        
        // 结束性能监控
        const totalTime = DebugManager.endTimer('total_optimization');
        DebugManager.logDebug('优化流程完成', { totalTime: `${totalTime.toFixed(2)}ms` });
        
        ProgressManager.finish(`所有优化步骤已完成！(耗时 ${totalTime.toFixed(0)}ms)`);
        
        setTimeout(() => {
            floatingBtn.textContent = '开始优化';
            floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            isOptimizing = false;
        }, 3000);
        
        ErrorHandler.log(`✅ 优化流程完成，总耗时: ${totalTime.toFixed(2)}ms`);
        
        // 返回AI结果供调用者使用
        return aiResult;
        
    } catch (error) {
        ErrorHandler.error('优化失败:', error);
        ProgressManager.finish(`优化失败: ${error.message}`, false);
        
        if (floatingBtn) {
            floatingBtn.textContent = '优化失败❌';
            floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
            
            setTimeout(() => {
                floatingBtn.textContent = '开始优化';
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
            }, 3000);
        }
        
        // 优化失败时不标记产品
        ErrorHandler.log('优化失败，跳过产品标记');
        throw error;
    }
}

// 页面加载时自动添加悬浮按钮
window.addEventListener('DOMContentLoaded', () => {
    console.log('【唯一标记】DOMContentLoaded事件触发');
    
    // 自动启用调试模式用于故障排除
    DebugManager.enable();
    
    initFloatingBtn();
});

// 如果页面已经加载完成，直接执行
if (document.readyState === 'loading') {
    console.log('【唯一标记】页面正在加载，等待DOMContentLoaded事件');
} else {
    console.log('【唯一标记】页面已加载，直接初始化...');
    // 确保只执行一次初始化
    setTimeout(() => {
        initFloatingBtn();
    }, 100);
} 

// 在文件末尾追加样式注入
(function injectFloatingBtnFixedStyle() {
    const style = document.createElement('style');
    style.textContent = `
    .floating-btn, .floating-btn.dragging {
        position: fixed !important;
        width: 80px !important;
        height: 120px !important;
        min-width: 80px !important;
        max-width: 80px !important;
        min-height: 120px !important;
        max-height: 120px !important;
        left: 0 !important;
        top: 0 !important;
        border-radius: 40px !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        overflow: hidden !important;
        transition: none !important;
        z-index: 99999 !important;
        user-select: none !important;
        background: linear-gradient(90deg, #6a9cf7 0%, #7b5be6 100%) !important;
    }
    `;
    document.head.appendChild(style);
})(); 

async function fetch1688PackageInfo(url) {
    try {
        console.log('开始采集1688包装信息，URL:', url);
        const resp = await fetch(url, { 
            credentials: 'omit',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        let packageInfo = [];
        
        // 方法1: 查找页面中的包装相关信息
        const packageKeywords = ['包装', '包装方式', '包装规格', '外包装', '内包装', '包装材质', '包装尺寸', '包装重量'];
        
        // 搜索所有文本节点和属性
        const allElements = doc.querySelectorAll('*');
        for (const element of allElements) {
            const text = element.textContent || '';
            const innerHTML = element.innerHTML || '';
            
            // 检查是否包含包装关键词
            for (const keyword of packageKeywords) {
                if (text.includes(keyword)) {
                    // 尝试提取键值对
                    const parent = element.closest('tr, .detail-item, .attr-item, .property-item, .spec-item, li, div');
                    if (parent) {
                        const parentText = parent.textContent.trim();
                        // 查找冒号分隔的键值对
                        const colonMatch = parentText.match(/([^:：]+)[：:]([^：:]+)/);
                        if (colonMatch && colonMatch[1].includes(keyword)) {
                            packageInfo.push(`${colonMatch[1].trim()}: ${colonMatch[2].trim()}`);
                            console.log('找到包装信息（方法1）:', colonMatch[1].trim(), ':', colonMatch[2].trim());
                        }
                    }
                }
            }
        }
        
        // 方法2: 查找属性表格
        const tables = doc.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const key = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();
                    if (packageKeywords.some(keyword => key.includes(keyword))) {
                        packageInfo.push(`${key}: ${value}`);
                        console.log('找到包装信息（方法2）:', key, ':', value);
                    }
                }
            }
        }
        
        // 方法3: 查找JSON数据中的包装信息
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent || '';
            if (content.includes('包装') || content.includes('package')) {
                try {
                    // 方法3.1: 尝试提取完整的JSON对象
                    const jsonMatches = content.match(/\{[^{}]*包装[^{}]*\}/g);
                    if (jsonMatches) {
                        for (const jsonStr of jsonMatches) {
                            try {
                                const data = JSON.parse(jsonStr);
                                for (const [key, value] of Object.entries(data)) {
                                    if (packageKeywords.some(keyword => key.includes(keyword))) {
                                        packageInfo.push(`${key}: ${value}`);
                                        console.log('找到包装信息（方法3.1）:', key, ':', value);
                                    }
                                }
                            } catch (e) {
                                // 忽略JSON解析错误
                            }
                        }
                    }
                    
                    // 方法3.2: 查找"包装": "值"格式的内容
                    const packagePatterns = [
                        /"包装"\s*:\s*"([^"]+)"/g,
                        /"包装方式"\s*:\s*"([^"]+)"/g,
                        /"包装规格"\s*:\s*"([^"]+)"/g,
                        /"外包装"\s*:\s*"([^"]+)"/g,
                        /"内包装"\s*:\s*"([^"]+)"/g,
                        /"包装材质"\s*:\s*"([^"]+)"/g,
                        /"包装说明"\s*:\s*"([^"]+)"/g
                    ];
                    
                    for (const pattern of packagePatterns) {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            const value = match[1].trim();
                            if (value && value !== '暂无' && value !== '无' && value !== '-') {
                                packageInfo.push(`包装: ${value}`);
                                console.log('找到包装信息（方法3.2）:', value);
                            }
                        }
                    }
                    
                    // 方法3.3: 查找复杂JSON结构中的包装信息
                    const largeJsonMatches = content.match(/\{[\s\S]*?"包装"[\s\S]*?\}/g);
                    if (largeJsonMatches) {
                        for (const jsonStr of largeJsonMatches) {
                            try {
                                // 尝试修复可能的JSON格式问题
                                let fixedJson = jsonStr.replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                                const data = JSON.parse(fixedJson);
                                
                                function extractPackageFromObject(obj, prefix = '') {
                                    if (typeof obj === 'object' && obj !== null) {
                                        for (const [key, value] of Object.entries(obj)) {
                                            if (packageKeywords.some(keyword => key.includes(keyword))) {
                                                if (typeof value === 'string' && value.trim() && value !== '暂无' && value !== '无' && value !== '-') {
                                                    packageInfo.push(`${key}: ${value}`);
                                                    console.log('找到包装信息（方法3.3）:', key, ':', value);
                                                }
                                            } else if (typeof value === 'object') {
                                                extractPackageFromObject(value, prefix + key + '.');
                                            }
                                        }
                                    }
                                }
                                
                                extractPackageFromObject(data);
                            } catch (e) {
                                // JSON解析失败，尝试正则提取
                                console.log('JSON解析失败，尝试正则提取包装信息');
                            }
                        }
                    }
                } catch (e) {
                    // 忽略脚本解析错误
                }
            }
        }
        
        // 方法4: 查找meta标签中的包装信息
        const metas = doc.querySelectorAll('meta[name*="package"], meta[property*="package"], meta[content*="包装"]');
        for (const meta of metas) {
            const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
            const content = meta.getAttribute('content') || '';
            if (name && content) {
                packageInfo.push(`${name}: ${content}`);
                console.log('找到包装信息（方法4）:', name, ':', content);
            }
        }
        
        // 去重并返回结果
        const uniquePackageInfo = [...new Set(packageInfo)];
        const result = uniquePackageInfo.join('\n');
        
        console.log('1688包装信息采集结果:', result);
        return result;
        
    } catch (e) {
        console.error('采集1688包装信息失败:', e);
        return '';
    }
}

// 从当前页面内容中提取1688包装信息（备用方案）
function extract1688PackageFromPageContent() {
    try {
        console.log('开始从页面内容提取1688包装信息...');
        let packageInfo = [];
        
        const packageKeywords = ['包装', '包装方式', '包装规格', '外包装', '内包装', '包装材质', '包装尺寸', '包装重量', '包装说明'];
        
        // 方法1: 检查页面中是否有1688相关的iframe或嵌入内容
        const iframes = document.querySelectorAll('iframe[src*="1688"], iframe[src*="alibaba"]');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) {
                    const allElements = iframeDoc.querySelectorAll('*');
                    for (const element of allElements) {
                        const text = element.textContent || '';
                        for (const keyword of packageKeywords) {
                            if (text.includes(keyword)) {
                                const parent = element.closest('tr, .detail-item, .attr-item, li, div');
                                if (parent) {
                                    const parentText = parent.textContent.trim();
                                    const colonMatch = parentText.match(/([^:：]+)[：:]([^：:]+)/);
                                    if (colonMatch && colonMatch[1].includes(keyword)) {
                                        packageInfo.push(`${colonMatch[1].trim()}: ${colonMatch[2].trim()}`);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // 跨域访问限制，忽略
            }
        }
        
        // 方法2: 检查当前页面中的隐藏数据或脚本
        const allInputs = document.querySelectorAll('input[type="hidden"], textarea[style*="display:none"], textarea[style*="display: none"]');
        for (const input of allInputs) {
            const value = input.value || '';
            if (value.includes('1688') && packageKeywords.some(keyword => value.includes(keyword))) {
                try {
                    // 尝试解析JSON
                    const data = JSON.parse(value);
                    for (const [key, val] of Object.entries(data)) {
                        if (packageKeywords.some(keyword => key.includes(keyword))) {
                            packageInfo.push(`${key}: ${val}`);
                        }
                    }
                } catch (e) {
                    // 非JSON格式，直接文本匹配
                    const lines = value.split('\n');
                    for (const line of lines) {
                        const colonMatch = line.match(/([^:：]+)[：:]([^：:]+)/);
                        if (colonMatch && packageKeywords.some(keyword => colonMatch[1].includes(keyword))) {
                            packageInfo.push(`${colonMatch[1].trim()}: ${colonMatch[2].trim()}`);
                        }
                    }
                }
            }
        }
        
        // 方法3: 检查页面中所有可见文本内容和脚本
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            const text = element.textContent || '';
            const innerHTML = element.innerHTML || '';
            
            // 检查是否包含1688相关内容
            if (text.includes('1688') || text.includes('阿里巴巴') || innerHTML.includes('1688')) {
                for (const keyword of packageKeywords) {
                    if (text.includes(keyword) || innerHTML.includes(keyword)) {
                        // 查找父元素获取完整信息
                        const parent = element.closest('tr, .item, .detail, .info, li, div');
                        if (parent) {
                            const parentText = parent.textContent.trim();
                            const parentHTML = parent.innerHTML;
                            
                            // 匹配键值对格式
                            const patterns = [
                                /([^:：\n]+包装[^:：\n]*)[：:]([^：:\n]+)/g,
                                /(包装[^:：\n]*)[：:]([^：:\n]+)/g
                            ];
                            
                            for (const pattern of patterns) {
                                let match;
                                while ((match = pattern.exec(parentText)) !== null) {
                                    const key = match[1].trim();
                                    const value = match[2].trim();
                                    if (key && value && value.length < 100 && value !== '暂无' && value !== '无' && value !== '-') {
                                        packageInfo.push(`${key}: ${value}`);
                                    }
                                }
                            }
                            
                            // 检查HTML中的JSON格式数据
                            const jsonPackagePatterns = [
                                /"包装"\s*:\s*"([^"]+)"/g,
                                /"包装方式"\s*:\s*"([^"]+)"/g,
                                /"包装规格"\s*:\s*"([^"]+)"/g,
                                /"外包装"\s*:\s*"([^"]+)"/g,
                                /"内包装"\s*:\s*"([^"]+)"/g,
                                /"包装材质"\s*:\s*"([^"]+)"/g,
                                /"包装说明"\s*:\s*"([^"]+)"/g
                            ];
                            
                            for (const pattern of jsonPackagePatterns) {
                                let match;
                                while ((match = pattern.exec(parentHTML)) !== null) {
                                    const value = match[1].trim();
                                    if (value && value !== '暂无' && value !== '无' && value !== '-') {
                                        packageInfo.push(`包装: ${value}`);
                                        console.log('从页面HTML找到包装信息:', value);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 新增方法3.1: 检查页面中的script标签JSON数据
        const scriptElements = document.querySelectorAll('script');
        for (const script of scriptElements) {
            const content = script.textContent || script.innerHTML || '';
            if (content.includes('包装') && (content.includes('1688') || content.includes('detail') || content.includes('product'))) {
                // 查找JSON格式的包装信息
                const packagePatterns = [
                    /"包装"\s*:\s*"([^"]+)"/g,
                    /"包装方式"\s*:\s*"([^"]+)"/g,
                    /"包装规格"\s*:\s*"([^"]+)"/g,
                    /"外包装"\s*:\s*"([^"]+)"/g,
                    /"内包装"\s*:\s*"([^"]+)"/g,
                    /"包装材质"\s*:\s*"([^"]+)"/g,
                    /"包装说明"\s*:\s*"([^"]+)"/g
                ];
                
                for (const pattern of packagePatterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const value = match[1].trim();
                        if (value && value !== '暂无' && value !== '无' && value !== '-') {
                            packageInfo.push(`包装: ${value}`);
                            console.log('从页面script找到包装信息:', value);
                        }
                    }
                }
            }
        }
        
        // 方法4: 检查localStorage和sessionStorage中的数据
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (value && value.includes('1688') && packageKeywords.some(keyword => value.includes(keyword))) {
                    try {
                        const data = JSON.parse(value);
                        if (typeof data === 'object') {
                            for (const [dataKey, dataValue] of Object.entries(data)) {
                                if (packageKeywords.some(keyword => dataKey.includes(keyword))) {
                                    packageInfo.push(`${dataKey}: ${dataValue}`);
                                }
                            }
                        }
                    } catch (e) {
                        // 非JSON，直接文本处理
                        const lines = value.split('\n');
                        for (const line of lines) {
                            const colonMatch = line.match(/([^:：]+包装[^:：]*)[：:]([^：:]+)/);
                            if (colonMatch) {
                                packageInfo.push(`${colonMatch[1].trim()}: ${colonMatch[2].trim()}`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // localStorage访问失败，忽略
        }
        
        // 去重并返回结果
        const uniquePackageInfo = [...new Set(packageInfo)];
        const result = uniquePackageInfo.join('\n');
        
        console.log('从页面内容提取的1688包装信息:', result);
        return result;
        
    } catch (e) {
        console.error('从页面内容提取1688包装信息失败:', e);
        return '';
    }
}

// 专门解析用户提供的1688 HTML内容中的包装信息
function extract1688PackageFromRawHTML(htmlContent) {
    try {
        console.log('开始从原始HTML内容解析1688包装信息...');
        let packageInfo = [];
        
        if (!htmlContent || typeof htmlContent !== 'string') {
            console.log('无效的HTML内容');
            return '';
        }
        
        // 方法1: 直接正则匹配"包装": "值"格式
        const directPackagePatterns = [
            /"包装"\s*:\s*"([^"]+)"/g,
            /"包装方式"\s*:\s*"([^"]+)"/g,
            /"包装规格"\s*:\s*"([^"]+)"/g,
            /"外包装"\s*:\s*"([^"]+)"/g,
            /"内包装"\s*:\s*"([^"]+)"/g,
            /"包装材质"\s*:\s*"([^"]+)"/g,
            /"包装说明"\s*:\s*"([^"]+)"/g,
            /"包装数量"\s*:\s*"([^"]+)"/g
        ];
        
        for (const pattern of directPackagePatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                const value = match[1].trim();
                if (value && value !== '暂无' && value !== '无' && value !== '-' && value !== 'null' && value !== 'undefined') {
                    packageInfo.push(`包装: ${value}`);
                    console.log('从原始HTML找到包装信息（方法1）:', value);
                }
            }
        }
        
        // 方法2: 查找更复杂的JSON结构
        try {
            // 尝试提取大段JSON包含包装信息的部分
            const jsonBlocks = htmlContent.match(/\{[^{}]*"包装"[^{}]*:[^{}]*\}/g);
            if (jsonBlocks) {
                for (const block of jsonBlocks) {
                    try {
                        const data = JSON.parse(block);
                        if (data.包装) {
                            const value = String(data.包装).trim();
                            if (value && value !== '暂无' && value !== '无' && value !== '-') {
                                packageInfo.push(`包装: ${value}`);
                                console.log('从原始HTML找到包装信息（方法2）:', value);
                            }
                        }
                    } catch (e) {
                        // JSON解析失败，继续下一个
                    }
                }
            }
        } catch (e) {
            console.log('方法2解析失败:', e);
        }
        
        // 方法3: 查找包装相关的键值对（中英文混合）
        const mixedPatterns = [
            /package['"]\s*:\s*['"]([^'"]+)['"]/gi,
            /packaging['"]\s*:\s*['"]([^'"]+)['"]/gi,
            /包装['"]\s*:\s*['"]([^'"]+)['"]/g,
            /包装方式['"]\s*:\s*['"]([^'"]+)['"]/g
        ];
        
        for (const pattern of mixedPatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                const value = match[1].trim();
                if (value && value !== '暂无' && value !== '无' && value !== '-') {
                    packageInfo.push(`包装: ${value}`);
                    console.log('从原始HTML找到包装信息（方法3）:', value);
                }
            }
        }
        
        // 方法4: 查找HTML标签中的包装信息
        try {
            const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
            const allElements = doc.querySelectorAll('*');
            
            for (const element of allElements) {
                const text = element.textContent || '';
                const innerHTML = element.innerHTML || '';
                
                // 查找包含"包装"的元素
                if (text.includes('包装') || innerHTML.includes('包装')) {
                    // 查找冒号分隔的格式
                    const colonPatterns = [
                        /包装[^：:]*[：:]([^：:\n\r\t]+)/g,
                        /包装方式[^：:]*[：:]([^：:\n\r\t]+)/g,
                        /包装规格[^：:]*[：:]([^：:\n\r\t]+)/g
                    ];
                    
                    for (const pattern of colonPatterns) {
                        let match;
                        while ((match = pattern.exec(text)) !== null) {
                            const value = match[1].trim();
                            if (value && value.length < 50 && value !== '暂无' && value !== '无' && value !== '-') {
                                packageInfo.push(`包装: ${value}`);
                                console.log('从原始HTML找到包装信息（方法4）:', value);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log('方法4解析失败:', e);
        }
        
        // 去重并返回结果
        const uniquePackageInfo = [...new Set(packageInfo)];
        const result = uniquePackageInfo.join('\n');
        
        console.log('从原始HTML解析的1688包装信息结果:', result);
        return result;
        
    } catch (e) {
        console.error('从原始HTML解析1688包装信息失败:', e);
        return '';
    }
}

// 图片优化相关函数
async function optimizeImages() {
    try {
        console.log('开始图片优化...');
        showProgress('正在优化产品图片...');
        
        // 获取图片优化设置
        const settings = await getImageOptimizationSettings();
        if (!settings.enableImageOptimization) {
            console.log('图片优化已禁用，跳过');
            hideProgress();
            return;
        }
        
        // 查找页面中的图片上传区域
        const imageUploadAreas = findImageUploadAreas();
        if (imageUploadAreas.length === 0) {
            console.log('未找到图片上传区域');
            hideProgress();
            return;
        }
        
        console.log(`找到 ${imageUploadAreas.length} 个图片上传区域`);
        
        // 处理每个图片上传区域
        for (let i = 0; i < imageUploadAreas.length; i++) {
            const area = imageUploadAreas[i];
            showProgress(`正在处理图片区域 ${i + 1}/${imageUploadAreas.length}...`);
            
            await processImageUploadArea(area, settings);
        }
        
        showProgress('图片优化完成！');
        setTimeout(() => hideProgress(), 2000);
        
    } catch (error) {
        console.error('图片优化失败:', error);
        showProgress('图片优化失败: ' + error.message);
        setTimeout(() => hideProgress(), 3000);
    }
}

// 获取图片优化设置
async function getImageOptimizationSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'enableImageOptimization',
            'imageOptimizationType',
            'targetImageSize',
            'imageQuality'
        ], (result) => {
            resolve({
                enableImageOptimization: result.enableImageOptimization !== false,
                imageOptimizationType: result.imageOptimizationType || 'smart_ecommerce',
                targetImageSize: result.targetImageSize || '1000x1000',
                imageQuality: result.imageQuality || 'high'
            });
        });
    });
}

// 点击页面中的图片优化按钮
async function clickImageOptimizeButtons() {
    try {
        console.log('查找并点击图片优化按钮...');
        
        // 查找包含"优化"、"Optimize"等关键词的按钮
        const optimizeSelectors = [
            'button',
            '.btn',
            '.button',
            '.el-button',
            'a',
            '.link',
            '.optimize-btn',
            '.image-optimize',
            '.upload-btn'
        ];
        
        let clickedCount = 0;
        
        for (const selector of optimizeSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = (element.textContent || '').toLowerCase();
                const title = (element.title || '').toLowerCase();
                const placeholder = (element.placeholder || '').toLowerCase();
                
                // 检查是否包含优化相关关键词
                if (text.includes('优化') || text.includes('optimize') || 
                    text.includes('图片优化') || text.includes('image optimize') ||
                    title.includes('优化') || title.includes('optimize') ||
                    placeholder.includes('优化') || placeholder.includes('optimize')) {
                    
                    console.log('找到图片优化按钮:', element);
                    
                    // 检查按钮是否可见且可点击
                    if (element.offsetWidth > 0 && element.offsetHeight > 0 && 
                        !element.disabled && element.style.display !== 'none') {
                        
                        try {
                            // 高亮显示要点击的按钮
                            element.style.outline = '2px solid #ff6b6b';
                            element.style.outlineOffset = '2px';
                            
                            // 点击按钮
                            element.click();
                            clickedCount++;
                            
                            console.log('已点击图片优化按钮:', element);
                            
                            // 等待一小段时间再点击下一个
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                        } catch (error) {
                            console.error('点击图片优化按钮失败:', error);
                        }
                    }
                }
            }
        }
        
        console.log(`总共点击了 ${clickedCount} 个图片优化按钮`);
        
        // 移除高亮
        setTimeout(() => {
            const highlightedElements = document.querySelectorAll('[style*="outline: 2px solid #ff6b6b"]');
            highlightedElements.forEach(el => {
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
        }, 2000);
        
    } catch (error) {
        console.error('点击图片优化按钮失败:', error);
    }
}

// 查找图片上传区域
function findImageUploadAreas() {
    const areas = [];
    
    // 查找常见的图片上传区域选择器
    const selectors = [
        '.image-upload-area',
        '.upload-area',
        '.image-container',
        '.product-images',
        '.sku-images',
        '.main-images',
        '[data-type="image"]',
        '.el-upload',
        '.upload-list',
        '.image-list',
        '.el-upload__input',
        '.upload-dragger',
        '.upload-area',
        '.image-upload',
        '.file-upload'
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                console.log('找到图片上传区域:', selector, element);
                areas.push(element);
            }
        }
    }
    
    // 查找包含"图片"、"上传"等关键词的元素
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        const text = element.textContent || '';
        if (text.includes('图片') || text.includes('上传') || text.includes('Image') || text.includes('Upload') || 
            text.includes('SKU图片') || text.includes('产品图片') || text.includes('主图')) {
            if (element.offsetWidth > 50 && element.offsetHeight > 50) {
                console.log('找到包含关键词的图片区域:', text, element);
                areas.push(element);
            }
        }
    }
    
    // 查找所有img标签的父容器
    const images = document.querySelectorAll('img');
    for (const img of images) {
        const parent = img.parentElement;
        if (parent && parent.offsetWidth > 100 && parent.offsetHeight > 100) {
            console.log('找到图片父容器:', parent);
            if (!areas.includes(parent)) {
                areas.push(parent);
            }
        }
    }
    
    console.log('总共找到图片上传区域数量:', areas.length);
    return areas;
}

// 处理图片上传区域
async function processImageUploadArea(area, settings) {
    try {
        console.log('处理图片上传区域:', area);
        
        // 查找区域内的图片元素
        const images = area.querySelectorAll('img');
        console.log(`找到 ${images.length} 张图片`);
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            showProgress(`正在优化图片 ${i + 1}/${images.length}...`);
            
            await optimizeSingleImage(img, settings);
        }
        
        // 查找上传按钮并触发优化
        const uploadButtons = area.querySelectorAll('button, input[type="file"], .upload-btn');
        for (const button of uploadButtons) {
            if (button.textContent && (button.textContent.includes('优化') || button.textContent.includes('Optimize'))) {
                console.log('触发图片优化按钮:', button);
                button.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
    } catch (error) {
        console.error('处理图片上传区域失败:', error);
    }
}

// 优化单张图片
async function optimizeSingleImage(img, settings) {
    try {
        const src = img.src;
        if (!src || src.startsWith('data:')) {
            console.log('跳过无效图片:', src);
            return;
        }
        
        console.log('优化图片:', src);
        
        // 根据设置类型进行不同的优化处理
        switch (settings.imageOptimizationType) {
            case 'white_background':
                await applyWhiteBackground(img);
                break;
            case 'enhance_quality':
                await enhanceImageQuality(img);
                break;
            case 'resize':
                await resizeImage(img, settings.targetImageSize);
                break;
            case 'compress':
                await compressImage(img, settings.imageQuality);
                break;
            case 'ecommerce_standard':
                await ecommerceStandardOptimize(img, settings);
                break;
            case 'smart_ecommerce':
                await smartEcommerceOptimize(img, settings);
                break;
            case 'ozon_optimized':
                await ozonOptimize(img, settings);
                break;
            case 'amazon_style':
                await amazonStyleOptimize(img, settings);
                break;
            case 'instagram_ready':
                await instagramReadyOptimize(img, settings);
                break;
            case 'auto':
            default:
                await autoOptimizeImage(img, settings);
                break;
        }
        
    } catch (error) {
        console.error('优化单张图片失败:', error);
    }
}

// 应用白底处理
async function applyWhiteBackground(img) {
    try {
        console.log('应用白底处理');
        
        // 创建canvas进行图片处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 等待图片加载
        await new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            tempImg.src = img.src;
        });
        
        // 设置canvas尺寸
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('白底处理失败:', error);
    }
}

// 增强图片质量
async function enhanceImageQuality(img) {
    try {
        console.log('增强图片质量');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 绘制高质量图片
        ctx.drawImage(img, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('增强图片质量失败:', error);
    }
}

// 调整图片尺寸
async function resizeImage(img, targetSize) {
    try {
        console.log('调整图片尺寸到:', targetSize);
        
        const [width, height] = targetSize.split('x').map(Number);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // 高质量缩放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('调整图片尺寸失败:', error);
    }
}

// 智能选择电商尺寸
function getOptimalEcommerceSize(img) {
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    const aspectRatio = originalWidth / originalHeight;
    
    console.log('原始图片尺寸:', originalWidth, 'x', originalHeight, '比例:', aspectRatio.toFixed(2));
    
    // 根据比例选择最适合的电商尺寸
    if (aspectRatio >= 1.5) {
        // 宽屏图片
        return '1200x800';
    } else if (aspectRatio <= 0.7) {
        // 长屏图片
        return '800x1200';
    } else if (aspectRatio >= 1.2) {
        // 横版图片
        return '1000x750';
    } else if (aspectRatio <= 0.8) {
        // 竖版图片
        return '750x1000';
    } else {
        // 接近正方形，使用标准电商尺寸
        return '1000x1000';
    }
}

// 智能电商优化
async function smartEcommerceOptimize(img, settings) {
    try {
        console.log('执行智能电商优化');
        
        // 自动选择最适合的尺寸
        const optimalSize = getOptimalEcommerceSize(img);
        console.log('智能选择的尺寸:', optimalSize);
        
        // 应用电商标准优化
        await resizeImage(img, optimalSize);
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
    } catch (error) {
        console.error('智能电商优化失败:', error);
    }
}

// 压缩图片
async function compressImage(img, quality) {
    try {
        console.log('压缩图片，质量:', quality);
        
        const qualityMap = {
            'high': 0.9,
            'medium': 0.7,
            'low': 0.5
        };
        
        const compressionQuality = qualityMap[quality] || 0.7;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        ctx.drawImage(img, 0, 0);
        
        // 压缩图片
        img.src = canvas.toDataURL('image/jpeg', compressionQuality);
        
    } catch (error) {
        console.error('压缩图片失败:', error);
    }
}

// 自动优化图片
async function autoOptimizeImage(img, settings) {
    try {
        console.log('自动优化图片');
        
        // 组合多种优化方法
        await resizeImage(img, settings.targetImageSize);
        await applyWhiteBackground(img);
        await compressImage(img, settings.imageQuality);
        
    } catch (error) {
        console.error('自动优化图片失败:', error);
    }
}

// 电商标准优化
async function ecommerceStandardOptimize(img, settings) {
    try {
        console.log('执行电商标准优化');
        
        // 电商标准：1000x1000，白底，高质量
        await resizeImage(img, '1000x1000');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
    } catch (error) {
        console.error('电商标准优化失败:', error);
    }
}

// Ozon平台优化
async function ozonOptimize(img, settings) {
    try {
        console.log('执行Ozon平台优化');
        
        // Ozon推荐：1200x1200，白底，超高质量
        await resizeImage(img, '1200x1200');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加Ozon特定的图片处理
        await applyOzonSpecificEnhancement(img);
        
    } catch (error) {
        console.error('Ozon平台优化失败:', error);
    }
}

// 亚马逊风格优化
async function amazonStyleOptimize(img, settings) {
    try {
        console.log('执行亚马逊风格优化');
        
        // 亚马逊推荐：1000x1000，白底，专业质量
        await resizeImage(img, '1000x1000');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加亚马逊特定的图片处理
        await applyAmazonStyleEnhancement(img);
        
    } catch (error) {
        console.error('亚马逊风格优化失败:', error);
    }
}

// Instagram就绪优化
async function instagramReadyOptimize(img, settings) {
    try {
        console.log('执行Instagram就绪优化');
        
        // Instagram推荐：1080x1080，高质量
        await resizeImage(img, '1080x1080');
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加Instagram特定的图片处理
        await applyInstagramEnhancement(img);
        
    } catch (error) {
        console.error('Instagram就绪优化失败:', error);
    }
}

// Ozon特定增强
async function applyOzonSpecificEnhancement(img) {
    try {
        console.log('应用Ozon特定增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // 轻微锐化处理（适合Ozon平台）
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 简单的锐化滤镜
        for (let i = 0; i < data.length; i += 4) {
            if (i > 0 && i < data.length - 4) {
                data[i] = Math.min(255, data[i] * 1.05);     // R
                data[i + 1] = Math.min(255, data[i + 1] * 1.05); // G
                data[i + 2] = Math.min(255, data[i + 2] * 1.05); // B
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('Ozon特定增强失败:', error);
    }
}

// 亚马逊风格增强
async function applyAmazonStyleEnhancement(img) {
    try {
        console.log('应用亚马逊风格增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // 亚马逊风格：轻微对比度增强
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 轻微提高对比度
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.1 + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.1 + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.1 + 128)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('亚马逊风格增强失败:', error);
    }
}

// Instagram增强
async function applyInstagramEnhancement(img) {
    try {
        console.log('应用Instagram增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // Instagram风格：轻微饱和度增强
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 轻微提高饱和度
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = Math.min(255, avg + (data[i] - avg) * 1.1);     // R
            data[i + 1] = Math.min(255, avg + (data[i + 1] - avg) * 1.1); // G
            data[i + 2] = Math.min(255, avg + (data[i + 2] - avg) * 1.1); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('Instagram增强失败:', error);
    }
}

// 第二个ErrorHandler类已移除，使用文件开头的增强版ErrorHandler

// 第二个DebounceManager类已移除，使用文件开头的增强版DebounceManager

// 妙手ERP专用工具类
class MiaoshouERPHelper {
    // 检测当前页面类型
    static detectPageType() {
        if (document.querySelector('.product-edit, .goods-edit')) return 'PRODUCT_EDIT';
        if (document.querySelector('.product-list, .goods-list')) return 'PRODUCT_LIST';
        if (document.querySelector('.batch-upload, .bulk-edit')) return 'BATCH_OPERATION';
        return 'UNKNOWN';
    }
    
    // 智能字段查找 - 专门针对妙手ERP
    static findField(fieldType) {
        const fieldConfig = CONFIG.MIAOSHOU_FIELDS[fieldType];
        if (!fieldConfig) return null;
        
        // 特殊处理制造国checkbox字段
        if (fieldType === 'MANUFACTURER' && fieldConfig.fieldType === 'checkbox') {
            return this.findManufacturerCheckbox();
        }
        
        // 特殊处理包装可编辑标签字段
        if (fieldType === 'PACKAGE_QUANTITY' && fieldConfig.fieldType === 'editable-label') {
            return this.findEditableLabelField(fieldType);
        }
        
        // 1. 优先使用CSS选择器
        for (const selector of fieldConfig.selectors) {
            try {
                const element = document.querySelector(selector);
                if (element && this.isVisible(element)) {
                    console.log(`通过选择器 ${selector} 找到 ${fieldType} 字段`);
                    return element;
                }
            } catch (error) {
                console.warn(`选择器 ${selector} 无效:`, error.message);
                continue;
            }
        }
        
        // 2. 通过标签文本查找
        for (const labelText of fieldConfig.labels) {
            try {
                const element = this.findByLabel(labelText);
                if (element) {
                    console.log(`通过标签 ${labelText} 找到 ${fieldType} 字段`);
                    return element;
                }
            } catch (error) {
                console.warn(`查找标签 ${labelText} 时出错:`, error.message);
                continue;
            }
        }
        
        console.warn(`未找到 ${fieldType} 字段`);
        return null;
    }
    
    // 专门查找制造国多选框 - 增强版
    static findManufacturerCheckbox() {
        ErrorHandler.log('🔍 查找制造国多选框...');
        
        // 基础选择器策略
        const basicSelectors = [
            'input[type="checkbox"][value="90296"]',  // 精确值匹配
            '.el-checkbox-group .el-checkbox[title*="中国"] input[type="checkbox"]',
            '.jx-pro-checkbox[title*="中国"] input[type="checkbox"]',
            '.el-checkbox[title*="KиTā"] input[type="checkbox"]',
            '.el-checkbox[title*="KTaй"] input[type="checkbox"]'
        ];
        
        // 尝试基础选择器
        const basicResult = DOMUtils.findElementBySelectors(basicSelectors);
        if (basicResult && DOMUtils.isElementInteractable(basicResult)) {
            ErrorHandler.log('✅ 通过基础选择器找到制造国checkbox');
            return basicResult;
        }
        
        // 通过表单项标签文本查找
        const manufacturerLabels = ['制造国', 'Страна-изготовитель', '制造国(Страна-изготовитель)'];
        for (const labelText of manufacturerLabels) {
            const formItem = DOMUtils.findElementByText(labelText, '.el-form-item');
            if (formItem) {
                ErrorHandler.log(`找到包含"${labelText}"的表单项`);
                
                // 在表单项中查找checkbox
                const checkboxInForm = DOMUtils.findElementBySelectors([
                    'input[type="checkbox"][value="90296"]',
                    '.el-checkbox[title*="中国"] input[type="checkbox"]',
                    '.el-checkbox[title*="KиTā"] input[type="checkbox"]',
                    '.el-checkbox[title*="KTaй"] input[type="checkbox"]',
                    '.el-checkbox input[type="checkbox"]'
                ], formItem);
                
                if (checkboxInForm && DOMUtils.isElementInteractable(checkboxInForm)) {
                    ErrorHandler.log('✅ 在表单项中找到制造国checkbox');
                    return checkboxInForm;
                }
            }
        }
        
        // 遍历所有checkbox，通过属性和父元素判断
        try {
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            ErrorHandler.log(`开始遍历 ${allCheckboxes.length} 个checkbox`);
            
            for (const checkbox of allCheckboxes) {
                // 详细调试信息
                const debugInfo = {
                    value: checkbox.value,
                    parentClass: checkbox.parentElement?.className,
                    parentTitle: checkbox.closest('.el-checkbox, .jx-pro-checkbox')?.title,
                    nearbyText: checkbox.closest('.el-form-item')?.textContent?.slice(0, 100)
                };
                
                // 检查value属性
                if (checkbox.value === '90296') {
                    ErrorHandler.log('✅ 通过value="90296"找到制造国checkbox', debugInfo);
                    return checkbox;
                }
                
                // 检查父元素的title属性
                const parent = checkbox.closest('.el-checkbox, .jx-pro-checkbox');
                if (parent && parent.title) {
                    const title = parent.title.toLowerCase();
                    if (title.includes('中国') || title.includes('kита') || title.includes('ktaй')) {
                        ErrorHandler.log(`✅ 通过父元素title="${parent.title}"找到制造国checkbox`, debugInfo);
                        return checkbox;
                    }
                }
                
                // 检查关联label的文本
                const label = parent?.querySelector('span');
                if (label && label.textContent) {
                    const labelText = label.textContent.toLowerCase();
                    if (labelText.includes('中国') || labelText.includes('kита') || labelText.includes('ktaй')) {
                        ErrorHandler.log(`✅ 通过label文本="${label.textContent}"找到制造国checkbox`, debugInfo);
                        return checkbox;
                    }
                }
                
                // 记录一些可能有用的checkbox信息
                if (checkbox.value || (parent && parent.title)) {
                    DebugManager.logDebug(`Checkbox详情`, debugInfo);
                }
            }
        } catch (error) {
            ErrorHandler.error('遍历checkbox时出错:', error);
        }
        
        // 最后尝试：使用xpath定位（用户提供的具体路径）
        try {
            const xpath = '/html/body/div[21]/div/div[2]/div[2]/div[2]/div[2]/div/label[125]';
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (result.singleNodeValue) {
                const checkbox = result.singleNodeValue.querySelector('input[type="checkbox"]');
                if (checkbox && DOMUtils.isElementInteractable(checkbox)) {
                    ErrorHandler.log('✅ 通过XPath找到制造国checkbox');
                    return checkbox;
                }
            }
        } catch (error) {
            ErrorHandler.warn('XPath查找失败:', error);
        }
        
        // 最后的desperate尝试：查找任何包含中国相关文本的checkbox
        try {
            ErrorHandler.log('🔍 执行最后的desperate查找策略...');
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
                if (element.textContent && 
                    (element.textContent.includes('中国') || 
                     element.textContent.includes('KиTā') || 
                     element.textContent.includes('KTaй'))) {
                    
                    const nearbyCheckbox = element.querySelector('input[type="checkbox"]') ||
                                         element.closest('.el-checkbox')?.querySelector('input[type="checkbox"]') ||
                                         element.nextElementSibling?.querySelector('input[type="checkbox"]') ||
                                         element.previousElementSibling?.querySelector('input[type="checkbox"]');
                    
                    if (nearbyCheckbox && DOMUtils.isElementInteractable(nearbyCheckbox)) {
                        ErrorHandler.log('✅ 通过desperate策略找到制造国checkbox', {
                            elementText: element.textContent.slice(0, 50),
                            checkboxValue: nearbyCheckbox.value
                        });
                        return nearbyCheckbox;
                    }
                }
            }
        } catch (error) {
            ErrorHandler.error('Desperate查找失败:', error);
        }
        
        ErrorHandler.warn('❌ 未找到制造国checkbox - 所有策略均失败');
        return null;
    }
    
    // 查找可编辑标签字段 - 增强版
    static findEditableLabelField(fieldType) {
        ErrorHandler.log(`🔍 查找可编辑标签字段: ${fieldType}`);
        
        // 包装字段关键词（多语言支持）
        const packageKeywords = ['包装', 'ynaкoвкa', 'Упаковка', 'package', 'packaging'];
        
        // 基础编辑按钮选择器
        const editButtonSelectors = [
            '.edit-field-label .text-edit-btn',
            '.jx-pro-button.text-edit-btn',
            'button.text-edit-btn',
            '.el-button.text-edit-btn',
            '.text-edit-btn'  // 更通用的选择器
        ];
        
        // 策略1: 通过编辑按钮查找
        for (const selector of editButtonSelectors) {
            try {
                const editButtons = document.querySelectorAll(selector);
                ErrorHandler.log(`找到 ${editButtons.length} 个编辑按钮`);
                
                for (const editBtn of editButtons) {
                    if (!DOMUtils.isElementInteractable(editBtn)) continue;
                    
                    // 检查按钮的各级父元素
                    let currentElement = editBtn;
                    for (let level = 0; level < 5; level++) {
                        if (!currentElement) break;
                        
                        const text = currentElement.textContent || '';
                        const hasPackageKeyword = packageKeywords.some(keyword => 
                            text.toLowerCase().includes(keyword.toLowerCase())
                        );
                        
                        if (hasPackageKeyword) {
                            ErrorHandler.log(`✅ 找到包装编辑按钮 (level ${level}):`, editBtn);
                            return {
                                labelElement: editBtn.closest('.edit-field-label') || editBtn.parentElement,
                                editButton: editBtn,
                                fieldType: 'editable-label'
                            };
                        }
                        
                        currentElement = currentElement.parentElement;
                    }
                }
            } catch (error) {
                ErrorHandler.warn(`编辑按钮选择器 ${selector} 无效:`, error.message);
                continue;
            }
        }
        
        // 策略2: 通过表单项标签文本查找
        for (const keyword of packageKeywords) {
            const formItem = DOMUtils.findElementByText(keyword, '.el-form-item');
            if (formItem) {
                ErrorHandler.log(`找到包含"${keyword}"的表单项`);
                
                const editBtn = DOMUtils.findElementBySelectors([
                    '.text-edit-btn',
                    '.jx-pro-button',
                    '.el-button',
                    'button'
                ], formItem);
                
                if (editBtn && DOMUtils.isElementInteractable(editBtn)) {
                    ErrorHandler.log('✅ 在表单项中找到包装编辑按钮');
                    return {
                        labelElement: formItem.querySelector('.edit-field-label') || formItem,
                        editButton: editBtn,
                        fieldType: 'editable-label'
                    };
                }
            }
        }
        
        // 策略3: 遍历所有编辑按钮，查找包装相关的
        try {
            const allEditButtons = document.querySelectorAll('button, .text-edit-btn, .jx-pro-button');
            ErrorHandler.log(`开始遍历 ${allEditButtons.length} 个可能的编辑按钮`);
            
            for (const btn of allEditButtons) {
                if (!DOMUtils.isElementInteractable(btn)) continue;
                
                // 检查按钮及其周围环境的文本
                const surroundingText = [
                    btn.textContent,
                    btn.title,
                    btn.getAttribute('aria-label'),
                    btn.closest('.el-form-item')?.textContent,
                    btn.parentElement?.textContent
                ].filter(Boolean).join(' ').toLowerCase();
                
                const hasPackageContext = packageKeywords.some(keyword => 
                    surroundingText.includes(keyword.toLowerCase())
                );
                
                if (hasPackageContext) {
                    ErrorHandler.log('✅ 通过上下文文本找到包装编辑按钮');
                    return {
                        labelElement: btn.closest('.edit-field-label') || btn.parentElement,
                        editButton: btn,
                        fieldType: 'editable-label'
                    };
                }
            }
        } catch (error) {
            ErrorHandler.error('遍历编辑按钮时出错:', error);
        }
        
        ErrorHandler.warn('❌ 未找到包装可编辑标签字段 - 所有策略均失败');
        return null;
    }
    
    // 检查元素是否可见
    static isVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }
    
    // 通过标签查找字段
    static findByLabel(labelText) {
        const labels = document.querySelectorAll('label, span');
        for (const label of labels) {
            if (label.textContent.includes(labelText)) {
                const formItem = label.closest('.el-form-item');
                if (formItem) {
                    return formItem.querySelector('input, textarea, select') ||
                           formItem.querySelector('.el-input__inner, .el-textarea__inner');
                }
            }
        }
        return null;
    }
    
    // 获取妙手ERP商品信息
    static getProductInfo() {
        const info = {
            title: this.getFieldValue('TITLE'),
            description: this.getFieldValue('DESCRIPTION'),
            category: this.getFieldValue('CATEGORY'),
            keywords: this.getFieldValue('KEYWORDS'),
            images: this.getProductImages(),
            sourceUrl: this.getSourceUrl(),
            dimensions: this.extractDimensions()
        };
        
        console.log('妙手ERP商品信息:', info);
        return info;
    }
    
    // 获取字段值
    static getFieldValue(fieldType) {
        const field = this.findField(fieldType);
        return field ? field.value : '';
    }
    
    // 获取商品图片
    static getProductImages() {
        const images = [];
        const imgElements = document.querySelectorAll('.el-upload-list img, .product-image img, .upload-preview img');
        
        imgElements.forEach(img => {
            if (img.src && img.src.startsWith('http')) {
                images.push({
                    src: img.src,
                    element: img
                });
            }
        });
        
        return images;
    }
    
    // 获取来源URL
    static getSourceUrl() {
        // 妙手ERP可能在不同位置存储来源URL
        const urlSelectors = [
            'input[name="sourceUrl"]',
            'input[placeholder*="链接"]',
            'input[placeholder*="URL"]',
            '.source-url input'
        ];
        
        for (const selector of urlSelectors) {
            const input = document.querySelector(selector);
            if (input && input.value) {
                return input.value;
            }
        }
        
        return '';
    }
    
    // 提取尺寸信息
    static extractDimensions() {
        const dimensionSelectors = [
            'input[placeholder*="长"]',
            'input[placeholder*="宽"]', 
            'input[placeholder*="高"]',
            'input[name*="length"]',
            'input[name*="width"]',
            'input[name*="height"]'
        ];
        
        const dimensions = {};
        
        dimensionSelectors.forEach(selector => {
            const input = document.querySelector(selector);
            if (input && input.value) {
                const placeholder = input.placeholder || input.name || '';
                if (placeholder.includes('长') || placeholder.includes('length')) {
                    dimensions.length = input.value;
                } else if (placeholder.includes('宽') || placeholder.includes('width')) {
                    dimensions.width = input.value;
                } else if (placeholder.includes('高') || placeholder.includes('height')) {
                    dimensions.height = input.value;
                }
            }
        });
        
        return dimensions;
    }
    
    // 验证字段值
    static validateField(fieldType, value) {
        const fieldConfig = CONFIG.MIAOSHOU_FIELDS[fieldType];
        if (!fieldConfig || !fieldConfig.validation) return true;
        
        return fieldConfig.validation(value);
    }
    
    // 批量设置字段值
    static async setFieldValues(values, options = {}) {
        const { delay = 100, validate = true } = options;
        const results = {};
        
        for (const [fieldType, value] of Object.entries(values)) {
            if (!value) continue;
            
            // 验证字段值
            if (validate && !this.validateField(fieldType, value)) {
                console.warn(`${fieldType} 字段值验证失败:`, value);
                results[fieldType] = { success: false, error: 'validation_failed' };
                continue;
            }
            
            const field = this.findField(fieldType);
            if (field) {
                try {
                    await this.setFieldValue(field, value);
                    results[fieldType] = { success: true, element: field };
                    console.log(`${fieldType} 字段设置成功:`, value);
                } catch (error) {
                    console.error(`${fieldType} 字段设置失败:`, error);
                    results[fieldType] = { success: false, error: error.message };
                }
                
                // 延迟避免操作过快
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } else {
                results[fieldType] = { success: false, error: 'field_not_found' };
            }
        }
        
        return results;
    }
    
    // 设置单个字段值 - 针对妙手ERP优化
    static async setFieldValue(field, value) {
        if (!field || !value) return false;
        
        // 检查字段类型
        if (field.type === 'checkbox') {
            return await this.setCheckboxValue(field, value);
        }
        
        // 检查是否是可编辑标签字段
        if (field.fieldType === 'editable-label') {
            return await this.setEditableLabelValue(field, value);
        }
        
        // 普通输入框处理
        // 聚焦字段
        field.focus();
        
        // 清空原有值
        field.value = '';
        
        // 触发清空事件
        field.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 设置新值
        field.value = value;
        
        // 触发一系列事件确保妙手ERP识别
        const events = ['input', 'change', 'blur', 'keyup', 'paste'];
        for (const eventType of events) {
            field.dispatchEvent(new Event(eventType, { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Element UI特殊处理
        if (field.classList.contains('el-input__inner') || field.classList.contains('el-textarea__inner')) {
            // 触发Vue的更新
            const vueComponent = field.__vue__ || field.parentNode.__vue__;
            if (vueComponent && vueComponent.$emit) {
                vueComponent.$emit('input', value);
                vueComponent.$emit('change', value);
            }
        }
        
        return true;
    }
    
    // 设置多选框值 - 专门处理制造国等多选字段
    static async setCheckboxValue(checkbox, value) {
        console.log('🔘 设置多选框值:', value, checkbox);
        
        // 获取checkbox的标签或title，检查是否匹配预设值
        const label = checkbox.closest('.el-checkbox')?.querySelector('.el-checkbox__label')?.textContent || '';
        const title = checkbox.closest('.el-checkbox')?.getAttribute('title') || '';
        
        console.log('🏷️ checkbox标签:', label, '标题:', title);
        
        // 检查是否匹配预设值
        const isMatch = label.includes(value) || title.includes(value) || 
                       (value === '中国' && (label.includes('中国') || title.includes('中国'))) ||
                       (value === '俄罗斯' && (label.includes('俄罗斯') || title.includes('俄罗斯')));
        
        if (isMatch && !checkbox.checked) {
            console.log('✅ 匹配预设值，选中checkbox');
            
            // 点击选中
            checkbox.click();
            
            // 触发事件
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Element UI特殊处理
            const vueComponent = checkbox.__vue__ || checkbox.closest('.el-checkbox').__vue__;
            if (vueComponent && vueComponent.$emit) {
                vueComponent.$emit('change', true);
            }
            
            return true;
        }
        
        console.log('ℹ️ checkbox不匹配或已选中');
        return false;
    }
    
    // 设置可编辑标签值 - 专门处理包装等可编辑字段
    static async setEditableLabelValue(fieldObj, value) {
        console.log('📝 设置可编辑标签值:', value, fieldObj);
        
        try {
            const { labelElement, editButton } = fieldObj;
            
            // 点击编辑按钮激活编辑模式
            console.log('🖱️ 点击编辑按钮激活编辑模式');
            editButton.click();
            
            // 等待输入框出现
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 查找激活后的输入框
            const inputSelectors = [
                // 在标签元素附近查找输入框
                'input[type="text"]',
                '.el-input__inner',
                'textarea'
            ];
            
            let activeInput = null;
            
            // 首先在标签元素的父容器中查找
            const container = labelElement.closest('.el-form-item');
            if (container) {
                for (const selector of inputSelectors) {
                    activeInput = container.querySelector(selector);
                    if (activeInput && this.isVisible(activeInput)) {
                        console.log('✅ 在容器中找到激活的输入框:', activeInput);
                        break;
                    }
                }
            }
            
            // 如果还没找到，在整个页面查找最近显示的输入框
            if (!activeInput) {
                const allInputs = document.querySelectorAll('input[type="text"], .el-input__inner');
                for (const input of allInputs) {
                    if (this.isVisible(input) && !input.value) {
                        activeInput = input;
                        console.log('✅ 找到空的可见输入框:', activeInput);
                        break;
                    }
                }
            }
            
            if (activeInput) {
                // 设置值
                activeInput.focus();
                activeInput.value = value;
                
                // 触发事件
                const events = ['input', 'change', 'blur'];
                for (const eventType of events) {
                    activeInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // Element UI特殊处理
                const vueComponent = activeInput.__vue__ || activeInput.parentNode.__vue__;
                if (vueComponent && vueComponent.$emit) {
                    vueComponent.$emit('input', value);
                    vueComponent.$emit('change', value);
                }
                
                console.log('✅ 可编辑标签值设置成功');
                return true;
            } else {
                console.warn('❌ 未找到激活的输入框');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 设置可编辑标签值失败:', error);
            return false;
        }
    }
} 

// 预设属性调试工具 - 添加到文件末尾
window.debugPresetFields = function() {
    console.log('🔍 开始调试预设属性字段...');
    
    // 获取预设信息
    chrome.storage.local.get([
        'configuration',
        'manufacturer', 
        'packageQuantity',
        'targetAudience'
    ], (presetInfo) => {
        console.log('📋 当前预设信息:', presetInfo);
        
        // 检查每个字段
        const fieldTypes = ['CONFIGURATION', 'MANUFACTURER', 'PACKAGE_QUANTITY', 'TARGET_AUDIENCE'];
        
        fieldTypes.forEach(fieldType => {
            console.log(`\n🔍 检查 ${fieldType} 字段:`);
            
            // 使用新方法查找字段
            const field = MiaoshouERPHelper.findField(fieldType);
            if (field) {
                console.log(`✅ 找到字段:`, field);
                
                if (field.type === 'checkbox') {
                    // Checkbox特殊处理
                    console.log(`🔘 字段类型: checkbox (多选框)`);
                    console.log(`☑️ 选中状态: ${field.checked}`);
                    console.log(`💰 值: ${field.value}`);
                    
                    const label = field.closest('.el-checkbox')?.querySelector('.el-checkbox__label')?.textContent || '';
                    const title = field.closest('.el-checkbox')?.getAttribute('title') || '';
                    console.log(`🏷️ 标签文本: "${label}"`);
                    console.log(`📋 标题属性: "${title}"`);
                } else if (field.fieldType === 'editable-label') {
                    // 可编辑标签特殊处理
                    console.log(`📝 字段类型: editable-label (可编辑标签)`);
                    console.log(`🏷️ 标签元素:`, field.labelElement);
                    console.log(`🖱️ 编辑按钮:`, field.editButton);
                    
                    const labelText = field.labelElement?.textContent || '';
                    console.log(`📋 标签文本: "${labelText}"`);
                    console.log(`🔧 按钮类: ${field.editButton?.className || 'N/A'}`);
                } else {
                    // 普通输入框
                    console.log(`📄 当前值: "${field.value}"`);
                    console.log(`🔧 字段类型: ${field.tagName.toLowerCase()}`);
                    console.log(`🎯 CSS类: ${field.className}`);
                    console.log(`📝 placeholder: ${field.placeholder || 'N/A'}`);
                }
            } else {
                console.log(`❌ 未找到 ${fieldType} 字段`);
                
                // 尝试降级查找
                const fieldConfig = CONFIG.MIAOSHOU_FIELDS[fieldType];
                if (fieldConfig) {
                    console.log(`🔄 尝试降级查找方案:`);
                    fieldConfig.selectors.forEach((selector, index) => {
                        const element = document.querySelector(selector);
                        console.log(`   ${index + 1}. ${selector}: ${element ? '✅ 找到' : '❌ 未找到'}`);
                    });
                }
            }
        });
        
        // 列出页面上所有可能的表单字段
        console.log('\n📋 页面上所有表单字段:');
        const allInputs = document.querySelectorAll('input, textarea, select');
        allInputs.forEach((input, index) => {
            const label = input.closest('.el-form-item')?.querySelector('label, span')?.textContent || '';
            console.log(`${index + 1}. ${input.tagName.toLowerCase()}[${input.type || 'text'}] - "${label}" - value: "${input.value}" - placeholder: "${input.placeholder || 'N/A'}"`);
        });
    });
};

// 预设属性测试填写工具
window.testPresetFill = async function() {
    console.log('🧪 开始测试预设属性填写...');
    
    const testValues = {
        CONFIGURATION: '测试配置',
        MANUFACTURER: '中国',
        PACKAGE_QUANTITY: '1个装',
        TARGET_AUDIENCE: '成人'
    };
    
    try {
        const results = await MiaoshouERPHelper.setFieldValues(testValues, {
            delay: 300,
            validate: false
        });
        
        console.log('🎯 测试填写结果:', results);
        
        // 显示结果摘要
        let successCount = 0;
        let totalCount = Object.keys(results).length;
        
        for (const [fieldType, result] of Object.entries(results)) {
            if (result.success) {
                successCount++;
                console.log(`✅ ${fieldType}: 成功`);
            } else {
                console.log(`❌ ${fieldType}: 失败 - ${result.error}`);
            }
        }
        
        console.log(`📊 测试摘要: ${successCount}/${totalCount} 成功`);
        ErrorHandler.showUserNotification(`预设属性测试: ${successCount}/${totalCount} 成功`, successCount === totalCount ? 'success' : 'error');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        ErrorHandler.showUserNotification('预设属性测试失败', 'error');
    }
};

console.log('🛠️ 预设属性调试工具已加载');
console.log('💡 使用方法:');
console.log('   - 在控制台运行 debugPresetFields() 查看字段状态');
console.log('   - 在控制台运行 testPresetFill() 测试填写功能');

// 包装字段专用调试工具
window.debugPackageField = function() {
    console.log('📦 开始调试包装字段...');
    
    try {
        // 查找包装字段
        const packageField = MiaoshouERPHelper.findField('PACKAGE_QUANTITY');
        
        if (packageField) {
            console.log('✅ 找到包装字段:', packageField);
            
            if (packageField.fieldType === 'editable-label') {
                console.log('📝 字段类型: 可编辑标签');
                console.log('🏷️ 标签元素:', packageField.labelElement);
                console.log('🖱️ 编辑按钮:', packageField.editButton);
                
                const labelText = packageField.labelElement?.textContent || '';
                console.log(`📋 当前标签文本: "${labelText}"`);
                
                // 测试点击编辑按钮
                console.log('🧪 测试点击编辑按钮...');
                packageField.editButton.click();
                
                setTimeout(() => {
                    const inputs = document.querySelectorAll('input[type="text"], .el-input__inner');
                    console.log('📝 点击后页面上的输入框:', inputs.length);
                    inputs.forEach((input, index) => {
                        if (MiaoshouERPHelper.isVisible(input)) {
                            console.log(`${index + 1}. 可见输入框:`, input, `值: "${input.value}"`);
                        }
                    });
                }, 500);
                
            } else {
                console.log('📄 普通字段，当前值:', packageField.value);
            }
        } else {
            console.log('❌ 未找到包装字段');
            
            // 显示所有包含"包装"的元素
            console.log('🔍 页面上包含"包装"的所有元素:');
            const allElements = document.querySelectorAll('*');
            allElements.forEach((el, index) => {
                if (el.textContent && el.textContent.includes('包装')) {
                    console.log(`${index + 1}.`, el.tagName, el.className, `"${el.textContent.trim()}"`);
                }
            });
        }
    } catch (error) {
        console.error('❌ 调试包装字段出错:', error);
    }
};

// 测试包装字段填写
window.testPackageFill = async function() {
    console.log('🧪 开始测试包装字段填写...');
    
    try {
        const result = await MiaoshouERPHelper.setFieldValues({
            PACKAGE_QUANTITY: '1个装'
        }, {
            delay: 500,
            validate: false
        });
        
        console.log('🎯 包装字段填写结果:', result);
        
        if (result.PACKAGE_QUANTITY?.success) {
            console.log('✅ 包装字段填写成功');
            ErrorHandler.showUserNotification('包装字段填写成功', 'success');
        } else {
            console.log('❌ 包装字段填写失败');
            ErrorHandler.showUserNotification('包装字段填写失败', 'error');
        }
        
    } catch (error) {
        console.error('❌ 测试包装字段填写失败:', error);
        ErrorHandler.showUserNotification('测试失败', 'error');
    }
};

console.log('📦 包装字段调试工具已加载');
console.log('💡 使用方法:');
console.log('   - debugPackageField() - 调试包装字段结构');
console.log('   - testPackageFill() - 测试包装字段填写');

// 调试1688包装信息提取
window.debug1688Package = async function(url) {
    console.log('=== 调试1688包装信息提取 ===');
    if (!url) {
        // 尝试从输入框获取URL
        const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
        for (const input of urlInputs) {
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            if (placeholder.includes('链接') || placeholder.includes('url') || placeholder.includes('URL') || value.includes('http')) {
                url = value;
                break;
            }
        }
    }
    
    if (!url) {
        console.log('未找到1688 URL，请提供URL参数');
        return;
    }
    
    console.log('URL:', url);
    
    if (url.includes('1688.com')) {
        console.log('检测到1688链接，开始提取包装信息...');
        
        // 测试网络请求方法
        console.log('--- 方法1: 网络请求提取 ---');
        try {
            const networkResult = await fetch1688PackageInfo(url);
            console.log('网络请求结果:', networkResult);
        } catch (e) {
            console.error('网络请求失败:', e);
        }
        
        // 测试页面内容提取方法
        console.log('--- 方法2: 页面内容提取 ---');
        try {
            const pageResult = extract1688PackageFromPageContent();
            console.log('页面内容提取结果:', pageResult);
        } catch (e) {
            console.error('页面内容提取失败:', e);
        }
        
        // 显示页面中包含"包装"关键词的所有元素
        console.log('--- 页面包装相关元素分析 ---');
        const packageElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent || '';
            return text.includes('包装') && text.length < 200;
        });
        console.log('包含"包装"的元素数量:', packageElements.length);
        packageElements.slice(0, 10).forEach((el, index) => {
            console.log(`元素${index + 1}:`, el.tagName, el.textContent.substring(0, 100));
        });
        
    } else {
        console.log('非1688链接，无法提取包装信息');
    }
};

// 快速测试当前页面的1688包装信息提取
window.test1688PackageExtraction = function() {
    console.log('=== 快速测试1688包装信息提取 ===');
    const result = extract1688PackageFromPageContent();
    if (result) {
        console.log('提取成功:', result);
        alert('1688包装信息提取结果:\n' + result);
    } else {
        console.log('未提取到包装信息');
        alert('未从当前页面提取到1688包装信息');
    }
};

// 解析用户提供的1688 HTML内容
window.parse1688HtmlContent = function(htmlContent) {
    console.log('=== 解析用户提供的1688 HTML内容 ===');
    
    if (!htmlContent) {
        console.log('请提供HTML内容');
        return '';
    }
    
    try {
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        let packageInfo = [];
        
        const packageKeywords = ['包装', '包装方式', '包装规格', '外包装', '内包装', '包装材质', '包装尺寸', '包装重量', '包装说明', '包装类型'];
        
        // 方法1: 查找所有表格中的包装信息
        const tables = doc.querySelectorAll('table');
        console.log(`找到 ${tables.length} 个表格`);
        
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const key = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();
                    if (packageKeywords.some(keyword => key.includes(keyword))) {
                        packageInfo.push(`${key}: ${value}`);
                        console.log('表格中找到包装信息:', key, ':', value);
                    }
                }
            }
        }
        
        // 方法2: 查找所有包含包装关键词的元素
        const allElements = doc.querySelectorAll('*');
        console.log(`扫描 ${allElements.length} 个元素`);
        
        for (const element of allElements) {
            const text = element.textContent || '';
            if (text.length > 5 && text.length < 200) {
                for (const keyword of packageKeywords) {
                    if (text.includes(keyword)) {
                        // 尝试提取键值对
                        const patterns = [
                            /([^:：\n]+包装[^:：\n]*)[：:]([^：:\n]+)/g,
                            /(包装[^:：\n]*)[：:]([^：:\n]+)/g,
                            /([^，,\n]+包装[^，,\n]*)[，,]([^，,\n]+)/g
                        ];
                        
                        for (const pattern of patterns) {
                            let match;
                            while ((match = pattern.exec(text)) !== null) {
                                const key = match[1].trim();
                                const value = match[2].trim();
                                if (key && value && value.length < 100 && !value.includes('html')) {
                                    packageInfo.push(`${key}: ${value}`);
                                    console.log('文本中找到包装信息:', key, ':', value);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 方法3: 查找脚本中的JSON数据
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent || '';
            if (content.includes('包装')) {
                // 查找JSON对象
                const jsonPattern = /\{[^{}]*包装[^{}]*\}/g;
                let match;
                while ((match = jsonPattern.exec(content)) !== null) {
                    try {
                        const data = JSON.parse(match[0]);
                        for (const [key, value] of Object.entries(data)) {
                            if (packageKeywords.some(keyword => key.includes(keyword))) {
                                packageInfo.push(`${key}: ${value}`);
                                console.log('JSON中找到包装信息:', key, ':', value);
                            }
                        }
                    } catch (e) {
                        // 忽略JSON解析错误
                    }
                }
            }
        }
        
        // 去重
        const uniquePackageInfo = [...new Set(packageInfo)];
        const result = uniquePackageInfo.join('\n');
        
        console.log('解析结果:', result);
        return result;
        
    } catch (e) {
        console.error('解析HTML内容失败:', e);
        return '';
    }
};

console.log('🎯 1688包装信息调试工具已加载');
console.log('💡 新增使用方法:');
console.log('   - debug1688Package(url) - 调试1688包装信息提取');
console.log('   - test1688PackageExtraction() - 快速测试页面包装信息提取');
console.log('   - parse1688HtmlContent(htmlContent) - 解析HTML内容中的包装信息');

// XPath元素分析工具
window.analyzeXPathElement = function(xpath) {
    console.log(`🔍 分析XPath元素: ${xpath}`);
    
    try {
        // 使用XPath查找元素
        const element = document.evaluate(
            xpath, 
            document, 
            null, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, 
            null
        ).singleNodeValue;
        
        if (element) {
            console.log('✅ 找到元素:', element);
            console.log('🏷️ 标签名:', element.tagName);
            console.log('🎯 CSS类:', element.className);
            console.log('📋 ID:', element.id || 'N/A');
            console.log('📄 文本内容:', element.textContent?.trim() || 'N/A');
            console.log('🔧 类型:', element.type || 'N/A');
            console.log('💰 值:', element.value || 'N/A');
            
            // 检查父元素上下文
            console.log('\n🔗 父元素信息:');
            const parent = element.parentElement;
            if (parent) {
                console.log('📁 父标签:', parent.tagName);
                console.log('📁 父CSS类:', parent.className);
                console.log('📁 父文本:', parent.textContent?.trim().substring(0, 100) || 'N/A');
            }
            
            // 检查表单项上下文
            const formItem = element.closest('.el-form-item');
            if (formItem) {
                console.log('\n📋 表单项信息:');
                console.log('📋 表单项类:', formItem.className);
                console.log('📋 表单项文本:', formItem.textContent?.trim().substring(0, 150) || 'N/A');
                
                // 查找标签
                const label = formItem.querySelector('label, span');
                if (label) {
                    console.log('🏷️ 标签文本:', label.textContent?.trim() || 'N/A');
                }
            }
            
            // 生成CSS选择器建议
            console.log('\n🎯 建议的CSS选择器:');
            let cssSelector = element.tagName.toLowerCase();
            
            if (element.id) {
                cssSelector = `#${element.id}`;
            } else if (element.className) {
                const classes = element.className.split(' ').filter(c => c).slice(0, 2);
                cssSelector = element.tagName.toLowerCase() + '.' + classes.join('.');
            }
            
            console.log('📌 基础选择器:', cssSelector);
            
            // 如果有特殊属性，添加属性选择器
            if (element.type) {
                console.log('📌 类型选择器:', `${cssSelector}[type="${element.type}"]`);
            }
            if (element.name) {
                console.log('📌 名称选择器:', `${cssSelector}[name="${element.name}"]`);
            }
            if (element.value) {
                console.log('📌 值选择器:', `${cssSelector}[value="${element.value}"]`);
            }
            
            // 检查是否是可能的预设字段
            console.log('\n🎯 字段类型分析:');
            const text = (element.textContent || element.value || element.placeholder || '').toLowerCase();
            
            if (text.includes('配置') || text.includes('комплектация')) {
                console.log('🔧 可能是配置字段');
            }
            if (text.includes('制造') || text.includes('страна')) {
                console.log('🏭 可能是制造国字段');
            }
            if (text.includes('包装') || text.includes('упаковка')) {
                console.log('📦 可能是包装字段');
            }
            if (text.includes('受众') || text.includes('аудитория')) {
                console.log('👥 可能是目标受众字段');
            }
            
            return element;
            
        } else {
            console.log('❌ 未找到指定XPath的元素');
            
            // 尝试简化路径查找
            console.log('🔄 尝试简化路径查找...');
            const pathParts = xpath.split('/');
            for (let i = pathParts.length - 1; i >= 0; i--) {
                const simplifiedPath = pathParts.slice(i).join('/');
                if (simplifiedPath && simplifiedPath !== xpath) {
                    const simpleElement = document.evaluate(
                        '//' + simplifiedPath, 
                        document, 
                        null, 
                        XPathResult.FIRST_ORDERED_NODE_TYPE, 
                        null
                    ).singleNodeValue;
                    
                    if (simpleElement) {
                        console.log(`✅ 简化路径找到元素: //${simplifiedPath}`, simpleElement);
                        break;
                    }
                }
            }
            
            return null;
        }
        
    } catch (error) {
        console.error('❌ 分析XPath元素出错:', error);
        return null;
    }
};

// 快速分析指定XPath
window.checkElement = function() {
    const xpath = '/html/body/div[21]/div/div[2]/div[2]/div[2]/div[2]/div/label[125]';
    console.log('🔍 检查用户指定的元素...');
    return analyzeXPathElement(xpath);
};

// 查找页面上所有可能的预设字段
window.findAllPresetFields = function() {
    console.log('🔍 查找页面上所有可能的预设字段...');
    
    const keywords = [
        { name: '配置', patterns: ['配置', 'комплектация', 'configuration'] },
        { name: '制造国', patterns: ['制造国', '制造', 'страна', 'изготовитель'] },
        { name: '包装', patterns: ['包装', 'упаковка', 'ynaкoвкa'] },
        { name: '目标受众', patterns: ['目标受众', '受众', 'аудитория', 'целевая'] }
    ];
    
    keywords.forEach(keyword => {
        console.log(`\n🔍 查找 ${keyword.name} 相关字段:`);
        
        const allElements = document.querySelectorAll('input, textarea, select, label, span, button');
        let found = false;
        
        allElements.forEach((element, index) => {
            const text = (element.textContent || element.value || element.placeholder || '').toLowerCase();
            const hasKeyword = keyword.patterns.some(pattern => text.includes(pattern.toLowerCase()));
            
            if (hasKeyword) {
                found = true;
                console.log(`   ${index + 1}. ${element.tagName}:`, element);
                console.log(`       文本: "${element.textContent?.trim() || element.value || element.placeholder || 'N/A'}"`);
                console.log(`       类: ${element.className || 'N/A'}`);
                
                // 生成XPath
                const xpath = getElementXPath(element);
                console.log(`       XPath: ${xpath}`);
            }
        });
        
        if (!found) {
            console.log(`   ❌ 未找到 ${keyword.name} 相关字段`);
        }
    });
};

// 生成元素的XPath
function getElementXPath(element) {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();
        if (element.parentNode) {
            const siblings = Array.from(element.parentNode.children).filter(e => e.nodeName === element.nodeName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                selector += `[${index}]`;
            }
        }
        path.unshift(selector);
        element = element.parentNode;
    }
    return '/' + path.join('/');
}

console.log('🔍 XPath分析工具已加载');
console.log('💡 使用方法:');
console.log('   - analyzeXPathElement("xpath") - 分析指定XPath元素');
console.log('   - checkElement() - 检查用户指定的元素');
console.log('   - findAllPresetFields() - 查找所有可能的预设字段');

// 网页元素导出工具
class PageElementExporter {
    
    // 导出所有表单元素
    static exportFormElements() {
        console.log('📋 开始导出表单元素...');
        
        const formElements = [];
        const selectors = ['input', 'textarea', 'select', 'button'];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const elementData = this.extractElementData(element, `${selector}_${index}`);
                formElements.push(elementData);
            });
        });
        
        console.log(`✅ 找到 ${formElements.length} 个表单元素`);
        return formElements;
    }
    
    // 导出所有包含文本的元素
    static exportTextElements() {
        console.log('📝 开始导出文本元素...');
        
        const textElements = [];
        const selectors = ['label', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const text = element.textContent?.trim();
                if (text && text.length > 0 && text.length < 200) {
                    const elementData = this.extractElementData(element, `${selector}_${index}`);
                    if (elementData.text !== elementData.parentText) { // 避免重复
                        textElements.push(elementData);
                    }
                }
            });
        });
        
        console.log(`✅ 找到 ${textElements.length} 个文本元素`);
        return textElements;
    }
    
    // 提取元素详细数据
    static extractElementData(element, id) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
            id: id,
            tagName: element.tagName.toLowerCase(),
            type: element.type || '',
            name: element.name || '',
            value: element.value || '',
            placeholder: element.placeholder || '',
            text: element.textContent?.trim() || '',
            innerHTML: element.innerHTML?.substring(0, 200) || '',
            className: element.className || '',
            elementId: element.id || '',
            
            // 位置信息
            position: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            },
            
            // 可见性
            visible: this.isElementVisible(element),
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            
            // 父元素信息
            parentTag: element.parentElement?.tagName.toLowerCase() || '',
            parentClass: element.parentElement?.className || '',
            parentText: element.parentElement?.textContent?.trim().substring(0, 100) || '',
            
            // 表单项信息
            formItem: this.getFormItemInfo(element),
            
            // XPath
            xpath: this.getElementXPath(element),
            
            // CSS选择器建议
            cssSelector: this.generateCSSSelector(element),
            
            // 时间戳
            timestamp: new Date().toISOString()
        };
    }
    
    // 检查元素可见性
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }
    
    // 获取表单项信息
    static getFormItemInfo(element) {
        const formItem = element.closest('.el-form-item, .form-group, .field');
        if (!formItem) return null;
        
        const label = formItem.querySelector('label, .label, .el-form-item__label');
        return {
            className: formItem.className,
            labelText: label?.textContent?.trim() || '',
            fullText: formItem.textContent?.trim().substring(0, 200) || ''
        };
    }
    
    // 生成元素XPath
    static getElementXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.parentNode) {
                const siblings = Array.from(element.parentNode.children)
                    .filter(e => e.nodeName === element.nodeName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(element) + 1;
                    selector += `[${index}]`;
                }
            }
            path.unshift(selector);
            element = element.parentNode;
        }
        return '/' + path.join('/');
    }
    
    // 生成CSS选择器
    static generateCSSSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        let selector = element.tagName.toLowerCase();
        
        if (element.className) {
            const classes = element.className.split(' ')
                .filter(c => c && !c.match(/^(el-|jx-)/)) // 过滤框架类
                .slice(0, 2);
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }
        
        // 添加属性选择器
        if (element.type) {
            selector += `[type="${element.type}"]`;
        }
        if (element.name) {
            selector += `[name="${element.name}"]`;
        }
        
        return selector;
    }
    
    // 导出为JSON文件
    static exportToJSON(data, filename = 'page_elements.json') {
        const jsonData = JSON.stringify(data, null, 2);
        this.downloadFile(jsonData, filename, 'application/json');
        console.log(`📄 JSON文件已导出: ${filename}`);
    }
    
    // 导出为CSV文件
    static exportToCSV(data, filename = 'page_elements.csv') {
        if (data.length === 0) {
            console.log('❌ 没有数据可导出');
            return;
        }
        
        // 获取所有字段名
        const headers = Object.keys(data[0]).filter(key => 
            typeof data[0][key] !== 'object' || data[0][key] === null
        );
        
        // 构建CSV内容
        let csvContent = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvContent += values.join(',') + '\n';
        });
        
        this.downloadFile(csvContent, filename, 'text/csv');
        console.log(`📊 CSV文件已导出: ${filename}`);
    }
    
    // 导出为HTML报告
    static exportToHTML(formData, textData, filename = 'page_analysis.html') {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>页面元素分析报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .visible { color: green; }
        .hidden { color: red; }
        .xpath { font-family: monospace; font-size: 12px; }
        .text-content { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 页面元素分析报告</h1>
        <p><strong>生成时间:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>页面URL:</strong> ${window.location.href}</p>
        <p><strong>表单元素:</strong> ${formData.length} 个</p>
        <p><strong>文本元素:</strong> ${textData.length} 个</p>
    </div>
    
    <div class="section">
        <h2>🔧 表单元素</h2>
        <table>
            <tr>
                <th>标签</th>
                <th>类型</th>
                <th>名称</th>
                <th>值</th>
                <th>占位符</th>
                <th>CSS类</th>
                <th>可见</th>
                <th>XPath</th>
            </tr>
            ${formData.map(item => `
                <tr>
                    <td>${item.tagName}</td>
                    <td>${item.type}</td>
                    <td>${item.name}</td>
                    <td class="text-content">${item.value}</td>
                    <td class="text-content">${item.placeholder}</td>
                    <td class="text-content">${item.className}</td>
                    <td class="${item.visible ? 'visible' : 'hidden'}">${item.visible ? '✅' : '❌'}</td>
                    <td class="xpath">${item.xpath}</td>
                </tr>
            `).join('')}
        </table>
    </div>
    
    <div class="section">
        <h2>📝 文本元素 (包含关键词)</h2>
        <table>
            <tr>
                <th>标签</th>
                <th>文本内容</th>
                <th>CSS类</th>
                <th>可见</th>
                <th>XPath</th>
            </tr>
            ${textData.filter(item => {
                const text = item.text.toLowerCase();
                return text.includes('配置') || text.includes('制造') || text.includes('包装') || 
                       text.includes('受众') || text.includes('комплектация') || text.includes('страна') ||
                       text.includes('упаковка') || text.includes('аудитория');
            }).map(item => `
                <tr>
                    <td>${item.tagName}</td>
                    <td class="text-content">${item.text}</td>
                    <td class="text-content">${item.className}</td>
                    <td class="${item.visible ? 'visible' : 'hidden'}">${item.visible ? '✅' : '❌'}</td>
                    <td class="xpath">${item.xpath}</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;
        
        this.downloadFile(html, filename, 'text/html');
        console.log(`📊 HTML报告已导出: ${filename}`);
    }
    
    // 下载文件
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 导出工具快捷方法
window.exportPageElements = function(format = 'all') {
    console.log('🚀 开始导出页面元素...');
    
    try {
        const formElements = PageElementExporter.exportFormElements();
        const textElements = PageElementExporter.exportTextElements();
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-]/g, '');
        
        switch (format.toLowerCase()) {
            case 'json':
                PageElementExporter.exportToJSON(formElements, `form_elements_${timestamp}.json`);
                break;
                
            case 'csv':
                PageElementExporter.exportToCSV(formElements, `form_elements_${timestamp}.csv`);
                break;
                
            case 'html':
                PageElementExporter.exportToHTML(formElements, textElements, `page_analysis_${timestamp}.html`);
                break;
                
            case 'all':
            default:
                PageElementExporter.exportToJSON(formElements, `form_elements_${timestamp}.json`);
                PageElementExporter.exportToCSV(formElements, `form_elements_${timestamp}.csv`);
                PageElementExporter.exportToHTML(formElements, textElements, `page_analysis_${timestamp}.html`);
                console.log('✅ 所有格式导出完成！');
                break;
        }
        
        // 在控制台显示统计信息
        console.table(formElements.slice(0, 10)); // 显示前10个表单元素
        
        return {
            formElements: formElements.length,
            textElements: textElements.length,
            total: formElements.length + textElements.length
        };
        
    } catch (error) {
        console.error('❌ 导出页面元素失败:', error);
        return null;
    }
};

// 导出指定类型的元素
window.exportFormElements = () => exportPageElements('json');
window.exportAsCSV = () => exportPageElements('csv');
window.exportAsHTML = () => exportPageElements('html');

// 快速查看页面元素统计
window.showPageStats = function() {
    const forms = document.querySelectorAll('input, textarea, select, button').length;
    const texts = document.querySelectorAll('label, span, div, p, h1, h2, h3, h4, h5, h6').length;
    const total = document.querySelectorAll('*').length;
    
    console.log('📊 页面元素统计:');
    console.log(`   🔧 表单元素: ${forms}`);
    console.log(`   📝 文本元素: ${texts}`);
    console.log(`   📄 总元素数: ${total}`);
    
    return { forms, texts, total };
};

console.log('📤 页面元素导出工具已加载');
console.log('💡 使用方法:');
console.log('   - exportPageElements() - 导出所有格式');
console.log('   - exportPageElements("json") - 仅导出JSON');
console.log('   - exportPageElements("csv") - 仅导出CSV');
console.log('   - exportPageElements("html") - 仅导出HTML报告');
console.log('   - showPageStats() - 显示页面元素统计');

// 全局函数，用于测试1688包装信息解析
window.test1688PackageExtraction = function(htmlContent = null) {
    console.log('🔍 开始测试1688包装信息解析...');
    
    if (!htmlContent) {
        // 如果没有提供HTML内容，提示用户
        console.log('💡 请提供1688 HTML内容进行测试，例如:');
        console.log('   test1688PackageExtraction(`你的1688 HTML内容`)');
        
        // 尝试从当前页面解析
        console.log('🔄 尝试从当前页面解析1688包装信息...');
        const result1 = extract1688PackageFromPageContent();
        console.log('📋 从当前页面解析结果:', result1);
        
        return result1;
    } else {
        // 使用提供的HTML内容解析
        console.log('📝 使用提供的HTML内容解析包装信息...');
        const result = extract1688PackageFromRawHTML(htmlContent);
        console.log('✅ 解析结果:', result);
        return result;
    }
};

// 全局函数，用于调试1688包装信息采集
window.debug1688PackageInfo = function(sourceUrl = null) {
    console.log('🐛 开始调试1688包装信息采集...');
    
    if (!sourceUrl) {
        // 尝试从页面获取URL
        const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
        for (const input of urlInputs) {
            const value = input.value || '';
            if (value.includes('1688.com')) {
                sourceUrl = value;
                break;
            }
        }
    }
    
    if (sourceUrl && sourceUrl.includes('1688.com')) {
        console.log('🔗 找到1688链接:', sourceUrl);
        
        // 测试网络获取
        fetch1688PackageInfo(sourceUrl).then(result => {
            console.log('🌐 网络获取结果:', result);
            
            if (!result) {
                console.log('❌ 网络获取失败，尝试从页面内容解析...');
                const pageResult = extract1688PackageFromPageContent();
                console.log('📄 页面解析结果:', pageResult);
            }
        }).catch(e => {
            console.error('💥 网络获取出错:', e);
            console.log('🔄 尝试从页面内容解析...');
            const pageResult = extract1688PackageFromPageContent();
            console.log('📄 页面解析结果:', pageResult);
        });
    } else {
        console.log('❌ 未找到1688链接，仅测试页面内容解析...');
        const pageResult = extract1688PackageFromPageContent();
        console.log('📄 页面解析结果:', pageResult);
    }
};

// 全局函数，用于直接解析用户提供的1688 HTML内容
window.parse1688PackageInfo = function(htmlContent) {
    if (!htmlContent) {
        console.log('❌ 请提供HTML内容');
        console.log('💡 使用方法: parse1688PackageInfo(`你的HTML内容`)');
        return '';
    }
    
    console.log('🎯 正在解析1688包装信息...');
    const result = extract1688PackageFromRawHTML(htmlContent);
    
    if (result) {
        console.log('✅ 成功提取包装信息:');
        console.log(result);
    } else {
        console.log('❌ 未能提取到包装信息');
        console.log('🔍 请检查HTML内容是否包含包装相关信息');
    }
    
    return result;
};

// =============================================================================
// 🔧 智能匹配调试工具
// =============================================================================

/**
 * 测试URL信息提取功能
 */
window.testProductInfoExtraction = function(url) {
    console.log('🧪 测试产品信息提取功能...');
    
    if (!url) {
        url = prompt('请输入要测试的产品URL:');
    }
    
    if (!url) {
        console.log('❌ 没有提供URL');
        return null;
    }
    
    console.log('🔍 测试URL:', url);
    
    try {
        const productInfo = extractProductInfoFromUrl(url);
        
        console.log('=== 产品信息提取结果 ===');
        console.log('🔍 完整结果:', productInfo);
        
        if (productInfo.dimensions) {
            console.log('📏 尺寸信息:', productInfo.dimensions);
        }
        if (productInfo.weight) {
            console.log('⚖️ 重量信息:', productInfo.weight);
        }
        if (productInfo.material) {
            console.log('🧱 材质信息:', productInfo.material);
        }
        if (productInfo.brand) {
            console.log('🏷️ 品牌信息:', productInfo.brand);
        }
        if (productInfo.color) {
            console.log('🎨 颜色信息:', productInfo.color);
        }
        if (productInfo.model) {
            console.log('🔢 型号信息:', productInfo.model);
        }
        if (productInfo.style) {
            console.log('✨ 风格信息:', productInfo.style);
        }
        if (productInfo.capacity) {
            console.log('🫗 容量信息:', productInfo.capacity);
        }
        if (productInfo.power) {
            console.log('⚡ 功率信息:', productInfo.power);
        }
        if (productInfo.voltage) {
            console.log('🔌 电压信息:', productInfo.voltage);
        }
        
        return productInfo;
        
    } catch (error) {
        console.error('❌ 提取过程中出错:', error);
        return null;
    }
};

/**
 * 测试智能字段匹配功能
 */
window.testSmartMatching = function() {
    console.log('🧪 测试智能字段匹配功能...');
    
    // 模拟一些测试数据
    const testProductInfo = {
        dimensions: { length: 200, width: 150, height: 100 },
        weight: { value: 500, unit: 'g', weightInGrams: 500 },
        material: '不锈钢',
        brand: '小米',
        color: '白色',
        model: 'ABC123',
        style: '简约',
        capacity: { value: 1, unit: 'L' },
        power: { value: 100, unit: 'W' },
        voltage: { value: 220, unit: 'V' }
    };
    
    const testPackageInfo = '透明opp袋包装';
    const testPresetInfo = {
        configuration: '标准配置',
        manufacturer: '中国',
        packageQuantity: '1',
        targetAudience: '通用'
    };
    
    console.log('📊 测试数据:');
    console.log('  产品信息:', testProductInfo);
    console.log('  包装信息:', testPackageInfo);
    console.log('  预设信息:', testPresetInfo);
    
    try {
        const matchedValues = ProductInfoMatcher.matchProductInfoToERPFields(
            testProductInfo,
            testPackageInfo,
            testPresetInfo
        );
        
        console.log('=== 智能匹配结果 ===');
        console.log('🎯 匹配结果:', matchedValues);
        
        // 显示详细的匹配信息
        Object.keys(matchedValues).forEach(fieldKey => {
            console.log(`✅ ${fieldKey}: ${matchedValues[fieldKey]}`);
        });
        
        return matchedValues;
        
    } catch (error) {
        console.error('❌ 匹配过程中出错:', error);
        return null;
    }
};

/**
 * 查看当前页面的字段信息
 */
window.inspectCurrentPageFields = function() {
    console.log('🔍 检查当前页面的ERP字段...');
    
    const foundFields = {};
    
    // 遍历所有配置的字段
    Object.keys(CONFIG.MIAOSHOU_FIELDS).forEach(fieldKey => {
        const fieldConfig = CONFIG.MIAOSHOU_FIELDS[fieldKey];
        const field = MiaoshouERPHelper.findField(fieldKey);
        
        if (field) {
            foundFields[fieldKey] = {
                element: field,
                config: fieldConfig,
                currentValue: field.value || field.textContent || '(无值)'
            };
            console.log(`✅ 找到字段 ${fieldKey}:`, field);
        } else {
            console.log(`❌ 未找到字段 ${fieldKey}`);
        }
    });
    
    console.log('=== 页面字段检查结果 ===');
    console.log('🔍 找到的字段:', foundFields);
    
    return foundFields;
};

/**
 * 综合测试智能匹配系统
 */
window.testFullSmartSystem = async function(testUrl) {
    console.log('🚀 开始综合测试智能匹配系统...');
    
    if (!testUrl) {
        testUrl = prompt('请输入要测试的产品URL（留空使用默认测试URL）:');
    }
    
    if (!testUrl) {
        testUrl = 'https://detail.1688.com/offer/12345.html?title=小米不锈钢保温杯500ml白色ABC123&重量=500g&材质=不锈钢&颜色=白色';
        console.log('🔗 使用默认测试URL:', testUrl);
    }
    
    try {
        // 1. 提取产品信息
        console.log('📋 步骤1: 提取产品信息...');
        const productInfo = extractProductInfoFromUrl(testUrl);
        
        // 2. 执行智能匹配
        console.log('🎯 步骤2: 执行智能匹配...');
        const matchedValues = ProductInfoMatcher.matchProductInfoToERPFields(
            productInfo,
            '透明opp袋包装',
            { configuration: '标准', manufacturer: '中国', packageQuantity: '1', targetAudience: '通用' }
        );
        
        // 3. 检查页面字段
        console.log('🔍 步骤3: 检查页面字段...');
        const pageFields = window.inspectCurrentPageFields();
        
        // 4. 显示完整报告
        console.log('=== 综合测试报告 ===');
        console.log('📊 提取的产品信息:', productInfo);
        console.log('🎯 智能匹配结果:', matchedValues);
        console.log('🔍 页面字段状态:', pageFields);
        
        const report = {
            extractedInfo: productInfo,
            matchedValues: matchedValues,
            pageFields: pageFields,
            summary: {
                extractedFields: Object.keys(productInfo).filter(key => productInfo[key] !== null).length,
                matchedFields: Object.keys(matchedValues).length,
                availablePageFields: Object.keys(pageFields).length
            }
        };
        
        console.log('📋 测试总结:', report.summary);
        
        return report;
        
    } catch (error) {
        console.error('❌ 综合测试出错:', error);
        return null;
    }
};

console.log('🔧 智能匹配调试工具已加载');
console.log('💡 调试方法:');
console.log('   - testProductInfoExtraction(url) - 测试产品信息提取');
console.log('   - testSmartMatching() - 测试智能字段匹配');
console.log('   - inspectCurrentPageFields() - 检查当前页面字段');
console.log('   - testFullSmartSystem(url) - 综合测试智能匹配系统');

console.log('🔧 1688包装信息调试工具已加载');
console.log('💡 调试方法:');
console.log('   - test1688PackageExtraction() - 测试包装信息解析');
console.log('   - debug1688PackageInfo() - 调试1688包装信息采集');
console.log('   - parse1688PackageInfo(htmlContent) - 直接解析HTML内容');

// =============================================================================
// 妙手ERP字段配置和智能匹配系统
// =============================================================================

/**
 * 妙手ERP字段配置
 */
const CONFIG = {
    MIAOSHOU_FIELDS: {
        // 配置字段
        CONFIGURATION: {
            labels: ['配置(Комплектация)', '配置'],
            selectors: [
                'input[placeholder*="配置"]',
                'input[placeholder*="Комплектация"]'
            ],
            fieldType: 'input',
            mappingRules: ['model', 'style', 'capacity']  // 可以映射型号、风格、容量等信息
        },
        
        // 制造国字段
        MANUFACTURER: {
            labels: ['制造国(Страна-изготовитель)', '制造国'],
            selectors: [
                '.el-checkbox-group .el-checkbox[title*="中国"] input[type="checkbox"]',
                '.jx-pro-checkbox[title*="中国"] input[type="checkbox"]',
                '.el-checkbox[title*="KиTā"] input[type="checkbox"]',
                '.el-checkbox[title*="KTaй"] input[type="checkbox"]',
                'input[type="checkbox"][value="90296"]'  // 从用户提供的HTML中找到的中国选项
            ],
            fieldType: 'checkbox',
            mappingRules: ['fixed']  // 固定值：中国
        },
        
        // 包装数量字段
        PACKAGE_QUANTITY: {
            labels: ['原厂包装数量', '包装数量'],
            selectors: [
                'input[placeholder*="包装数量"]',
                'input[placeholder*="原厂包装"]'
            ],
            fieldType: 'input',
            mappingRules: ['packageInfo']  // 从包装信息中提取
        },
        
        // 目标受众字段
        TARGET_AUDIENCE: {
            labels: ['目标受众(Целевая аудитория)', '目标受众'],
            selectors: [
                'input[placeholder*="目标受众"]',
                'input[placeholder*="Целевая"]'
            ],
            fieldType: 'input',
            mappingRules: ['category', 'style']  // 根据分类和风格推断
        },
        
        // 包装字段（可编辑标签）
        PACKAGE: {
            labels: ['包装(ynaкoвкa)', '包装'],
            selectors: [
                '.edit-field-label .text-edit-btn',
                '.jx-pro-button.text-edit-btn'
            ],
            fieldType: 'editable-label',
            mappingRules: ['packageInfo']  // 直接使用包装信息
        },
        
        // 重量字段
        WEIGHT: {
            labels: ['重量', '净重', '毛重', 'Weight'],
            selectors: [
                'input[placeholder*="重量"]',
                'input[placeholder*="净重"]',
                'input[placeholder*="毛重"]',
                'input[placeholder*="weight"]'
            ],
            fieldType: 'input',
            mappingRules: ['weight']  // 直接使用重量信息
        },
        
        // 材质字段
        MATERIAL: {
            labels: ['材质', '材料', 'Material'],
            selectors: [
                'input[placeholder*="材质"]',
                'input[placeholder*="材料"]',
                'input[placeholder*="material"]'
            ],
            fieldType: 'input',
            mappingRules: ['material']  // 直接使用材质信息
        },
        
        // 品牌字段
        BRAND: {
            labels: ['品牌', 'Brand'],
            selectors: [
                'input[placeholder*="品牌"]',
                'input[placeholder*="brand"]'
            ],
            fieldType: 'input',
            mappingRules: ['brand']  // 直接使用品牌信息
        },
        
        // 颜色字段
        COLOR: {
            labels: ['颜色', '色彩', 'Color'],
            selectors: [
                'input[placeholder*="颜色"]',
                'input[placeholder*="色彩"]',
                'input[placeholder*="color"]'
            ],
            fieldType: 'input',
            mappingRules: ['color']  // 直接使用颜色信息
        },
        
        // 容量字段
        CAPACITY: {
            labels: ['容量', '容积', 'Capacity'],
            selectors: [
                'input[placeholder*="容量"]',
                'input[placeholder*="容积"]',
                'input[placeholder*="capacity"]'
            ],
            fieldType: 'input',
            mappingRules: ['capacity']  // 直接使用容量信息
        },
        
        // 功率字段
        POWER: {
            labels: ['功率', 'Power'],
            selectors: [
                'input[placeholder*="功率"]',
                'input[placeholder*="power"]'
            ],
            fieldType: 'input',
            mappingRules: ['power']  // 直接使用功率信息
        },
        
        // 电压字段
        VOLTAGE: {
            labels: ['电压', 'Voltage'],
            selectors: [
                'input[placeholder*="电压"]',
                'input[placeholder*="voltage"]'
            ],
            fieldType: 'input',
            mappingRules: ['voltage']  // 直接使用电压信息
        }
    }
};

/**
 * 智能字段匹配系统
 * 将提取的产品信息映射到妙手ERP字段
 */
class ProductInfoMatcher {
    
    /**
     * 执行智能匹配，将提取的产品信息映射到ERP字段
     */
    static matchProductInfoToERPFields(extractedProductInfo, packageInfo, presetInfo) {
        console.log('🎯 开始执行智能字段匹配...');
        console.log('提取的产品信息:', extractedProductInfo);
        console.log('包装信息:', packageInfo);
        console.log('预设信息:', presetInfo);
        
        const matchedValues = {};
        
        if (!extractedProductInfo) {
            console.log('❌ 没有提取的产品信息，跳过匹配');
            return matchedValues;
        }
        
        // 遍历每个ERP字段，尝试匹配
        Object.keys(CONFIG.MIAOSHOU_FIELDS).forEach(fieldKey => {
            const fieldConfig = CONFIG.MIAOSHOU_FIELDS[fieldKey];
            const value = this.getMatchedValue(fieldKey, fieldConfig, extractedProductInfo, packageInfo, presetInfo);
            
            if (value !== null && value !== undefined && value !== '') {
                matchedValues[fieldKey] = value;
                console.log(`✅ 字段 ${fieldKey} 匹配成功:`, value);
            }
        });
        
        console.log('🎯 智能匹配结果:', matchedValues);
        return matchedValues;
    }
    
    /**
     * 根据字段配置和映射规则获取匹配的值
     */
    static getMatchedValue(fieldKey, fieldConfig, extractedProductInfo, packageInfo, presetInfo) {
        const { mappingRules } = fieldConfig;
        
        for (const rule of mappingRules) {
            let value = null;
            
            switch (rule) {
                case 'weight':
                    if (extractedProductInfo.weight) {
                        value = `${extractedProductInfo.weight.value}${extractedProductInfo.weight.unit}`;
                    }
                    break;
                    
                case 'material':
                    value = extractedProductInfo.material;
                    break;
                    
                case 'brand':
                    value = extractedProductInfo.brand;
                    break;
                    
                case 'color':
                    value = extractedProductInfo.color;
                    break;
                    
                case 'model':
                    value = extractedProductInfo.model;
                    break;
                    
                case 'style':
                    value = extractedProductInfo.style;
                    break;
                    
                case 'capacity':
                    if (extractedProductInfo.capacity) {
                        value = `${extractedProductInfo.capacity.value}${extractedProductInfo.capacity.unit}`;
                    }
                    break;
                    
                case 'power':
                    if (extractedProductInfo.power) {
                        value = `${extractedProductInfo.power.value}${extractedProductInfo.power.unit}`;
                    }
                    break;
                    
                case 'voltage':
                    if (extractedProductInfo.voltage) {
                        value = `${extractedProductInfo.voltage.value}${extractedProductInfo.voltage.unit}`;
                    }
                    break;
                    
                case 'packageInfo':
                    value = packageInfo;
                    break;
                    
                case 'category':
                    // 根据分类推断目标受众
                    if (fieldKey === 'TARGET_AUDIENCE') {
                        value = this.inferTargetAudienceFromCategory(extractedProductInfo, packageInfo);
                    }
                    break;
                    
                case 'fixed':
                    // 固定值处理
                    if (fieldKey === 'MANUFACTURER') {
                        value = '中国';  // 默认制造国为中国
                    }
                    break;
                    
                default:
                    console.log(`⚠️ 未知的映射规则: ${rule}`);
                    break;
            }
            
            if (value !== null && value !== undefined && value !== '') {
                return value;
            }
        }
        
        return null;
    }
    
    /**
     * 根据分类和其他信息推断目标受众
     */
    static inferTargetAudienceFromCategory(extractedProductInfo, packageInfo) {
        // 这里可以根据产品分类、风格等信息来推断目标受众
        // 简单示例逻辑，可以根据实际需求扩展
        
        const keywords = [
            extractedProductInfo.style,
            extractedProductInfo.brand,
            packageInfo
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (keywords.includes('儿童') || keywords.includes('童装') || keywords.includes('玩具')) {
            return '儿童';
        }
        
        if (keywords.includes('女') || keywords.includes('女性') || keywords.includes('女士')) {
            return '女性';
        }
        
        if (keywords.includes('男') || keywords.includes('男性') || keywords.includes('男士')) {
            return '男性';
        }
        
        if (keywords.includes('老人') || keywords.includes('老年')) {
            return '老年人';
        }
        
        return '通用';  // 默认值
    }
}

// =============================================================================
// 妙手ERP采集箱页面优化功能模块
// =============================================================================

/**
 * 妙手ERP采集箱页面助手类
 * 专门处理采集箱列表页面的优化功能
 */
class MiaoshouCollectBoxHelper {
    
    /**
     * 检测当前是否为采集箱页面
     */
    static isCollectBoxPage() {
        const url = window.location.href;
        const isCollectBoxUrl = url.includes('collect_box') || url.includes('采集箱');
        const hasCollectElements = document.querySelector('.collect-item, .product-item, .goods-item, [class*="collect"], [class*="item-card"]');
        
        console.log('🔍 检测采集箱页面:', { url, isCollectBoxUrl, hasCollectElements: !!hasCollectElements });
        return isCollectBoxUrl || !!hasCollectElements;
    }
    
    /**
     * 获取页面上的所有产品项
     */
    static getAllProductItems() {
        // 多种可能的产品项选择器
        const selectors = [
            '.collect-item',
            '.product-item', 
            '.goods-item',
            '.item-card',
            '[class*="collect"][class*="item"]',
            '[class*="product"][class*="item"]',
            '.list-item',
            '.data-item'
        ];
        
        let items = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                items = Array.from(elements);
                console.log(`✅ 找到 ${items.length} 个产品项 (选择器: ${selector})`);
                break;
            }
        }
        
        // 如果没找到，尝试通过DOM结构推断
        if (items.length === 0) {
            items = this.inferProductItems();
        }
        
        return items;
    }
    
    /**
     * 通过DOM结构推断产品项
     */
    static inferProductItems() {
        console.log('🔍 通过DOM结构推断产品项...');
        
        // 查找包含图片和文本的重复性结构
        const potentialContainers = document.querySelectorAll('div[class*="list"], div[class*="container"], div[class*="content"]');
        
        for (const container of potentialContainers) {
            const children = container.children;
            if (children.length >= 3) { // 至少3个子元素才考虑
                const hasImages = container.querySelectorAll('img').length >= children.length / 2;
                const hasLinks = container.querySelectorAll('a').length >= children.length / 2;
                
                if (hasImages && hasLinks) {
                    console.log(`✅ 推断出产品容器:`, container);
                    return Array.from(children);
                }
            }
        }
        
        console.log('❌ 未能推断出产品项结构');
        return [];
    }
    
    /**
     * 从产品项提取信息
     */
    static extractProductInfo(productItem) {
        const info = {
            element: productItem,
            title: '',
            sourceUrl: '',
            price: '',
            image: '',
            status: '',
            platform: ''
        };
        
        // 提取标题
        const titleSelectors = [
            '.title', '.product-title', '.goods-title', '.name',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            '[class*="title"]', '[class*="name"]'
        ];
        for (const selector of titleSelectors) {
            const titleEl = productItem.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
                info.title = titleEl.textContent.trim();
                break;
            }
        }
        
        // 提取来源链接
        const linkSelectors = [
            'a[href*="1688.com"]', 'a[href*="taobao.com"]', 'a[href*="tmall.com"]',
            'a[href*="jd.com"]', 'a[href*="pinduoduo.com"]', 'a[href*="pdd.com"]',
            '.source-url', '.origin-url', '[class*="source"]'
        ];
        for (const selector of linkSelectors) {
            const linkEl = productItem.querySelector(selector);
            if (linkEl) {
                info.sourceUrl = linkEl.href || linkEl.textContent.trim();
                if (info.sourceUrl) {
                    info.platform = this.getPlatformFromUrl(info.sourceUrl);
                    break;
                }
            }
        }
        
        // 提取价格
        const priceSelectors = [
            '.price', '.cost', '.amount', '[class*="price"]', '[class*="cost"]'
        ];
        for (const selector of priceSelectors) {
            const priceEl = productItem.querySelector(selector);
            if (priceEl && priceEl.textContent.trim()) {
                info.price = priceEl.textContent.trim();
                break;
            }
        }
        
        // 提取图片
        const img = productItem.querySelector('img');
        if (img) {
            info.image = img.src || img.dataset.src || '';
        }
        
        // 提取状态
        const statusSelectors = [
            '.status', '.state', '[class*="status"]', '[class*="state"]'
        ];
        for (const selector of statusSelectors) {
            const statusEl = productItem.querySelector(selector);
            if (statusEl && statusEl.textContent.trim()) {
                info.status = statusEl.textContent.trim();
                break;
            }
        }
        
        return info;
    }
    
    /**
     * 从URL判断平台
     */
    static getPlatformFromUrl(url) {
        if (url.includes('1688.com')) return '1688';
        if (url.includes('taobao.com')) return '淘宝';
        if (url.includes('tmall.com')) return '天猫';
        if (url.includes('jd.com')) return '京东';
        if (url.includes('pinduoduo.com') || url.includes('pdd.com')) return '拼多多';
        return '其他';
    }
    
    /**
     * 创建批量操作工具栏
     */
    static createBatchToolbar() {
        if (document.getElementById('miaoshou-batch-toolbar')) {
            return; // 已存在
        }
        
        const toolbar = document.createElement('div');
        toolbar.id = 'miaoshou-batch-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
            z-index: 10001;
            font-family: 'Microsoft YaHei', sans-serif;
            min-width: 300px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        toolbar.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: bold; font-size: 16px;">📦 采集箱批量工具</span>
                <button id="close-batch-toolbar" style="margin-left: auto; background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <button id="select-all-products" style="padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">全选</button>
                <button id="deselect-all-products" style="padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">取消全选</button>
                <button id="batch-optimize-products" style="padding: 8px 12px; background: rgba(46, 204, 113, 0.8); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">批量优化</button>
                <button id="filter-products" style="padding: 8px 12px; background: rgba(241, 196, 15, 0.8); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">智能筛选</button>
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
                <span id="selected-count">已选择: 0 个产品</span>
            </div>
        `;
        
        document.body.appendChild(toolbar);
        
        // 绑定事件
        this.bindBatchToolbarEvents();
        
        console.log('✅ 批量操作工具栏已创建');
    }
    
    /**
     * 绑定批量工具栏事件
     */
    static bindBatchToolbarEvents() {
        // 关闭工具栏
        document.getElementById('close-batch-toolbar')?.addEventListener('click', () => {
            document.getElementById('miaoshou-batch-toolbar')?.remove();
        });
        
        // 全选
        document.getElementById('select-all-products')?.addEventListener('click', () => {
            this.selectAllProducts(true);
        });
        
        // 取消全选
        document.getElementById('deselect-all-products')?.addEventListener('click', () => {
            this.selectAllProducts(false);
        });
        
        // 批量优化
        document.getElementById('batch-optimize-products')?.addEventListener('click', () => {
            this.batchOptimizeProducts();
        });
        
        // 智能筛选
        document.getElementById('filter-products')?.addEventListener('click', () => {
            this.showFilterDialog();
        });
    }
    
    /**
     * 为产品项添加选择功能
     */
    static addSelectableFeature() {
        const productItems = this.getAllProductItems();
        
        productItems.forEach((item, index) => {
            // 避免重复添加
            if (item.querySelector('.product-selector')) return;
            
            const selector = document.createElement('div');
            selector.className = 'product-selector';
            selector.style.cssText = `
                position: absolute;
                top: 5px;
                left: 5px;
                width: 20px;
                height: 20px;
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #667eea;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                z-index: 100;
                transition: all 0.2s ease;
            `;
            
            // 设置产品项为相对定位
            if (window.getComputedStyle(item).position === 'static') {
                item.style.position = 'relative';
            }
            
            // 点击选择/取消选择
            selector.addEventListener('click', (e) => {
                e.stopPropagation();
                const isSelected = item.classList.contains('miaoshou-selected');
                
                if (isSelected) {
                    item.classList.remove('miaoshou-selected');
                    selector.innerHTML = '';
                    selector.style.background = 'rgba(255, 255, 255, 0.9)';
                } else {
                    item.classList.add('miaoshou-selected');
                    selector.innerHTML = '✓';
                    selector.style.background = '#667eea';
                    selector.style.color = 'white';
                }
                
                this.updateSelectedCount();
            });
            
            item.appendChild(selector);
        });
        
        console.log(`✅ 已为 ${productItems.length} 个产品项添加选择功能`);
    }
    
    /**
     * 全选/取消全选产品
     */
    static selectAllProducts(select = true) {
        const productItems = this.getAllProductItems();
        
        productItems.forEach(item => {
            const selector = item.querySelector('.product-selector');
            if (!selector) return;
            
            if (select) {
                item.classList.add('miaoshou-selected');
                selector.innerHTML = '✓';
                selector.style.background = '#667eea';
                selector.style.color = 'white';
            } else {
                item.classList.remove('miaoshou-selected');
                selector.innerHTML = '';
                selector.style.background = 'rgba(255, 255, 255, 0.9)';
                selector.style.color = '#333';
            }
        });
        
        this.updateSelectedCount();
        console.log(`✅ ${select ? '全选' : '取消全选'} ${productItems.length} 个产品`);
    }
    
    /**
     * 更新选中数量显示
     */
    static updateSelectedCount() {
        const selectedItems = document.querySelectorAll('.miaoshou-selected');
        const countEl = document.getElementById('selected-count');
        if (countEl) {
            countEl.textContent = `已选择: ${selectedItems.length} 个产品`;
        }
    }
    
    /**
     * 批量优化选中的产品
     */
    static async batchOptimizeProducts() {
        const selectedItems = document.querySelectorAll('.miaoshou-selected');
        
        if (selectedItems.length === 0) {
            alert('请先选择要优化的产品！');
            return;
        }
        
        const confirmMsg = `确定要批量优化 ${selectedItems.length} 个产品吗？\n\n这将：\n1. 提取每个产品的信息\n2. 调用AI进行优化\n3. 可能需要较长时间\n\n建议一次不要选择太多产品。`;
        
        if (!confirm(confirmMsg)) return;
        
        console.log(`🚀 开始批量优化 ${selectedItems.length} 个产品...`);
        
        // 创建进度显示
        const progressEl = this.createProgressDialog();
        let completed = 0;
        
        for (const item of selectedItems) {
            try {
                const productInfo = this.extractProductInfo(item);
                console.log(`🔄 正在优化产品: ${productInfo.title}`);
                
                // 更新进度
                progressEl.querySelector('.progress-text').textContent = 
                    `正在优化: ${productInfo.title.substring(0, 30)}${productInfo.title.length > 30 ? '...' : ''}`;
                progressEl.querySelector('.progress-bar').style.width = 
                    `${((completed + 0.5) / selectedItems.length) * 100}%`;
                
                // 如果有来源URL，可以尝试调用现有的优化功能
                if (productInfo.sourceUrl) {
                    // 这里可以扩展实际的优化逻辑
                    console.log(`📝 产品信息:`, productInfo);
                    
                    // 模拟优化过程（实际应该调用真实的AI优化）
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                completed++;
                progressEl.querySelector('.progress-bar').style.width = 
                    `${(completed / selectedItems.length) * 100}%`;
                progressEl.querySelector('.progress-text').textContent = 
                    `已完成 ${completed}/${selectedItems.length} 个产品`;
                
            } catch (error) {
                console.error(`❌ 优化产品失败:`, error);
                completed++;
            }
        }
        
        progressEl.querySelector('.progress-text').textContent = 
            `✅ 批量优化完成！共处理 ${completed} 个产品`;
        
        setTimeout(() => {
            progressEl.remove();
        }, 3000);
        
        console.log(`✅ 批量优化完成，共处理 ${completed} 个产品`);
    }
    
    /**
     * 创建进度对话框
     */
    static createProgressDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10002;
            min-width: 300px;
            text-align: center;
            font-family: 'Microsoft YaHei', sans-serif;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">批量优化进行中...</div>
            <div class="progress-text" style="margin-bottom: 10px; font-size: 12px; color: #666;">准备开始...</div>
            <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); width: 0%; transition: width 0.3s ease;"></div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        return dialog;
    }
    
    /**
     * 显示筛选对话框
     */
    static showFilterDialog() {
        // 移除已存在的筛选对话框
        document.getElementById('filter-dialog')?.remove();
        
        const dialog = document.createElement('div');
        dialog.id = 'filter-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10003;
            min-width: 400px;
            font-family: 'Microsoft YaHei', sans-serif;
        `;
        
        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333;">智能筛选</h3>
                <button id="close-filter-dialog" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">×</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">按平台筛选:</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <label><input type="checkbox" value="1688" checked> 1688</label>
                    <label><input type="checkbox" value="淘宝" checked> 淘宝</label>
                    <label><input type="checkbox" value="京东" checked> 京东</label>
                    <label><input type="checkbox" value="拼多多" checked> 拼多多</label>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">按状态筛选:</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <label><input type="checkbox" value="待采集" checked> 待采集</label>
                    <label><input type="checkbox" value="已采集" checked> 已采集</label>
                    <label><input type="checkbox" value="处理中" checked> 处理中</label>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">关键词筛选:</label>
                <input type="text" id="keyword-filter" placeholder="输入标题关键词..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="apply-filter" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">应用筛选</button>
                <button id="reset-filter" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer;">重置</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定事件
        dialog.querySelector('#close-filter-dialog').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#apply-filter').addEventListener('click', () => this.applyFilter(dialog));
        dialog.querySelector('#reset-filter').addEventListener('click', () => this.resetFilter());
    }
    
    /**
     * 应用筛选
     */
    static applyFilter(dialog) {
        const platformCheckboxes = dialog.querySelectorAll('input[value="1688"], input[value="淘宝"], input[value="京东"], input[value="拼多多"]');
        const statusCheckboxes = dialog.querySelectorAll('input[value="待采集"], input[value="已采集"], input[value="处理中"]');
        const keywordInput = dialog.querySelector('#keyword-filter');
        
        const selectedPlatforms = Array.from(platformCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const selectedStatuses = Array.from(statusCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const keyword = keywordInput.value.trim().toLowerCase();
        
        console.log('🔍 应用筛选条件:', { selectedPlatforms, selectedStatuses, keyword });
        
        const productItems = this.getAllProductItems();
        let visibleCount = 0;
        
        productItems.forEach(item => {
            const productInfo = this.extractProductInfo(item);
            let shouldShow = true;
            
            // 平台筛选
            if (selectedPlatforms.length > 0 && productInfo.platform) {
                shouldShow = shouldShow && selectedPlatforms.includes(productInfo.platform);
            }
            
            // 状态筛选
            if (selectedStatuses.length > 0 && productInfo.status) {
                const matchStatus = selectedStatuses.some(status => 
                    productInfo.status.includes(status)
                );
                shouldShow = shouldShow && matchStatus;
            }
            
            // 关键词筛选
            if (keyword) {
                shouldShow = shouldShow && productInfo.title.toLowerCase().includes(keyword);
            }
            
            // 显示/隐藏产品项
            if (shouldShow) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        console.log(`✅ 筛选完成，显示 ${visibleCount}/${productItems.length} 个产品`);
        
        // 显示筛选结果提示
        this.showFilterResult(visibleCount, productItems.length);
        
        dialog.remove();
    }
    
    /**
     * 重置筛选
     */
    static resetFilter() {
        const productItems = this.getAllProductItems();
        productItems.forEach(item => {
            item.style.display = '';
        });
        
        console.log(`✅ 筛选已重置，显示所有 ${productItems.length} 个产品`);
        
        document.getElementById('filter-dialog')?.remove();
    }
    
    /**
     * 显示筛选结果
     */
    static showFilterResult(visibleCount, totalCount) {
        // 移除已存在的结果提示
        document.getElementById('filter-result')?.remove();
        
        const result = document.createElement('div');
        result.id = 'filter-result';
        result.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 10004;
            font-size: 14px;
            font-weight: bold;
            backdrop-filter: blur(10px);
            animation: slideInFromTop 0.3s ease;
        `;
        
        result.innerHTML = `筛选结果: ${visibleCount}/${totalCount} 个产品`;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromTop {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(result);
        
        // 3秒后自动移除
        setTimeout(() => {
            result.remove();
            style.remove();
        }, 3000);
    }
    
    /**
     * 初始化采集箱页面优化
     */
    static init() {
        if (!this.isCollectBoxPage()) {
            console.log('❌ 当前页面不是采集箱页面，跳过初始化');
            return;
        }
        
        console.log('🚀 初始化妙手ERP采集箱页面优化功能...');
        
        // 等待页面加载完成
        setTimeout(() => {
            this.createBatchToolbar();
            this.addSelectableFeature();
            console.log('✅ 妙手ERP采集箱页面优化功能初始化完成');
        }, 1000);
    }
}

// 自动初始化采集箱优化功能
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MiaoshouCollectBoxHelper.init();
    });
} else {
    MiaoshouCollectBoxHelper.init();
}

// 监听页面变化（SPA应用）
let lastUrl = location.href;
new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('📍 页面URL变化，重新检查采集箱页面');
        setTimeout(() => {
            MiaoshouCollectBoxHelper.init();
        }, 500);
    }
}).observe(document, { subtree: true, childList: true });

console.log('🎯 妙手ERP采集箱页面优化模块已加载');