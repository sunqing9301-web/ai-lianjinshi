/**
 * 产品优化核心模块 - 处理产品信息提取和优化的核心逻辑
 * @version 1.0.87
 * @author OZON产品优化助手
 */

class ProductOptimizer {
    static isOptimizing = false;
    static currentTask = null;
    static optimizationHistory = [];
    
    /**
     * 初始化产品优化器
     */
    static async init() {
        try {
            await this.loadOptimizationHistory();
            console.log('✅ 产品优化器初始化成功');
        } catch (error) {
            console.error('❌ 产品优化器初始化失败:', error);
        }
    }
    
    /**
     * 开始优化产品信息
     * @param {Object} options - 优化选项
     * @returns {Promise<Object>} 优化结果
     */
    static async optimizeProduct(options = {}) {
        if (this.isOptimizing) {
            throw new Error('正在进行优化，请等待当前任务完成');
        }
        
        this.isOptimizing = true;
        const startTime = Date.now();
        
        try {
            // 创建进度指示器
            const progressIndicator = window.UIComponents?.createProgressIndicator({
                title: '正在优化产品信息...',
                closable: false
            });
            
            // 更新进度
            const updateProgress = (progress, text) => {
                if (window.UIComponents) {
                    window.UIComponents.updateProgress(progress, text);
                }
            };
            
            updateProgress(10, '正在提取产品信息...');
            
            // 1. 提取产品信息
            const productInfo = await this.extractProductInfo();
            updateProgress(30, '产品信息提取完成');
            
            // 2. 获取配置（嵌套schema）
            const config = await window.ConfigManager?.getAll() || {};
            const platform = (config.api && config.api.platform) ? config.api.platform : 'deepseek';
            const apiKey = window.ConfigManager?.get(`api.${platform}.apiKey`) || '';
            
            if (!apiKey) {
                throw new Error(`${platform} API密钥未配置，请在设置中配置`);
            }
            
            updateProgress(40, '正在生成优化提示词...');
            
            // 3. 生成优化提示词
            const prompt = this.generateOptimizationPrompt(
                productInfo,
                (config.presets || {})
            );
            updateProgress(50, '正在调用AI进行优化...');
            
            // 4. 调用AI API进行优化
            const optimizedContent = await window.APIManager?.callAPI(platform, apiKey, prompt, {
                timeout: (config.optimization && config.optimization.optimizationTimeout) || 30000,
                maxTokens: 2000,
                temperature: 0.7
            });
            
            updateProgress(70, '正在解析优化结果...');
            
            // 5. 解析优化结果
            const optimizationResult = this.parseOptimizationResult(optimizedContent);
            updateProgress(80, '正在应用优化结果...');
            
            // 6. 应用优化结果
            await this.applyOptimization(optimizationResult, options.autoApply !== false);
            updateProgress(90, '正在保存优化记录...');
            
            // 7. 保存优化记录
            const record = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                originalInfo: productInfo,
                optimizedResult: optimizationResult,
                platform: platform,
                duration: Date.now() - startTime,
                success: true
            };
            
            await this.saveOptimizationRecord(record);
            updateProgress(100, '优化完成！');
            
            // 延迟移除进度指示器
            setTimeout(() => {
                if (window.UIComponents) {
                    window.UIComponents.removeComponent('progressIndicator');
                }
            }, 2000);
            
            // 显示成功通知
            if (window.UIComponents) {
                window.UIComponents.showNotification({
                    title: '优化成功',
                    message: `产品信息已成功优化，耗时 ${Math.round((Date.now() - startTime) / 1000)} 秒`,
                    type: 'success',
                    duration: 5000
                });
            }
            
            return {
                success: true,
                data: optimizationResult,
                duration: Date.now() - startTime,
                recordId: record.id
            };
            
        } catch (error) {
            console.error('产品优化失败:', error);
            
            // 移除进度指示器
            if (window.UIComponents) {
                window.UIComponents.removeComponent('progressIndicator');
            }
            
            // 显示错误通知
            if (window.UIComponents) {
                window.UIComponents.showNotification({
                    title: '优化失败',
                    message: error.message || '未知错误',
                    type: 'error',
                    duration: 8000
                });
            }
            
            // 保存失败记录
            const failureRecord = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                error: error.message,
                duration: Date.now() - startTime,
                success: false
            };
            
