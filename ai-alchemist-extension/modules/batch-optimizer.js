/**
 * 批量优化模块 - 处理自动优化下一个产品的功能
 * @version 1.0.0
 * @author OZON产品优化助手
 */

class BatchOptimizer {
    static isRunning = false;
    static currentQueue = [];
    static processedCount = 0;
    static totalCount = 0;
    static settings = {
        autoNavigate: true,
        delayBetweenProducts: 3000, // 3秒延迟
        maxRetries: 3,
        skipOptimized: true
    };
    
    /**
     * 初始化批量优化器
     */
    static async init() {
        try {
            await this.loadSettings();
            this.setupEventListeners();
            console.log('✅ 批量优化器初始化成功');
        } catch (error) {
            console.error('❌ 批量优化器初始化失败:', error);
        }
    }
    
    /**
     * 开始批量优化
     * @param {Object} options - 批量优化选项
     */
    static async startBatchOptimization(options = {}) {
        if (this.isRunning) {
            throw new Error('批量优化正在进行中，请等待完成');
        }
        
        try {
            this.isRunning = true;
            this.processedCount = 0;
            
            // 合并设置
            const settings = { ...this.settings, ...options };
            
            // 获取产品列表
            const productList = await this.getProductList();
            if (!productList || productList.length === 0) {
                throw new Error('未找到可优化的产品列表');
            }
            
            this.currentQueue = productList;
            this.totalCount = productList.length;
            
            // 显示批量优化界面
            this.showBatchOptimizationUI();
            
            // 开始处理队列
            await this.processQueue(settings);
            
        } catch (error) {
            this.isRunning = false;
            console.error('批量优化启动失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取产品列表
     * @returns {Promise<Array>} 产品列表
     */
    static async getProductList() {
        try {
            // 检查当前页面类型
            const currentUrl = window.location.href;
            
            if (currentUrl.includes('/products') || currentUrl.includes('/catalog')) {
                // 产品列表页面
                return await this.getProductListFromCatalog();
            } else if (currentUrl.includes('/product/') || currentUrl.includes('/edit/')) {
                // 单个产品页面，获取相关产品或下一个产品
                return await this.getNextProductsFromCurrent();
            } else {
                throw new Error('当前页面不支持批量优化');
            }
        } catch (error) {
            console.error('获取产品列表失败:', error);
            return [];
        }
    }
    
    /**
     * 从目录页面获取产品列表
     * @returns {Promise<Array>} 产品列表
     */
    static async getProductListFromCatalog() {
        const productSelectors = [
            '.product-item a[href*="/product/"]',
            '.product-card a[href*="/edit/"]',
            'tr[data-product-id] a',
            '.product-row a[href*="/product/"]'
        ];
        
        const productLinks = [];
        
        for (const selector of productSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(link => {
                    const href = link.href;
                    const title = link.textContent?.trim() || link.title || '未知产品';
                    const productId = this.extractProductId(href);
                    
                    if (productId && !productLinks.find(p => p.id === productId)) {
                        productLinks.push({
                            id: productId,
                            url: href,
                            title: title,
                            status: 'pending'
                        });
                    }
                });
                break; // 找到产品就停止
            }
        }
        
        return productLinks;
    }
    
    /**
     * 从当前产品页面获取下一个产品
     * @returns {Promise<Array>} 产品列表
     */
    static async getNextProductsFromCurrent() {
        const nextProductSelectors = [
            '.next-product a',
            '.product-navigation .next a',
            'a[href*="/product/"]:contains("下一个")',
            '.pagination .next a',
            '.product-list-item:not(.current) + .product-list-item a'
        ];
        
        const products = [];
        const currentProductId = this.extractProductId(window.location.href);
        
        // 查找下一个产品链接
        for (const selector of nextProductSelectors) {
            const nextLink = await window.DOMUtils?.findElementBySelectors([selector]);
            if (nextLink) {
                const href = nextLink.href;
                const title = nextLink.textContent?.trim() || '下一个产品';
                const productId = this.extractProductId(href);
                
                if (productId && productId !== currentProductId) {
                    products.push({
                        id: productId,
                        url: href,
                        title: title,
                        status: 'pending'
                    });
                    break;
                }
            }
        }
        
        // 如果没找到下一个产品，尝试从产品列表获取
        if (products.length === 0) {
            const allProducts = await this.getAllProductsFromPage();
            const currentIndex = allProducts.findIndex(p => p.id === currentProductId);
            if (currentIndex >= 0 && currentIndex < allProducts.length - 1) {
                products.push(allProducts[currentIndex + 1]);
            }
        }
        
        return products;
    }
    
    /**
     * 从页面获取所有产品
     * @returns {Promise<Array>} 产品列表
     */
    static async getAllProductsFromPage() {
        // 尝试从侧边栏或导航中获取产品列表
        const sidebarSelectors = [
            '.sidebar .product-list a',
            '.product-navigation a',
            '.product-menu a[href*="/product/"]'
        ];
        
        const products = [];
        
        for (const selector of sidebarSelectors) {
            const links = document.querySelectorAll(selector);
            if (links.length > 0) {
                links.forEach(link => {
                    const href = link.href;
                    const title = link.textContent?.trim() || '产品';
                    const productId = this.extractProductId(href);
                    
                    if (productId && !products.find(p => p.id === productId)) {
                        products.push({
                            id: productId,
                            url: href,
                            title: title,
                            status: 'pending'
                        });
                    }
                });
                break;
            }
        }
        
        return products;
    }
    
    /**
     * 处理优化队列
     * @param {Object} settings - 设置
     */
    static async processQueue(settings) {
        try {
            while (this.currentQueue.length > 0 && this.isRunning) {
                const currentProduct = this.currentQueue.shift();
                
                try {
                    // 更新UI状态
                    this.updateBatchUI(currentProduct, 'processing');
                    
                    // 检查是否需要跳过已优化的产品
                    if (settings.skipOptimized && await this.isProductOptimized(currentProduct)) {
                        console.log(`⏭️ 跳过已优化的产品: ${currentProduct.title}`);
                        this.updateBatchUI(currentProduct, 'skipped');
                        this.processedCount++;
                        continue;
                    }
                    
                    // 导航到产品页面（如果需要）
                    if (settings.autoNavigate && window.location.href !== currentProduct.url) {
                        await this.navigateToProduct(currentProduct.url);
                        // 等待页面加载
                        await this.waitForPageLoad();
                    }
                    
                    // 执行产品优化
                    await this.optimizeCurrentProduct(currentProduct);
                    
                    // 更新状态
                    this.updateBatchUI(currentProduct, 'completed');
                    this.processedCount++;
                    
                    // 延迟处理下一个产品
                    if (this.currentQueue.length > 0) {
                        await this.delay(settings.delayBetweenProducts);
                    }
                    
                } catch (error) {
                    console.error(`优化产品失败: ${currentProduct.title}`, error);
                    this.updateBatchUI(currentProduct, 'failed');
                    
                    // 重试逻辑
                    if (currentProduct.retries < settings.maxRetries) {
                        currentProduct.retries = (currentProduct.retries || 0) + 1;
                        this.currentQueue.unshift(currentProduct); // 重新加入队列开头
                        console.log(`🔄 重试产品: ${currentProduct.title} (${currentProduct.retries}/${settings.maxRetries})`);
                    }
                }
            }
            
            // 批量优化完成
            this.completeBatchOptimization();
            
        } catch (error) {
            console.error('处理优化队列失败:', error);
            this.stopBatchOptimization();
        }
    }
    
    /**
     * 优化当前产品
     * @param {Object} product - 产品信息
     */
    static async optimizeCurrentProduct(product) {
        if (!window.ProductOptimizer) {
            throw new Error('ProductOptimizer 模块未加载');
        }
        
        // 调用产品优化器
        const result = await window.ProductOptimizer.optimizeProduct({
            autoApply: true,
            skipPreview: true
        });
        
        if (!result.success) {
            throw new Error(result.error || '产品优化失败');
        }
        
        // 保存优化记录
        product.optimizationResult = result.data;
        product.optimizedAt = new Date().toISOString();
        
        return result;
    }
    
    /**
     * 检查产品是否已优化
     * @param {Object} product - 产品信息
     * @returns {Promise<boolean>} 是否已优化
     */
    static async isProductOptimized(product) {
        try {
            // 检查优化历史记录
            const history = window.ProductOptimizer?.getOptimizationHistory() || [];
            const recentOptimization = history.find(record => {
                const recordTime = new Date(record.timestamp);
                const daysDiff = (Date.now() - recordTime.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff < 7; // 7天内的优化记录
            });
            
            return !!recentOptimization;
        } catch (error) {
            console.error('检查产品优化状态失败:', error);
            return false;
        }
    }
    
    /**
     * 导航到产品页面
     * @param {string} url - 产品URL
     */
    static async navigateToProduct(url) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('页面导航超时'));
            }, 30000);
            
