/**
 * DOM工具模块 - 提供强大的元素查找和等待功能
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class DOMUtils {
    /**
     * 等待元素出现，支持超时和自定义检查间隔
     * @param {string} selector - CSS选择器
     * @param {number} timeout - 超时时间（毫秒）
     * @param {number} interval - 检查间隔（毫秒）
     * @returns {Promise<Element>} 找到的元素
     */
    static async waitForElement(selector, timeout = 5000, interval = 100) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                try {
                    const element = document.querySelector(selector);
                    if (element && this.isElementVisible(element)) {
                        resolve(element);
                        return;
                    }
                    
                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未找到或不可见`));
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
     * 尝试多个选择器查找元素（按优先级顺序）
     * @param {string[]} selectors - 选择器数组
     * @param {Element} container - 容器元素
     * @returns {Element|null} 找到的元素
     */
    static findElementBySelectors(selectors, container = document) {
        for (const selector of selectors) {
            try {
                const element = container.querySelector(selector);
                if (element && this.isElementVisible(element)) {
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
     * @param {string} text - 要查找的文本
     * @param {string} tagName - 标签名（默认为所有标签）
     * @param {boolean} exact - 是否精确匹配
     * @param {Element} container - 容器元素
     * @returns {Element|null} 找到的元素
     */
    static findElementByText(text, tagName = '*', exact = false, container = document) {
        const elements = container.querySelectorAll(tagName);
        for (const element of elements) {
            const elementText = element.textContent || element.innerText || '';
            const normalizedText = elementText.trim();
            
            if (exact ? normalizedText === text : normalizedText.includes(text)) {
                return element;
            }
        }
        return null;
    }
    
    /**
     * 检查元素是否可见
     * @param {Element} element - 要检查的元素
     * @returns {boolean} 是否可见
     */
    static isElementVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               rect.width > 0 && 
               rect.height > 0;
    }
    
    /**
     * 检查元素是否可交互
     * @param {Element} element - 要检查的元素
     * @returns {boolean} 是否可交互
     */
    static isElementInteractable(element) {
        if (!element || !this.isElementVisible(element)) return false;
        
        return !element.disabled && 
               !element.readOnly &&
               !element.hasAttribute('aria-disabled');
    }
    
    /**
     * 安全地点击元素
     * @param {Element} element - 要点击的元素
     * @param {Object} options - 点击选项
     * @returns {boolean} 是否成功点击
     */
    static safeClick(element, options = {}) {
        if (!this.isElementInteractable(element)) {
            console.warn('元素不可交互，无法点击');
            return false;
        }
        
        try {
            // 滚动到元素可见区域
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 等待一小段时间确保滚动完成
            setTimeout(() => {
                if (options.useMouseEvent) {
                    // 使用鼠标事件模拟点击
                    const event = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(event);
                } else {
                    // 直接调用click方法
                    element.click();
                }
            }, 100);
            
            return true;
        } catch (error) {
            console.error('点击元素时出错:', error);
            return false;
        }
    }
    
    /**
     * 安全地设置元素值
     * @param {Element} element - 目标元素
     * @param {string} value - 要设置的值
     * @returns {boolean} 是否成功设置
     */
    static safeSetValue(element, value) {
        if (!this.isElementInteractable(element)) {
            console.warn('元素不可交互，无法设置值');
            return false;
        }
        
        try {
            // 聚焦元素
            element.focus();
            
            // 清空现有值
            element.value = '';
            
            // 设置新值
            element.value = value;
            
            // 触发相关事件
            ['input', 'change', 'blur'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                element.dispatchEvent(event);
            });
            
            return true;
        } catch (error) {
            console.error('设置元素值时出错:', error);
            return false;
        }
    }
    
    /**
     * 等待页面加载完成
     * @param {number} timeout - 超时时间
     * @returns {Promise<void>}
     */
    static async waitForPageLoad(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }
            
            const timer = setTimeout(() => {
                reject(new Error('页面加载超时'));
            }, timeout);
            
            const onLoad = () => {
                clearTimeout(timer);
                document.removeEventListener('DOMContentLoaded', onLoad);
                window.removeEventListener('load', onLoad);
                resolve();
            };
            
            document.addEventListener('DOMContentLoaded', onLoad);
            window.addEventListener('load', onLoad);
        });
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
} else if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
}