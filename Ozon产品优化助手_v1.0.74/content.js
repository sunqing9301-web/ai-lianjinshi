console.log('【唯一标记】20240708-终极兼容调试');
console.log('content.js loaded');

let floatingBtn = null; // 全局变量存储悬浮按钮引用
let dragOffset = { x: 0, y: 0 }; // 存储拖拽偏移量
let isOptimizing = false; // 是否正在优化中
let progressIndicator = null; // 进度指示器
let isDragging = false; // 是否正在拖拽中

// 1. 初始化时从chrome.storage.local加载缓存
let aiResultCache = {};
chrome.storage && chrome.storage.local.get('aiResultCache', (data) => {
    if (data && data.aiResultCache) {
        aiResultCache = data.aiResultCache;
        console.log('已从chrome.storage.local加载AI结果缓存', aiResultCache);
    }
});

// 2. 写缓存时同步到chrome.storage.local
function setAiResultCache(key, value) {
    aiResultCache[key] = value;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ aiResultCache }, () => {
            console.log('AI结果缓存已写入chrome.storage.local', key);
        });
    }
}

// 3. 读缓存时优先内存，没有则从chrome.storage.local读
async function getAiResultCache(key) {
    if (aiResultCache[key]) return aiResultCache[key];
    return new Promise((resolve) => {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('aiResultCache', (data) => {
                if (data && data.aiResultCache && data.aiResultCache[key]) {
                    aiResultCache[key] = data.aiResultCache[key];
                    resolve(aiResultCache[key]);
                } else {
                    resolve(undefined);
                }
            });
        } else {
            resolve(undefined);
        }
    });
}

// 2. 获取当前产品唯一标识（以产品URL为key）
function getCurrentProductKey() {
    // 1. 优先从来源URL提取
    let sourceUrl = '';
    // 先尝试标准input
    const urlInput = document.querySelector('input[name="sourceUrl"]');
    if (urlInput && urlInput.value) sourceUrl = urlInput.value;
    // 再尝试所有input中带"链接/url/URL"的placeholder或value
    if (!sourceUrl) {
        const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
        for (const input of urlInputs) {
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            if (placeholder.includes('链接') || placeholder.includes('url') || placeholder.includes('URL') || value.includes('http')) {
                sourceUrl = value;
                break;
            }
        }
    }
    if (sourceUrl) {
        // 1688
        let m = sourceUrl.match(/offer\/(\d+)\.html/);
        if (m) return `1688_${m[1]}`;
        // 拼多多
        m = sourceUrl.match(/goods_id=(\d+)/);
        if (m) return `pdd_${m[1]}`;
        // 淘宝
        m = sourceUrl.match(/item\.taobao\.com\/item\.htm.*[?&]id=(\d+)/);
        if (m) return `taobao_${m[1]}`;
        // 京东
        m = sourceUrl.match(/item\.jd\.com\/(\d+)\.html/);
        if (m) return `jd_${m[1]}`;
        // 阿里巴巴
        m = sourceUrl.match(/detail\.1688\.com\/offer\/(\d+)\.html/);
        if (m) return `alibaba_${m[1]}`;
        // 其它平台可继续补充
        // fallback: 直接用URL
        return `url_${encodeURIComponent(sourceUrl)}`;
    }
    // 2. 左侧产品列表的data-id
    const selected = document.querySelector('.goods-item.active, .goods-item.selected, .product-list .selected');
    if (selected && selected.dataset && selected.dataset.id) {
        return `local_${selected.dataset.id}`;
    }
    // 3. 标题+时间戳兜底
    let title = '';
    const titleInput = document.querySelector('input[name="title"]') || document.querySelector('input[placeholder*="标题"]');
    if (titleInput && titleInput.value) {
        title = titleInput.value;
    }
    return `name_${title || 'unknown'}_${Date.now()}`;
}

// 3. 重试填写功能已集成到圆形按钮中

// 4. 修改悬浮按钮点击逻辑，保证状态恢复
async function onFloatingBtnClick() {
    console.log('【唯一标记】onFloatingBtnClick 执行了');
    if (isOptimizing) {
        console.log('【唯一标记】正在优化中，忽略点击');
        return;
    }
    isOptimizing = true;
    const optimizeBtn = floatingBtn.querySelector('#optimizeBtn');
    if (optimizeBtn) {
        optimizeBtn.textContent = '暂停';
        optimizeBtn.style.background = 'rgba(255,107,107,0.3)';
    }
    floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
    let needRestore = true;
    try {
        const key = getCurrentProductKey();
        console.log('【唯一标记】当前产品key:', key);
        const cached = await getAiResultCache(key);
        if (cached) {
            console.log('【唯一标记】发现缓存结果');
            let cacheInfo = '📋 发现该产品的AI优化缓存：\n\n';
            if (cached.title) cacheInfo += `• 标题：${cached.title.substring(0, 50)}${cached.title.length > 50 ? '...' : ''}\n`;
            if (cached.description) cacheInfo += `• 描述：${cached.description.substring(0, 100)}${cached.description.length > 100 ? '...' : ''}\n`;
            if (cached.keywords) cacheInfo += `• 关键词：${cached.keywords.substring(0, 50)}${cached.keywords.length > 50 ? '...' : ''}\n`;
            cacheInfo += '\n请选择操作：\n';
            cacheInfo += '✅ 确认：使用缓存结果重试填写（节省API调用）\n';
            cacheInfo += '🔄 取消：重新请求AI优化（覆盖缓存）';
            if (window.confirm(cacheInfo)) {
                console.log('【唯一标记】用户选择重试填写');
                const { pageInfo } = await collectInfo();
                await fillFields(cached, pageInfo.extractedDimensions);
                if (optimizeBtn) {
                    optimizeBtn.textContent = '完成✔';
                    optimizeBtn.style.background = 'rgba(40,167,69,0.3)';
                }
                floatingBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                setTimeout(() => {
                    if (optimizeBtn) {
                        optimizeBtn.textContent = '优化';
                        optimizeBtn.style.background = 'transparent';
                    }
                    floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    isOptimizing = false;
                    createFloatingBtn();
                }, 2000);
                needRestore = false;
                return;
            } else {
                console.log('【唯一标记】用户选择重新请求AI');
            }
        }
        
        // 只执行文案优化，不处理图片
        console.log('【唯一标记】开始执行文案优化...');
        showProgress('正在优化产品文案...');
        
        // 继续优化，重新请求AI
        console.log('【唯一标记】开始调用main()函数');
        const aiResult = await main();
        if (aiResult && (aiResult.title || aiResult.description || aiResult.keywords)) {
            console.log('【唯一标记】AI返回有效结果，保存到缓存');
            setAiResultCache(key, aiResult);
            await fillFields(aiResult);
            if (optimizeBtn) {
                optimizeBtn.textContent = '完成✔';
                optimizeBtn.style.background = 'rgba(40,167,69,0.3)';
            }
            floatingBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            setTimeout(() => {
                if (optimizeBtn) {
                    optimizeBtn.textContent = '优化';
                    optimizeBtn.style.background = 'transparent';
                }
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
                createFloatingBtn();
            }, 3000);
            needRestore = false;
        } else {
            console.log('【唯一标记】AI返回结果无效');
            throw new Error('AI返回结果无效');
        }
    } catch (error) {
        console.error('【唯一标记】优化过程出错:', error);
        if (optimizeBtn) {
            optimizeBtn.textContent = '失败❌';
            optimizeBtn.style.background = 'rgba(255,107,107,0.3)';
        }
        floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
        showProgress('优化失败: ' + error.message);
        setTimeout(() => {
            if (optimizeBtn) {
                optimizeBtn.textContent = '优化';
                optimizeBtn.style.background = 'transparent';
            }
            floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            isOptimizing = false;
            createFloatingBtn();
        }, 2000);
        needRestore = false;
        return;
    }
    // 最后兜底恢复
    if (needRestore) {
        createFloatingBtn();
        isOptimizing = false;
    }
}
// 全局暴露主流程函数，兼容所有作用域
if (typeof window !== 'undefined') {
    window.onFloatingBtnClick = onFloatingBtnClick;
}

