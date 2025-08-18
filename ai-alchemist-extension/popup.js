console.log('AI炼金师 - 产品优化专家 popup v2.0.15 已加载');

// 全局变量
let currentConfig = {};
let isSaving = false;

document.addEventListener('DOMContentLoaded', function() {
    // 加载保存的设置
    loadSettings();
    
    // 保存按钮点击事件
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    
    // API平台选择事件
    document.getElementById('apiPlatform').addEventListener('change', toggleApiSection);
    
    // 悬浮按钮显示切换事件
    document.getElementById('showFloatingBtn').addEventListener('change', function() {
        // 立即发送消息到content script更新按钮显示状态
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const active = tabs && tabs[0];
            const url = active && active.url || '';
            const isTarget = /https:\/\/(erp\.91miaoshou\.com|.*\.ozon\.ru|seller\.ozon\.ru)\//.test(url);
            if (active && isTarget) {
                try {
                    chrome.tabs.sendMessage(active.id, {
                        action: 'configChanged',
                        config: { ui: { showFloatingButton: this.checked } }
                    }, () => void 0);
                } catch (error) {
                    console.warn('发送配置更新消息失败:', error);
                }
            }
        });
    });
    
    // 添加输入验证
    setupInputValidation();
    
    // 添加自动保存功能
    setupAutoSave();
});

function toggleApiSection() {
    const platform = document.getElementById('apiPlatform').value;
    const deepseekSection = document.getElementById('deepseekSection');
    const tongyiSection = document.getElementById('tongyiSection');
    const bailianSection = document.getElementById('bailianSection');
    
    // 隐藏所有section
    deepseekSection.style.display = 'none';
    tongyiSection.style.display = 'none';
    bailianSection.style.display = 'none';
    
    // 显示选中的section
    if (platform === 'deepseek') {
        deepseekSection.style.display = 'block';
    } else if (platform === 'tongyi') {
        tongyiSection.style.display = 'block';
    } else if (platform === 'bailian') {
        bailianSection.style.display = 'block';
    }
}

// 加载设置
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get('ozonOptimizerConfig');
        const config = result.ozonOptimizerConfig || {};
        currentConfig = config;
        
        // 设置AI平台
        document.getElementById('apiPlatform').value = config.api?.platform || 'deepseek';
        
        // 设置API Keys
        document.getElementById('deepseekApiKey').value = config.api?.deepseek?.apiKey || '';
        document.getElementById('tongyiApiKey').value = config.api?.tongyi?.apiKey || '';
        document.getElementById('bailianApiKey').value = config.api?.bailian?.apiKey || '';
        
        // 设置预设属性
        document.getElementById('configuration').value = config.presets?.configuration || '';
        document.getElementById('manufacturer').value = config.presets?.manufacturer || '中国';
        document.getElementById('packageQuantity').value = config.presets?.packageQuantity || '';
        document.getElementById('targetAudience').value = config.presets?.targetAudience || '';
        
        // 设置悬浮按钮显示状态
        document.getElementById('showFloatingBtn').checked = config.ui?.showFloatingButton !== false;
        
        // 设置批量优化选项
        document.getElementById('enableBatchOptimization').checked = config.batch?.enabled !== false;
        document.getElementById('autoNavigate').checked = config.batch?.autoNavigate !== false;
        document.getElementById('skipOptimized').checked = config.batch?.skipOptimized !== false;
        document.getElementById('delayBetweenProducts').value = (config.batch?.delayBetweenProducts || 3000) / 1000;
        document.getElementById('maxRetries').value = config.batch?.maxRetries || 3;
        
        // 设置图片优化选项
        document.getElementById('enableImageOptimization').checked = config.optimization?.enableImageOptimization !== false;
        document.getElementById('imageOptimizationType').value = config.optimization?.imageOptimizationType || 'smart_ecommerce';
        document.getElementById('targetImageSize').value = config.optimization?.targetImageSize || '1000x1000';
        document.getElementById('imageQuality').value = config.optimization?.imageQuality || 'high';
        
        // 切换API设置区域显示
        toggleApiSection();
        
        console.log('✅ 设置加载成功');
        
    } catch (error) {
        console.error('❌ 加载设置失败:', error);
        showStatus('加载设置失败，使用默认配置', 'error');
    }
}

