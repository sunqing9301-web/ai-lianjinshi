/**
 * AI炼金师 - 产品优化专家 v2.0.2
 * 优化版本：提升性能和稳定性
 */

// 启动日志
console.log('🚀 AI炼金师 - 产品优化专家 v2.0.16 启动中...');

// 模块列表 - 按依赖顺序排列
const modules = [
    'modules/dom-utils.js',
    'modules/error-handler.js', 
    'modules/performance-monitor.js',
    'modules/config-manager.js',
    'modules/api-manager.js',
    'modules/ui-components.js',
    'modules/product-optimizer.js',
    'modules/batch-optimizer.js'
];

// 检查是否在扩展环境中
function isExtensionEnvironment() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

// 优化的模块加载器
class ModuleLoader {
    static loadedModules = new Set();
    static loadingPromises = new Map();
    static retryCount = new Map();
    static maxRetries = 3;
    
    static async loadModule(modulePath) {
        // 如果已经加载，直接返回
        if (this.loadedModules.has(modulePath)) {
            return Promise.resolve();
        }
        
        // 如果正在加载，返回现有的Promise
        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath);
        }
        
        const loadPromise = this._loadModuleWithRetry(modulePath);
        this.loadingPromises.set(modulePath, loadPromise);
        
        try {
            await loadPromise;
            this.loadedModules.add(modulePath);
            this.loadingPromises.delete(modulePath);
            console.log(`✅ 模块加载成功: ${modulePath}`);
        } catch (error) {
            this.loadingPromises.delete(modulePath);
            throw error;
        }
        
        return loadPromise;
    }
    
    static async _loadModuleWithRetry(modulePath, attempt = 1) {
        try {
            const resolvedSrc = (isExtensionEnvironment() && chrome?.runtime?.getURL)
                ? chrome.runtime.getURL(modulePath)
                : modulePath;
            
            // 通过动态 import 以 ES Modules 方式加载，避免注入到页面世界
            const timeoutMs = 10000;
            let timerId;
            const importPromise = import(resolvedSrc);
            const timeoutPromise = new Promise((_, reject) => {
                timerId = setTimeout(() => reject(new Error(`模块加载超时: ${modulePath}`)), timeoutMs);
            });
            await Promise.race([importPromise, timeoutPromise]);
            clearTimeout(timerId);
        } catch (error) {
            if (attempt < this.maxRetries) {
                console.warn(`⚠️ 模块加载失败，重试 ${attempt}/${this.maxRetries}: ${modulePath}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 指数退避
                return this._loadModuleWithRetry(modulePath, attempt + 1);
            }
            throw error;
        }
    }
    
    static async loadAllModules() {
        console.log('🔄 开始加载模块...');
        const startTime = performance.now();
        
        const loadPromises = modules.map(async (modulePath, index) => {
            try {
                await this.loadModule(modulePath);
                return { success: true, module: modulePath };
            } catch (error) {
                console.error(`❌ 模块加载失败: ${modulePath}`, error);
                return { success: false, module: modulePath, error: error.message };
            }
        });
        
        const results = await Promise.allSettled(loadPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        
        const loadTime = performance.now() - startTime;
        console.log(`📊 模块加载完成: 成功 ${successful}/${modules.length}, 失败 ${failed}, 耗时 ${loadTime.toFixed(2)}ms`);
        
        return { successful, failed, loadTime, results };
    }
}

// 全局变量声明
let floatingBtn = null;
let isOptimizing = false;
let isInitialized = false;
let appInstance = null;

// 优化的主应用类
class OzonOptimizerApp {
    constructor() {
        this.modules = {};
        this.initialized = false;
        this.errorCount = 0;
        this.maxErrors = 5;
    }
    
    static async create() {
        if (appInstance) {
            return appInstance;
        }
        
        appInstance = new OzonOptimizerApp();
        await appInstance.init();
        return appInstance;
    }
    
    async init() {
        try {
            console.log('🔧 初始化AI炼金师应用...');
            
            // 加载模块
            const loadResult = await ModuleLoader.loadAllModules();
            
            // 初始化模块
            await this.initializeModules();
            
            // 创建UI
            await this.createUI();
            
            // 设置事件监听
            this.setupEventListeners();
            
            this.initialized = true;
            isInitialized = true;
            console.log('✅ AI炼金师应用初始化完成');
            
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.handleError(error);
            
            // 即使初始化失败，也尝试创建基本UI
            try {
                await this.createBasicUI();
            } catch (uiError) {
                console.error('❌ 基本UI创建失败:', uiError);
            }
        }
    }
    
    async initializeModules() {
        try {
            const moduleInitPromises = [];
            
            // 初始化性能监控（仅在debug开启时）
            const enablePerf = window.ConfigManager?.get?.('debug.enablePerformanceMonitoring', false);
            if (enablePerf && window.PerformanceMonitor?.enable) {
                moduleInitPromises.push(
                    Promise.resolve(window.PerformanceMonitor.enable()).catch(e => 
                        console.warn('⚠️ 性能监控初始化失败:', e)
                    )
                );
            }
            
            // 初始化错误处理
            if (window.ErrorHandler?.init) {
                moduleInitPromises.push(
                    Promise.resolve(window.ErrorHandler.init()).catch(e => 
                        console.warn('⚠️ 错误处理初始化失败:', e)
                    )
                );
            }
            
            // 初始化配置管理
            if (window.ConfigManager?.init) {
                moduleInitPromises.push(
                    Promise.resolve(window.ConfigManager.init()).catch(e => 
                        console.warn('⚠️ 配置管理初始化失败:', e)
                    )
                );
            }
            
            // 初始化API管理
            if (window.APIManager?.init) {
                moduleInitPromises.push(
                    Promise.resolve(window.APIManager.init()).catch(e => 
                        console.warn('⚠️ API管理初始化失败:', e)
                    )
                );
            }
            
            await Promise.allSettled(moduleInitPromises);
            console.log('✅ 模块初始化完成');
            
        } catch (error) {
            console.error('❌ 模块初始化失败:', error);
            throw error;
        }
    }
    
    createBasicFloatingButton() {
        const button = document.createElement('div');
        button.className = 'floating-btn';
        button.innerHTML = '🚀';
        button.title = 'AI炼金师 - 产品优化';
        button.style.cssText = `
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            user-select: none;
            position: relative;
            z-index: 10000;
        `;
        
        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });
        
        // 添加点击事件
        button.addEventListener('click', this.handleOptimizeClick.bind(this));
        
        return button;
    }
    
    async createUI() {
        try {
            // 检查是否已存在按钮
            const existingButtons = document.querySelector('.ozon-floating-buttons');
            if (existingButtons) {
                existingButtons.remove();
            }
            
            // 使用 Shadow DOM 隔离样式与结构
            const host = document.createElement('div');
            host.className = 'ozon-floating-buttons';
            host.style.position = 'fixed';
            host.style.right = '20px';
            host.style.top = '50%';
            host.style.transform = 'translateY(-50%)';
            host.style.zIndex = '10000';
            const shadow = host.attachShadow({ mode: 'open' });
            
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '10px';
            
            // 创建基本的悬浮按钮
            floatingBtn = this.createBasicFloatingButton();
            
            // 创建批量优化按钮
            const batchBtn = this.createBasicFloatingButton();
            batchBtn.innerHTML = '⚡';
            batchBtn.title = 'AI炼金师 - 批量优化';
            batchBtn.addEventListener('click', this.handleBatchOptimizeClick.bind(this));
            
            wrapper.appendChild(floatingBtn);
            wrapper.appendChild(batchBtn);
            
            // 注入基础样式，避免继承站点 CSS
            const style = document.createElement('style');
            style.textContent = `
                .floating-btn { 
                    width: 60px; height: 60px; border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff; display: flex; align-items: center; justify-content: center;
                    font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    transition: all 0.3s ease; user-select: none;
                }
                .floating-btn:hover { transform: scale(1.1); box-shadow: 0 6px 25px rgba(0,0,0,0.4); }
            `;
            shadow.appendChild(style);
            shadow.appendChild(wrapper);
            document.body.appendChild(host);

            // 如果有保存的位置，应用并关闭居中 transform
            try {
                const savedPos = window.ConfigManager?.get('ui.floatingButtonPosition');
                if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
                    host.style.right = 'auto';
                    host.style.transform = 'none';
                    host.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, savedPos.x))}px`;
                    host.style.top = `${Math.max(0, Math.min(window.innerHeight - 60, savedPos.y))}px`;
                }
            } catch (e) {
                console.warn('读取悬浮按钮位置失败:', e);
            }

            // 启用拖拽
            this.enableDragForHost(host, shadow);
            
            console.log('✅ 悬浮按钮创建成功');
            
        } catch (error) {
            console.error('❌ UI创建失败:', error);
            throw error;
        }
    }
    
    async createBasicUI() {
        // 创建最基本的UI，不依赖其他模块
        const button = this.createBasicFloatingButton();
        button.style.position = 'fixed';
        button.style.right = '20px';
        button.style.top = '50%';
        button.style.transform = 'translateY(-50%)';
        button.style.zIndex = '10000';
        
        document.body.appendChild(button);
        console.log('✅ 基本UI创建成功');
    }
    
    setupEventListeners() {
        // 妙手ERP SPA路由与就绪监听
        this.setupSpaListeners();
        
        // 窗口焦点监听
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
        
        // 配置变化监听（来自 ConfigManager 事件）
        if (window.ConfigManager && window.ConfigManager.addListener) {
            window.ConfigManager.addListener((event, data) => {
                if (event === 'configChanged') {
                    this.handleConfigChange(data || {});
                }
            });
        }
        
        // 接收来自后台/弹窗的配置更新消息
        if (isExtensionEnvironment() && chrome?.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request && request.action === 'configChanged') {
                    this.handleConfigChange(request.config || {});
                    if (typeof sendResponse === 'function') {
                        sendResponse({ success: true });
                    }
                }
            });
        }
        
        // 错误监听
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }

    setupSpaListeners() {
        // 路由变更拦截（pushState/replaceState）
        const wrapHistory = (type) => {
            const orig = history[type];
            history[type] = function() {
                const ret = orig.apply(this, arguments);
                window.dispatchEvent(new Event('aiOptimizer:navigation')); 
                return ret;
            };
        };
        wrapHistory('pushState');
        wrapHistory('replaceState');
        window.addEventListener('popstate', () => window.dispatchEvent(new Event('aiOptimizer:navigation')));

        // 路由变更时，等待页面就绪（妙手ERP表单区域）
        const onNavigate = () => {
            this.handlePageChange();
            // 仅监听与表单区域相关的容器，减少开销
            const target = document.body;
            if (!target) return;
            if (this._mo) this._mo.disconnect();
            this._mo = new MutationObserver(() => {
                // 简单就绪条件：存在常见表单根/编辑区域标识
                const ready = document.querySelector('[data-product-form], .product-edit, form[action*="product"], [data-v-app]');
                if (ready) {
                    this.handlePageChange();
                }
            });
            this._mo.observe(target, { childList: true, subtree: true });
        };
        window.addEventListener('aiOptimizer:navigation', onNavigate);
        onNavigate();
    }

    enableDragForHost(host, shadowRoot) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        const startDrag = (e) => {
            isDragging = true;
            const rect = host.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!isDragging) return;
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            const maxX = window.innerWidth - host.offsetWidth;
            const maxY = window.innerHeight - host.offsetHeight;
            host.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
            host.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
            host.style.right = 'auto';
            host.style.transform = 'none';
        };
        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            const position = {
                x: parseInt(host.style.left || '0', 10),
                y: parseInt(host.style.top || '0', 10)
            };
            if (window.ConfigManager) {
                window.ConfigManager.set('ui.floatingButtonPosition', position);
            }
        };

        // 监听 shadow 内元素的鼠标事件（在 wrapper 区域拖拽）
        shadowRoot.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', endDrag);
    }
    
    async handleOptimizeClick() {
        if (isOptimizing) {
            console.log('⏳ 优化正在进行中，请稍候...');
            return;
        }
        
        try {
            isOptimizing = true;
            
            if (window.ProductOptimizer?.optimize) {
                await window.ProductOptimizer.optimize();
            } else if (window.ProductOptimizer?.optimizeProduct) {
                await window.ProductOptimizer.optimizeProduct({ autoApply: false, skipPreview: false });
            } else {
                console.warn('⚠️ ProductOptimizer模块未加载，使用基本优化功能');
                this.showBasicOptimization();
            }
            
        } catch (error) {
            console.error('❌ 优化过程出错:', error);
            this.handleError(error);
        } finally {
            isOptimizing = false;
        }
    }
    
    showBasicOptimization() {
        // 基本的优化提示
        const message = 'AI炼金师正在启动中，请稍后再试...';
        if (window.UIComponents) {
            window.UIComponents.showNotification(message, 'info');
        } else {
            alert(message);
        }
    }
    
    handleConfigChange(data) {
        console.log('⚙️ 配置已更新:', data);
        
        // 兼容扁平与嵌套schema的显示开关
        const show = (data?.ui && typeof data.ui.showFloatingButton !== 'undefined')
            ? data.ui.showFloatingButton
            : (typeof data?.showFloatingButton !== 'undefined')
                ? data.showFloatingButton
                : undefined;
        
        if (typeof show !== 'undefined') {
            const buttons = document.querySelector('.ozon-floating-buttons');
            if (show === false) {
                if (buttons) buttons.remove();
            } else {
                // 显示或重建
                this.createUI();
            }
        }
    }
    
    handlePageChange() {
        console.log('📄 页面内容已变化');
        // 可以在这里添加页面变化后的处理逻辑
    }
    
    handleWindowFocus() {
        console.log('👁️ 窗口获得焦点');
        // 可以在这里添加窗口焦点处理逻辑
    }
    
    async handleBatchOptimizeClick() {
        if (isOptimizing) {
            console.log('⏳ 优化正在进行中，请稍候...');
            return;
        }
        
        try {
            isOptimizing = true;
            
            if (window.BatchOptimizer) {
                await window.BatchOptimizer.optimize();
            } else {
                console.warn('⚠️ BatchOptimizer模块未加载');
                this.showBasicOptimization();
            }
            
        } catch (error) {
            console.error('❌ 批量优化出错:', error);
            this.handleError(error);
        } finally {
            isOptimizing = false;
        }
    }
    
    handleError(error, context = 'General') {
        this.errorCount++;
        console.error(`❌ [${context}] 错误:`, error);
        
        if (window.ErrorHandler) {
            window.ErrorHandler.handle(error, context);
        }
        
        // 如果错误过多，停止应用
        if (this.errorCount >= this.maxErrors) {
            console.error('❌ 错误次数过多，停止应用');
            this.destroy();
        }
    }
    
    handleGlobalError(event) {
        this.handleError(event.error, 'Global');
    }
    
    handleUnhandledRejection(event) {
        this.handleError(event.reason, 'UnhandledRejection');
    }
    
    destroy() {
        // 清理资源
        const buttons = document.querySelector('.ozon-floating-buttons');
        if (buttons) {
            buttons.remove();
        }
        
        // 清理事件监听
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
        
        console.log('🧹 应用已清理');
    }
    
    showConfigurationModal(issues) {
        if (window.UIComponents) {
            window.UIComponents.showModal({
                title: '⚙️ 配置问题',
                content: `
                    <div style="margin-bottom: 20px;">
                        <p>检测到以下配置问题，请修复后继续：</p>
                        <ul style="text-align: left; margin: 10px 0;">
                            ${issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                `,
                buttons: [
                    {
                        text: '打开设置',
                        primary: true,
                        onClick: () => {
                            if (chrome.runtime) {
                                chrome.runtime.openOptionsPage();
                            }
                        }
                    },
                    {
                        text: '稍后处理',
                        onClick: () => {}
                    }
                ]
            });
        } else {
            alert('配置问题：' + issues.join(', '));
        }
    }
}

// 兼容性检查
function checkCompatibility() {
    try {
        const ok = (
            typeof fetch === 'function' &&
            typeof Promise !== 'undefined' &&
            typeof window !== 'undefined' &&
            typeof document !== 'undefined' &&
            typeof document.querySelector === 'function' &&
            typeof performance !== 'undefined'
        );
        if (!ok) console.error('❌ 缺少必需功能');
        return ok;
    } catch (_) {
        return false;
    }
}

// 启动应用
if (checkCompatibility()) {
    console.log('✅ 兼容性检查通过');
    
    const startApp = async () => {
        try {
            await OzonOptimizerApp.create();
        } catch (error) {
            console.error('❌ 应用启动失败:', error);
        }
    };
    
    // 防重复：只运行一次
    if (!window.__aiOptimizerStarted) {
        window.__aiOptimizerStarted = true;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startApp, 500);
            });
        } else {
            setTimeout(startApp, 500);
        }
    }
} else {
    console.log('🚫 兼容性检查失败，应用未启动');
}

// 导出到全局
window.OzonOptimizerApp = OzonOptimizerApp;
window.ModuleLoader = ModuleLoader;

console.log('📦 AI炼金师 - 产品优化专家内容脚本加载完成');