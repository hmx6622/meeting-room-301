# 301 会议室借用系统

基于 **微信原生小程序 + 云开发（Serverless）** 的会议室预约与审批系统，覆盖「查空闲 → 提交申请 → 管理员审批 → 状态同步」全流程，运行成本约 **30 元/年**。

> 在线互动展示页见 [`docs/index.html`](docs/index.html)（开启 GitHub Pages 后可直接访问，含卡通形象"小铭"的拖拽互动、状态机演示与时段看板演示）。

## 功能特性

- **空闲看板**：按日期查看 8:00–22:00 共 14 个整点时段的占用情况
- **在线申请**：表单校验 + 用户协议/隐私政策授权勾选 + 微信官方内容安全检测（msgSecCheck）
- **双重冲突校验**：提交时与审批通过瞬间各做一次时段重叠检测，杜绝撞会
- **无感身份识别**：微信 openid 静默登录，管理员表命中即获审批权限，云函数侧二次校验防越权
- **审批留痕**：通过/驳回备注全程可追溯；待审批申请可自助取消
- **隐私最小化**：空闲查询仅返回时间字段，不暴露他人姓名与手机号
- **时区健壮性**：显式按 UTC+8 计算边界，消除云函数容器 UTC 与真机解析差异

## 技术架构

```
微信小程序前端（WXML/WXSS/JS，5 页面）
        │ wx.cloud.callFunction
        ▼
云函数层（Node.js + wx-server-sdk，8 个单一职责函数）
  login / checkAdmin / getRoomSchedule / submitReservation
  getMyReservations / cancelReservation / getAdminList / auditReservation
        │ 管理端权限读写
        ▼
云数据库（3 集合，权限分级）
  meeting_rooms（所有用户可读）
  reservations（仅创建者可读写）
  admins（所有用户不可读写）
```

## 目录结构

```
├── miniprogram/        小程序前端（页面、工具函数、全局配置）
├── cloudfunctions/     8 个云函数
├── data-init/          数据集合初始化示例与字段说明
├── docs/
│   ├── index.html      互动展示网页（单文件自包含）
│   └── 部署指南.md      零基础逐步部署文档
└── project.config.json 微信开发者工具项目配置
```

## 快速开始

1. 克隆本仓库，用微信开发者工具导入根目录
2. 开通云开发环境，将 `miniprogram/app.js` 中的 `envId: 'your-env-id'` 替换为你自己的环境 ID
3. 按 [`docs/部署指南.md`](docs/部署指南.md) 创建 3 个集合、部署 8 个云函数、录入初始化数据
4. 编译预览，真机调试

> 注：仓库中的云环境 ID 已替换为占位符；`project.config.json` 中的 AppID 请替换为你自己注册的小程序 AppID。

## 作者

胡铭轩 · 安徽中医药大学 2025 级人工智能专业