async function saveSettings() {
    if (isSaving) {
        showStatus('正在保存中，请稍候...', 'info');
        return;
    }
    
    isSaving = true;
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;
    
    try {
        const apiPlatform = document.getElementById('apiPlatform').value;
        const deepseekApiKey = document.getElementById('deepseekApiKey').value.trim();
        const tongyiApiKey = document.getElementById('tongyiApiKey').value.trim();
        const bailianApiKey = document.getElementById('bailianApiKey').value.trim();
        
        // 验证API Key
        const validationErrors = [];
        
        if (apiPlatform === 'deepseek' && !deepseekApiKey) {
            validationErrors.push('请输入DeepSeek API Key');
        }
        
        if (apiPlatform === 'tongyi' && !tongyiApiKey) {
            validationErrors.push('请输入通义千问 API Key');
        }
        
        if (apiPlatform === 'bailian' && !bailianApiKey) {
            validationErrors.push('请输入百炼 API Key');
        }
        
        if (validationErrors.length > 0) {
            showStatus(validationErrors.join(', '), 'error');
            return;
        }
        
        // 构建配置对象
        const config = {
            api: {
                platform: apiPlatform,
                deepseek: { apiKey: deepseekApiKey },
                tongyi: { apiKey: tongyiApiKey },
                bailian: { apiKey: bailianApiKey }
            },
            presets: {
                configuration: document.getElementById('configuration').value.trim(),
                manufacturer: document.getElementById('manufacturer').value,
                packageQuantity: document.getElementById('packageQuantity').value,
                targetAudience: document.getElementById('targetAudience').value.trim()
            },
            ui: {
                showFloatingButton: document.getElementById('showFloatingBtn').checked
            },
            batch: {
                enabled: document.getElementById('enableBatchOptimization').checked,
                autoNavigate: document.getElementById('autoNavigate').checked,
                skipOptimized: document.getElementById('skipOptimized').checked,
                delayBetweenProducts: parseInt(document.getElementById('delayBetweenProducts').value) * 1000,
                maxRetries: parseInt(document.getElementById('maxRetries').value)
            },
            optimization: {
                enableImageOptimization: document.getElementById('enableImageOptimization').checked,
                imageOptimizationType: document.getElementById('imageOptimizationType').value,
                targetImageSize: document.getElementById('targetImageSize').value,
                imageQuality: document.getElementById('imageQuality').value
            }
        };
        
        // 保存到chrome.storage
        await chrome.storage.local.set({ ozonOptimizerConfig: config });
        
        currentConfig = config;
        showStatus('设置已保存成功！', 'success');
        
        // 通知content script配置已更新
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const active = tabs && tabs[0];
            const url = active && active.url || '';
            const isTarget = /https:\/\/(erp\.91miaoshou\.com|.*\.ozon\.ru|seller\.ozon\.ru)\//.test(url);
            if (active && isTarget) {
                try {
                    chrome.tabs.sendMessage(active.id, {
                        action: 'configChanged',
                        config: config
                    }, () => void 0);
                } catch (error) {
                    console.warn('通知content script失败:', error);
                }
            }
        });
        
    } catch (error) {
        console.error('保存设置失败:', error);
        showStatus('保存失败: ' + error.message, 'error');
    } finally {
        isSaving = false;
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

function setupInputValidation() {
    // API Key输入验证
    const apiKeyInputs = ['deepseekApiKey', 'tongyiApiKey', 'bailianApiKey'];
    apiKeyInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function() {
                const value = this.value.trim();
                if (value && value.length < 10) {
                    this.style.borderColor = '#ff4444';
                    this.title = 'API Key长度不足';
                } else {
                    this.style.borderColor = '';
                    this.title = '';
                }
            });
        }
    });
    
    // 数字输入验证
    const numberInputs = ['packageQuantity', 'delayBetweenProducts', 'maxRetries'];
    numberInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function() {
                const value = parseInt(this.value);
                const min = parseInt(this.min) || 0;
                const max = parseInt(this.max) || 999;
                
                if (value < min || value > max) {
                    this.style.borderColor = '#ff4444';
                    this.title = `请输入 ${min}-${max} 之间的数字`;
                } else {
                    this.style.borderColor = '';
                    this.title = '';
                }
            });
        }
    });
}

function setupAutoSave() {
    // 延迟自动保存
    let autoSaveTimeout = null;
    const autoSaveDelay = 2000; // 2秒延迟
    
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            // 清除之前的定时器
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }
            
            // 设置新的定时器
            autoSaveTimeout = setTimeout(() => {
                autoSave();
            }, autoSaveDelay);
        });
    });
}

async function autoSave() {
    try {
        // 读取现有配置，合并非敏感字段并保留 API Key
        const existing = (await chrome.storage.local.get('ozonOptimizerConfig')).ozonOptimizerConfig || {};
        const merged = {
            ...existing,
            api: {
                ...(existing.api || {}),
                platform: document.getElementById('apiPlatform').value,
                // 保留已保存的密钥，不在自动保存中覆盖
                deepseek: existing.api?.deepseek || { apiKey: '' },
                tongyi: existing.api?.tongyi || { apiKey: '' },
                bailian: existing.api?.bailian || { apiKey: '' }
            },
            presets: {
                configuration: document.getElementById('configuration').value.trim(),
                manufacturer: document.getElementById('manufacturer').value,
                packageQuantity: document.getElementById('packageQuantity').value,
                targetAudience: document.getElementById('targetAudience').value.trim()
            },
            ui: {
                showFloatingButton: document.getElementById('showFloatingBtn').checked
            },
            batch: {
                enabled: document.getElementById('enableBatchOptimization').checked,
                autoNavigate: document.getElementById('autoNavigate').checked,
                skipOptimized: document.getElementById('skipOptimized').checked,
                delayBetweenProducts: parseInt(document.getElementById('delayBetweenProducts').value) * 1000,
                maxRetries: parseInt(document.getElementById('maxRetries').value)
            },
            optimization: {
                enableImageOptimization: document.getElementById('enableImageOptimization').checked,
                imageOptimizationType: document.getElementById('imageOptimizationType').value,
                targetImageSize: document.getElementById('targetImageSize').value,
                imageQuality: document.getElementById('imageQuality').value
            }
        };

        await chrome.storage.local.set({ ozonOptimizerConfig: merged });
        console.log('✅ 配置已自动保存（保留API Key）');
        
    } catch (error) {
        console.warn('自动保存失败:', error);
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // 根据类型设置不同的自动隐藏时间
    const hideDelay = type === 'error' ? 5000 : 3000;
    
    // 清除之前的定时器
    if (statusDiv.hideTimeout) {
        clearTimeout(statusDiv.hideTimeout);
    }
    
    // 设置新的定时器
    statusDiv.hideTimeout = setTimeout(() => {
        statusDiv.style.display = 'none';
    }, hideDelay);
}

// 导出函数供外部使用
window.ozonOptimizerPopup = {
    loadSettings,
    saveSettings,
    showStatus,
    toggleApiSection
};
 