// 恢复为单一悬浮按钮（无重试按钮、无容器）
function createFloatingBtn() {
    if (floatingBtn) floatingBtn.remove();
    
    // 创建圆形按钮容器
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'floatingBtnContainer';
    floatingBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 10000;
        width: 80px;
        height: 120px;
        border-radius: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        cursor: pointer;
        user-select: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: all 0.3s ease;
    `;
    
    // 创建上半部分 - 优化按钮
    const optimizeBtn = document.createElement('div');
    optimizeBtn.id = 'optimizeBtn';
    optimizeBtn.textContent = '优化';
    optimizeBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-radius: 40px 40px 0 0;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-bottom: 0px;
        box-sizing: border-box;
        margin-bottom: -1px;
    `;
    
    // 创建中间部分 - 图片优化按钮
    const imageOptimizeBtn = document.createElement('div');
    imageOptimizeBtn.id = 'imageOptimizeBtn';
    imageOptimizeBtn.textContent = '图片';
    imageOptimizeBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-top: 0px;
        padding-bottom: 0px;
        box-sizing: border-box;
        margin-top: -1px;
        margin-bottom: -1px;
    `;
    
    // 创建下半部分 - 重试按钮
    const retryBtn = document.createElement('div');
    retryBtn.id = 'retryBtn';
    retryBtn.textContent = '重试';
    retryBtn.style.cssText = `
        width: 100%;
        height: 33.33%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-radius: 0 0 40px 40px;
        cursor: pointer;
        transition: background 0.2s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        padding-top: 0px;
        box-sizing: border-box;
        margin-top: -1px;
    `;
    
    // 添加悬停效果
    optimizeBtn.addEventListener('mouseenter', function() {
        optimizeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    optimizeBtn.addEventListener('mouseleave', function() {
        optimizeBtn.style.background = 'transparent';
    });
    
    imageOptimizeBtn.addEventListener('mouseenter', function() {
        imageOptimizeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    imageOptimizeBtn.addEventListener('mouseleave', function() {
        imageOptimizeBtn.style.background = 'transparent';
    });
    
    retryBtn.addEventListener('mouseenter', function() {
        retryBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    retryBtn.addEventListener('mouseleave', function() {
        retryBtn.style.background = 'transparent';
    });
    
    // 绑定点击事件
    optimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isDragging) return;
        onFloatingBtnClick();
    });
    
    imageOptimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isDragging) return;
        onImageOptimizeClick();
    });
    
    retryBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (isDragging) return;
        console.log('点击了重试填写按钮');
        const key = getCurrentProductKey();
        const aiResult = await getAiResultCache(key);
        
        // 检查缓存是否存在
        if (!aiResult) {
            alert('❌ 当前产品还没有AI优化结果！\n\n请先点击"优化"按钮进行AI优化。');
            return;
        }
        
        // 检查缓存数据是否完善
        const hasTitle = aiResult.title && aiResult.title.trim().length > 0;
        const hasDescription = aiResult.description && aiResult.description.trim().length > 0;
        const hasKeywords = aiResult.keywords && aiResult.keywords.trim().length > 0;
        
        if (!hasTitle && !hasDescription && !hasKeywords) {
            alert('⚠️ 缓存数据不完善！\n\n当前缓存缺少有效的优化内容（标题、描述、关键词都为空）。\n\n建议重新点击"优化"按钮获取完整的AI优化结果。');
            return;
        }
        
        // 显示缓存信息
        let cacheInfo = '📋 使用缓存结果重试填写：\n\n';
        if (hasTitle) cacheInfo += `• 标题：${aiResult.title.substring(0, 50)}${aiResult.title.length > 50 ? '...' : ''}\n`;
        if (hasDescription) cacheInfo += `• 描述：${aiResult.description.substring(0, 100)}${aiResult.description.length > 100 ? '...' : ''}\n`;
        if (hasKeywords) cacheInfo += `• 关键词：${aiResult.keywords.substring(0, 50)}${aiResult.keywords.length > 50 ? '...' : ''}\n`;
        
        // 显示缺失的字段
        let missingFields = [];
        if (!hasTitle) missingFields.push('标题');
        if (!hasDescription) missingFields.push('描述');
        if (!hasKeywords) missingFields.push('关键词');
        
        if (missingFields.length > 0) {
            cacheInfo += `\n⚠️ 注意：缓存中缺少 ${missingFields.join('、')} 字段\n`;
        }
        
        cacheInfo += '\n✅ 正在使用缓存结果填写表单...';
        
        alert(cacheInfo);
        // 重试填写时也需要获取当前页面的尺寸信息
        const { pageInfo } = await collectInfo();
        await fillFields(aiResult, pageInfo.extractedDimensions);
        alert('✅ 已成功使用缓存结果重试填写！');
    });
    
    // 图片优化点击事件
    async function onImageOptimizeClick() {
        if (isOptimizing) {
            console.log('正在优化中，忽略点击');
            return;
        }
        
        try {
            isOptimizing = true;
            imageOptimizeBtn.textContent = '处理中...';
            imageOptimizeBtn.style.background = 'rgba(255,107,107,0.3)';
            
            // 获取图片优化设置
            const settings = await getImageOptimizationSettings();
            if (!settings.enableImageOptimization) {
                console.log('图片优化已禁用');
                showProgress('图片优化已禁用，请在设置中启用');
                setTimeout(() => hideProgress(), 2000);
                return;
            }
            
            console.log('先点击页面中的图片优化按钮...');
            showProgress('正在点击图片优化按钮...');
            
            // 先点击页面中的图片优化按钮
            await clickImageOptimizeButtons();
            
            // 等待一段时间让图片优化完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('执行插件图片优化...');
            showProgress('正在执行插件图片优化...');
            await optimizeImages();
            
            imageOptimizeBtn.textContent = '完成✔';
            imageOptimizeBtn.style.background = 'rgba(40,167,69,0.3)';
            
            setTimeout(() => {
                imageOptimizeBtn.textContent = '图片';
                imageOptimizeBtn.style.background = 'transparent';
                isOptimizing = false;
            }, 2000);
            
        } catch (error) {
            console.error('图片优化失败:', error);
            imageOptimizeBtn.textContent = '失败❌';
            imageOptimizeBtn.style.background = 'rgba(255,107,107,0.3)';
            showProgress('图片优化失败: ' + error.message);
            
            setTimeout(() => {
                imageOptimizeBtn.textContent = '图片';
                imageOptimizeBtn.style.background = 'transparent';
                isOptimizing = false;
            }, 3000);
        }
    }
    
    // 组装按钮
    floatingBtn.appendChild(optimizeBtn);
    floatingBtn.appendChild(imageOptimizeBtn);
    floatingBtn.appendChild(retryBtn);
    
    // 拖拽逻辑
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let startX = 0, startY = 0;
    floatingBtn.addEventListener('mousedown', function (e) {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        dragOffset.x = e.clientX - floatingBtn.offsetLeft;
        dragOffset.y = e.clientY - floatingBtn.offsetTop;
        floatingBtn.classList.add('dragging');
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    });
    
    function drag(e) {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 3 || dy > 3) isDragging = true;
        if (isDragging) {
            floatingBtn.style.transition = 'none';
            let left = e.clientX - dragOffset.x;
            let top = e.clientY - dragOffset.y;
            const minLeft = 0;
            const minTop = 0;
            const maxLeft = window.innerWidth - 80;
            const maxTop = window.innerHeight - 80;
            left = Math.max(minLeft, Math.min(left, maxLeft));
            top = Math.max(minTop, Math.min(top, maxTop));
            floatingBtn.style.left = left + 'px';
            floatingBtn.style.top = top + 'px';
        }
    }
    
    function dragEnd(e) {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        setTimeout(() => { isDragging = false; }, 50);
    }
    
    document.body.appendChild(floatingBtn);
    console.log('圆形悬浮按钮已创建');
}



// 优化字段识别调试输出，显示新查找逻辑
async function testFieldRecognition() {
    console.log('【唯一标记】testFieldRecognition新版');
    console.log('=== 字段识别测试 ===');
    
    // 测试标题输入框
    let titleInput = findTitleInput();
    if (titleInput) {
        console.log('✅ 找到 标题 输入框:', titleInput.outerHTML);
    } else {
        console.log('❌ 未找到 标题 输入框');
    }
    
    // 测试关键字输入框
    let keywordInput = findKeywordsInput();
    if (keywordInput) {
        console.log('✅ 找到 关键词 输入框（新结构适配）:', keywordInput.outerHTML);
    } else {
        console.log('❌ 未找到 关键词 输入框（新结构适配）');
    }
    
    // 输出所有input的详细信息
    console.log('=== 所有input详细信息 ===');
    const allInputs = document.querySelectorAll('input');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        const editFieldLabel = input.closest('.edit-field-label');
        const editFieldContent = input.closest('.edit-field-content');
        
        console.log('input:', {
            outerHTML: input.outerHTML,
            placeholder: input.placeholder,
            readOnly: input.readOnly,
            type: input.type,
            className: input.className,
            labelText: label?.textContent?.trim(),
            hasEditFieldLabel: !!editFieldLabel,
            hasEditFieldContent: !!editFieldContent
        });
    }
    
    console.log('=== 字段识别测试完成 ===');
}

// 创建进度指示器
function createProgressIndicator() {
    if (progressIndicator) {
        progressIndicator.remove();
    }
    
    progressIndicator = document.createElement('div');
    progressIndicator.id = 'optimizeProgressIndicator';
    progressIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: none;
        max-width: 300px;
        text-align: center;
    `;
    
    document.body.appendChild(progressIndicator);
    console.log('进度指示器已创建');
}

// 显示进度指示器
function showProgress(message, targetElement = null) {
    if (!progressIndicator) {
        createProgressIndicator();
    }
    
    progressIndicator.textContent = message;
    progressIndicator.style.display = 'block';
    
    // 如果有目标元素，高亮显示
    if (targetElement) {
        highlightElement(targetElement);
    }
    
    console.log('显示进度:', message);
}

// 隐藏进度指示器
function hideProgress() {
    if (progressIndicator) {
        progressIndicator.style.display = 'none';
        removeAllHighlights();
    }
}

// 高亮元素
function highlightElement(element) {
    // 移除之前的高亮
    removeAllHighlights();
    
    // 添加高亮样式
    element.style.outline = '3px solid #ff6b6b';
    element.style.outlineOffset = '2px';
    element.style.transition = 'outline 0.3s ease';
    
    // 滚动到元素位置
    element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
    });
    
    console.log('高亮元素:', element);
}

// 移除所有高亮
function removeAllHighlights() {
    const highlightedElements = document.querySelectorAll('[style*="outline: 3px solid #ff6b6b"]');
    highlightedElements.forEach(el => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.transition = '';
    });
}

