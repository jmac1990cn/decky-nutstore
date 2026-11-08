# Decky Nutstore（坚果云存档同步插件）

一个 [Decky](https://github.com/SteamDeckHomebrew/decky-loader) 插件，用 [rclone](https://rclone.org/) 把 Steam Deck 游戏存档同步到云端。本版本仅支持 **坚果云（Nutstore）WebDAV**——国内无需 VPN 即可稳定使用。

- 问题反馈：在本仓库提交 Issue，或加入 [SteamDeckHomebrew Discord](https://deckbrew.xyz/discord)。
- 插件界面：跟随 Steam 语言设置，选「简体中文」即为中文界面。

## 功能特性

- 将游戏存档（或任意文件/文件夹）备份到坚果云 WebDAV。
- 游戏关闭后自动备份。
- 文件数预估，避免误选整个 Steam Deck。
- 包含/排除规则的高级过滤。
- 可选云端子目录。
- 游戏启动/退出自动同步（启动下载、退出上传）。
- 插件面板内直接查看同步日志。

> **注意**：常规复制模式下，本地删除不会删除云端文件（防误删，设计如此）。

## 安装

从 [Releases 页面](https://github.com/jmac1990cn/decky-nutstore/releases/) 下载最新 `decky-nutstore.zip`，通过 Decky 内置安装器安装：`Decky → 设置 → 开发者 → 从 ZIP 安装插件`。也可直接 clone 本仓库、用解压后的文件夹同样方式安装。

## 使用

### 1. 配置坚果云（认证）

进入 `配置 → 云端服务商`，点击 **坚果云（WebDAV）** 按钮，填入：

- **WebDAV 地址**：`https://dav.jianguoyun.com/dav/`（已预填，一般无需改动）
- **坚果云账号（邮箱）**
- **应用专用密码**（不是登录密码；在坚果云网页 → 安全 → 第三方应用授权 中生成）

确认后插件会自动写入 rclone 配置，顶部显示「当前使用：坚果云 WebDAV」。

> 大屏输入不便时，可在桌面模式运行 `defaults/quickstart/nutstore_webdav.sh`（`bash ./defaults/quickstart/nutstore_webdav.sh`）。

### 2. 选择同步路径

进入 `配置 → 同步路径`，点击 **添加到同步**，选择文件或文件夹。选择后显示预估文件数；**若超过 9000，很可能是选错路径**（单个游戏存档通常不足 10 个）。

- **云端布局**：每个文件夹以其原名称上传到坚果云根目录，插件记住其 Steam Deck 路径，逆向同步时原样恢复。「坚果云存放目录」为可选子目录，**留空即直接传到根目录**（推荐，方便在电脑端查看）。
- **两个同步按钮**：
  - **SD → 云端（上传存档）**：本地存档推送到坚果云。
  - **云端 → SD（下载存档）**：从坚果云恢复到 Steam Deck；未上传过的文件夹自动跳过。
- **游戏启动/退出自动同步**逻辑同上：启动先下载最新云存档，退出再上传本地存档。

> **安全提示**：rclone 在 Steam Deck 上以「混淆」而非强加密方式保存 WebDAV 密码，请务必使用坚果云**应用专用密码**，不要用主账号密码。

## 高级配置（`plugin.properties`）

文件位置：`~/homebrew/settings/decky-nutstore/plugin.properties`

- `log_level`：日志级别，调试时设 `DEBUG`（默认 `INFO`）。
- `destination_directory`：可选坚果云子目录，留空同步到根目录。
- `additional_sync_args`：传给每次 rclone copy 的额外参数。
- `sync_root`：同步路径必须位于此绝对路径前缀下（默认 `/`，须以 `/` 结尾）。

## 从源码构建

```bash
pnpm install
pnpm build        # 输出到 dist/
```

把含 `dist/`、`bin/`、`py_modules/`、`main.py`、`plugin.json` 的插件文件夹通过 Decky 开发者安装器安装。`bin/rclone` 与 `bin/rcloneLauncher` 已内置，开箱即用。

## 致谢

- [rclone](https://rclone.org/)：同步引擎。
- [SteamDeckHomebrew](https://github.com/SteamDeckHomebrew)：Decky 加载器与开发支持。
- 本插件是 GedasFX 的 [decky-cloud-save](https://github.com/GedasFX/decky-cloud-save) 的坚果云定制版。