            await this.saveOptimizationRecord(failureRecord);
            
            throw error;
        } finally {
            this.isOptimizing = false;
        }
    }
    
    /**
     * 提取产品信息
     * @returns {Promise<Object>} 产品信息
     */
    static async extractProductInfo() {
        const productInfo = {
            title: '',
            description: '',
            price: '',
            images: [],
            attributes: {},
            category: '',
            brand: '',
            sku: '',
            stock: '',
            url: window.location.href,
            sourceUrl: ''
        };
        
        try {
            // 等待页面加载完成
            await window.DOMUtils?.waitForPageLoad();
            const isMiaoshouERP = /erp\.91miaoshou\.com/.test(location.hostname || '');
            
            // 妙手ERP优先：直接从表单读取来源链接、标题、描述、分类
            if (isMiaoshouERP) {
                try {
                    // 来源URL：优先标准name字段；否则任何可能的URL输入
                    let src = '';
                    const stdUrl = document.querySelector('input[name="sourceUrl"]');
                    if (stdUrl && stdUrl.value) src = stdUrl.value.trim();
                    if (!src) {
                        const urlInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
                        for (const input of urlInputs) {
                            const placeholder = (input.placeholder || '').toLowerCase();
                            const value = (input.value || '').trim();
                            if (
                                placeholder.includes('链接') ||
                                placeholder.includes('url') ||
                                /https?:\/\//i.test(value)
                            ) {
                                src = value;
                                break;
                            }
                        }
                    }
                    productInfo.sourceUrl = src;
                    
                    // 标题：通过label/span 文本包含“产品标题”定位到同一表单项内的 input
                    if (!productInfo.title) {
                        const labelEl = Array.from(document.querySelectorAll('label, span')).find(el => (el.textContent || '').includes('产品标题'));
                        const input = labelEl?.closest('.el-form-item')?.querySelector('input.el-input__inner');
                        if (input && input.value) productInfo.title = input.value.trim();
                    }
                    
                    // 描述：通过label/span 文本包含“描述”定位到 textarea
                    if (!productInfo.description) {
                        const labelEl = Array.from(document.querySelectorAll('label, span')).find(el => (el.textContent || '').includes('描述'));
                        const textarea = labelEl?.closest('.el-form-item')?.querySelector('textarea.el-textarea__inner');
                        if (textarea && textarea.value) productInfo.description = textarea.value.trim();
                    }
                    
                    // 分类：cascader/只读input
                    if (!productInfo.category) {
                        const catLabel = Array.from(document.querySelectorAll('label, span')).find(el => /产品分类|类别/.test(el.textContent || ''));
                        let catValue = '';
                        if (catLabel) {
                            const formItem = catLabel.closest('.el-form-item');
                            if (formItem) {
                                const inputEl = formItem.querySelector('input[readonly], input.el-input__inner, .el-cascader input');
                                if (inputEl && inputEl.value) catValue = inputEl.value.trim();
                            }
                        }
                        if (!catValue) {
                            const cascaderInput = document.querySelector('.el-cascader input, .jx-pro-input input');
                            if (cascaderInput && cascaderInput.value) {
                                const parentText = cascaderInput.closest('.el-form-item')?.textContent || '';
                                if (/产品分类|类别/.test(parentText)) catValue = cascaderInput.value.trim();
                            }
                        }
                        if (!catValue) {
                            const readonlyInputs = document.querySelectorAll('input[readonly]');
                            for (const ri of readonlyInputs) {
                                const pt = ri.closest('.el-form-item')?.textContent || '';
                                if (/产品分类|类别/.test(pt) && ri.value) { catValue = ri.value.trim(); break; }
                            }
                        }
                        productInfo.category = catValue;
                    }
                } catch (e) {
                    console.warn('ERP字段提取失败，降级到通用提取:', e);
                }
            }
            
            // 若仍为空，再从通用页面结构提取标题
            if (!productInfo.title) {
                const titleSelectors = [
                    'h1[data-widget="webProductHeading"]',
                    '.product-title',
                    'h1.product-name',
                    'h1',
                    '[data-testid="product-title"]'
                ];
                const titleElement = await window.DOMUtils?.findElementBySelectors(titleSelectors);
                if (titleElement) productInfo.title = (titleElement.textContent || '').trim();
            }
            
            // 若仍为空，再从通用页面结构提取描述
            if (!productInfo.description) {
                const descriptionSelectors = [
                    '[data-widget="webProductDescription"]',
                    '.product-description',
                    '.description',
                    '[data-testid="product-description"]'
                ];
                const descElement = await window.DOMUtils?.findElementBySelectors(descriptionSelectors);
                if (descElement) productInfo.description = (descElement.textContent || '').trim();
            }
            
            // 提取价格
            const priceSelectors = [
                '[data-widget="webPrice"]',
                '.price-current',
                '.product-price',
                '[data-testid="price-current"]',
                '.price'
            ];
            
            const priceElement = await window.DOMUtils?.findElementBySelectors(priceSelectors);
            if (priceElement) {
                productInfo.price = priceElement.textContent.trim();
            }
            
            // 提取图片
            const imageSelectors = [
                '[data-widget="webGallery"] img',
                '.product-images img',
                '.gallery img',
                '[data-testid="product-image"]'
            ];
            
            const imageElements = document.querySelectorAll(imageSelectors.join(', '));
            productInfo.images = Array.from(imageElements)
                .map(img => img.src || img.dataset.src)
                .filter(src => src && src.startsWith('http'))
                .slice(0, 10); // 限制图片数量
            
            // 提取属性
            const attributeSelectors = [
                '[data-widget="webCharacteristics"]',
                '.product-attributes',
                '.characteristics',
                '[data-testid="product-attributes"]'
            ];
            
            const attrContainer = await window.DOMUtils?.findElementBySelectors(attributeSelectors);
            if (attrContainer) {
                const attrItems = attrContainer.querySelectorAll('dt, dd, .attr-name, .attr-value');
                let currentKey = null;
                
                attrItems.forEach(item => {
                    const text = item.textContent.trim();
                    if (item.tagName === 'DT' || item.classList.contains('attr-name')) {
                        currentKey = text;
                    } else if (currentKey && (item.tagName === 'DD' || item.classList.contains('attr-value'))) {
                        productInfo.attributes[currentKey] = text;
                        currentKey = null;
                    }
                });
            }
            
            // 提取品牌
            const brandSelectors = [
                '[data-widget="webBrand"]',
                '.product-brand',
                '.brand',
                '[data-testid="product-brand"]'
            ];
            
            const brandElement = await window.DOMUtils?.findElementBySelectors(brandSelectors);
            if (brandElement) {
                productInfo.brand = brandElement.textContent.trim();
            }
            
            // 提取SKU
            const skuSelectors = [
                '[data-widget="webSku"]',
                '.product-sku',
                '.sku',
                '[data-testid="product-sku"]'
            ];
            
            const skuElement = await window.DOMUtils?.findElementBySelectors(skuSelectors);
            if (skuElement) {
                productInfo.sku = skuElement.textContent.trim();
            }
            
            console.log('✅ 产品信息提取完成:', productInfo);
            return productInfo;
            
        } catch (error) {
            console.error('❌ 产品信息提取失败:', error);
            throw new Error(`产品信息提取失败: ${error.message}`);
        }
    }
    
    /**
     * 生成优化提示词
     * @param {Object} productInfo - 产品信息
     * @param {Object} presetAttributes - 预设属性
     * @returns {string} 优化提示词
     */
    static generateOptimizationPrompt(productInfo, presetAttributes = {}) {
        // 构建尺寸信息文本（尽量贴合旧版逻辑，若无则不添加）
        let dimensionsText = '';
        const lengthVal = productInfo.attributes?.['长度'] || productInfo.attributes?.['长'];
        const widthVal = productInfo.attributes?.['宽度'] || productInfo.attributes?.['宽'];
        const heightVal = productInfo.attributes?.['高度'] || productInfo.attributes?.['高'];
        if (lengthVal || widthVal || heightVal) {
            dimensionsText = `\n产品尺寸信息：\n- 长度: ${lengthVal || '未填写'}\n- 宽度: ${widthVal || '未填写'}\n- 高度: ${heightVal || '未填写'}`;
        }

        // 旧版可选的包装信息片段
        const pkgParts = [];
        if (presetAttributes.configuration) pkgParts.push(`配置: ${presetAttributes.configuration}`);
        if (presetAttributes.manufacturer) pkgParts.push(`制造商: ${presetAttributes.manufacturer}`);
        if (presetAttributes.packageQuantity) pkgParts.push(`包装数量: ${presetAttributes.packageQuantity}`);
        if (presetAttributes.targetAudience) pkgParts.push(`目标受众: ${presetAttributes.targetAudience}`);
        const packageInfoBlock = pkgParts.length > 0 ? `\n包装信息：\n${pkgParts.join('\n')}` : '';

        // 旧版提示词（保持不变）
        let prompt = `你是一个专业的Ozon电商产品优化专家。请根据以下产品信息，生成优化的产品属性：\n\n产品基本信息：\n- 产品来源URL: ${productInfo.url || '未提供'}\n- 产品分类: ${productInfo.category || '未提供'}\n- 当前产品标题: ${productInfo.title || '未提供'}\n- 当前产品描述: ${productInfo.description || '未提供'}${dimensionsText}`;
        if (packageInfoBlock) {
            prompt += packageInfoBlock;
        }
        prompt += `\n\n请生成以下内容（全部使用俄语）：\n\n产品标题（核心标题 + 长尾关键词）：\n产品描述（至少300字，不包含尺寸信息，要有标点符号）：\n产品关键词（至少20个，用分号分隔）：\n产品标签（俄语，社交媒体风格，不包含品牌名，安全词汇，以#开头，只能包含字母、数字、下划线，最大28字符，数量最少25个，数量最好30个，用空格分隔）：\n\n请严格按照以上格式输出，每个部分都要有明确的标题。注意：标题必须使用中文，内容使用俄语。**不要输出任何markdown语法，不要加粗，不要用**包裹内容。**`;

        console.log('构建的AI提示词(旧版模板):', prompt);
        return prompt;
    }
    
    /**
     * 解析优化结果
     * @param {string} content - AI返回的内容
     * @returns {Object} 解析后的优化结果
     */
    static parseOptimizationResult(content) {
        try {
            if (!content || typeof content !== 'string') {
                throw new Error('空的优化结果');
            }
            // 优先尝试JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const result = JSON.parse(jsonStr);
                if (!result.title || !result.description) {
                    throw new Error('优化结果缺少必要字段');
                }
                result.keywords = result.keywords || [];
                result.highlights = result.highlights || [];
                return {
                    title: result.title.trim(),
                    description: result.description.trim(),
                    keywords: Array.isArray(result.keywords) ? result.keywords : [],
                    highlights: Array.isArray(result.highlights) ? result.highlights : [],
                    categorySuggestion: result.category_suggestion || '',
                    optimizationNotes: result.optimization_notes || '',
                    rawContent: content
                };
            }
            
        } catch (error) {
            console.error('解析优化结果失败:', error);
            // 继续走到旧版格式解析
        }

        // 旧版分段格式解析（严格贴近旧版正则）
        const safeContent = typeof content === 'string' ? content : '';
        const legacy = { title: '', description: '', keywords: [], highlights: [], categorySuggestion: '', optimizationNotes: '', rawContent: safeContent };

        try {
            const titleMatch = safeContent.match(/(?:###\s*)?产品标题(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品描述|$)/);
            if (titleMatch) legacy.title = titleMatch[1].replace(/\*\*/g, '').trim();

            const descMatch = safeContent.match(/(?:###\s*)?产品描述(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品关键词|$)/);
            if (descMatch) legacy.description = descMatch[1].replace(/\*\*/g, '').trim();

            const keywordsMatch = safeContent.match(/(?:###\s*)?产品关键词(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n###|\n产品标签|$)/);
            if (keywordsMatch) {
                const kwText = keywordsMatch[1].replace(/\*\*/g, '').trim();
                legacy.keywords = kwText.split(/[；;\n]+/).map(s => s.trim()).filter(Boolean);
            }

            const tagsMatch = safeContent.match(/(?:###\s*)?产品标签(?:[（(][^）)]*[）)])?\s*[：:：]?\s*([\s\S]*?)(?=\n|$)/);
            if (tagsMatch) {
                const tagText = tagsMatch[1].replace(/\*\*/g, '').trim();
                // 空格分隔的#标签
                legacy.highlights = tagText.split(/\s+/).map(s => s.trim()).filter(Boolean);
            }
        } catch (_) {}

        if (!legacy.title && !legacy.description) {
            legacy.description = safeContent.trim();
        }
        return legacy;
    }
    
    /**
     * 应用优化结果
     * @param {Object} optimizationResult - 优化结果
     * @param {boolean} autoApply - 是否自动应用
     * @returns {Promise<void>}
     */
    static async applyOptimization(optimizationResult, autoApply = true) {
        try {
            if (autoApply) {
                // 自动填充优化结果
                await this.fillOptimizedContent(optimizationResult);
            } else {
                // 显示预览模态框
                this.showOptimizationPreview(optimizationResult);
            }
        } catch (error) {
            console.error('应用优化结果失败:', error);
            throw error;
        }
    }
    
    /**
     * 填充优化内容到页面
     * @param {Object} optimizationResult - 优化结果
     * @returns {Promise<void>}
     */
    static async fillOptimizedContent(optimizationResult) {
        try {
            // 填充标题
            const titleSelectors = [
                'input[name="title"]',
                'input[name="name"]',
                'textarea[name="title"]',
                '#product-title',
                '.product-title-input'
            ];
            
            const titleInput = await window.DOMUtils?.findElementBySelectors(titleSelectors);
            if (titleInput && optimizationResult.title) {
                await window.DOMUtils?.safeSetValue(titleInput, optimizationResult.title);
                console.log('✅ 标题已更新');
            }
            
            // 填充描述
            const descriptionSelectors = [
                'textarea[name="description"]',
                'textarea[name="desc"]',
                '#product-description',
                '.product-description-input',
                '[data-testid="description-input"]'
            ];
            
            const descInput = await window.DOMUtils?.findElementBySelectors(descriptionSelectors);
            if (descInput && optimizationResult.description) {
                await window.DOMUtils?.safeSetValue(descInput, optimizationResult.description);
                console.log('✅ 描述已更新');
            }
            
            // 如果有富文本编辑器
            const richEditorSelectors = [
                '.ql-editor',
                '.note-editable',
                '[contenteditable="true"]'
            ];
            
            const richEditor = await window.DOMUtils?.findElementBySelectors(richEditorSelectors);
            if (richEditor && optimizationResult.description) {
                richEditor.innerHTML = optimizationResult.description.replace(/\n/g, '<br>');
                
                // 触发输入事件
                richEditor.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ 富文本描述已更新');
            }
            
        } catch (error) {
            console.error('填充优化内容失败:', error);
            throw error;
        }
    }
    
    /**
     * 显示优化预览
     * @param {Object} optimizationResult - 优化结果
     */
    static showOptimizationPreview(optimizationResult) {
        if (!window.UIComponents) {
            console.error('UIComponents 未加载');
            return;
        }
        
        const content = `
            <div style="max-height: 400px; overflow-y: auto;">
                <h3>优化后的标题：</h3>
                <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                    ${optimizationResult.title}
                </p>
                
                <h3>优化后的描述：</h3>
                <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 15px; white-space: pre-wrap;">
                    ${optimizationResult.description}
                </div>
                
                ${optimizationResult.keywords.length > 0 ? `
                    <h3>关键词：</h3>
                    <p style="margin-bottom: 15px;">
                        ${optimizationResult.keywords.map(kw => `<span style="background: #e3f2fd; padding: 2px 6px; border-radius: 3px; margin-right: 5px;">${kw}</span>`).join('')}
                    </p>
                ` : ''}
                
                ${optimizationResult.highlights.length > 0 ? `
                    <h3>产品卖点：</h3>
                    <ul style="margin-bottom: 15px;">
                        ${optimizationResult.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
                    </ul>
                ` : ''}
                
                ${optimizationResult.optimizationNotes ? `
                    <h3>优化说明：</h3>
                    <p style="color: #666; font-style: italic;">${optimizationResult.optimizationNotes}</p>
                ` : ''}
            </div>
        `;
        
        window.UIComponents.createModal({
            title: '优化结果预览',
            content: content,
            buttons: [
                {
                    text: '取消',
                    type: 'ozon-btn-secondary',
                    onClick: (e, modal, overlay) => {
                        window.UIComponents.removeModal(overlay);
                    }
                },
                {
                    text: '应用优化',
                    type: 'ozon-btn-primary',
                    onClick: async (e, modal, overlay) => {
                        try {
                            await this.fillOptimizedContent(optimizationResult);
                            window.UIComponents.removeModal(overlay);
                            window.UIComponents.showNotification({
                                title: '应用成功',
                                message: '优化内容已应用到页面',
                                type: 'success'
                            });
                        } catch (error) {
                            window.UIComponents.showNotification({
                                title: '应用失败',
                                message: error.message,
                                type: 'error'
                            });
                        }
                    }
                }
            ]
        });
    }
    
    /**
     * 保存优化记录
     * @param {Object} record - 优化记录
     * @returns {Promise<void>}
     */
    static async saveOptimizationRecord(record) {
        try {
            this.optimizationHistory.unshift(record);
            
            // 限制历史记录数量
            if (this.optimizationHistory.length > 50) {
                this.optimizationHistory = this.optimizationHistory.slice(0, 50);
            }
            
            // 保存到存储
            if (window.chrome && chrome.storage) {
                await chrome.storage.local.set({
                    optimizationHistory: this.optimizationHistory
                });
            }
            
        } catch (error) {
            console.error('保存优化记录失败:', error);
        }
    }
    
    /**
     * 加载优化历史
     * @returns {Promise<void>}
     */
    static async loadOptimizationHistory() {
        try {
            if (window.chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['optimizationHistory']);
                this.optimizationHistory = result.optimizationHistory || [];
            }
        } catch (error) {
            console.error('加载优化历史失败:', error);
            this.optimizationHistory = [];
        }
    }
    
    /**
     * 获取优化历史
     * @param {number} limit - 限制数量
     * @returns {Array} 优化历史记录
     */
    static getOptimizationHistory(limit = 10) {
        return this.optimizationHistory.slice(0, limit);
    }
    
    /**
     * 清除优化历史
     * @returns {Promise<void>}
     */
    static async clearOptimizationHistory() {
        try {
            this.optimizationHistory = [];
            
            if (window.chrome && chrome.storage) {
                await chrome.storage.local.remove(['optimizationHistory']);
            }
            
            console.log('✅ 优化历史已清除');
        } catch (error) {
            console.error('清除优化历史失败:', error);
        }
    }
    
    /**
     * 获取优化统计
     * @returns {Object} 统计信息
     */
    static getOptimizationStats() {
        const total = this.optimizationHistory.length;
        const successful = this.optimizationHistory.filter(record => record.success).length;
        const failed = total - successful;
        
        const avgDuration = total > 0 
            ? Math.round(this.optimizationHistory.reduce((sum, record) => sum + (record.duration || 0), 0) / total)
            : 0;
        
        const platforms = {};
        this.optimizationHistory.forEach(record => {
            if (record.platform) {
                platforms[record.platform] = (platforms[record.platform] || 0) + 1;
            }
        });
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
            avgDuration,
            platforms,
            lastOptimization: this.optimizationHistory[0]?.timestamp || null
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductOptimizer;
} else if (typeof window !== 'undefined') {
    window.ProductOptimizer = ProductOptimizer;
}