/**
 * 配置管理模块 - 统一管理扩展的所有配置项
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class ConfigManager {
    static defaultConfig = {
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
            showFloatingButton: true,
            floatingButtonPosition: { x: 20, y: 100 }
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
            imageQuality: 'high',
            optimizationTimeout: 30000
        },
        debug: {
            debugMode: false,
            enablePerformanceMonitoring: false,
            logLevel: 'info'
        },
        cache: {
            enableCache: true,
            cacheExpiration: 3600000,
            maxCacheSize: 100
        },
        language: 'zh-CN',
        version: '2.0.15',
        lastUpdated: null
    };
    
    static configCache = null;
    static listeners = new Set();
    
    /**
     * 初始化配置管理器
     */
    static async init() {
        try {
            await this.loadConfig();
            this.setupStorageListener();
            console.log('✅ 配置管理器初始化成功');
        } catch (error) {
            console.error('❌ 配置管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载配置
     * @returns {Promise<Object>} 配置对象
     */
    static async loadConfig() {
        try {
            // 读取 local 中的嵌套配置
            const result = await chrome.storage.local.get('ozonOptimizerConfig');
            let config = result.ozonOptimizerConfig;
            
            // 如果不存在，尝试从旧的 sync 扁平结构迁移
            if (!config) {
                const legacy = await chrome.storage.sync.get(null).catch(() => ({}));
                config = this.migrateLegacyToNested(legacy || {});
                // 写回 local
                await chrome.storage.local.set({ ozonOptimizerConfig: config });
            }
            
            // 合并默认值
            this.configCache = this.mergeDeep(structuredClone(this.defaultConfig), config || {});
            this.configCache.lastUpdated = Date.now();
            
            // 验证配置完整性
            this.validateConfig();
            
            return this.configCache;
        } catch (error) {
            console.error('加载配置失败:', error);
            this.configCache = structuredClone(this.defaultConfig);
            return this.configCache;
        }
    }
    
    /**
     * 保存配置
     * @param {Object} config - 要保存的配置
     * @param {boolean} merge - 是否合并现有配置
     * @returns {Promise<void>}
     */
    static async saveConfig(config, merge = true) {
        try {
            let configToSave;
            
            if (merge) {
                this.configCache = this.mergeDeep(structuredClone(this.configCache || {}), config);
                configToSave = this.configCache;
            } else {
                configToSave = this.mergeDeep(structuredClone(this.defaultConfig), config);
                this.configCache = configToSave;
            }
            
            configToSave.lastUpdated = Date.now();
            this.validateConfig(configToSave);
            
            await chrome.storage.local.set({ ozonOptimizerConfig: configToSave });
            
            this.notifyListeners('configSaved', configToSave);
            console.log('✅ 配置保存成功');
        } catch (error) {
            console.error('❌ 配置保存失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取配置项
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    static get(key = null, defaultValue = null) {
        if (!this.configCache) {
            console.warn('配置未加载，返回默认值');
            if (key === null) return structuredClone(this.defaultConfig);
            return this.getDefault(key, defaultValue);
        }
        if (key === null) {
            return structuredClone(this.configCache);
        }
        
        // 兼容旧扁平键名到新结构
        const alias = {
            'apiPlatform': 'api.platform',
            'deepseekApiKey': 'api.deepseek.apiKey',
            'tongyiApiKey': 'api.tongyi.apiKey',
            'bailianApiKey': 'api.bailian.apiKey',
            'showFloatingButton': 'ui.showFloatingButton',
            'floatingButtonPosition': 'ui.floatingButtonPosition',
            'batchOptimization': 'batch'
        };
        const path = alias[key] || key;
        
        const keys = path.split('.');
        let value = this.configCache;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue !== null ? defaultValue : this.getDefault(path, null);
            }
        }
        return value;
    }
    
    /**
     * 设置配置项
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     * @param {boolean} save - 是否立即保存
     * @returns {Promise<void>}
     */
    static async set(key, value, save = true) {
        if (!this.configCache) {
            await this.loadConfig();
        }
        
        const alias = {
            'apiPlatform': 'api.platform',
            'deepseekApiKey': 'api.deepseek.apiKey',
            'tongyiApiKey': 'api.tongyi.apiKey',
            'bailianApiKey': 'api.bailian.apiKey',
            'showFloatingButton': 'ui.showFloatingButton',
            'floatingButtonPosition': 'ui.floatingButtonPosition',
            'batchOptimization': 'batch'
        };
        const path = alias[key] || key;
        
        const keys = path.split('.');
        let target = this.configCache;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        const lastKey = keys[keys.length - 1];
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        if (save) {
            await this.saveConfig(this.configCache, false);
        }
        
        // 通知监听器
        this.notifyListeners('configChanged', { key: path, value, oldValue });
    }
    
    /**
     * 获取默认配置值
     * @param {string} key - 配置键
     * @param {*} fallback - 回退值
     * @returns {*} 默认值
     */
    static getDefault(key, fallback = null) {
        const keys = key.split('.');
        let value = this.defaultConfig;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return fallback;
            }
        }
        
        return value;
    }
    
    /**
     * 重置配置到默认值
     * @param {string[]} keys - 要重置的键（可选）
     * @returns {Promise<void>}
     */
    static async reset(keys = null) {
        try {
            if (keys && Array.isArray(keys)) {
                // 重置指定键
                for (const key of keys) {
                    const defaultValue = this.getDefault(key);
                    await this.set(key, defaultValue, false);
                }
                await this.saveConfig(this.configCache, false);
            } else {
                // 重置所有配置
                await this.saveConfig(this.defaultConfig, false);
            }
            
            console.log('✅ 配置重置成功');
            this.notifyListeners('configReset', keys);
        } catch (error) {
            console.error('❌ 配置重置失败:', error);
            throw error;
        }
    }
    
    /**
     * 验证配置完整性
     * @param {Object} config - 要验证的配置
     */
    static validateConfig(config = this.configCache) {
        if (!config) return;
        
        const validPlatforms = ['deepseek', 'tongyi', 'bailian'];
        if (!validPlatforms.includes(config.api?.platform)) {
            config.api.platform = this.defaultConfig.api.platform;
        }
        
        // 数值与范围
        if (!config.optimization) config.optimization = {};
        if (config.optimization.optimizationTimeout < 5000 || config.optimization.optimizationTimeout > 120000) {
            config.optimization.optimizationTimeout = this.defaultConfig.optimization.optimizationTimeout;
        }
        if (!config.batch) config.batch = {};
        if (config.batch.maxRetries < 1 || config.batch.maxRetries > 10) {
            config.batch.maxRetries = this.defaultConfig.batch.maxRetries;
        }
        if (typeof config.batch.delayBetweenProducts !== 'number' || config.batch.delayBetweenProducts < 500) {
            config.batch.delayBetweenProducts = this.defaultConfig.batch.delayBetweenProducts;
        }
        
        // 日志级别
        if (!config.debug) config.debug = {};
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(config.debug.logLevel)) {
            config.debug.logLevel = this.defaultConfig.debug.logLevel;
        }
        
        if (!config.ui) config.ui = {};
        if (!config.ui.floatingButtonPosition || typeof config.ui.floatingButtonPosition !== 'object') {
            config.ui.floatingButtonPosition = { ...this.defaultConfig.ui.floatingButtonPosition };
        }
    }
    
    /**
     * 导出配置
     * @param {boolean} includeSecrets - 是否包含敏感信息
     * @returns {Object} 配置对象
     */
    static exportConfig(includeSecrets = false) {
        const config = structuredClone(this.configCache || this.defaultConfig);
        if (!includeSecrets) {
            if (config.api?.deepseek) config.api.deepseek.apiKey = '';
            if (config.api?.tongyi) config.api.tongyi.apiKey = '';
            if (config.api?.bailian) config.api.bailian.apiKey = '';
        }
        return config;
    }
    
    /**
     * 导入配置
     * @param {Object} config - 要导入的配置
     * @param {boolean} merge - 是否合并现有配置
     * @returns {Promise<void>}
     */
    static async importConfig(config, merge = true) {
        try {
            // 验证导入的配置
            if (!config || typeof config !== 'object') {
                throw new Error('无效的配置格式');
            }
            
            await this.saveConfig(config, merge);
            console.log('✅ 配置导入成功');
            this.notifyListeners('configImported', config);
        } catch (error) {
            console.error('❌ 配置导入失败:', error);
            throw error;
        }
    }
    
    /**
     * 添加配置变更监听器
     * @param {Function} listener - 监听器函数
     */
    static addListener(eventOrListener, maybeListener = null) {
        // 兼容两种签名：addListener(listener) 或 addListener(event, listener)
        if (typeof eventOrListener === 'function') {
            this.listeners.add(eventOrListener);
            return;
        }
        if (typeof maybeListener === 'function') {
            // 包裹一层，根据事件类型转发
            const wrapper = (event, data) => {
                if (event === eventOrListener) {
                    try { maybeListener(data); } catch (e) { console.error(e); }
                }
            };
            this.listeners.add(wrapper);
        }
    }
    
    /**
     * 移除配置变更监听器
     * @param {Function} listener - 监听器函数
     */
    static removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    /**
     * 通知所有监听器
     * @param {string} event - 事件类型
     * @param {*} data - 事件数据
     */
    static notifyListeners(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data);
            } catch (error) {
                console.error('监听器执行失败:', error);
            }
        }
    }
    
    /**
     * 设置存储变更监听器
     */
    static setupStorageListener() {
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.ozonOptimizerConfig) {
                    const newConfig = changes.ozonOptimizerConfig.newValue || {};
                    this.configCache = this.mergeDeep(structuredClone(this.defaultConfig), newConfig);
                    this.notifyListeners('configChanged', structuredClone(this.configCache));
                }
            });
        }
    }
    
    /**
     * 获取配置统计信息
     * @returns {Object} 统计信息
     */
    static getStats() {
        if (!this.configCache) {
            return { loaded: false };
        }
        
        return {
            loaded: true,
            version: this.configCache.version,
            lastUpdated: this.configCache.lastUpdated ? new Date(this.configCache.lastUpdated).toLocaleString() : '未知',
            apiPlatform: this.configCache.api?.platform,
            hasApiKey: !!(this.get('api.' + (this.configCache.api?.platform || 'deepseek') + '.apiKey')),
            debugMode: !!this.configCache.debug?.debugMode,
            cacheEnabled: !!this.configCache.cache?.enableCache,
            listenersCount: this.listeners.size
        };
    }
    
    /**
     * 检查配置是否完整
     * @returns {Object} 检查结果
     */
    static checkIntegrity() {
        const issues = [];
        const warnings = [];
        
        if (!this.configCache) {
            issues.push('配置未加载');
            return { valid: false, issues, warnings };
        }
        
        // 检查API密钥
        const platform = this.configCache.api?.platform || 'deepseek';
        const apiKey = this.get(`api.${platform}.apiKey`);
        if (!apiKey) {
            issues.push(`${platform} API密钥未配置`);
        }
        
        // 检查版本兼容性
        if (this.configCache.version !== this.defaultConfig.version) {
            warnings.push('配置版本与当前版本不匹配');
        }
        
        // 检查必要配置项
        const requiredKeys = ['api.platform', 'presets', 'ui.floatingButtonPosition'];
        for (const key of requiredKeys) {
            if (!(key in this.configCache)) {
                issues.push(`缺少必要配置项: ${key}`);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues,
            warnings
        };
    }

    static getAll() {
        return this.get(null);
    }

    // 深合并
    static mergeDeep(target, source) {
        if (typeof target !== 'object' || target === null) return source;
        if (typeof source !== 'object' || source === null) return target;
        for (const key of Object.keys(source)) {
            if (Array.isArray(source[key])) {
                target[key] = source[key].slice();
            } else if (typeof source[key] === 'object' && source[key] !== null) {
                target[key] = this.mergeDeep(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    // 旧扁平结构迁移到嵌套结构
    static migrateLegacyToNested(legacy) {
        if (!legacy || Object.keys(legacy).length === 0) {
            return structuredClone(this.defaultConfig);
        }
        const nested = structuredClone(this.defaultConfig);
        // API
        if (legacy.apiPlatform) nested.api.platform = legacy.apiPlatform;
        if (legacy.deepseekApiKey) nested.api.deepseek.apiKey = legacy.deepseekApiKey;
        if (legacy.tongyiApiKey) nested.api.tongyi.apiKey = legacy.tongyiApiKey;
        if (legacy.bailianApiKey) nested.api.bailian.apiKey = legacy.bailianApiKey;
        // UI
        if (typeof legacy.showFloatingButton === 'boolean') nested.ui.showFloatingButton = legacy.showFloatingButton;
        if (legacy.floatingButtonPosition) nested.ui.floatingButtonPosition = legacy.floatingButtonPosition;
        // 优化
        if (typeof legacy.enableImageOptimization === 'boolean') nested.optimization.enableImageOptimization = legacy.enableImageOptimization;
        if (legacy.optimizationTimeout) nested.optimization.optimizationTimeout = legacy.optimizationTimeout;
        if (legacy.maxRetries) nested.batch.maxRetries = legacy.maxRetries;
        // 预设属性 → 简化映射
        if (legacy.presetAttributes) {
            nested.presets.configuration = legacy.presetAttributes.features || '';
        }
        return nested;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
} else if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
}