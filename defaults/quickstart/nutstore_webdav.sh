#!/usr/bin/env bash
# 坚果云 (Nutstore) WebDAV 快速配置脚本
# 适用于无法在 Big Picture 模式下配置时，在桌面模式终端中运行。
#
# 使用方法：
#   1. 进入插件安装目录（默认 /home/deck/homebrew/plugins/decky-nutstore）
#   2. 运行： bash ./quickstart/nutstore_webdav.sh
#   3. 按提示输入坚果云账号（邮箱）与应用专用密码
#
# 注意：应用专用密码不是登录密码，
# 需先在坚果云网页端「安全选项 → 第三方应用管理」中生成。

echo "=== 坚果云 WebDAV 配置 ==="
echo "WebDAV 地址: https://dav.jianguoyun.com/dav/"
echo "接下来请输入你的坚果云账号（邮箱）与应用专用密码。"
echo "（应用专用密码需在坚果云网页端『安全选项 → 第三方应用管理』中单独生成，不是登录密码）"
echo ""

# 不在此处硬编码账号密码，交由 rclone 交互式询问，更安全。
exec ./.runner_do_not_touch config create backend webdav url=https://dav.jianguoyun.com/dav/ vendor=other