// 显示/隐藏悬浮按钮
function toggleFloatingBtn(show) {
    if (show) {
        if (!floatingBtn) {
            createFloatingBtn();
        } else {
            floatingBtn.style.display = 'block';
            // 恢复拖拽位置
            floatingBtn.style.transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`;
        }
        console.log('悬浮按钮已显示');
    } else {
        if (floatingBtn) {
            floatingBtn.style.display = 'none';
        }
        console.log('悬浮按钮已隐藏');
    }
}

// 初始化悬浮按钮（根据设置决定是否显示）
async function initFloatingBtn() {
    console.log('开始初始化悬浮按钮...');
    
    // 直接创建按钮，不依赖存储设置
    createFloatingBtn();
    
    return new Promise((resolve) => {
        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['showFloatingBtn'], function(result) {
                    console.log('存储查询结果:', result);
                    const showBtn = result.showFloatingBtn !== undefined ? result.showFloatingBtn : true;
                    console.log('是否显示按钮:', showBtn);
                    if (!showBtn) {
                        console.log('根据设置隐藏按钮');
                        if (floatingBtn) {
                            floatingBtn.style.display = 'none';
                        }
                    }
                    resolve();
                });
            } else {
                console.log('chrome.storage不可用，按钮已创建');
                resolve();
            }
        } catch (error) {
            console.error('初始化悬浮按钮时出错:', error);
            console.log('按钮已创建，继续执行');
            resolve();
        }
    });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleFloatingBtn') {
        toggleFloatingBtn(request.show);
        sendResponse({success: true});
    }
});

// 从URL中提取长宽高信息
function extractDimensionsFromUrl(url) {
    console.log('开始从URL提取尺寸信息:', url);
    
    try {
        // 常见的尺寸模式匹配
        const patterns = [
            // 模式1: 200x300x400 或 200*300*400
            /(\d+)[x\*](\d+)[x\*](\d+)/i,
            // 模式2: 长200宽300高400
            /长(\d+).*?宽(\d+).*?高(\d+)/i,
            // 模式3: 200×300×400 (使用×符号)
            /(\d+)[×x](\d+)[×x](\d+)/i,
            // 模式4: 200mm x 300mm x 400mm
            /(\d+)\s*mm\s*[x\*×]\s*(\d+)\s*mm\s*[x\*×]\s*(\d+)\s*mm/i,
            // 模式5: 200cm x 300cm x 400cm
            /(\d+)\s*cm\s*[x\*×]\s*(\d+)\s*cm\s*[x\*×]\s*(\d+)\s*cm/i,
            // 模式6: 200*300*400mm
            /(\d+)\s*[x\*×]\s*(\d+)\s*[x\*×]\s*(\d+)\s*mm/i,
            // 模式7: 200*300*400cm
            /(\d+)\s*[x\*×]\s*(\d+)\s*[x\*×]\s*(\d+)\s*cm/i,
            // 模式8: 尺寸200x300x400
            /尺寸\s*(\d+)[x\*×](\d+)[x\*×](\d+)/i,
            // 模式9: 规格200x300x400
            /规格\s*(\d+)[x\*×](\d+)[x\*×](\d+)/i,
            // 模式10: 200mm*300mm*400mm
            /(\d+)mm\s*[x\*×]\s*(\d+)mm\s*[x\*×]\s*(\d+)mm/i
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const match = url.match(patterns[i]);
            if (match) {
                const length = parseInt(match[1]);
                const width = parseInt(match[2]);
                const height = parseInt(match[3]);
                
                // 验证数值合理性
                if (length > 0 && width > 0 && height > 0 && 
                    length < 10000 && width < 10000 && height < 10000) {
                    
                    console.log(`✅ 匹配模式${i + 1}成功:`, { length, width, height });
                    return { length, width, height };
                }
            }
        }
        
        // 如果没有找到标准模式，尝试查找单个尺寸信息
        const singlePatterns = [
            // 查找长度
            /长[度]*[：:]*\s*(\d+)/i,
            /length[：:]*\s*(\d+)/i,
            // 查找宽度
            /宽[度]*[：:]*\s*(\d+)/i,
            /width[：:]*\s*(\d+)/i,
            // 查找高度
            /高[度]*[：:]*\s*(\d+)/i,
            /height[：:]*\s*(\d+)/i
        ];
        
        let extractedLength = null, extractedWidth = null, extractedHeight = null;
        
        for (const pattern of singlePatterns) {
            const match = url.match(pattern);
            if (match) {
                const value = parseInt(match[1]);
                if (value > 0 && value < 10000) {
                    if (pattern.source.includes('长') || pattern.source.includes('length')) {
                        extractedLength = value;
                    } else if (pattern.source.includes('宽') || pattern.source.includes('width')) {
                        extractedWidth = value;
                    } else if (pattern.source.includes('高') || pattern.source.includes('height')) {
                        extractedHeight = value;
                    }
                }
            }
        }
        
        if (extractedLength || extractedWidth || extractedHeight) {
            console.log('✅ 提取到部分尺寸信息:', { 
                length: extractedLength, 
                width: extractedWidth, 
                height: extractedHeight 
            });
            return { 
                length: extractedLength, 
                width: extractedWidth, 
                height: extractedHeight 
            };
        }
        
        console.log('❌ 未找到有效的尺寸信息');
        return null;
        
    } catch (error) {
        console.error('提取尺寸信息时出错:', error);
        return null;
    }
}

// 收集页面信息
async function collectInfo() {
    console.log('开始收集页面信息...');
    
    // 获取预设信息
    showProgress('正在获取预设信息...');
    const presetInfo = await new Promise((resolve) => {
        chrome.storage.local.get([
            'configuration',
            'manufacturer', 
            'packageQuantity',
            'targetAudience',
            'apiPlatform',
            'deepseekApiKey',
            'tongyiApiKey',
            'bailianApiKey'
        ], resolve);
    });
    
    console.log('预设信息:', presetInfo);
    
    // 获取产品来源URL
    showProgress('正在获取产品来源URL...');
    let sourceUrl = '';
    const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
    for (const input of urlInputs) {
        const placeholder = input.placeholder || '';
        const value = input.value || '';
        if (placeholder.includes('链接') || placeholder.includes('url') || placeholder.includes('URL') || 
            value.includes('ozon.ru') || value.includes('ozon.com')) {
            sourceUrl = value;
            console.log('从输入框获取产品来源URL:', sourceUrl);
            break;
        }
    }
    console.log('产品来源URL:', sourceUrl);
    
    // 从来源URL提取长宽高信息
    let extractedDimensions = null;
    if (sourceUrl) {
        extractedDimensions = extractDimensionsFromUrl(sourceUrl);
        if (extractedDimensions) {
            console.log('从URL提取的尺寸信息:', extractedDimensions);
        } else {
            console.log('URL中未找到尺寸信息');
        }
    }
    
    // 获取产品标题 - 使用更精确的选择器
    showProgress('正在获取产品标题...');
    let currentTitle = '';
    const titleLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('产品标题：'));
    if (titleLabel) {
        const titleInput = titleLabel.closest('.el-form-item')?.querySelector('input.el-input__inner');
        if (titleInput) {
            currentTitle = titleInput.value;
            console.log('从标题输入框获取标题:', currentTitle);
        }
    }
    console.log('当前产品标题:', currentTitle);
    
    // 获取产品描述 - 使用更精确的选择器
    showProgress('正在获取产品描述...');
    let currentDesc = '';
    const descLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('描述：'));
    if (descLabel) {
        const descTextarea = descLabel.closest('.el-form-item')?.querySelector('textarea.el-textarea__inner');
        if (descTextarea) {
            currentDesc = descTextarea.value;
            console.log('从描述文本框获取描述:', currentDesc);
        }
    }
    console.log('当前产品描述:', currentDesc);
    
    // 获取产品分类（类别）- 专门针对产品分类字段
    showProgress('正在获取产品分类...');
    let category = '';
    const categoryLabel = Array.from(document.querySelectorAll('label, span')).find(el => el.textContent.includes('产品分类：') || el.textContent.includes('产品分类'));
    if (categoryLabel) {
        const formItem = categoryLabel.closest('.el-form-item');
        if (formItem) {
            const inputElement = formItem.querySelector('input[readonly], input.el-input__inner, .el-cascader input');
            if (inputElement) {
                category = inputElement.value;
                console.log('从产品分类输入框获取类别:', category);
            }
        }
    }
    // Fallback for cascader if not found by label association
    if (!category) {
        const cascaderInput = document.querySelector('.el-cascader input, .jx-pro-input input');
        if (cascaderInput) {
            const parentText = cascaderInput.closest('.el-form-item')?.textContent || '';
            if (parentText.includes('产品分类') || parentText.includes('类别')) {
                category = cascaderInput.value;
                console.log('从cascader组件获取产品分类:', category);
            }
        }
    }
    // Fallback for any readonly input if not found by previous methods
    if (!category) {
        const readonlyInputs = document.querySelectorAll('input[readonly]');
        for (const input of readonlyInputs) {
            const parentText = input.closest('.el-form-item')?.textContent || '';
            if (parentText.includes('产品分类') || parentText.includes('类别')) {
                category = input.value;
                console.log('从readonly输入框获取产品分类:', category);
                break;
            }
        }
    }
    console.log('产品分类（类别）:', category);
    
    // 采集1688包装信息
    let packageInfo = '';
    if (sourceUrl && sourceUrl.includes('1688.com')) {
        try {
            packageInfo = await fetch1688PackageInfo(sourceUrl);
            if (packageInfo) {
                console.log('采集到1688包装信息:', packageInfo);
            } else {
                console.log('未采集到1688包装信息');
            }
        } catch (e) {
            console.error('采集1688包装信息异常:', e);
        }
    }
    
    // 返回收集的信息，包括提取的尺寸
    return {
        presetInfo,
        pageInfo: {
            sourceUrl,
            currentTitle,
            currentDesc,
            category,
            extractedDimensions,
            packageInfo
        }
    };
    
    // 获取产品尺寸信息（长宽高）
    showProgress('正在获取产品尺寸信息...');
    let productDimensions = {
        length: '',
        width: '',
        height: ''
    };
    
    // 查找包裹尺寸字段
    const dimensionInputs = document.querySelectorAll('input[type="number"][placeholder*="长"], input[type="number"][placeholder*="宽"], input[type="number"][placeholder*="高"]');
    dimensionInputs.forEach(input => {
        const placeholder = input.placeholder;
        const value = input.value;
        
        if (placeholder.includes('长')) {
            productDimensions.length = value;
            console.log('产品长度:', value);
        } else if (placeholder.includes('宽')) {
            productDimensions.width = value;
            console.log('产品宽度:', value);
        } else if (placeholder.includes('高')) {
            productDimensions.height = value;
            console.log('产品高度:', value);
        }
    });
    
    // 如果没找到具体的尺寸字段，尝试查找包含"包裹尺寸"的字段
    if (!productDimensions.length && !productDimensions.width && !productDimensions.height) {
        const dimensionLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
            const text = el.textContent;
            return text && text.includes('包裹尺寸') && text.length < 100; // 限制文本长度避免捕获大量HTML
        });
        
        for (const element of dimensionLabels) {
            const text = element.textContent;
            if (text && text.includes('包裹尺寸')) {
                console.log('找到包裹尺寸标签:', text);
                const formItem = element.closest('.el-form-item');
                if (formItem) {
                    const inputs = formItem.querySelectorAll('input[type="number"]');
                    inputs.forEach((input, index) => {
                        const placeholder = input.placeholder;
                        const value = input.value;
                        
                        if (placeholder.includes('长') || index === 0) {
                            productDimensions.length = value;
                            console.log('从包裹尺寸获取长度:', value);
                        } else if (placeholder.includes('宽') || index === 1) {
                            productDimensions.width = value;
                            console.log('从包裹尺寸获取宽度:', value);
                        } else if (placeholder.includes('高') || index === 2) {
                            productDimensions.height = value;
                            console.log('从包裹尺寸获取高度:', value);
                        }
                    });
                    break;
                }
            }
        }
    }
    
    // 检查尺寸是否为空或为0，如果为空则设置默认值
    if (!productDimensions.length || productDimensions.length === '0') {
        productDimensions.length = '200';
        console.log('设置默认长度: 200');
    } else {
        console.log('长度已有值，跳过默认填充:', productDimensions.length);
    }
    if (!productDimensions.width || productDimensions.width === '0') {
        productDimensions.width = '200';
        console.log('设置默认宽度: 200');
    } else {
        console.log('宽度已有值，跳过默认填充:', productDimensions.width);
    }
    if (!productDimensions.height || productDimensions.height === '0') {
        productDimensions.height = '200';
        console.log('设置默认高度: 200');
    } else {
        console.log('高度已有值，跳过默认填充:', productDimensions.height);
    }
    
    console.log('产品尺寸信息:', productDimensions);
    
    return {
        presetInfo,
        pageInfo: {
            sourceUrl,
            currentTitle,
            currentDesc,
            category,
            dimensions: productDimensions
        }
    };
}

// 构建AI提示词
function buildPrompt(presetInfo, pageInfo) {
    const { sourceUrl, currentTitle, currentDesc, category, dimensions, packageInfo } = pageInfo;
    const { configuration, manufacturer, packageQuantity, targetAudience } = presetInfo;
    
    // 构建尺寸信息文本
    let dimensionsText = '';
    if ((dimensions && typeof dimensions.length !== 'undefined' && dimensions.length) ||
        (dimensions && typeof dimensions.width !== 'undefined' && dimensions.width) ||
        (dimensions && typeof dimensions.height !== 'undefined' && dimensions.height)) {
        dimensionsText = `\n产品尺寸信息：\n- 长度: ${(dimensions && typeof dimensions.length !== 'undefined' && dimensions.length) ? dimensions.length : '未填写'}\n- 宽度: ${(dimensions && typeof dimensions.width !== 'undefined' && dimensions.width) ? dimensions.width : '未填写'}\n- 高度: ${(dimensions && typeof dimensions.height !== 'undefined' && dimensions.height) ? dimensions.height : '未填写'}`;
    }
    
    let prompt = `你是一个专业的Ozon电商产品优化专家。请根据以下产品信息，生成优化的产品属性：\n\n产品基本信息：\n- 产品来源URL: ${sourceUrl || '未提供'}\n- 产品分类: ${category || '未提供'}\n- 当前产品标题: ${currentTitle || '未提供'}\n- 当前产品描述: ${currentDesc || '未提供'}${dimensionsText}`;
    if (packageInfo) {
        prompt += `\n包装信息：\n${packageInfo}`;
    }
    prompt += `\n\n请生成以下内容（全部使用俄语）：\n\n产品标题（核心标题 + 长尾关键词）：\n产品描述（至少300字，不包含尺寸信息，要有标点符号）：\n产品关键词（至少20个，用分号分隔）：\n产品标签（俄语，社交媒体风格，不包含品牌名，安全词汇，以#开头，只能包含字母、数字、下划线，最大28字符，数量最少25个，数量最好30个，用空格分隔）：\n\n请严格按照以上格式输出，每个部分都要有明确的标题。注意：标题必须使用中文，内容使用俄语。**不要输出任何markdown语法，不要加粗，不要用**包裹内容。**`;
    
    console.log('构建的AI提示词:', prompt);
    return prompt;
}

// 调用DeepSeek API
async function callDeepSeek(apiKey, prompt) {
    console.log('开始调用DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('DeepSeek API返回:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('DeepSeek API返回格式错误');
    }
    
    const content = data.choices[0].message.content;
    console.log('DeepSeek AI返回内容:', content);
    
    return content;
}

// 调用通义千问 API
async function callTongyi(apiKey, prompt) {
    console.log('开始调用通义千问 API...');
    
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                max_tokens: 2000,
                temperature: 0.7
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`通义千问 API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('通义千问 API返回:', data);
    
    if (!data.output || !data.output.choices || !data.output.choices[0] || !data.output.choices[0].message) {
        throw new Error('通义千问 API返回格式错误');
    }
    
    const content = data.output.choices[0].message.content;
    console.log('通义千问 AI返回内容:', content);
    
    return content;
}

// 调用阿里云百炼 API
async function callBailian(apiKey, prompt) {
    console.log('开始调用阿里云百炼 API...');
    
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-r1',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`阿里云百炼 API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('阿里云百炼 API返回:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('阿里云百炼 API返回格式错误');
    }
    
    const content = data.choices[0].message.content;
    console.log('阿里云百炼 AI返回内容:', content);
    
    return content;
}

// 调用AI API（根据平台选择）
async function callAI(apiPlatform, apiKey, prompt) {
    if (apiPlatform === 'deepseek') {
        return await callDeepSeek(apiKey, prompt);
    } else if (apiPlatform === 'tongyi') {
        return await callTongyi(apiKey, prompt);
    } else if (apiPlatform === 'bailian') {
        return await callBailian(apiKey, prompt);
    } else {
        throw new Error('不支持的AI平台');
    }
}

// 解析AI响应
function parseAIResponse(response) {
    const result = { title: '', description: '', keywords: '', hashtags: '', dimensions: { length: '200', width: '200', height: '200' } };
    try {
        // 只识别中文小标题，括号和冒号都可选
        let titleMatch = response.match(/(?:###\s*)?产品标题(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品描述|$)/);
        if (titleMatch) result.title = titleMatch[1].replace(/\*\*/g, '').trim();

        let descMatch = response.match(/(?:###\s*)?产品描述(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品关键词|$)/);
        if (descMatch) result.description = descMatch[1].replace(/\*\*/g, '').trim();

        let keywordsMatch = response.match(/(?:###\s*)?产品关键词(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品标签|$)/);
        if (keywordsMatch) result.keywords = keywordsMatch[1].replace(/\*\*/g, '').trim();

        let hashtagsMatch = response.match(/(?:###\s*)?产品标签(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n|$)/);
        if (hashtagsMatch) result.hashtags = hashtagsMatch[1].replace(/\*\*/g, '').trim();

        return result;
    } catch (e) {
        console.error('AI解析失败', e);
        return result;
    }
}

function findInputByLabel(labelText) {
    // 统一处理labelText，去除空格、冒号、全角半角、转小写
    const norm = s => s ? s.replace(/[：:：\s]/g, '').toLowerCase() : '';
    const normLabelText = norm(labelText);
    // 1. 先找label或span
    const label = Array.from(document.querySelectorAll('label span, span')).find(
        el => norm(el.textContent) === normLabelText
    );
    if (label) {
        // 支持label的for属性
        const labelEl = label.closest('label');
        if (labelEl && labelEl.getAttribute('for')) {
            const forId = labelEl.getAttribute('for');
            const byId = document.getElementById(forId);
            if (byId) return byId;
            // 也支持name属性
            const byName = document.querySelector(`input[name='${forId}'], textarea[name='${forId}']`);
            if (byName) return byName;
        }
        // 2. 向上找.el-form-item，再找input/textarea
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const input = formItem.querySelector('input.el-input__inner, textarea.el-textarea__inner, input, textarea');
            if (input) return input;
        }
    }
    // 3. placeholder、aria-label、name、class、父级div文本模糊匹配
    const allInputs = document.querySelectorAll('input.el-input__inner, textarea.el-textarea__inner, input, textarea');
    for (const input of allInputs) {
        // placeholder
        if (input.placeholder && norm(input.placeholder).includes(normLabelText)) return input;
        // aria-label
        if (input.getAttribute('aria-label') && norm(input.getAttribute('aria-label')).includes(normLabelText)) return input;
        // name
        if (input.name && norm(input.name).includes(normLabelText)) return input;
        // class
        if (input.className && norm(input.className).includes(normLabelText)) return input;
        // 父级div的文本
        const parentDiv = input.closest('div');
        if (parentDiv && norm(parentDiv.textContent).includes(normLabelText)) return input;
        // 兜底：通过父级 .jx-pro-input 的 cid 唯一定位关键词输入框
        if (labelText.includes('关键字') || labelText.includes('关键词')) {
            const jxParent = input.closest('.jx-pro-input');
            if (jxParent && jxParent.getAttribute('cid') === '780113') {
                return input;
            }
        }
    }
    // 4. 兜底：遍历所有input/textarea，输出其父级和label内容，辅助调试
    console.log('【调试】所有input/textarea及父级：');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span, span') : null;
        console.log('input:', input, 'label:', label?.textContent);
    }
    return null;
}

function setNativeValue(element, value) {
    const lastValue = element.value;
    element.focus();
    element.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function setNativeValueWithPaste(element, value) {
    element.focus();
    // 尝试粘贴事件
    try {
        const clipboardEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        clipboardEvent.clipboardData.setData('text/plain', value);
        element.dispatchEvent(clipboardEvent);
    } catch (e) {
        // 某些浏览器不支持ClipboardEvent
    }
    // 兜底赋值
    const lastValue = element.value;
    element.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// 终极描述查找函数
function findDescTextarea() {
    console.log('【调试】开始查找描述输入框...');
    
    // 1. 通过label for="notes"属性查找
    const label = document.querySelector('label[for="notes"]');
    if (label) {
        console.log('找到label[for="notes"]:', label);
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const textarea = formItem.querySelector('textarea.el-textarea__inner');
            if (textarea) {
                console.log('通过label for找到描述textarea:', textarea);
                return textarea;
            }
        }
    }
    
    // 2. 通过label文本内容查找
    const allLabels = document.querySelectorAll('label');
    for (const label of allLabels) {
        if (label.textContent.includes('描述')) {
            console.log('找到包含"描述"的label:', label);
            const formItem = label.closest('.el-form-item');
            if (formItem) {
                const textarea = formItem.querySelector('textarea.el-textarea__inner');
                if (textarea) {
                    console.log('通过label文本找到描述textarea:', textarea);
                    return textarea;
                }
            }
        }
    }
    
    // 3. 通过父级结构查找
    const allTextareas = document.querySelectorAll('textarea.el-textarea__inner');
    for (const textarea of allTextareas) {
        const jxParent = textarea.closest('.jx-pro-input.el-textarea');
        if (jxParent) {
            console.log('通过父级结构找到描述textarea:', textarea);
            return textarea;
        }
    }
    
    // 4. 兜底：如果只有一个textarea，直接返回
    if (allTextareas.length === 1) {
        console.log('页面只有一个textarea，作为描述输入框:', allTextareas[0]);
        return allTextareas[0];
    }
    
    console.log('【调试】所有textarea及父级：');
    for (const textarea of allTextareas) {
        const formItem = textarea.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label') : null;
        console.log('textarea:', textarea, 'label:', label?.textContent);
    }
    
    return null;
}

// 备选填写方案 - 多种方法确保成功
function setNativeValueWithFallback(element, value) {
    console.log('【调试】备选填写开始:', element, '值:', value);
    
    // 方案1: 直接DOM操作
    try {
        element.setAttribute('value', value);
        element.value = value;
        console.log('【调试】方案1完成: 直接DOM操作');
    } catch (e) {
        console.log('【调试】方案1失败:', e);
    }
    
    // 方案2: 键盘输入模拟
    try {
        element.focus();
        element.value = '';
        for (let i = 0; i < value.length; i++) {
            element.value += value[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { key: value[i], code: 'Key' + value[i].toUpperCase(), bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: value[i], code: 'Key' + value[i].toUpperCase(), bubbles: true }));
        }
        console.log('【调试】方案2完成: 键盘输入模拟');
    } catch (e) {
        console.log('【调试】方案2失败:', e);
    }
    
    // 方案3: Vue组件操作
    try {
        if (element.__vue__) {
            element.__vue__.$emit('input', value);
            console.log('【调试】方案3完成: Vue组件操作');
        }
    } catch (e) {
        console.log('【调试】方案3失败:', e);
    }
    
    // 方案4: 使用execCommand
    try {
        element.focus();
        element.select();
        document.execCommand('insertText', false, value);
        console.log('【调试】方案4完成: execCommand');
    } catch (e) {
        console.log('【调试】方案4失败:', e);
    }
    
    // 方案5: 触发所有可能的事件
    try {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        console.log('【调试】方案5完成: 事件触发');
    } catch (e) {
        console.log('【调试】方案5失败:', e);
    }
    
    console.log('【调试】备选填写完成，最终值:', element.value);
}

// 终极填写函数 - 极限事件模拟，最大兼容 Element UI/Vue
function setNativeValueWithAllEvents(element, value) {
    console.log('【调试】极限填写开始:', element, '值:', value);
    console.log('【调试】元素类型:', element.tagName, 'class:', element.className);

    // 1. 聚焦
    element.click();
    element.focus();
    console.log('【调试】步骤1完成: 聚焦');

    // 2. 清空
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('【调试】步骤2完成: 清空');

    // 3. 组合事件模拟
    try {
        element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    } catch (e) {
        console.log('【调试】组合事件开始失败:', e);
    }
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    try {
        element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    } catch (e) {
        console.log('【调试】组合事件结束失败:', e);
    }
    console.log('【调试】步骤3完成: 组合事件');

    // 4. 粘贴事件
    try {
        const clipboardEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        clipboardEvent.clipboardData.setData('text/plain', value);
        element.dispatchEvent(clipboardEvent);
        console.log('【调试】步骤4完成: 粘贴事件');
    } catch (e) {
        console.log('【调试】粘贴事件失败:', e);
    }

    // 5. 再次赋值+事件
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    console.log('【调试】步骤5完成: 再次赋值');

    // 6. 模拟键盘事件
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true }));
    console.log('【调试】步骤6完成: 键盘事件');

    // 7. 选中内容再失焦
    if (element.select) element.select();
    element.blur();
    setTimeout(() => {
        element.focus();
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('【调试】极限填写完成，最终值:', element.value);
        console.log('【调试】元素当前状态:', {
            value: element.value,
            disabled: element.disabled,
            readOnly: element.readOnly,
            type: element.type
        });
    }, 100);
}

async function fillFields(aiResult, extractedDimensions = null) {
    console.log('开始填写页面字段...');
    console.log('AI结果:', aiResult);
    console.log('提取的尺寸信息:', extractedDimensions);

    // 获取预设信息
    const presetInfo = await new Promise((resolve) => {
        chrome.storage.local.get([
            'configuration',
            'manufacturer', 
            'packageQuantity',
            'targetAudience'
        ], resolve);
    });
    
    console.log('预设信息:', presetInfo);

    // 填写预设属性
    if (presetInfo.configuration) {
        const configInput = findInputByLabel('配置(Комплектация)') || findInputByLabel('配置');
        if (configInput && (!configInput.value || configInput.value.trim() === '')) {
            showProgress('正在填写产品配置...', configInput);
            setNativeValueWithFallback(configInput, presetInfo.configuration);
            console.log('已填写配置:', presetInfo.configuration);
        } else {
            console.log('配置字段已有值或未找到输入框，跳过填写');
        }
    }

    if (presetInfo.manufacturer) {
        const manufacturerInput = findInputByLabel('制造国(Страна-изготовитель)') || findInputByLabel('制造国');
        if (manufacturerInput && (!manufacturerInput.value || manufacturerInput.value.trim() === '')) {
            showProgress('正在填写制造国...', manufacturerInput);
            setNativeValueWithFallback(manufacturerInput, presetInfo.manufacturer);
            console.log('已填写制造国:', presetInfo.manufacturer);
        } else {
            console.log('制造国字段已有值或未找到输入框，跳过填写');
        }
    }

    if (presetInfo.packageQuantity) {
        const packageInput = findInputByLabel('原厂包装数量') || findInputByLabel('包装数量');
        if (packageInput && (!packageInput.value || packageInput.value.trim() === '')) {
            showProgress('正在填写包装数量...', packageInput);
            setNativeValueWithFallback(packageInput, presetInfo.packageQuantity);
            console.log('已填写包装数量:', presetInfo.packageQuantity);
        } else {
            console.log('包装数量字段已有值或未找到输入框，跳过填写');
        }
    }

    if (presetInfo.targetAudience) {
        const audienceInput = findInputByLabel('目标受众(Целевая аудитория)') || findInputByLabel('目标受众');
        if (audienceInput && (!audienceInput.value || audienceInput.value.trim() === '')) {
            showProgress('正在填写目标受众...', audienceInput);
            setNativeValueWithFallback(audienceInput, presetInfo.targetAudience);
            console.log('已填写目标受众:', presetInfo.targetAudience);
        } else {
            console.log('目标受众字段已有值或未找到输入框，跳过填写');
        }
    }

    // 标题 - 专门查找+备选填写方案
    const titleInput = findTitleInput();
    if (titleInput && aiResult.title) {
        showProgress('正在填写产品标题...', titleInput);
        setNativeValueWithFallback(titleInput, aiResult.title);
        console.log('已填写标题:', aiResult.title);
    } else {
        console.log('未找到标题输入框或AI结果为空');
        console.log('AI结果中的标题:', aiResult.title);
    }

    // 描述 - 备选填写方案
    const descInput = findDescTextarea();
    if (descInput && aiResult.description) {
        showProgress('正在填写产品描述...', descInput);
        setNativeValueWithFallback(descInput, aiResult.description);
        console.log('已填写描述:', aiResult.description);
    } else {
        console.log('未找到描述输入框或AI结果为空');
    }

    // 关键词 - 使用备选填写方案（带调试）
    const keywordsInput = findKeywordsInput();
    if (keywordsInput && aiResult.keywords) {
        showProgress('正在填写产品关键词...', keywordsInput);
        
        // 尝试多种填写方式确保成功
        console.log('【调试】关键词输入框特殊处理开始');
        
        // 方式1: 使用极限事件模拟
        setNativeValueWithAllEvents(keywordsInput, aiResult.keywords);
        
        // 方式2: 等待一下再尝试备选填写
        setTimeout(() => {
            if (!keywordsInput.value || keywordsInput.value !== aiResult.keywords) {
                console.log('【调试】关键词第一次填写可能失败，尝试第二次');
                setNativeValueWithFallback(keywordsInput, aiResult.keywords);
            }
        }, 100);
        
        // 方式3: 再次确认填写结果
        setTimeout(() => {
            console.log('【调试】关键词最终检查:', keywordsInput.value);
            if (!keywordsInput.value || keywordsInput.value !== aiResult.keywords) {
                console.log('【调试】关键词填写失败，尝试最后一种方法');
                // 最后尝试：直接DOM操作 + 所有事件
                keywordsInput.focus();
                keywordsInput.value = aiResult.keywords;
                keywordsInput.dispatchEvent(new Event('input', { bubbles: true }));
                keywordsInput.dispatchEvent(new Event('change', { bubbles: true }));
                keywordsInput.dispatchEvent(new Event('blur', { bubbles: true }));
                keywordsInput.dispatchEvent(new Event('focus', { bubbles: true }));
            }
        }, 200);
        
        console.log('已填写关键词:', aiResult.keywords);
    } else {
        console.log('未找到关键词输入框或AI结果为空');
        console.log('AI结果中的关键词:', aiResult.keywords);
    }

    // 标签 - 备选填写方案
    const hashtagsInput = findInputByLabel('#主题标签(#Хештеги)') || findInputByLabel('标签');
    if (hashtagsInput && aiResult.hashtags) {
        showProgress('正在填写产品标签...', hashtagsInput);
        setNativeValueWithFallback(hashtagsInput, aiResult.hashtags);
        console.log('已填写标签:', aiResult.hashtags);
    } else {
        console.log('未找到标签输入框或AI结果为空');
    }

    // 尺寸逻辑 - 优化跳过条件
    const lengthInput = document.querySelector('input[type="number"][placeholder*="长"]');
    const widthInput = document.querySelector('input[type="number"][placeholder*="宽"]');
    const heightInput = document.querySelector('input[type="number"][placeholder*="高"]');

    // 检查长度字段
    if (lengthInput) {
        const lengthValue = lengthInput.value.trim();
        if (!lengthValue || lengthValue === '0' || lengthValue === '') {
            // 优先使用提取的尺寸信息
            let lengthToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.length !== 'undefined' && extractedDimensions.length) {
                lengthToFill = extractedDimensions.length.toString();
                console.log('使用从URL提取的长度:', lengthToFill);
            } else {
                console.log('使用默认长度:', lengthToFill);
            }
            
            showProgress(`正在填写产品长度(${lengthToFill})...`, lengthInput);
            
            // 检查输入框是否可编辑
            if (lengthInput.readOnly || lengthInput.disabled) {
                console.log('长度输入框被锁定，无法填写');
                hideProgress();
                return;
            }
            
            try {
                setNativeValueWithFallback(lengthInput, lengthToFill);
                console.log(`已填写长度: ${lengthToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (lengthInput.value === lengthToFill) {
                        console.log('长度填写成功');
                    } else {
                        console.log('长度填写可能失败，当前值:', lengthInput.value);
                    }
                    hideProgress();
                }, 500);
                
            } catch (error) {
                console.error('填写长度时出错:', error);
                hideProgress();
            }
        } else {
            console.log('长度字段已有值，跳过填写:', lengthValue);
        }
    } else {
        console.log('未找到长度输入框');
    }

    // 检查宽度字段
    if (widthInput) {
        const widthValue = widthInput.value.trim();
        if (!widthValue || widthValue === '0' || widthValue === '') {
            // 优先使用提取的尺寸信息
            let widthToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.width !== 'undefined' && extractedDimensions.width) {
                widthToFill = extractedDimensions.width.toString();
                console.log('使用从URL提取的宽度:', widthToFill);
            } else {
                console.log('使用默认宽度:', widthToFill);
            }
            
            showProgress(`正在填写产品宽度(${widthToFill})...`, widthInput);
            
            // 检查输入框是否可编辑
            if (widthInput.readOnly || widthInput.disabled) {
                console.log('宽度输入框被锁定，无法填写');
                hideProgress();
                return;
            }
            
            try {
                setNativeValueWithFallback(widthInput, widthToFill);
                console.log(`已填写宽度: ${widthToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (widthInput.value === widthToFill) {
                        console.log('宽度填写成功');
                    } else {
                        console.log('宽度填写可能失败，当前值:', widthInput.value);
                    }
                    hideProgress();
                }, 500);
                
            } catch (error) {
                console.error('填写宽度时出错:', error);
                hideProgress();
            }
        } else {
            console.log('宽度字段已有值，跳过填写:', widthValue);
        }
    } else {
        console.log('未找到宽度输入框');
    }

    // 检查高度字段
    if (heightInput) {
        const heightValue = heightInput.value.trim();
        if (!heightValue || heightValue === '0' || heightValue === '') {
            // 优先使用提取的尺寸信息
            let heightToFill = '200'; // 默认值
            if (extractedDimensions && typeof extractedDimensions.height !== 'undefined' && extractedDimensions.height) {
                heightToFill = extractedDimensions.height.toString();
                console.log('使用从URL提取的高度:', heightToFill);
            } else {
                console.log('使用默认高度:', heightToFill);
            }
            
            showProgress(`正在填写产品高度(${heightToFill})...`, heightInput);
            
            // 检查输入框是否可编辑
            if (heightInput.readOnly || heightInput.disabled) {
                console.log('高度输入框被锁定，无法填写');
                hideProgress();
                return;
            }
            
            try {
                setNativeValueWithFallback(heightInput, heightToFill);
                console.log(`已填写高度: ${heightToFill}`);
                
                // 验证填写是否成功
                setTimeout(() => {
                    if (heightInput.value === heightToFill) {
                        console.log('高度填写成功');
                    } else {
                        console.log('高度填写可能失败，当前值:', heightInput.value);
                    }
                    hideProgress();
                }, 500);
                
            } catch (error) {
                console.error('填写高度时出错:', error);
                hideProgress();
            }
        } else {
            console.log('高度字段已有值，跳过填写:', heightValue);
        }
    } else {
        console.log('未找到高度输入框');
    }
}

// 标记产品
function markProduct() {
    console.log('开始标记产品...');
    
    // 查找标记按钮，使用正确的JavaScript方法
    const allButtons = document.querySelectorAll('button');
    let markBtn = null;
    
    // 查找包含"标记"、"mark"、"Mark"的按钮
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('标记') || text.includes('mark')) {
            markBtn = btn;
            break;
        }
    }
    
    if (markBtn) {
        showProgress('正在标记产品...', markBtn);
        markBtn.click();
        console.log('已点击标记按钮');
    } else {
        console.log('未找到标记按钮');
    }
}

// 更新版本号
async function updateVersion() {
    console.log('开始更新版本号...');
    try {
        // 由于浏览器扩展的安全限制，我们无法直接修改manifest.json文件
        // 但我们可以将新版本号存储到storage中，供popup显示
        const currentTime = new Date().toLocaleString();
        
        // 从storage获取当前版本号
        chrome.storage.local.get(['currentVersion'], function(result) {
            let currentVersion = result.currentVersion || '1.0.34';
            const versionParts = currentVersion.split('.');
            const major = parseInt(versionParts[0]);
            const minor = parseInt(versionParts[1]);
            const patch = parseInt(versionParts[2]);
            
            // 增加patch版本号
            const newPatch = patch + 1;
            const newVersion = `${major}.${minor}.${newPatch}`;
            
            console.log(`版本号更新: ${currentVersion} -> ${newVersion}`);
            
            // 存储新版本号到storage
            chrome.storage.local.set({ 
                currentVersion: newVersion,
                lastUpdateTime: currentTime
            }, function() {
                console.log('版本号已存储到storage');
                
                // 显示版本更新提示
                if (floatingBtn) {
                    const originalText = floatingBtn.textContent;
                    floatingBtn.textContent = `版本已更新: ${newVersion}`;
                    setTimeout(() => {
                        floatingBtn.textContent = originalText;
                    }, 2000);
                }
                
                console.log('版本号更新完成');
            });
        });
        
    } catch (error) {
        console.error('更新版本号失败:', error);
        // 即使版本更新失败，也不影响主要功能
        console.log('版本更新失败，但不影响优化功能');
    }
}

// 检查产品是否已标记
function isProductMarked() {
    console.log('检查产品是否已标记...');
    
    // 查找标记按钮，使用正确的JavaScript方法
    const allButtons = document.querySelectorAll('button');
    let markBtn = null;
    
    // 查找包含"标记"、"mark"、"Mark"的按钮
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('标记') || text.includes('mark')) {
            markBtn = btn;
            break;
        }
    }
    
    if (markBtn) {
        // 检查按钮是否可点击（未标记状态）
        const isClickable = !markBtn.disabled && markBtn.style.display !== 'none';
        console.log('标记按钮状态:', isClickable ? '可点击（未标记）' : '不可点击（已标记）');
        return !isClickable; // 如果不可点击，说明已标记
    }
    
    // 如果没有找到标记按钮，尝试其他方式检查
    // 查找已标记的标识
    const markedIndicator = document.querySelector('[class*="marked"], [class*="collected"], [class*="signed"]');
    if (markedIndicator) {
        console.log('发现已标记标识');
        return true;
    }
    
    // 检查按钮文本是否包含"已标记"、"已收藏"等
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('已标记') || text.includes('已收藏') || text.includes('marked') || text.includes('collected')) {
            console.log('发现已标记按钮:', btn.textContent);
            return true;
        }
    }
    
    console.log('产品未标记');
    return false;
}

