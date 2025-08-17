/**
 * 配置管理模块 - 统一管理扩展的所有配置项
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class ConfigManager {
    static defaultConfig = {
        // API配置
        apiPlatform: 'deepseek',
        deepseekApiKey: '',
        tongyiApiKey: '',
        bailianApiKey: '',
        
        // 预设属性
        presetAttributes: {
            brand: '',
            category: '',
            material: '',
            color: '',
            size: '',
            weight: '',
            features: ''
        },
        
        // UI配置
        showFloatingButton: true,
        floatingButtonPosition: { x: 20, y: 100 },
        
        // 优化配置
        enableImageOptimization: true,
        optimizationTimeout: 30000,
        maxRetries: 3,
        
        // 调试配置
        debugMode: false,
        enablePerformanceMonitoring: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        
        // 缓存配置
        enableCache: true,
        cacheExpiration: 3600000, // 1小时
        maxCacheSize: 100,
        
        // 高级配置
        autoSave: true,
        autoSaveInterval: 5000,
        enableNotifications: true,
        notificationDuration: 3000,
        
        // 语言配置
        language: 'zh-CN',
        
        // 版本信息
        version: '1.0.87',
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
            const result = await chrome.storage.sync.get(null);
            this.configCache = { ...this.defaultConfig, ...result };
            
            // 更新最后加载时间
            this.configCache.lastUpdated = Date.now();
            
            // 验证配置完整性
            this.validateConfig();
            
            return this.configCache;
        } catch (error) {
            console.error('加载配置失败:', error);
            this.configCache = { ...this.defaultConfig };
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
                // 合并配置
                this.configCache = { ...this.configCache, ...config };
                configToSave = this.configCache;
            } else {
                // 完全替换
                configToSave = { ...this.defaultConfig, ...config };
                this.configCache = configToSave;
            }
            
            // 更新时间戳
            configToSave.lastUpdated = Date.now();
            
            // 验证配置
            this.validateConfig(configToSave);
            
            // 保存到存储
            await chrome.storage.sync.set(configToSave);
            
            // 通知监听器
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
    static get(key, defaultValue = null) {
        if (!this.configCache) {
            console.warn('配置未加载，返回默认值');
            return this.getDefault(key, defaultValue);
        }
        
        // 支持点号分隔的嵌套键
        const keys = key.split('.');
        let value = this.configCache;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue !== null ? defaultValue : this.getDefault(key, null);
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
        
        // 支持点号分隔的嵌套键
        const keys = key.split('.');
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
        this.notifyListeners('configChanged', { key, value, oldValue });
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
        
        // 验证API平台
        const validPlatforms = ['deepseek', 'tongyi', 'bailian'];
        if (!validPlatforms.includes(config.apiPlatform)) {
            config.apiPlatform = this.defaultConfig.apiPlatform;
        }
        
        // 验证数值范围
        if (config.optimizationTimeout < 5000 || config.optimizationTimeout > 120000) {
            config.optimizationTimeout = this.defaultConfig.optimizationTimeout;
        }
        
        if (config.maxRetries < 1 || config.maxRetries > 10) {
            config.maxRetries = this.defaultConfig.maxRetries;
        }
        
        // 验证日志级别
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(config.logLevel)) {
            config.logLevel = this.defaultConfig.logLevel;
        }
        
        // 确保预设属性对象存在
        if (!config.presetAttributes || typeof config.presetAttributes !== 'object') {
            config.presetAttributes = { ...this.defaultConfig.presetAttributes };
        }
        
        // 确保悬浮按钮位置对象存在
        if (!config.floatingButtonPosition || typeof config.floatingButtonPosition !== 'object') {
            config.floatingButtonPosition = { ...this.defaultConfig.floatingButtonPosition };
        }
    }
    
    /**
     * 导出配置
     * @param {boolean} includeSecrets - 是否包含敏感信息
     * @returns {Object} 配置对象
     */
    static exportConfig(includeSecrets = false) {
        const config = { ...this.configCache };
        
        if (!includeSecrets) {
            // 移除敏感信息
            delete config.deepseekApiKey;
            delete config.tongyiApiKey;
            delete config.bailianApiKey;
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
    static addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.add(listener);
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
                if (namespace === 'sync') {
                    // 更新缓存
                    for (const [key, { newValue }] of Object.entries(changes)) {
                        if (this.configCache) {
                            this.configCache[key] = newValue;
                        }
                    }
                    
                    this.notifyListeners('storageChanged', changes);
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
            apiPlatform: this.configCache.apiPlatform,
            hasApiKey: !!(this.configCache[`${this.configCache.apiPlatform}ApiKey`]),
            debugMode: this.configCache.debugMode,
            cacheEnabled: this.configCache.enableCache,
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
        const platform = this.configCache.apiPlatform;
        const apiKey = this.configCache[`${platform}ApiKey`];
        if (!apiKey) {
            issues.push(`${platform} API密钥未配置`);
        }
        
        // 检查版本兼容性
        if (this.configCache.version !== this.defaultConfig.version) {
            warnings.push('配置版本与当前版本不匹配');
        }
        
        // 检查必要配置项
        const requiredKeys = ['apiPlatform', 'presetAttributes', 'floatingButtonPosition'];
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
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
} else if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
}