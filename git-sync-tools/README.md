# Git自动同步工具集 (auto-sync-tools)

这是一个完整的Git自动同步解决方案，包含所有必要的工具和脚本。

## 📁 文件结构

```
auto-sync-tools/
├── README.md                           # 本说明文件
├── 仓库配置器-中文版.ps1               # 中文版仓库配置器（推荐）
├── GitAutoSync-Simple.ps1              # 简化版GUI应用
├── 配置向导.ps1                        # 交互式配置向导
├── auto-sync.ps1                       # 核心自动同步脚本
├── setup-auto-sync.ps1                 # 任务计划设置脚本
├── auto-sync-config.json               # 配置文件
├── auto-sync.bat                       # 基础同步批处理
├── push-to-github.bat                  # GitHub推送脚本
├── push-to-github.ps1                  # GitHub推送PowerShell脚本
├── 一键设置全自动同步.bat              # 一键设置工具
├── 配置向导.bat                        # 配置向导启动器
├── 启动中文版配置器.bat                # 中文版配置器启动器
├── 启动Git自动同步GUI.bat              # GUI应用启动器
├── 全自动同步说明.md                   # 详细使用说明
├── Git自动同步使用指南.md              # 快速使用指南
└── GitHub推送指南.md                   # GitHub推送指南
```

## 🚀 快速使用

### 方法1：使用中文版配置器（推荐）
1. 双击根目录的 `启动中文版配置器.bat`
2. 填写远程仓库地址和本地路径
3. 点击"启动自动同步"

### 方法2：使用一键设置工具
1. 双击根目录的 `setup-git-auto-sync.bat`
2. 按提示完成配置
3. 自动创建定时任务

### 方法3：使用GUI应用
1. 双击根目录的 `启动Git自动同步GUI.bat`
2. 在图形界面中配置
3. 启动自动同步

## 📋 文件说明

### 🎯 主要工具
- **`仓库配置器-中文版.ps1`** - 中文界面仓库配置器，支持远程地址和本地路径配置
- **`GitAutoSync-Simple.ps1`** - 简化版GUI应用，功能完整
- **`配置向导.ps1`** - 交互式配置向导，支持详细配置

### ⚙️ 核心脚本
- **`auto-sync.ps1`** - 核心自动同步脚本，处理Git操作
- **`setup-auto-sync.ps1`** - 创建Windows任务计划
- **`auto-sync-config.json`** - 存储同步配置信息

### 🛠️ 辅助工具
- **`push-to-github.bat/.ps1`** - GitHub推送工具
- **`auto-sync.bat`** - 基础同步批处理脚本
- **各种启动器.bat** - 方便用户启动不同工具

### 📚 文档
- **`全自动同步说明.md`** - 详细的技术说明和使用指南
- **`Git自动同步使用指南.md`** - 快速入门指南
- **`GitHub推送指南.md`** - GitHub推送问题解决方案

## 🔧 配置说明

配置文件 `auto-sync-config.json` 包含以下设置：

```json
{
  "sync": {
    "enabled": true,
    "interval": 5,
    "taskName": "GitAutoSync",
    "repoPath": "本地项目路径",
    "remote": "origin",
    "branch": "main",
    "logFile": "sync.log",
    "silent": true,
    "autoCommit": true,
    "autoPush": true,
    "conflictStrategy": "rebase",
    "retryAttempts": 3,
    "retryDelay": 30
  }
}
```

## 🎯 推荐使用流程

1. **首次使用**：运行 `启动中文版配置器.bat`
2. **配置仓库**：填写远程地址和本地路径
3. **启动同步**：点击"启动自动同步"
4. **查看日志**：检查 `sync.log` 文件
5. **管理任务**：使用Windows任务计划管理器

## 🔍 故障排除

- **权限问题**：以管理员身份运行
- **编码问题**：使用中文版配置器（已修复编码问题）
- **网络问题**：检查网络连接和代理设置
- **Git问题**：确保Git已正确安装和配置

## 📞 支持

如有问题，请查看：
1. `全自动同步说明.md` - 详细技术文档
2. `Git自动同步使用指南.md` - 快速指南
3. `GitHub推送指南.md` - 推送问题解决方案

---

**注意**：所有文件现在都已整理到 `auto-sync-tools` 文件夹中，根目录只保留启动器脚本。 