---
name: gen-image
description: |
    使用 Nano Banana 进行 AI 图像生成与编辑。
    当用户需要生成图片、编辑图片、或调用图像 API 时使用此 skill。
    触发场景：
    - 生成图片（文生图）：根据文字描述生成图像
    - 图片编辑：对已有图片进行局部修改、背景替换、风格迁移等
    - 多轮对话式图像精调
    - 需要选择分辨率（512px/1K/2K/4K）或宽高比（14种）
---

# Nano Banana 图像生成 Skill

## API 配置

**环境变量**:

- `NANO_BANANA_API_KEY`: API Key（必填）
- `NANO_BANANA_BASE_URL`: Base URL（可选）
- `NANO_BANANA_MODEL`: 模型名称（可选）

## 核心参数

| 参数                      | 值                         | 说明             |
| ------------------------- | -------------------------- | ---------------- |
| `imageConfig.aspectRatio` | 见下方                     | 可选，默认 `1:1` |
| `imageConfig.imageSize`   | `512` / `1K` / `2K` / `4K` | 可选，默认 `1K`  |

**支持的宽高比（14种）**: `1:1` `2:3` `3:2` `3:4` `4:3` `4:5` `5:4` `9:16` `16:9` `21:9` `1:4` `4:1` `1:8` `8:1`

## 脚本: `scripts/image.mjs`

**全局选项**:

- `--key <key>`: API Key（或 `NANO_BANANA_API_KEY`）
- `--base-url <url>`: Base URL（或 `NANO_BANANA_BASE_URL`）
- `--model <model>`: 模型名称（或 `NANO_BANANA_MODEL`）

---

### gen — 文生图

```bash
node scripts/image.mjs gen "prompt" [--aspect 16:9] [--size 1K] [-o output.png]
```

- `--aspect`: 宽高比（默认 1:1）
- `--size`: 分辨率 512/1K/2K/4K（默认 1K）
- `-o`: 输出路径（默认 images/output.png）

---

### edit — 编辑图片

```bash
# 单张
node scripts/image.mjs edit input.png "编辑指令" [-o output.png]

# 多张（最后一个位置参数为 prompt）
node scripts/image.mjs edit a.png b.png "融合两张图的风格" -o merged.png

# 多张（-p 指定 prompt，所有位置参数均为图片）
node scripts/image.mjs edit a.png b.png c.png -p "合并三张图的元素" -o result.png
```

- `input...`: 输入图片（一或多个）
- `prompt`: 编辑指令（最后位置参数，或 `-p`）
- `--aspect`: 宽高比（默认保持原图）
- `--size`: 输出分辨率（默认 2K）
- `-o`: 输出路径（默认 images/edited.png）

**常见指令**:

| 场景     | 示例                                                            |
| -------- | --------------------------------------------------------------- |
| 添加元素 | `"Add a rose flower in the bottom right corner"`                |
| 背景替换 | `"Replace the background with a neon-lit city street at night"` |
| 风格迁移 | `"Convert to watercolor style, preserve original composition"`  |
| 局部修改 | `"Change the person's clothing color to red"`                   |
| 删除元素 | `"Remove the text watermark and fill in the background"`        |

---

## 工作流指导

### 批量试稿

需要让用户从多个候选中挑选时，**循环多次调用 gen**，使用低分辨率（`--size 512`）降低成本：

```bash
for i in 1 2 3 4; do
  node scripts/image.mjs gen "prompt" --size 512 --aspect 1:1 -o images/roll_$i.png
done
```

生成完毕后展示给用户，由用户指定满意的版本再升清晰度。

### 图片放大

对已有图片提升分辨率，使用 **edit + 放大指令**：

```bash
node scripts/image.mjs edit input.png \
  -p "Upscale and enhance clarity while preserving original style and composition" \
  --size 4K -o output_4k.png
```

4K 分辨率请求耗时较长，建议提前告知用户。

---

## 环境变量配置

```bash
export NANO_BANANA_API_KEY="sk-your-api-key"
```

---

## Prompt 示例

示例文件位于 `examples/`，格式为 YAML frontmatter（command/aspect/size）+ prompt 正文。

| 文件                                                                    | 场景                 | 命令   | 参数          |
| ----------------------------------------------------------------------- | -------------------- | ------ | ------------- |
| [typographic-mask-editorial.md](examples/typographic-mask-editorial.md) | 字体掩码编辑海报     | `gen`  | `16:9` / `2K` |
| [monochromatic-ink-portrait.md](examples/monochromatic-ink-portrait.md) | 单色水墨肖像         | `edit` | `1:1` / `2K`  |
| [chibi-doodle-portrait.md](examples/chibi-doodle-portrait.md)           | Q版涂鸦人物肖像      | `edit` | `1:1` / `2K`  |
| [isometric-diorama.md](examples/isometric-diorama.md)                   | 3D 等距微缩场景      | `gen`  | `1:1` / `1K`  |
| [dual-exposure-photo-grid.md](examples/dual-exposure-photo-grid.md)     | 双重曝光照片网格海报 | `gen`  | `16:9` / `2K` |
| [exploded-view-breakdown.md](examples/exploded-view-breakdown.md)       | 商业爆炸图分解展示   | `edit` | `1:1` / `4K`  |
| [city-brushstroke-poster.md](examples/city-brushstroke-poster.md)       | 城市笔触艺术海报     | `gen`  | `16:9` / `2K` |
| [minimalist-editorial-recap.md](examples/minimalist-editorial-recap.md) | 极简编辑回顾海报     | `gen`  | `1:1` / `2K`  |
