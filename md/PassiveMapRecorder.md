# PassiveMapRecorder

一个纯客户端的 Fabric 模组，被动记录玩家已加载区块的地形数据，直接写入存档文件。

> Minecraft 1.21.11 · Fabric Loader 0.18.4+ · Java 21+

---

## 功能特性

- **纯被动记录** — 仅处理服务器主动推送的区块数据包，零网络发包，无法被检测
- **内存安全** — 线程安全队列 + 按 tick 限速写入，不卡顿不溢出
- **HUD 进度提示** — 屏幕底部居中显示实时写入进度：`已写入 XX / XX 区块，进度 XX.X%`
- **开始即扫描** — 开始记录时自动扫描所有已加载区块，不漏记录
- **自动去重** — 同一区块不会被重复记录

## 安装

### 前置要求

- Minecraft **1.21.11**
- Fabric Loader **0.18.4+**
- [Fabric API](https://modrinth.com/mod/fabric-api)（必需）
- Java 21+

### 安装方法

1. 从 [Releases](https://github.com/passivemaprecorder/passivemaprecorder/releases) 下载最新版 JAR
2. 放入 `.minecraft/mods/` 目录
3. 启动游戏即可

## 按键绑定

| 按键 | 功能 |
|------|------|
| **F6** | 开始 / 停止记录 |

## 使用流程

1. 按 **F6** 打开存档选择界面 → 选择要替换区块的存档
2. 开始记录后，HUD 显示实时进度
3. 移动探索，已加载区块自动写入目标存档
4. 按 **F6** 停止记录
5. 在游戏单人模式中加载目标存档即可查看

> **注意**：导入的存档会替换原存档的区块数据，建议**先备份**。

## 配置文件

位于 `.minecraft/config/passivemaprecorder.json`，首次运行时自动生成。

```json
{
  "superflatSavePath": "saves/passivemaprecorder_superflat",
  "showChunkNotifications": false,
  "verbosityLevel": 1,
  "maxChunksPerTick": 10
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `superflatSavePath` | 超平坦存档路径（相对 .minecraft） | `saves/passivemaprecorder_superflat` |
| `showChunkNotifications` | 是否在日志中显示每个区块的加载通知 | `false` |
| `verbosityLevel` | 日志详细程度（0=静默, 1=基本, 2=详细） | `1` |
| `maxChunksPerTick` | 每 tick 最多处理的区块数 | `10` |

## 开源许可

本项目采用 **MIT 许可证** 开源。详见 [LICENSE](LICENSE) 文件。