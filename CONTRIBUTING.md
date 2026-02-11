# 贡献指南

感谢你对 Fireworks 生图平台的关注！

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请创建一个 Issue，包含以下信息：

1. Bug 描述
2. 复现步骤
3. 预期行为
4. 实际行为
5. 环境信息（浏览器、操作系统等）

### 提出新功能

如果你有新功能的想法，请创建一个 Issue，描述：

1. 功能描述
2. 使用场景
3. 预期效果

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建一个 Pull Request

## 开发规范

### 代码风格

- 使用 2 空格缩进
- 使用有意义的变量名
- 添加必要的注释
- 保持代码简洁

### 提交信息

使用清晰的提交信息：

- `feat: 添加新功能`
- `fix: 修复 Bug`
- `docs: 更新文档`
- `style: 代码格式调整`
- `refactor: 代码重构`
- `test: 添加测试`
- `chore: 构建/工具链相关`

## 开发环境设置

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/fireworks-image-platform.git
   cd fireworks-image-platform
   ```

2. 安装依赖
   ```bash
   npm install -g wrangler
   ```

3. 配置环境变量
   ```bash
   cp .dev.vars.example .dev.vars
   # 编辑 .dev.vars 填入你的 API Key
   ```

4. 本地开发
   ```bash
   npm run dev
   ```

## 测试

在提交 PR 之前，请确保：

1. 代码可以正常运行
2. 没有引入新的 Bug
3. 功能符合预期

## 文档

如果你的修改涉及到用户可见的功能，请更新相应的文档：

- `README.md` - 项目说明
- `docs/API.md` - API 文档
- `docs/USAGE.md` - 使用指南
- `docs/DEPLOY.md` - 部署指南

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

## 联系方式

如有任何问题，欢迎通过 Issue 联系我们。