// 专门查找产品标题输入框
function findTitleInput() {
    console.log('【调试】开始查找产品标题输入框...');
    
    // 方案1: 通过label for="title"属性（最精确）
    const label = document.querySelector('label[for="title"]');
    if (label) {
        console.log('找到label[for="title"]:', label);
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const input = formItem.querySelector('input.el-input__inner');
            if (input) {
                console.log('通过label for找到标题input:', input);
                return input;
            }
        }
    }
    
    // 方案2: 通过包含"产品标题"的label文本（精确匹配）
    const allLabels = document.querySelectorAll('label');
    for (const label of allLabels) {
        const text = label.textContent.trim();
        if (text === '产品标题：' || text === '产品标题') {
            console.log('找到包含"产品标题"的label:', label);
            const formItem = label.closest('.el-form-item');
            if (formItem) {
                const input = formItem.querySelector('input.el-input__inner');
                if (input) {
                    console.log('通过label文本找到标题input:', input);
                    return input;
                }
            }
        }
    }
    
    // 方案3: 通过span文本精确查找
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
        const text = span.textContent.trim();
        if (text === '产品标题：' || text === '产品标题') {
            console.log('找到产品标题span:', span);
            const formItem = span.closest('.el-form-item');
            if (formItem) {
                const input = formItem.querySelector('input.el-input__inner');
                if (input) {
                    console.log('通过span文本找到标题input:', input);
                    return input;
                }
            }
        }
    }
    
    // 方案4: 兜底 - 查找所有input并输出调试信息
    console.log('【调试】所有input及父级：');
    const allInputs = document.querySelectorAll('input.el-input__inner');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        console.log('input:', input, 'label:', label?.textContent, 'for:', label?.closest('label')?.getAttribute('for'));
    }
    
    return null;
}

