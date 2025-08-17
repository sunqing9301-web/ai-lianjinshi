# 🚀 Git自动同步使用指南

## 📋 概述

本项目已集成完整的Git自动同步解决方案，可以实现完全自动化的代码同步，无需人工干预。

## 📁 文件结构

```
AI炼金师-产品优化专家 (2)/
├── 📁 auto-sync-tools/          # 自动同步工具集
│   ├── README.md                # 工具集说明
│   ├── auto-sync.ps1           # 主同步脚本
│   ├── auto-sync.bat           # 批处理同步脚本
│   ├── setup-auto-sync.ps1     # 任务计划设置脚本
│   ├── auto-sync-config.json   # 配置文件
│   ├── 一键设置全自动同步.bat   # 一键设置工具
│   └── 全自动同步说明.md       # 详细说明文档
├── setup-git-auto-sync.bat     # 主设置脚本（推荐使用）
└── ... (其他项目文件)
```

## 🚀 快速开始

### 方法一：使用主设置脚本（推荐）

1. **右键点击** `setup-git-auto-sync.bat`
2. **选择** "以管理员身份运行"
3. **确认** 设置信息
4. **等待** 设置完成

### 方法二：直接使用工具集

1. **进入** `auto-sync-tools` 文件夹
2. **右键点击** `一键设置全自动同步.bat`
3. **选择** "以管理员身份运行"

## ✨ 功能特性

- 🔄 **完全自动化** - 无需人工干预
- ⏰ **定时同步** - 每5分钟自动同步一次
- 📝 **自动提交** - 检测本地更改并自动提交
- 🔄 **双向同步** - 自动拉取远程更新并推送本地更改
- 🛡️ **冲突处理** - 智能处理合并冲突
- 📊 **详细日志** - 记录所有同步操作
- 🔧 **灵活配置** - 支持多种配置选项

## ⚙️ 配置说明

### 默认配置
- **同步间隔**: 5分钟
- **任务名称**: GitAutoSync
- **仓库路径**: 当前项目目录
- **远程仓库**: origin
- **分支**: main
- **静默模式**: 启用
- **自动提交**: 启用
- **自动推送**: 启用

### 自定义配置
如需修改配置，请编辑 `auto-sync-tools/auto-sync-config.json` 文件。

## 🔧 管理命令

### 查看任务状态
```powershell
Get-ScheduledTask -TaskName "GitAutoSync"
```

### 手动启动同步
```powershell
Start-ScheduledTask -TaskName "GitAutoSync"
```

### 停止自动同步
```powershell
Stop-ScheduledTask -TaskName "GitAutoSync"
```

### 删除任务
```powershell
Unregister-ScheduledTask -TaskName "GitAutoSync" -Confirm:$false
```

### 手动执行同步
```powershell
cd auto-sync-tools
.\auto-sync.ps1
```

## 📊 监控和日志

### 查看同步日志
```powershell
# 查看最新日志
Get-Content "auto-sync-tools\sync.log" -Tail 20

# 实时监控日志
Get-Content "auto-sync-tools\sync.log" -Wait

# 搜索错误日志
Get-Content "auto-sync-tools\sync.log" | Select-String "ERROR"
```

### 日志示例
```
[2024-12-19 14:30:15] [INFO] Starting Git repository auto sync
[2024-12-19 14:30:15] [INFO] Repository path: E:\AI炼金师-产品优化专家 (2)
[2024-12-19 14:30:16] [INFO] Found local changes, auto-committing...
[2024-12-19 14:30:17] [INFO] Local changes auto-committed
[2024-12-19 14:30:18] [INFO] Pulling remote updates...
[2024-12-19 14:30:20] [INFO] Remote updates pulled successfully
[2024-12-19 14:30:21] [INFO] Pushing local changes...
[2024-12-19 14:30:23] [INFO] Local changes pushed successfully
[2024-12-19 14:30:23] [INFO] Git repository sync completed
```

## 🛡️ 安全特性

### 冲突处理
- **自动检测** - 检测合并冲突
- **智能解决** - 尝试rebase方式解决
- **安全回退** - 冲突时自动回退
- **详细报告** - 记录冲突处理过程

### 备份机制
- **同步前备份** - 自动创建备份
- **版本管理** - 保留多个备份版本
- **自动清理** - 清理过期备份

### 错误处理
- **重试机制** - 失败时自动重试
- **超时控制** - 防止长时间阻塞
- **错误日志** - 详细记录错误信息

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

### 调试模式
```powershell
# 启用详细日志
cd auto-sync-tools
.\auto-sync.ps1 -Silent:$false
```

## 📞 技术支持

### 获取帮助
- 查看日志文件：`auto-sync-tools\sync.log`
- 检查任务状态：`Get-ScheduledTask -TaskName "GitAutoSync"`
- 手动测试：`cd auto-sync-tools && .\auto-sync.ps1`

### 详细文档
- 工具集说明：`auto-sync-tools\README.md`
- 完整文档：`auto-sync-tools\全自动同步说明.md`

## 🎯 使用场景

### 个人开发
- 多设备代码同步
- 自动备份重要代码
- 版本控制自动化

### 团队协作
- 实时同步团队代码
- 自动合并分支
- 冲突预警和处理

### 持续集成
- 自动部署触发
- 代码质量检查
- 测试自动化

## 📈 性能优化

### 同步优化
- **增量同步** - 只同步变更文件
- **并行处理** - 支持多仓库并行同步
- **缓存机制** - 缓存远程状态信息

### 资源管理
- **内存控制** - 限制内存使用
- **CPU限制** - 避免占用过多CPU
- **磁盘优化** - 定期清理临时文件

---

**🎉 设置完成后，您的项目将完全自动化同步到GitHub，无需任何人工干预！**

**💡 提示**: 首次设置需要配置Git身份验证，请参考 `GitHub推送指南.md` 文件。 