            const handleLoad = () => {
                clearTimeout(timeout);
                window.removeEventListener('load', handleLoad);
                resolve();
            };
            
            window.addEventListener('load', handleLoad);
            window.location.href = url;
        });
    }
    
    /**
     * 等待页面加载完成
     */
    static async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                const handleLoad = () => {
                    document.removeEventListener('readystatechange', handleLoad);
                    resolve();
                };
                document.addEventListener('readystatechange', handleLoad);
            }
        });
    }
    
    /**
     * 显示批量优化UI
     */
    static showBatchOptimizationUI() {
        if (!window.UIComponents) return;
        
        const content = `
            <div class="batch-optimizer-panel">
                <div class="batch-header">
                    <h3>批量优化进度</h3>
                    <div class="batch-stats">
                        <span class="processed-count">${this.processedCount}</span> / 
                        <span class="total-count">${this.totalCount}</span>
                    </div>
                </div>
                <div class="batch-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">准备开始...</div>
                </div>
                <div class="batch-product-list">
                    ${this.currentQueue.map(product => `
                        <div class="batch-product-item" data-product-id="${product.id}">
                            <span class="product-title">${product.title}</span>
                            <span class="product-status status-pending">等待中</span>
                        </div>
                    `).join('')}
                </div>
                <div class="batch-controls">
                    <button class="ozon-btn ozon-btn-secondary" onclick="window.BatchOptimizer.pauseBatchOptimization()">暂停</button>
                    <button class="ozon-btn ozon-btn-danger" onclick="window.BatchOptimizer.stopBatchOptimization()">停止</button>
                </div>
            </div>
        `;
        
        window.UIComponents.createModal({
            title: '批量优化',
            content: content,
            closable: false,
            className: 'batch-optimizer-modal'
        });
    }
    
    /**
     * 更新批量优化UI
     * @param {Object} product - 产品信息
     * @param {string} status - 状态
     */
    static updateBatchUI(product, status) {
        const productItem = document.querySelector(`[data-product-id="${product.id}"]`);
        if (productItem) {
            const statusElement = productItem.querySelector('.product-status');
            statusElement.className = `product-status status-${status}`;
            
            const statusText = {
                'pending': '等待中',
                'processing': '优化中...',
                'completed': '已完成',
                'failed': '失败',
                'skipped': '已跳过'
            };
            
            statusElement.textContent = statusText[status] || status;
        }
        
        // 更新进度条
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const processedCountEl = document.querySelector('.processed-count');
        
        if (progressFill && progressText && processedCountEl) {
            const progress = (this.processedCount / this.totalCount) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `正在处理: ${product.title}`;
            processedCountEl.textContent = this.processedCount;
        }
    }
    
    /**
     * 暂停批量优化
     */
    static pauseBatchOptimization() {
        this.isRunning = false;
        console.log('⏸️ 批量优化已暂停');
        
        if (window.UIComponents) {
            window.UIComponents.showNotification({
                title: '批量优化已暂停',
                message: '您可以稍后继续优化',
                type: 'info'
            });
        }
    }
    
    /**
     * 停止批量优化
     */
    static stopBatchOptimization() {
        this.isRunning = false;
        this.currentQueue = [];
        console.log('⏹️ 批量优化已停止');
        
        if (window.UIComponents) {
            window.UIComponents.removeComponent('batchOptimizerModal');
            window.UIComponents.showNotification({
                title: '批量优化已停止',
                message: '优化过程已终止',
                type: 'warning'
            });
        }
    }
    
    /**
     * 完成批量优化
     */
    static completeBatchOptimization() {
        this.isRunning = false;
        console.log('✅ 批量优化完成');
        
        if (window.UIComponents) {
            window.UIComponents.showNotification({
                title: '批量优化完成',
                message: `成功优化了 ${this.processedCount} 个产品`,
                type: 'success',
                duration: 10000
            });
            
            // 延迟关闭模态框
            setTimeout(() => {
                window.UIComponents.removeComponent('batchOptimizerModal');
            }, 3000);
        }
    }
    
    /**
     * 提取产品ID
     * @param {string} url - 产品URL
     * @returns {string|null} 产品ID
     */
    static extractProductId(url) {
        const matches = url.match(/\/product\/(\d+)|\/edit\/(\d+)|id=(\d+)/);
        return matches ? (matches[1] || matches[2] || matches[3]) : null;
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 设置事件监听器
     */
    static setupEventListeners() {
        // 监听配置变更
        if (window.ConfigManager && window.ConfigManager.addListener) {
            window.ConfigManager.addListener((event, data) => {
                if (event === 'configChanged' && data && data.batch) {
                    this.settings = { ...this.settings, ...data.batch };
                }
            });
        }
    }
    
    /**
     * 加载设置
     */
    static async loadSettings() {
        try {
            const config = await window.ConfigManager?.getAll() || {};
            if (config.batch) {
                this.settings = { ...this.settings, ...config.batch };
            }
        } catch (error) {
            console.error('加载批量优化设置失败:', error);
        }
    }
    
    /**
     * 保存设置
     */
    static async saveSettings() {
        try {
            if (window.ConfigManager) {
                await window.ConfigManager.set('batch', this.settings);
            }
        } catch (error) {
            console.error('保存批量优化设置失败:', error);
        }
    }
    
    /**
     * 获取批量优化统计
     */
    static getStats() {
        return {
            isRunning: this.isRunning,
            processedCount: this.processedCount,
            totalCount: this.totalCount,
            remainingCount: this.currentQueue.length,
            settings: this.settings
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchOptimizer;
} else if (typeof window !== 'undefined') {
    window.BatchOptimizer = BatchOptimizer;
}