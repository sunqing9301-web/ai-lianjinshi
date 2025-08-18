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
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('erp.91miaoshou.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleFloatingBtn',
                    show: this.checked
                });
            }
        }.bind(this));
    });
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
function loadSettings() {
    chrome.storage.local.get([
        'apiPlatform',
        'deepseekApiKey',
        'tongyiApiKey',
        'bailianApiKey',
        'configuration',
        'manufacturer',
        'packageQuantity',
        'targetAudience',
        'showFloatingBtn',
        'enableImageOptimization',
        'imageOptimizationType',
        'targetImageSize',
        'imageQuality'
    ], function(result) {
        // 设置AI平台
        document.getElementById('apiPlatform').value = result.apiPlatform || 'deepseek';
        
        // 设置API Keys
        document.getElementById('deepseekApiKey').value = result.deepseekApiKey || '';
        document.getElementById('tongyiApiKey').value = result.tongyiApiKey || '';
        document.getElementById('bailianApiKey').value = result.bailianApiKey || '';
        
        // 设置预设属性
        document.getElementById('configuration').value = result.configuration || '';
        document.getElementById('manufacturer').value = result.manufacturer || '中国';
        document.getElementById('packageQuantity').value = result.packageQuantity || '';
        document.getElementById('targetAudience').value = result.targetAudience || '';
        
        // 设置悬浮按钮显示状态
        document.getElementById('showFloatingBtn').checked = result.showFloatingBtn !== false;
        
        // 设置图片优化选项
        document.getElementById('enableImageOptimization').checked = result.enableImageOptimization !== false;
        document.getElementById('imageOptimizationType').value = result.imageOptimizationType || 'smart_ecommerce';
        document.getElementById('targetImageSize').value = result.targetImageSize || '1000x1000';
        document.getElementById('imageQuality').value = result.imageQuality || 'high';
        
        // 切换API设置区域显示
        toggleApiSection();
    });
}

function saveSettings() {
    const showFloatingBtn = document.getElementById('showFloatingBtn').checked;
    const apiPlatform = document.getElementById('apiPlatform').value;
    const deepseekApiKey = document.getElementById('deepseekApiKey').value.trim();
    const tongyiApiKey = document.getElementById('tongyiApiKey').value.trim();
    const bailianApiKey = document.getElementById('bailianApiKey').value.trim();
    const configuration = document.getElementById('configuration').value.trim();
    const manufacturer = document.getElementById('manufacturer').value;
    const packageQuantity = document.getElementById('packageQuantity').value;
    const targetAudience = document.getElementById('targetAudience').value.trim();
    const enableImageOptimization = document.getElementById('enableImageOptimization').checked;
    const imageOptimizationType = document.getElementById('imageOptimizationType').value;
    const targetImageSize = document.getElementById('targetImageSize').value;
    const imageQuality = document.getElementById('imageQuality').value;
    
    // 验证API Key
    if (apiPlatform === 'deepseek' && !deepseekApiKey) {
        showStatus('请输入DeepSeek API Key', 'error');
        return;
    }
    
    if (apiPlatform === 'tongyi' && !tongyiApiKey) {
        showStatus('请输入通义千问 API Key', 'error');
        return;
    }
    
    if (apiPlatform === 'bailian' && !bailianApiKey) {
        showStatus('请输入百炼 API Key', 'error');
        return;
    }
    
    // 保存到chrome.storage
    chrome.storage.local.set({
        showFloatingBtn: showFloatingBtn,
        apiPlatform: apiPlatform,
        deepseekApiKey: deepseekApiKey,
        tongyiApiKey: tongyiApiKey,
        bailianApiKey: bailianApiKey,
        configuration: configuration,
        manufacturer: manufacturer,
        packageQuantity: packageQuantity,
        targetAudience: targetAudience,
        enableImageOptimization: enableImageOptimization,
        imageOptimizationType: imageOptimizationType,
        targetImageSize: targetImageSize,
        imageQuality: imageQuality
    }, function() {
        if (chrome.runtime.lastError) {
            showStatus('保存失败: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('设置已保存成功！', 'success');
        }
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}
 