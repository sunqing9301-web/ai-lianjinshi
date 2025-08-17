/**
 * 性能监控和调试模块
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class PerformanceMonitor {
    static isEnabled = false;
    static performanceData = new Map();
    static debugLogs = [];
    static maxLogs = 1000;
    static observers = new Map();
    
    /**
     * 启用性能监控
     */
    static enable() {
        this.isEnabled = true;
        this.log('🛠️ 性能监控已启用');
        
        // 暴露到全局对象供调试使用
        window.OzonOptimizerDebug = {
            getPerformanceData: () => Object.fromEntries(this.performanceData),
            getDebugLogs: () => this.debugLogs.slice(-100), // 最近100条
            clearLogs: () => this.clearLogs(),
            getStats: () => this.getPerformanceStats(),
            exportData: () => this.exportPerformanceData()
        };
        
        // 监控页面性能
        this.startPagePerformanceMonitoring();
    }
    
    /**
     * 禁用性能监控
     */
    static disable() {
        this.isEnabled = false;
        this.log('🛠️ 性能监控已禁用');
        
        // 清理观察器
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        delete window.OzonOptimizerDebug;
    }
    
    /**
     * 开始计时
     * @param {string} key - 计时器标识
     * @param {Object} metadata - 附加元数据
     */
    static startTimer(key, metadata = {}) {
        if (!this.isEnabled) return;
        
        const timerData = {
            startTime: performance.now(),
            startTimestamp: new Date().toISOString(),
            metadata
        };
        
        this.performanceData.set(key, timerData);
        this.logDebug(`⏱️ 开始计时: ${key}`, metadata);
    }
    
    /**
     * 结束计时
     * @param {string} key - 计时器标识
     * @param {Object} additionalData - 额外数据
     * @returns {number} 耗时（毫秒）
     */
    static endTimer(key, additionalData = {}) {
        if (!this.isEnabled) return 0;
        
        const timerData = this.performanceData.get(key);
        if (!timerData) {
            this.logDebug(`⚠️ 计时器 ${key} 不存在`);
            return 0;
        }
        
        const endTime = performance.now();
        const duration = endTime - timerData.startTime;
        
        // 更新计时器数据
        timerData.endTime = endTime;
        timerData.duration = duration;
        timerData.endTimestamp = new Date().toISOString();
        timerData.additionalData = additionalData;
        
        this.performanceData.set(key, timerData);
        
        // 记录性能日志
        const message = `⏱️ ${key}: ${duration.toFixed(2)}ms`;
        if (duration > 1000) {
            console.warn(`🐌 ${message} (较慢)`);
        } else if (duration > 500) {
            console.log(`⚡ ${message} (中等)`);
        } else {
            console.log(`🚀 ${message} (快速)`);
        }
        
        this.logDebug(message, { duration, ...additionalData });
        
        return duration;
    }
    
    /**
     * 记录调试日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static logDebug(message, data = null) {
        if (!this.isEnabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            message,
            data,
            stack: new Error().stack
        };
        
        this.debugLogs.push(logEntry);
        
        // 限制日志数量
        if (this.debugLogs.length > this.maxLogs) {
            this.debugLogs = this.debugLogs.slice(-this.maxLogs);
        }
        
        console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
    
    /**
     * 记录普通日志
     * @param {string} message - 日志消息
     */
    static log(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`📊 [${timestamp}] [性能监控] ${message}`);
    }
    
    /**
     * 监控函数执行性能
     * @param {Function} func - 要监控的函数
     * @param {string} name - 函数名称
     * @returns {Function} 包装后的函数
     */
    static monitorFunction(func, name) {
        if (!this.isEnabled) return func;
        
        return async function(...args) {
            const key = `function_${name}_${Date.now()}`;
            PerformanceMonitor.startTimer(key, { functionName: name, args: args.length });
            
            try {
                const result = await func.apply(this, args);
                PerformanceMonitor.endTimer(key, { success: true, resultType: typeof result });
                return result;
            } catch (error) {
                PerformanceMonitor.endTimer(key, { success: false, error: error.message });
                throw error;
            }
        };
    }
    
    /**
     * 监控API请求性能
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise} fetch结果
     */
    static async monitorFetch(url, options = {}) {
        const key = `fetch_${url.split('/').pop()}_${Date.now()}`;
        this.startTimer(key, { url, method: options.method || 'GET' });
        
        try {
            const response = await fetch(url, options);
            this.endTimer(key, { 
                status: response.status, 
                ok: response.ok,
                size: response.headers.get('content-length') || 'unknown'
            });
            return response;
        } catch (error) {
            this.endTimer(key, { error: error.message });
            throw error;
        }
    }
    
    /**
     * 开始页面性能监控
     */
    static startPagePerformanceMonitoring() {
        if (!this.isEnabled) return;
        
        // 监控DOM变化
        if (typeof MutationObserver !== 'undefined') {
            const mutationObserver = new MutationObserver((mutations) => {
                this.logDebug(`DOM变化: ${mutations.length}个变更`);
            });
            
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });
            
            this.observers.set('mutation', mutationObserver);
        }
        
        // 监控网络请求
        this.interceptFetch();
        
        // 监控页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.logDebug(`页面可见性变化: ${document.visibilityState}`);
        });
        
        // 记录页面加载性能
        window.addEventListener('load', () => {
            setTimeout(() => this.recordPageLoadMetrics(), 1000);
        });
    }
    
    /**
     * 拦截fetch请求进行监控
     */
    static interceptFetch() {
        if (window.fetch.__monitored) return;
        
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            return PerformanceMonitor.monitorFetch.apply(PerformanceMonitor, args);
        };
        window.fetch.__monitored = true;
    }
    
    /**
     * 记录页面加载指标
     */
    static recordPageLoadMetrics() {
        if (!this.isEnabled || !window.performance) return;
        
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const metrics = {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                domInteractive: navigation.domInteractive - navigation.navigationStart,
                firstPaint: 0,
                firstContentfulPaint: 0
            };
            
            // 获取绘制指标
            const paintEntries = performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
                if (entry.name === 'first-paint') {
                    metrics.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    metrics.firstContentfulPaint = entry.startTime;
                }
            });
            
            this.logDebug('页面加载性能指标', metrics);
        }
    }
    
    /**
     * 获取性能统计
     * @returns {Object} 性能统计数据
     */
    static getPerformanceStats() {
        if (!this.isEnabled) return {};
        
        const timers = Array.from(this.performanceData.values())
            .filter(timer => timer.duration !== undefined);
        
        if (timers.length === 0) return { message: '暂无性能数据' };
        
        const durations = timers.map(timer => timer.duration);
        const total = durations.reduce((sum, duration) => sum + duration, 0);
        const average = total / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        return {
            totalOperations: timers.length,
            totalTime: total.toFixed(2),
            averageTime: average.toFixed(2),
            minTime: min.toFixed(2),
            maxTime: max.toFixed(2),
            slowOperations: timers.filter(timer => timer.duration > 1000).length
        };
    }
    
    /**
     * 导出性能数据
     * @returns {Object} 完整的性能数据
     */
    static exportPerformanceData() {
        return {
            performanceData: Object.fromEntries(this.performanceData),
            debugLogs: this.debugLogs,
            stats: this.getPerformanceStats(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }
    
    /**
     * 清除所有日志和性能数据
     */
    static clearLogs() {
        this.debugLogs = [];
        this.performanceData.clear();
        this.log('性能数据和日志已清除');
    }
    
    /**
     * 创建性能报告
     * @returns {string} 格式化的性能报告
     */
    static createPerformanceReport() {
        const stats = this.getPerformanceStats();
        const recentLogs = this.debugLogs.slice(-20);
        
        return `
=== OZON优化助手性能报告 ===
时间: ${new Date().toLocaleString()}

性能统计:
- 总操作数: ${stats.totalOperations || 0}
- 总耗时: ${stats.totalTime || 0}ms
- 平均耗时: ${stats.averageTime || 0}ms
- 最快操作: ${stats.minTime || 0}ms
- 最慢操作: ${stats.maxTime || 0}ms
- 慢操作数: ${stats.slowOperations || 0}

最近日志:
${recentLogs.map(log => `[${log.timestamp}] ${log.message}`).join('\n')}

=============================
        `;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
} else if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}