// 终极兼容：宽松查找关键词输入框
function findKeywordsInput() {
    console.log('=== 开始查找关键字输入框 ===');
    
    // 1. 找到包含"关键字(Ключевые слова)"的span
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
        const text = span.textContent.trim();
        if (text.includes('关键字') && text.includes('Ключевые слова')) {
            console.log('找到关键字标签span:', span.outerHTML);
            
            // 2. 找到包含这个span的edit-field-label
            const labelDiv = span.closest('.edit-field-label');
            if (labelDiv) {
                console.log('找到edit-field-label:', labelDiv.outerHTML);
                
                // 3. 找到edit-field-label的兄弟元素edit-field-content
                const contentDiv = labelDiv.nextElementSibling;
                if (contentDiv && contentDiv.classList.contains('edit-field-content')) {
                    console.log('找到edit-field-content:', contentDiv.outerHTML);
                    
                    // 4. 在edit-field-content中查找input
                    const input = contentDiv.querySelector('input.el-input__inner');
                    if (input) {
                        // 额外验证：确保不是标题输入框
                        if (input.placeholder === '请输入' && !input.readOnly) {
                            console.log('✅ 找到正确的关键字input:', input.outerHTML);
                            return input;
                        } else {
                            console.log('❌ 过滤掉input:', input.outerHTML, '原因:', input.readOnly ? 'readonly' : 'placeholder不是请输入');
                        }
                    } else {
                        console.log('❌ 在edit-field-content中未找到input');
                    }
                } else {
                    console.log('❌ 未找到edit-field-content兄弟元素');
                }
            } else {
                console.log('❌ 未找到edit-field-label父级');
            }
        }
    }
    
    console.log('=== 精确查找失败，尝试备用扫描 ===');
    
    // 备用方案：简化扫描
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        const text = element.textContent || '';
        if (text.includes('关键字') && text.includes('Ключевые слова')) {
            // 从这个元素开始，向上查找所有父级容器
            let current = element;
            while (current && current !== document.body) {
                // 在当前容器中查找所有input
                const inputs = current.querySelectorAll('input');
                for (const input of inputs) {
                    // 检查input是否在正确的容器中
                    if (input.closest('.el-form-item') || input.closest('.edit-field-content')) {
                        // 确保是真正的关键字输入框
                        if (!input.readOnly && input.placeholder === '请输入' && input.type === 'text') {
                            // 额外验证：检查这个input是否在包含关键字标签的容器中
                            const container = input.closest('.el-form-item, .edit-field-content');
                            if (container) {
                                const containerText = container.textContent || '';
                                if (containerText.includes('关键字') && containerText.includes('Ключевые слова')) {
                                    console.log('✅ 备用扫描找到关键字input:', input.outerHTML);
                                    return input;
                                }
                            }
                        }
                    }
                }
                current = current.parentElement;
            }
        }
    }
    
    console.log('=== 所有查找方法都失败了 ===');
    return null;
}

