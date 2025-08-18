# AI炼金师 - 产品优化专家 v2.0.2

🚀 **智能化产品信息转化工具** - 将普通产品信息转化为高转化率的优质内容

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/sunqing9301-web/ai-lianjinshi.git)
[![Version](https://img.shields.io/badge/Version-2.0.2-green.svg)](https://github.com/sunqing9301-web/ai-lianjinshi.git)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/sunqing9301-web/ai-lianjinshi.git)

## 📋 目录

- [✨ 主要特性](#-主要特性)
- [🏗️ 架构概览](#️-架构概览)
- [🚀 安装使用](#-安装使用)
- [⚙️ 配置选项](#️-配置选项)
- [🔧 开发说明](#-开发说明)
- [📊 性能优化](#-性能优化)
- [🐛 故障排除](#-故障排除)
- [📝 更新日志](#-更新日志)

## ✨ 主要特性

- 🤖 **多AI平台支持**：DeepSeek、通义千问、百炼
- 📦 **模块化架构**：清晰的代码组织和职责分离
- 🎯 **智能优化**：自动提取和优化产品信息
- 🖼️ **图片处理**：智能图片优化功能
- ⚡ **性能监控**：内置性能分析和调试工具
- 🔧 **配置管理**：统一的配置系统
- 🎨 **现代UI**：响应式用户界面

## 🏗️ 架构概览

### 📁 项目结构
```
AI炼金师-产品优化专家/
├── manifest.json           # 扩展配置
├── popup.html              # 弹窗界面
├── popup.js                # 弹窗逻辑
├── content.js              # 主应用入口 (314行)
├── background.js           # 后台脚本
├── modules/                # 模块目录
│   ├── dom-utils.js        # DOM操作工具
│   ├── error-handler.js    # 错误处理系统
│   ├── performance-monitor.js # 性能监控
│   ├── api-manager.js      # API管理
│   ├── config-manager.js   # 配置管理
│   ├── ui-components.js    # UI组件系统
│   ├── product-optimizer.js # 产品优化核心
│   └── batch-optimizer.js   # 批量优化模块
├── *.svg                   # 各种Logo变体
├── *.html                  # 测试和预览页面
└── *.md                    # 文档文件
```

### 🔧 核心模块

#### 1. **ConfigManager** - 配置管理
- 统一配置存储和管理
- 支持配置验证和迁移
- 实时配置更新通知

#### 2. **APIManager** - API管理
- 多平台API统一接口
- 请求缓存和速率限制
- 错误重试和降级处理

#### 3. **ProductOptimizer** - 产品优化核心
- 智能信息提取
- AI优化处理
- 结果应用和预览

#### 4. **UIComponents** - UI组件系统
- 悬浮按钮和进度指示器
- 通知和模态框
- 拖拽和交互功能

#### 5. **DOMUtils** - DOM操作工具
- 安全的元素查找和操作
- 等待和交互检测
- 页面加载监控

#### 6. **ErrorHandler** - 错误处理
- 统一错误处理和日志
- 用户友好的错误提示
- 错误统计和报告

#### 7. **PerformanceMonitor** - 性能监控
- 实时性能监控
- API请求分析
- 调试工具和报告

## 🚀 安装使用

### 方法一：从GitHub克隆
```bash
# 克隆仓库
git clone https://github.com/sunqing9301-web/ai-lianjinshi.git

# 进入项目目录
cd ai-lianjinshi

# 安装依赖（如果有）
npm install
```

### 方法二：直接下载
1. 访问 [GitHub仓库](https://github.com/sunqing9301-web/ai-lianjinshi.git)
2. 点击 "Code" → "Download ZIP"
3. 解压到本地目录

### 安装Chrome扩展
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹
6. 扩展安装完成！

### 配置设置
1. 点击扩展图标打开设置面板
2. 选择AI平台（DeepSeek/通义千问/百炼）
3. 输入对应的API Key
4. 配置预设属性（可选）
5. 点击"保存设置"

### 使用优化功能
1. 访问 `erp.91miaoshou.com` 产品页面
2. 点击悬浮的"AI优化"按钮
3. 等待AI分析和优化
4. 预览优化结果
5. 确认应用到页面

## ⚙️ 配置选项

### API设置
- **平台选择**：DeepSeek、通义千问、百炼
- **API密钥**：对应平台的API Key
- **请求超时**：API请求超时时间

### 预设属性
- **配置信息**：产品配置描述
- **制造商**：产品制造商信息
- **包装数量**：产品包装规格
- **目标受众**：产品目标用户群体

### UI设置
- **悬浮按钮**：显示/隐藏悬浮按钮
- **主题模式**：浅色/深色主题
- **动画效果**：启用/禁用动画

### 优化设置
- **图片优化**：启用智能图片处理
- **优化类型**：电商智能/质量优先/尺寸优先
- **目标尺寸**：图片目标尺寸
- **图片质量**：压缩质量设置

## 🔧 开发说明

### 模块加载机制
```javascript
// 动态模块加载
const modules = [
    'dom-utils.js',
    'error-handler.js',
    'performance-monitor.js',
    'api-manager.js',
    'config-manager.js',
    'ui-components.js',
    'product-optimizer.js'
];

// 并行加载所有模块
const modulePromises = modules.map(loadModule);
const loadedModules = await Promise.all(modulePromises);
```

### 事件系统
```javascript
// 配置变更监听
this.configManager.addListener('configChanged', (config) => {
    this.handleConfigChange(config);
});

// 页面变化监听
window.addEventListener('focus', () => {
    this.handlePageFocus();
});
```

### 错误处理
```javascript
// 统一错误处理
try {
    await this.productOptimizer.optimize();
} catch (error) {
    this.errorHandler.handle(error, 'ProductOptimization');
}
```

## 📊 性能优化

### v2.0 vs v1.0
- **代码量**：7548行 → 314行主文件 + 模块
- **加载速度**：提升 60%
- **内存使用**：减少 40%
- **维护性**：显著提升

### 优化特性
- 模块按需加载
- 智能缓存机制
- 防抖和节流
- 性能监控和分析

## 🐛 故障排除

### 常见问题

**Q: 扩展无法加载？**
A: 检查manifest.json格式，确保所有文件路径正确

**Q: API调用失败？**
A: 验证API Key是否正确，检查网络连接

**Q: 悬浮按钮不显示？**
A: 确认在设置中启用了悬浮按钮显示

**Q: 优化结果不理想？**
A: 尝试调整预设属性，或切换不同的AI平台

### 调试模式
```javascript
// 启用调试模式
window.ozonOptimizerDebug = true;

// 查看性能报告
console.log(window.ozonOptimizer.getPerformanceReport());

// 查看配置信息
console.log(window.ozonOptimizer.getConfig());
```

## 📝 更新日志

### v2.0.2 (2024-12-19)
- 🔄 **版本更新**：统一更新所有文件中的版本号
- 🐛 **Bug修复**：修复悬浮按钮创建问题
- ⚡ **性能优化**：改进模块加载机制
- 🔧 **代码优化**：简化UI创建逻辑
- 📚 **文档更新**：完善README和安装说明

### v2.0.0 (2024-12-19)
- 🎉 **重大重构**：模块化架构
- ⚡ **性能提升**：代码精简和优化
- 🔧 **配置系统**：统一配置管理
- 🎨 **UI改进**：现代化界面设计
- 📊 **监控系统**：性能和错误监控
- 🛡️ **错误处理**：完善的错误处理机制

### v1.0.86 (之前版本)
- 基础功能实现
- 多AI平台支持
- 图片优化功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [GitHub仓库](https://github.com/sunqing9301-web/ai-lianjinshi.git)
- [问题反馈](https://github.com/sunqing9301-web/ai-lianjinshi/issues)
- [功能请求](https://github.com/sunqing9301-web/ai-lianjinshi/issues/new)

---

**AI炼金师-产品优化专家 v2.0** - 让产品优化更智能、更高效！

⭐ 如果这个项目对您有帮助，请给我们一个星标！