# 🔄 Git自动同步工具集

## 📁 文件夹结构

```
auto-sync-tools/
├── README.md                    # 本说明文件
├── auto-sync.ps1               # 主同步脚本（PowerShell）
├── auto-sync.bat               # 批处理版本同步脚本
├── setup-auto-sync.ps1         # 自动设置任务计划脚本
├── auto-sync-config.json       # 配置文件
├── 配置向导.bat                # 批处理配置向导
├── 配置向导.ps1                # PowerShell配置向导
├── 一键设置全自动同步.bat       # 一键设置工具
├── 全自动同步说明.md           # 详细使用说明
└── sync.log                    # 同步日志（自动生成）
```

## 🚀 快速使用

### 方法一：从项目根目录运行（推荐）
```bash
# 在项目根目录运行
setup-git-auto-sync.bat
```

### 方法二：分步配置
```bash
# 1. 进入auto-sync-tools文件夹
cd auto-sync-tools

# 2. 运行配置向导
配置向导.ps1

# 3. 创建任务计划
一键设置全自动同步.bat
```

### 方法三：直接运行
```bash
# 进入auto-sync-tools文件夹
cd auto-sync-tools

# 以管理员身份运行
一键设置全自动同步.bat
```

## 📋 文件说明

### 核心脚本
- **auto-sync.ps1** - 主要的PowerShell同步脚本，支持自动检测更改、提交、拉取、推送
- **auto-sync.bat** - 批处理版本的同步脚本，功能相同但使用批处理语法
- **setup-auto-sync.ps1** - 自动创建Windows任务计划的PowerShell脚本

### 配置工具
- **配置向导.ps1** - PowerShell版本的配置向导，功能更强大
- **配置向导.bat** - 批处理版本的配置向导
- **auto-sync-config.json** - 同步配置文件，包含所有可配置选项

### 设置工具
- **一键设置全自动同步.bat** - 一键设置工具，自动检查环境并创建任务计划

### 文档
- **全自动同步说明.md** - 详细的使用说明和故障排除指南

### 自动生成文件
- **sync.log** - 同步日志文件，记录所有同步操作（自动生成）

## ⚙️ 配置说明

### 必需配置项
- **本地项目路径** - Git仓库的本地路径
- **远程仓库地址** - GitHub/GitLab等远程仓库地址
- **分支名称** - 要同步的分支（如main、master）
- **同步间隔** - 自动同步的时间间隔（分钟）

### 配置向导功能
- **自动检测** - 自动检测当前Git仓库信息
- **路径验证** - 验证本地路径是否为有效的Git仓库
- **远程仓库检查** - 检查并配置远程仓库地址
- **配置文件生成** - 自动生成和更新配置文件

### 配置示例
```json
{
  "sync": {
    "enabled": true,           // 启用同步
    "interval": 5,             // 同步间隔（分钟）
    "taskName": "GitAutoSync", // 任务名称
    "repoPath": "E:\\AI炼金师-产品优化专家 (2)", // 本地仓库路径
    "remote": "origin",        // 远程仓库别名
    "branch": "main",          // 分支名称
    "silent": true,            // 静默模式
    "autoCommit": true,        // 自动提交
    "autoPush": true           // 自动推送
  }
}
```

## 🔧 管理命令

### 任务管理
```powershell
# 查看任务状态
Get-ScheduledTask -TaskName "GitAutoSync"

# 启动任务
Start-ScheduledTask -TaskName "GitAutoSync"

# 停止任务
Stop-ScheduledTask -TaskName "GitAutoSync"

# 删除任务
Unregister-ScheduledTask -TaskName "GitAutoSync" -Confirm:$false
```

### 手动同步
```powershell
# 手动执行同步
.\auto-sync.ps1

# 静默同步
.\auto-sync.ps1 -Silent

# 指定参数同步
.\auto-sync.ps1 -RepoPath "C:\path\to\repo" -SyncInterval 10
```

### 配置管理
```powershell
# 运行配置向导
.\配置向导.ps1

# 查看当前配置
Get-Content "auto-sync-config.json" | ConvertFrom-Json
```

## 📊 日志监控

### 查看同步日志
```powershell
# 查看最新日志
Get-Content "sync.log" -Tail 20

# 实时监控日志
Get-Content "sync.log" -Wait

# 搜索错误日志
Get-Content "sync.log" | Select-String "ERROR"
```

## 🛡️ 安全特性

- **自动冲突处理** - 智能检测和解决合并冲突
- **备份机制** - 同步前自动创建备份
- **错误重试** - 失败时自动重试
- **详细日志** - 记录所有操作和错误信息

## 🔍 故障排除

### 常见问题

**Q: 配置向导无法运行？**
A: 确保PowerShell执行策略允许运行脚本，或使用批处理版本

**Q: 任务计划创建失败？**
A: 确保以管理员身份运行，检查PowerShell执行策略

**Q: 同步失败，显示权限错误？**
A: 配置Git身份验证（SSH密钥或Personal Access Token）

**Q: 冲突无法自动解决？**
A: 查看日志文件，手动解决冲突后重新同步

**Q: 同步频率过高？**
A: 修改配置文件中的interval参数

### 调试模式
```powershell
# 启用详细日志
.\auto-sync.ps1 -Silent:$false

# 查看任务执行历史
Get-ScheduledTask -TaskName "GitAutoSync" | Get-ScheduledTaskInfo
```

## 📞 技术支持

### 获取帮助
- 查看日志文件：`sync.log`
- 检查任务状态：`Get-ScheduledTask -TaskName "GitAutoSync"`
- 手动测试：`.\auto-sync.ps1`
- 重新配置：`.\配置向导.ps1`

### 详细文档
- 完整文档：`全自动同步说明.md`

---

**🎉 设置完成后，您的Git仓库将完全自动化同步，无需任何人工干预！** 