// 优化字段识别调试输出，显示新查找逻辑
async function testFieldRecognition() {
    console.log('【唯一标记】testFieldRecognition新版');
    console.log('=== 字段识别测试 ===');
    
    // 测试标题输入框
    let titleInput = findTitleInput();
    if (titleInput) {
        console.log('✅ 找到 标题 输入框:', titleInput.outerHTML);
    } else {
        console.log('❌ 未找到 标题 输入框');
    }
    
    // 测试关键字输入框
    let keywordInput = findKeywordsInput();
    if (keywordInput) {
        console.log('✅ 找到 关键词 输入框（新结构适配）:', keywordInput.outerHTML);
    } else {
        console.log('❌ 未找到 关键词 输入框（新结构适配）');
    }
    
    // 输出所有input的详细信息
    console.log('=== 所有input详细信息 ===');
    const allInputs = document.querySelectorAll('input');
    for (const input of allInputs) {
        const formItem = input.closest('.el-form-item');
        const label = formItem ? formItem.querySelector('label span') : null;
        const editFieldLabel = input.closest('.edit-field-label');
        const editFieldContent = input.closest('.edit-field-content');
        
        console.log('input:', {
            outerHTML: input.outerHTML,
            placeholder: input.placeholder,
            readOnly: input.readOnly,
            type: input.type,
            className: input.className,
            labelText: label?.textContent?.trim(),
            hasEditFieldLabel: !!editFieldLabel,
            hasEditFieldContent: !!editFieldContent
        });
    }
    
    console.log('=== 字段识别测试完成 ===');
}

