/**
 * UI组件模块 - 统一管理所有UI元素的创建和交互
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class UIComponents {
    static components = new Map();
    static styles = null;
    static zIndexBase = 10000;
    
    /**
     * 初始化UI组件系统
     */
    static init() {
        this.injectStyles();
        this.setupGlobalEventListeners();
        console.log('✅ UI组件系统初始化成功');
    }
    
    /**
     * 注入样式
     */
    static injectStyles() {
        if (this.styles) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'ozon-optimizer-styles';
        styleSheet.textContent = `
            /* 悬浮按钮样式 */
            .ozon-floating-btn {
                position: fixed;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: ${this.zIndexBase + 1};
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
            }
            
            .ozon-floating-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(0,0,0,0.4);
            }
            
            .ozon-floating-btn:active {
                transform: scale(0.95);
            }
            
            .ozon-floating-btn.dragging {
                cursor: grabbing;
                transform: scale(1.05);
            }
            
            /* 进度指示器样式 */
            .ozon-progress-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                z-index: ${this.zIndexBase + 2};
                min-width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .ozon-progress-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            
            .ozon-progress-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            
            .ozon-progress-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ozon-progress-bar {
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .ozon-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .ozon-progress-text {
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            
            /* 通知样式 */
            .ozon-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-left: 4px solid #4CAF50;
                border-radius: 4px;
                padding: 16px 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: ${this.zIndexBase + 3};
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInRight 0.3s ease;
            }
            
            .ozon-notification.error {
                border-left-color: #f44336;
            }
            
            .ozon-notification.warning {
                border-left-color: #ff9800;
            }
            
            .ozon-notification.info {
                border-left-color: #2196F3;
            }
            
            .ozon-notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .ozon-notification-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            
            .ozon-notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
            }
            
            .ozon-notification-content {
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }
            
            /* 模态框样式 */
            .ozon-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: ${this.zIndexBase + 4};
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .ozon-modal {
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: scaleIn 0.3s ease;
            }
            
            .ozon-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .ozon-modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }
            
            .ozon-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ozon-modal-content {
                color: #333;
                line-height: 1.6;
            }
            
            .ozon-modal-footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            /* 按钮样式 */
            .ozon-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .ozon-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .ozon-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .ozon-btn-secondary {
                background: #f5f5f5;
                color: #333;
                border: 1px solid #ddd;
            }
            
            .ozon-btn-secondary:hover {
                background: #e8e8e8;
            }
            
            /* 动画 */
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes scaleIn {
                from {
                    transform: scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .ozon-modal {
                    margin: 20px;
                    max-width: calc(100% - 40px);
                }
                
                .ozon-notification {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .ozon-progress-indicator {
                    right: 10px;
                    left: 10px;
                    min-width: auto;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
        this.styles = styleSheet;
    }
    
    /**
     * 创建悬浮按钮
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} 按钮元素
     */
    static createFloatingButton(options = {}) {
        const {
            icon = '🚀',
            position = { x: 20, y: 100 },
            onClick = null,
            draggable = true
        } = options;
        
        const button = document.createElement('button');
        button.className = 'ozon-floating-btn';
        button.innerHTML = icon;
        button.style.left = `${position.x}px`;
        button.style.top = `${position.y}px`;
        
        // 点击事件
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        // 拖拽功能
        if (draggable) {
            this.makeDraggable(button);
        }
        
        document.body.appendChild(button);
        this.components.set('floatingButton', button);
        
        return button;
    }
    
    /**
     * 创建进度指示器
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} 进度指示器元素
     */
    static createProgressIndicator(options = {}) {
        const {
            title = '正在优化产品信息...',
            closable = true
        } = options;
        
        const container = document.createElement('div');
        container.className = 'ozon-progress-indicator';
        
        container.innerHTML = `
            <div class="ozon-progress-header">
                <div class="ozon-progress-title">${title}</div>
                ${closable ? '<button class="ozon-progress-close">×</button>' : ''}
            </div>
            <div class="ozon-progress-bar">
                <div class="ozon-progress-fill"></div>
            </div>
            <div class="ozon-progress-text">准备中...</div>
        `;
        
        // 关闭按钮事件
        if (closable) {
            const closeBtn = container.querySelector('.ozon-progress-close');
            closeBtn.addEventListener('click', () => {
                this.removeComponent('progressIndicator');
            });
        }
        
        document.body.appendChild(container);
        this.components.set('progressIndicator', container);
        
        return container;
    }
    
    /**
     * 更新进度
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} text - 进度文本
     */
    static updateProgress(progress, text = '') {
        const indicator = this.components.get('progressIndicator');
        if (!indicator) return;
        
        const fill = indicator.querySelector('.ozon-progress-fill');
        const textEl = indicator.querySelector('.ozon-progress-text');
        
        if (fill) {
            fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
        
        if (textEl && text) {
            textEl.textContent = text;
        }
    }
    
    /**
     * 显示通知
     * @param {Object} options - 通知选项
     * @returns {HTMLElement} 通知元素
     */
    static showNotification(options = {}) {
        const {
            title = '通知',
            message = '',
            type = 'info', // success, error, warning, info
            duration = 5000,
            closable = true
        } = options;
        
        const notification = document.createElement('div');
        notification.className = `ozon-notification ${type}`;
        
        notification.innerHTML = `
            <div class="ozon-notification-header">
                <div class="ozon-notification-title">${title}</div>
                ${closable ? '<button class="ozon-notification-close">×</button>' : ''}
            </div>
            ${message ? `<div class="ozon-notification-content">${message}</div>` : ''}
        `;
        
        // 关闭按钮事件
        if (closable) {
            const closeBtn = notification.querySelector('.ozon-notification-close');
            closeBtn.addEventListener('click', () => {
                this.removeNotification(notification);
            });
        }
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        document.body.appendChild(notification);
        
        return notification;
    }
    
    /**
     * 移除通知
     * @param {HTMLElement} notification - 通知元素
     */
    static removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    /**
     * 创建模态框
     * @param {Object} options - 模态框选项
     * @returns {HTMLElement} 模态框元素
     */
    static createModal(options = {}) {
        const {
            title = '模态框',
            content = '',
            closable = true,
            buttons = [],
            onClose = null
        } = options;
        
        const overlay = document.createElement('div');
        overlay.className = 'ozon-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'ozon-modal';
        
        modal.innerHTML = `
            <div class="ozon-modal-header">
                <div class="ozon-modal-title">${title}</div>
                ${closable ? '<button class="ozon-modal-close">×</button>' : ''}
            </div>
            <div class="ozon-modal-content">${content}</div>
            ${buttons.length > 0 ? '<div class="ozon-modal-footer"></div>' : ''}
        `;
        
        // 添加按钮
        if (buttons.length > 0) {
            const footer = modal.querySelector('.ozon-modal-footer');
            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `ozon-btn ${btn.type || 'ozon-btn-secondary'}`;
                button.textContent = btn.text || '按钮';
                
                if (btn.onClick) {
                    button.addEventListener('click', (e) => {
                        btn.onClick(e, modal, overlay);
                    });
                }
                
                footer.appendChild(button);
            });
        }
        
        // 关闭事件
        const closeModal = () => {
            if (onClose) onClose();
            this.removeModal(overlay);
        };
        
        if (closable) {
            const closeBtn = modal.querySelector('.ozon-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
        }
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.components.set('modal', overlay);
        
        return overlay;
    }
    
    /**
     * 移除模态框
     * @param {HTMLElement} modal - 模态框元素
     */
    static removeModal(modal) {
        if (modal && modal.parentNode) {
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                this.components.delete('modal');
            }, 300);
        }
    }
    
    /**
     * 使元素可拖拽
     * @param {HTMLElement} element - 要拖拽的元素
     */
    static makeDraggable(element) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            element.classList.add('dragging');
            
            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            // 限制在视窗内
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;
            
            element.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
            element.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                
                // 保存位置
                const position = {
                    x: parseInt(element.style.left),
                    y: parseInt(element.style.top)
                };
                
                if (window.ConfigManager) {
                    window.ConfigManager.set('floatingButtonPosition', position);
                }
            }
        });
    }
    
    /**
     * 移除组件
     * @param {string} name - 组件名称
     */
    static removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.parentNode) {
            component.parentNode.removeChild(component);
            this.components.delete(name);
        }
    }
    
    /**
     * 获取组件
     * @param {string} name - 组件名称
     * @returns {HTMLElement|null} 组件元素
     */
    static getComponent(name) {
        return this.components.get(name) || null;
    }
    
    /**
     * 清理所有组件
     */
    static cleanup() {
        for (const [name, component] of this.components) {
            if (component && component.parentNode) {
                component.parentNode.removeChild(component);
            }
        }
        this.components.clear();
        
        if (this.styles && this.styles.parentNode) {
            this.styles.parentNode.removeChild(this.styles);
            this.styles = null;
        }
    }
    
    /**
     * 设置全局事件监听器
     */
    static setupGlobalEventListeners() {
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = this.components.get('modal');
                if (modal) {
                    this.removeModal(modal);
                }
            }
        });
        
        // 窗口大小变化时调整组件位置
        window.addEventListener('resize', () => {
            const floatingBtn = this.components.get('floatingButton');
            if (floatingBtn) {
                const rect = floatingBtn.getBoundingClientRect();
                const maxX = window.innerWidth - floatingBtn.offsetWidth;
                const maxY = window.innerHeight - floatingBtn.offsetHeight;
                
                if (rect.right > window.innerWidth) {
                    floatingBtn.style.left = `${maxX}px`;
                }
                if (rect.bottom > window.innerHeight) {
                    floatingBtn.style.top = `${maxY}px`;
                }
            }
        });
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
} else if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}