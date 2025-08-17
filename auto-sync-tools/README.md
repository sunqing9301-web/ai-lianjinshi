# 🔄 Git自动同步工具集

## 📁 文件夹结构

```
auto-sync-tools/
├── README.md                    # 本说明文件
├── auto-sync.ps1               # 主同步脚本（PowerShell）
├── auto-sync.bat               # 批处理版本同步脚本
├── setup-auto-sync.ps1         # 自动设置任务计划脚本
├── auto-sync-config.json       # 配置文件
├── 一键设置全自动同步.bat       # 一键设置工具
├── 全自动同步说明.md           # 详细使用说明
└── sync.log                    # 同步日志（自动生成）
```

## 🚀 快速使用

### 方法一：从项目根目录运行
```bash
# 在项目根目录运行
setup-git-auto-sync.bat
```

### 方法二：直接运行
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

### 配置和文档
- **auto-sync-config.json** - 同步配置文件，包含所有可配置选项
- **一键设置全自动同步.bat** - 一键设置工具，自动检查环境并创建任务计划
- **全自动同步说明.md** - 详细的使用说明和故障排除指南

### 自动生成文件
- **sync.log** - 同步日志文件，记录所有同步操作（自动生成）

## ⚙️ 配置选项

### 基本配置
```json
{
  "sync": {
    "enabled": true,           // 启用同步
    "interval": 5,             // 同步间隔（分钟）
    "taskName": "GitAutoSync", // 任务名称
    "repoPath": "E:\\AI炼金师-产品优化专家 (2)", // 仓库路径
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

**Q: 任务计划创建失败？**
A: 确保以管理员身份运行，检查PowerShell执行策略

**Q: 同步失败，显示权限错误？**
A: 配置Git身份验证（SSH密钥或Personal Access Token）

**Q: 冲突无法自动解决？**
A: 查看日志文件，手动解决冲突后重新同步

**Q: 同步频率过高？**
A: 修改配置文件中的interval参数

## 📞 技术支持

- 查看日志文件：`sync.log`
- 检查任务状态：`Get-ScheduledTask -TaskName "GitAutoSync"`
- 手动测试：`.\auto-sync.ps1`

---

**🎉 设置完成后，您的Git仓库将完全自动化同步，无需任何人工干预！** 