// 主函数
async function main() {
    if (!floatingBtn) {
        console.error('悬浮按钮不存在');
        return;
    }
    
    try {
        // 0. 先测试字段识别
        floatingBtn.textContent = '测试字段识别...';
        showProgress('正在测试字段识别...');
        await testFieldRecognition();
        
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        
        // 1. 检查产品是否已标记
        floatingBtn.textContent = '检查产品状态...';
        showProgress('正在检查产品状态...');
        
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        
        if (isProductMarked()) {
            floatingBtn.textContent = '产品已标记❌';
            showProgress('产品已标记，跳过优化');
            setTimeout(() => {
                floatingBtn.textContent = '开始优化';
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
                hideProgress();
            }, 3000);
            console.log('产品已标记，跳过优化');
            return;
        }
        
        // 1. 采集信息
        floatingBtn.textContent = '采集信息中...';
        showProgress('正在采集产品信息...');
        
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        
        const { presetInfo, pageInfo } = await collectInfo();
        
        // 检查API配置
        if (presetInfo.apiPlatform === 'deepseek' && !presetInfo.deepseekApiKey) {
            throw new Error('请在插件设置中配置DeepSeek API Key');
        }
        if (presetInfo.apiPlatform === 'tongyi' && !presetInfo.tongyiApiKey) {
            throw new Error('请在插件设置中配置通义千问 API Key');
        }
        if (presetInfo.apiPlatform === 'bailian' && !presetInfo.bailianApiKey) {
            throw new Error('请在插件设置中配置百炼 API Key');
        }
        
        // 2. 调用AI
        floatingBtn.textContent = '调用AI中...';
        showProgress('正在调用AI生成优化内容...');
        
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        
        const prompt = buildPrompt(presetInfo, pageInfo);
        
        let apiKey = '';
        if (presetInfo.apiPlatform === 'deepseek') {
            apiKey = presetInfo.deepseekApiKey;
        } else if (presetInfo.apiPlatform === 'tongyi') {
            apiKey = presetInfo.tongyiApiKey;
        } else if (presetInfo.apiPlatform === 'bailian') {
            apiKey = presetInfo.bailianApiKey;
        }
        
        const aiResponse = await callAI(presetInfo.apiPlatform, apiKey, prompt);
        
        // 3. 填写内容
        floatingBtn.textContent = '填写内容中...';
        showProgress('正在填写优化内容...');
        
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        
        const aiResult = parseAIResponse(aiResponse);
        console.log('=== AI解析结果 ===');
        console.log('标题:', aiResult.title);
        console.log('描述:', aiResult.description);
        console.log('关键词:', aiResult.keywords);
        console.log('标签:', aiResult.hashtags);
        console.log('=== AI解析结果结束 ===');
        
        // 填写字段
        await fillFields(aiResult, pageInfo.extractedDimensions);
        
        // 4. 更新版本
        showProgress('正在更新版本号...');
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        await updateVersion();
        
        // 5. 标记产品（只有在优化成功后才标记）
        floatingBtn.textContent = '标记产品中...';
        showProgress('正在标记产品...');
        if (!isOptimizing) {
            console.log('优化已暂停');
            hideProgress();
            return;
        }
        markProduct();
        
        // 6. 完成
        floatingBtn.textContent = '优化完成✔';
        showProgress('优化完成！');
        setTimeout(() => {
            floatingBtn.textContent = '开始优化';
            floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            isOptimizing = false;
            hideProgress();
        }, 3000);
        
        console.log('优化流程完成');
        
        // 返回AI结果供调用者使用
        return aiResult;
        
    } catch (error) {
        console.error('优化失败:', error);
        if (floatingBtn) {
            floatingBtn.textContent = '优化失败❌';
            floatingBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
            showProgress('优化失败: ' + error.message);
            setTimeout(() => {
                floatingBtn.textContent = '开始优化';
                floatingBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                isOptimizing = false;
                hideProgress();
            }, 3000);
        }
        // 优化失败时不标记产品
        console.log('优化失败，跳过产品标记');
        throw error;
    }
}

// 页面加载时自动添加悬浮按钮
window.addEventListener('DOMContentLoaded', () => {
    console.log('【唯一标记】DOMContentLoaded事件触发');
    initFloatingBtn();
});

// 如果页面已经加载完成，直接执行
if (document.readyState === 'loading') {
    console.log('【唯一标记】页面正在加载，等待DOMContentLoaded事件');
} else {
    console.log('【唯一标记】页面已加载，直接初始化...');
    // 确保只执行一次初始化
    setTimeout(() => {
        initFloatingBtn();
    }, 100);
} 

// 在文件末尾追加样式注入
(function injectFloatingBtnFixedStyle() {
    const style = document.createElement('style');
    style.textContent = `
    .floating-btn, .floating-btn.dragging {
        position: fixed !important;
        width: 80px !important;
        height: 120px !important;
        min-width: 80px !important;
        max-width: 80px !important;
        min-height: 120px !important;
        max-height: 120px !important;
        left: 0 !important;
        top: 0 !important;
        border-radius: 40px !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: bold !important;
        overflow: hidden !important;
        transition: none !important;
        z-index: 99999 !important;
        user-select: none !important;
        background: linear-gradient(90deg, #6a9cf7 0%, #7b5be6 100%) !important;
    }
    `;
    document.head.appendChild(style);
})(); 

async function fetch1688PackageInfo(url) {
    try {
        const resp = await fetch(url, { credentials: 'omit' });
        const html = await resp.text();
        // 解析包装信息表格
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // 找到"包装信息"标题
        const title = Array.from(doc.querySelectorAll('h2, h3, span, div')).find(el => el.textContent && el.textContent.includes('包装信息'));
        if (!title) return '';
        // 找到下一个table
        let table = title.nextElementSibling;
        while (table && table.tagName !== 'TABLE') table = table.nextElementSibling;
        if (!table) return '';
        // 提取每一行
        const rows = table.querySelectorAll('tr');
        let result = [];
        for (const row of rows) {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
                result.push(`${cells[0].textContent.trim()}: ${cells[1].textContent.trim()}`);
            }
        }
        return result.join('\n');
    } catch (e) {
        console.error('采集1688包装信息失败:', e);
        return '';
    }
}

// 图片优化相关函数
async function optimizeImages() {
    try {
        console.log('开始图片优化...');
        showProgress('正在优化产品图片...');
        
        // 获取图片优化设置
        const settings = await getImageOptimizationSettings();
        if (!settings.enableImageOptimization) {
            console.log('图片优化已禁用，跳过');
            hideProgress();
            return;
        }
        
        // 查找页面中的图片上传区域
        const imageUploadAreas = findImageUploadAreas();
        if (imageUploadAreas.length === 0) {
            console.log('未找到图片上传区域');
            hideProgress();
            return;
        }
        
        console.log(`找到 ${imageUploadAreas.length} 个图片上传区域`);
        
        // 处理每个图片上传区域
        for (let i = 0; i < imageUploadAreas.length; i++) {
            const area = imageUploadAreas[i];
            showProgress(`正在处理图片区域 ${i + 1}/${imageUploadAreas.length}...`);
            
            await processImageUploadArea(area, settings);
        }
        
        showProgress('图片优化完成！');
        setTimeout(() => hideProgress(), 2000);
        
    } catch (error) {
        console.error('图片优化失败:', error);
        showProgress('图片优化失败: ' + error.message);
        setTimeout(() => hideProgress(), 3000);
    }
}

// 获取图片优化设置
async function getImageOptimizationSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'enableImageOptimization',
            'imageOptimizationType',
            'targetImageSize',
            'imageQuality'
        ], (result) => {
            resolve({
                enableImageOptimization: result.enableImageOptimization !== false,
                imageOptimizationType: result.imageOptimizationType || 'smart_ecommerce',
                targetImageSize: result.targetImageSize || '1000x1000',
                imageQuality: result.imageQuality || 'high'
            });
        });
    });
}

