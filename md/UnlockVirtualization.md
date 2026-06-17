# CPU 虚拟化解锁工具

检测并管理占用 CPU 虚拟化的应用程序和服务。

## 功能

- 扫描所有虚拟化相关进程并分类展示
- 显示进程 PID、内存占用、类型、可执行路径
- 支持单个/批量/全部结束选中的虚拟化进程
- 展示 Windows 虚拟化相关服务状态
- 自动提取并显示进程图标
- **深度扫描模式** — 三层内核级检测，绕过常规进程名匹配
  - 可执行路径扫描（按安装目录标记匹配）
  - WMI 命令行扫描（按启动参数匹配）
  - 父进程链扫描（按进程树关系递归匹配）
- **虚拟化内核驱动检测** — 通过 `EnumDeviceDrivers` 枚举已加载的内核驱动
- WinUI 3 现代界面，支持 Mica 背景

## 系统要求

- Windows 10 (build 17763+) / Windows 11

## 小记

主要是因为之前被三角洲的虚拟化弹窗搞破防了(明明所有虚拟化软件和服务都关了也没用)实在没招就写了个工具来检测

## 技术栈

- .NET 8 + WinUI 3 (Windows App SDK)
- System.Management (WMI 进程/服务查询)
- System.Drawing.Common (图标提取)
- psapi.dll P/Invoke (`EnumDeviceDrivers` 内核驱动枚举)

## 许可

MIT