/**
 * 错误处理模块 - 提供统一的错误管理和用户通知
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class ErrorHandler {
    static errorCounts = new Map();
    static maxErrorsPerType = 5;
    static notificationQueue = [];
    static isShowingNotification = false;
    
    /**
     * 记录普通日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`🔧 [${timestamp}] [优化助手] ${message}`, data || '');
    }
    
    /**
     * 记录警告日志
     * @param {string} message - 警告消息
     * @param {any} data - 附加数据
     */
    static warn(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.warn(`⚠️ [${timestamp}] [优化助手] ${message}`, data || '');
    }
    
    /**
     * 记录错误日志
     * @param {string} message - 错误消息
     * @param {Error|any} error - 错误对象
     */
    static error(message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`❌ [${timestamp}] [优化助手] ${message}`, error || '');
        
        // 统计错误次数
        const errorType = this.getErrorType(error);
        const count = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, count + 1);
        
        // 如果错误次数过多，显示特殊提示
        if (count >= this.maxErrorsPerType) {
            this.showUserNotification(
                `检测到频繁的${errorType}错误，建议刷新页面或联系技术支持`,
                'error',
                5000
            );
        }
    }
    
    /**
     * 异步操作错误处理
     * @param {Function} operation - 要执行的操作
     * @param {any} fallback - 失败时的回退值
     * @param {string} context - 操作上下文
     * @returns {Promise<any>} 操作结果
     */
    static async handleAsync(operation, fallback = null, context = '') {
        try {
            return await operation();
        } catch (error) {
            this.error(`${context}执行失败:`, error);
            
            if (typeof fallback === 'function') {
                try {
                    this.log(`${context}尝试执行回退方案`);
                    return await fallback();
                } catch (fallbackError) {
                    this.error(`${context}回退方案也失败:`, fallbackError);
                }
            }
            return fallback;
        }
    }
    
    /**
     * 同步操作错误处理
     * @param {Function} operation - 要执行的操作
     * @param {any} fallback - 失败时的回退值
     * @param {string} context - 操作上下文
     * @returns {any} 操作结果
     */
    static handle(operation, fallback = null, context = '') {
        try {
            return operation();
        } catch (error) {
            this.error(`${context}执行失败:`, error);
            
            if (typeof fallback === 'function') {
                try {
                    this.log(`${context}尝试执行回退方案`);
                    return fallback();
                } catch (fallbackError) {
                    this.error(`${context}回退方案也失败:`, fallbackError);
                }
            }
            return fallback;
        }
    }
    
    /**
     * 获取错误类型
     * @param {Error|any} error - 错误对象
     * @returns {string} 错误类型
     */
    static getErrorType(error) {
        if (!error) return 'unknown';
        if (error.name) return error.name;
        if (error.message) {
            if (error.message.includes('网络')) return 'network';
            if (error.message.includes('API')) return 'api';
            if (error.message.includes('超时')) return 'timeout';
            if (error.message.includes('权限')) return 'permission';
        }
        return 'runtime';
    }
    
    /**
     * 获取用户友好的错误消息
     * @param {Error|any} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static getUserFriendlyMessage(error) {
        if (!error) return '未知错误，请重试';
        
        const message = error.message || error.toString();
        
        // 网络相关错误
        if (message.includes('网络') || message.includes('fetch')) {
            return '网络连接异常，请检查网络后重试';
        }
        
        // API相关错误
        if (message.includes('API') || message.includes('401') || message.includes('403')) {
            return 'AI服务暂时不可用，请检查API配置或稍后重试';
        }
        
        // 超时错误
        if (message.includes('超时') || message.includes('timeout')) {
            return '操作超时，请检查网络或稍后重试';
        }
        
        // 权限错误
        if (message.includes('权限') || message.includes('permission')) {
            return '权限不足，请检查扩展权限设置';
        }
        
        // 元素查找错误
        if (message.includes('元素') || message.includes('selector')) {
            return '页面元素未找到，请刷新页面后重试';
        }
        
        return '操作失败，请重试或联系技术支持';
    }
    
    /**
     * 显示用户通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (info, success, warning, error)
     * @param {number} duration - 显示时长（毫秒）
     */
    static showUserNotification(message, type = 'info', duration = 3000) {
        // 添加到队列
        this.notificationQueue.push({ message, type, duration });
        
        // 如果没有正在显示的通知，开始处理队列
        if (!this.isShowingNotification) {
            this.processNotificationQueue();
        }
    }
    
    /**
     * 处理通知队列
     */
    static async processNotificationQueue() {
        if (this.notificationQueue.length === 0) {
            this.isShowingNotification = false;
            return;
        }
        
        this.isShowingNotification = true;
        const { message, type, duration } = this.notificationQueue.shift();
        
        await this.displayNotification(message, type, duration);
        
        // 继续处理下一个通知
        setTimeout(() => this.processNotificationQueue(), 300);
    }
    
    /**
     * 显示单个通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     * @param {number} duration - 显示时长
     */
    static async displayNotification(message, type, duration) {
        return new Promise((resolve) => {
            // 创建通知元素
            const notification = document.createElement('div');
            notification.className = `ozon-optimizer-notification ozon-notification-${type}`;
            
            // 设置样式
            const colors = {
                info: { bg: '#3498db', icon: 'ℹ️' },
                success: { bg: '#2ecc71', icon: '✅' },
                warning: { bg: '#f39c12', icon: '⚠️' },
                error: { bg: '#e74c3c', icon: '❌' }
            };
            
            const color = colors[type] || colors.info;
            
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${color.bg};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
                font-size: 14px;
                font-family: 'Microsoft YaHei', Arial, sans-serif;
                max-width: 350px;
                min-width: 200px;
                word-wrap: break-word;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            notification.innerHTML = `
                <span style="font-size: 16px;">${color.icon}</span>
                <span>${message}</span>
                <button style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " onclick="this.parentElement.remove();">×</button>
            `;
            
            document.body.appendChild(notification);
            
            // 动画显示
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            // 自动隐藏
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                    resolve();
                }, 300);
            }, duration);
        });
    }
    
    /**
     * 清除错误统计
     */
    static clearErrorCounts() {
        this.errorCounts.clear();
        this.log('错误统计已清除');
    }
    
    /**
     * 获取错误统计信息
     * @returns {Object} 错误统计
     */
    static getErrorStats() {
        return Object.fromEntries(this.errorCounts);
    }
    
    /**
     * 创建错误报告
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {Object} 错误报告
     */
    static createErrorReport(error, context = '') {
        return {
            message: error.message || '未知错误',
            type: this.getErrorType(error),
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorStats: this.getErrorStats()
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}