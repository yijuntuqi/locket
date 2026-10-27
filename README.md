# Locket

把照片装进吊坠盒 —— 3D 旋转照片墙，多用户、自定义相册、一键导出朋友圈素材。

## 技术栈

Vite + React 19 + TypeScript + Tailwind CSS 4 + shadcn（react-bits registry）+ Supabase（后续阶段接入）

## 本地开发

```bash
npm install --maxsockets=4   # E 盘 exFAT 上建议限制并发，避免解压写入错误
npm run dev
```

## 其他命令

```bash
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npx vitest run   # 单元测试
```

## 文档

- 设计文档：`docs/superpowers/specs/2026-10-26-locket-design.md`
- 实现计划：`docs/superpowers/plans/`