// 点击页面中的图片优化按钮
async function clickImageOptimizeButtons() {
    try {
        console.log('查找并点击图片优化按钮...');
        
        // 查找包含"优化"、"Optimize"等关键词的按钮
        const optimizeSelectors = [
            'button',
            '.btn',
            '.button',
            '.el-button',
            'a',
            '.link',
            '.optimize-btn',
            '.image-optimize',
            '.upload-btn'
        ];
        
        let clickedCount = 0;
        
        for (const selector of optimizeSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = (element.textContent || '').toLowerCase();
                const title = (element.title || '').toLowerCase();
                const placeholder = (element.placeholder || '').toLowerCase();
                
                // 检查是否包含优化相关关键词
                if (text.includes('优化') || text.includes('optimize') || 
                    text.includes('图片优化') || text.includes('image optimize') ||
                    title.includes('优化') || title.includes('optimize') ||
                    placeholder.includes('优化') || placeholder.includes('optimize')) {
                    
                    console.log('找到图片优化按钮:', element);
                    
                    // 检查按钮是否可见且可点击
                    if (element.offsetWidth > 0 && element.offsetHeight > 0 && 
                        !element.disabled && element.style.display !== 'none') {
                        
                        try {
                            // 高亮显示要点击的按钮
                            element.style.outline = '2px solid #ff6b6b';
                            element.style.outlineOffset = '2px';
                            
                            // 点击按钮
                            element.click();
                            clickedCount++;
                            
                            console.log('已点击图片优化按钮:', element);
                            
                            // 等待一小段时间再点击下一个
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                        } catch (error) {
                            console.error('点击图片优化按钮失败:', error);
                        }
                    }
                }
            }
        }
        
        console.log(`总共点击了 ${clickedCount} 个图片优化按钮`);
        
        // 移除高亮
        setTimeout(() => {
            const highlightedElements = document.querySelectorAll('[style*="outline: 2px solid #ff6b6b"]');
            highlightedElements.forEach(el => {
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
        }, 2000);
        
    } catch (error) {
        console.error('点击图片优化按钮失败:', error);
    }
}

// 查找图片上传区域
function findImageUploadAreas() {
    const areas = [];
    
    // 查找常见的图片上传区域选择器
    const selectors = [
        '.image-upload-area',
        '.upload-area',
        '.image-container',
        '.product-images',
        '.sku-images',
        '.main-images',
        '[data-type="image"]',
        '.el-upload',
        '.upload-list',
        '.image-list',
        '.el-upload__input',
        '.upload-dragger',
        '.upload-area',
        '.image-upload',
        '.file-upload'
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                console.log('找到图片上传区域:', selector, element);
                areas.push(element);
            }
        }
    }
    
    // 查找包含"图片"、"上传"等关键词的元素
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        const text = element.textContent || '';
        if (text.includes('图片') || text.includes('上传') || text.includes('Image') || text.includes('Upload') || 
            text.includes('SKU图片') || text.includes('产品图片') || text.includes('主图')) {
            if (element.offsetWidth > 50 && element.offsetHeight > 50) {
                console.log('找到包含关键词的图片区域:', text, element);
                areas.push(element);
            }
        }
    }
    
    // 查找所有img标签的父容器
    const images = document.querySelectorAll('img');
    for (const img of images) {
        const parent = img.parentElement;
        if (parent && parent.offsetWidth > 100 && parent.offsetHeight > 100) {
            console.log('找到图片父容器:', parent);
            if (!areas.includes(parent)) {
                areas.push(parent);
            }
        }
    }
    
    console.log('总共找到图片上传区域数量:', areas.length);
    return areas;
}

// 处理图片上传区域
async function processImageUploadArea(area, settings) {
    try {
        console.log('处理图片上传区域:', area);
        
        // 查找区域内的图片元素
        const images = area.querySelectorAll('img');
        console.log(`找到 ${images.length} 张图片`);
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            showProgress(`正在优化图片 ${i + 1}/${images.length}...`);
            
            await optimizeSingleImage(img, settings);
        }
        
        // 查找上传按钮并触发优化
        const uploadButtons = area.querySelectorAll('button, input[type="file"], .upload-btn');
        for (const button of uploadButtons) {
            if (button.textContent && (button.textContent.includes('优化') || button.textContent.includes('Optimize'))) {
                console.log('触发图片优化按钮:', button);
                button.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
    } catch (error) {
        console.error('处理图片上传区域失败:', error);
    }
}

// 优化单张图片
async function optimizeSingleImage(img, settings) {
    try {
        const src = img.src;
        if (!src || src.startsWith('data:')) {
            console.log('跳过无效图片:', src);
            return;
        }
        
        console.log('优化图片:', src);
        
        // 根据设置类型进行不同的优化处理
        switch (settings.imageOptimizationType) {
            case 'white_background':
                await applyWhiteBackground(img);
                break;
            case 'enhance_quality':
                await enhanceImageQuality(img);
                break;
            case 'resize':
                await resizeImage(img, settings.targetImageSize);
                break;
            case 'compress':
                await compressImage(img, settings.imageQuality);
                break;
            case 'ecommerce_standard':
                await ecommerceStandardOptimize(img, settings);
                break;
            case 'smart_ecommerce':
                await smartEcommerceOptimize(img, settings);
                break;
            case 'ozon_optimized':
                await ozonOptimize(img, settings);
                break;
            case 'amazon_style':
                await amazonStyleOptimize(img, settings);
                break;
            case 'instagram_ready':
                await instagramReadyOptimize(img, settings);
                break;
            case 'auto':
            default:
                await autoOptimizeImage(img, settings);
                break;
        }
        
    } catch (error) {
        console.error('优化单张图片失败:', error);
    }
}

// 应用白底处理
async function applyWhiteBackground(img) {
    try {
        console.log('应用白底处理');
        
        // 创建canvas进行图片处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 等待图片加载
        await new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            tempImg.src = img.src;
        });
        
        // 设置canvas尺寸
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('白底处理失败:', error);
    }
}

// 增强图片质量
async function enhanceImageQuality(img) {
    try {
        console.log('增强图片质量');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 绘制高质量图片
        ctx.drawImage(img, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('增强图片质量失败:', error);
    }
}

// 调整图片尺寸
async function resizeImage(img, targetSize) {
    try {
        console.log('调整图片尺寸到:', targetSize);
        
        const [width, height] = targetSize.split('x').map(Number);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // 高质量缩放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('调整图片尺寸失败:', error);
    }
}

// 智能选择电商尺寸
function getOptimalEcommerceSize(img) {
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    const aspectRatio = originalWidth / originalHeight;
    
    console.log('原始图片尺寸:', originalWidth, 'x', originalHeight, '比例:', aspectRatio.toFixed(2));
    
    // 根据比例选择最适合的电商尺寸
    if (aspectRatio >= 1.5) {
        // 宽屏图片
        return '1200x800';
    } else if (aspectRatio <= 0.7) {
        // 长屏图片
        return '800x1200';
    } else if (aspectRatio >= 1.2) {
        // 横版图片
        return '1000x750';
    } else if (aspectRatio <= 0.8) {
        // 竖版图片
        return '750x1000';
    } else {
        // 接近正方形，使用标准电商尺寸
        return '1000x1000';
    }
}

// 智能电商优化
async function smartEcommerceOptimize(img, settings) {
    try {
        console.log('执行智能电商优化');
        
        // 自动选择最适合的尺寸
        const optimalSize = getOptimalEcommerceSize(img);
        console.log('智能选择的尺寸:', optimalSize);
        
        // 应用电商标准优化
        await resizeImage(img, optimalSize);
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
    } catch (error) {
        console.error('智能电商优化失败:', error);
    }
}

// 压缩图片
async function compressImage(img, quality) {
    try {
        console.log('压缩图片，质量:', quality);
        
        const qualityMap = {
            'high': 0.9,
            'medium': 0.7,
            'low': 0.5
        };
        
        const compressionQuality = qualityMap[quality] || 0.7;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        ctx.drawImage(img, 0, 0);
        
        // 压缩图片
        img.src = canvas.toDataURL('image/jpeg', compressionQuality);
        
    } catch (error) {
        console.error('压缩图片失败:', error);
    }
}

// 自动优化图片
async function autoOptimizeImage(img, settings) {
    try {
        console.log('自动优化图片');
        
        // 组合多种优化方法
        await resizeImage(img, settings.targetImageSize);
        await applyWhiteBackground(img);
        await compressImage(img, settings.imageQuality);
        
    } catch (error) {
        console.error('自动优化图片失败:', error);
    }
}

// 电商标准优化
async function ecommerceStandardOptimize(img, settings) {
    try {
        console.log('执行电商标准优化');
        
        // 电商标准：1000x1000，白底，高质量
        await resizeImage(img, '1000x1000');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
    } catch (error) {
        console.error('电商标准优化失败:', error);
    }
}

// Ozon平台优化
async function ozonOptimize(img, settings) {
    try {
        console.log('执行Ozon平台优化');
        
        // Ozon推荐：1200x1200，白底，超高质量
        await resizeImage(img, '1200x1200');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加Ozon特定的图片处理
        await applyOzonSpecificEnhancement(img);
        
    } catch (error) {
        console.error('Ozon平台优化失败:', error);
    }
}

// 亚马逊风格优化
async function amazonStyleOptimize(img, settings) {
    try {
        console.log('执行亚马逊风格优化');
        
        // 亚马逊推荐：1000x1000，白底，专业质量
        await resizeImage(img, '1000x1000');
        await applyWhiteBackground(img);
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加亚马逊特定的图片处理
        await applyAmazonStyleEnhancement(img);
        
    } catch (error) {
        console.error('亚马逊风格优化失败:', error);
    }
}

// Instagram就绪优化
async function instagramReadyOptimize(img, settings) {
    try {
        console.log('执行Instagram就绪优化');
        
        // Instagram推荐：1080x1080，高质量
        await resizeImage(img, '1080x1080');
        await enhanceImageQuality(img);
        await compressImage(img, 'high');
        
        // 添加Instagram特定的图片处理
        await applyInstagramEnhancement(img);
        
    } catch (error) {
        console.error('Instagram就绪优化失败:', error);
    }
}

// Ozon特定增强
async function applyOzonSpecificEnhancement(img) {
    try {
        console.log('应用Ozon特定增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // 轻微锐化处理（适合Ozon平台）
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 简单的锐化滤镜
        for (let i = 0; i < data.length; i += 4) {
            if (i > 0 && i < data.length - 4) {
                data[i] = Math.min(255, data[i] * 1.05);     // R
                data[i + 1] = Math.min(255, data[i + 1] * 1.05); // G
                data[i + 2] = Math.min(255, data[i + 2] * 1.05); // B
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('Ozon特定增强失败:', error);
    }
}

// 亚马逊风格增强
async function applyAmazonStyleEnhancement(img) {
    try {
        console.log('应用亚马逊风格增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // 亚马逊风格：轻微对比度增强
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 轻微提高对比度
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.1 + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.1 + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.1 + 128)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('亚马逊风格增强失败:', error);
    }
}

// Instagram增强
async function applyInstagramEnhancement(img) {
    try {
        console.log('应用Instagram增强');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // 高质量渲染设置
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // Instagram风格：轻微饱和度增强
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 轻微提高饱和度
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = Math.min(255, avg + (data[i] - avg) * 1.1);     // R
            data[i + 1] = Math.min(255, avg + (data[i + 1] - avg) * 1.1); // G
            data[i + 2] = Math.min(255, avg + (data[i + 2] - avg) * 1.1); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // 更新图片源
        img.src = canvas.toDataURL('image/jpeg', 0.95);
        
    } catch (error) {
        console.error('Instagram增强失败:', error);
    }
}

 