# Prompt 示例库

## 目录

| 名称                                          | 命令 | 宽高比 | 分辨率 | 场景分类 |
| --------------------------------------------- | ---- | ------ | ------ | -------- |
| [文字遮罩编辑设计](#文字遮罩编辑设计)         | gen  | 9:16   | 2K     | 编辑设计 |
| [单色水墨肖像](#单色水墨肖像)                 | edit | 1:1    | 2K     | 肖像艺术 |
| [可爱Q版涂鸦肖像](#可爱q版涂鸦肖像)           | edit | 1:1    | 2K     | 趣味肖像 |
| [3D等距微缩模型](#3d等距微缩模型)             | gen  | 1:1    | 1K     | 3D插画   |
| [双重曝光照片网格](#双重曝光照片网格)         | gen  | 3:4    | 2K     | 运动海报 |
| [产品爆炸分解图](#产品爆炸分解图)             | edit | 9:16   | 2K     | 产品图解 |
| [城市景观笔触海报](#城市景观笔触海报)         | gen  | 4:5    | 2K     | 城市海报 |
| [极简编辑风格回顾海报](#极简编辑风格回顾海报) | gen  | 3:4    | 1K     | 编辑海报 |
| [编辑品牌海报](#编辑品牌海报)                 | gen  | 9:16   | 2K     | 编辑设计 |

---

## 文字遮罩编辑设计

**命令**: `gen` | **宽高比**: `9:16` | **分辨率**: `2K`

```
Act as a Senior Editorial Designer and Typographer.

PHASE 1: TYPOGRAPHIC MASK (THE "WINDOW" EFFECT).

- Core Element: Use the most iconic slogan or the name of [Nike] as a massive, ultra-bold, heavy sans-serif typographic
  mask.

- Layout: The letters must be giant, filling the entire vertical frame from edge to edge with tight kerning.

- Concept: The text acts as a "cut-out" window. The background is solid white, and the photographic subject is visible
  ONLY through the letterforms.

PHASE 2: DYNAMIC SUBJECT LOGIC.

- Subject Selection:

- Detail: Ensure a high-contrast element，an running athelete is visible through one of the letters as a focal point.

PHASE 3: SOPHISTICATED MUTED PALETTE.

- Atmosphere: Use a "Refined Muted" color scheme.

- Tones: Soft slate blues, charcoal greys, and creamy off-whites for the photography inside the mask.

- Accent: Identify one sharp, saturated accent color belonging to [BRAND NAME] and apply it to a single key object
  visible through the text.

PHASE 4: PHOTOGRAPHY & LIGHTING.

- Lighting: Soft-box studio lighting. Diffused shadows and gentle highlights to create a cinematic, high-end editorial
  feel.

- Finish: Clean, matte texture with zero visual noise. High-definition photographic quality.

PHASE 5: MINIMALIST BRANDING.

- Accents: Add a tiny minimalist logo and a small vertical tagline in a clean, microscopic sans-serif font near the
  corners.

- Year: Include the year "2026" in a subtle, elegant font to mimic a limited-edition look.
```

---

## 单色水墨肖像

**命令**: `edit` | **宽高比**: `1:1` | **分辨率**: `2K`

```
Transform the input photo into a refined monochromatic ink portrait on a pure white background. Clean side profile
facing left, preserving exact facial identity and proportions. Soft charcoal-gray ink with subtle tonal variation,
controlled splatter accents, delicate watercolor diffusion, and faint mist-like dispersion along the edges.
```

---

## 可爱Q版涂鸦肖像

**命令**: `edit` | **宽高比**: `1:1` | **分辨率**: `2K`

```
Surrounding the realistic main subject are multiple cute, 3D-style chibi miniatures of the same person, with identical
facial features, hairstyle, body proportions, and outfit. The chibi figures are naturally distributed around the
subject, interacting playfully with her or nearby elements in a charming, non-intrusive way.

Overlay the image with vibrant, hand-drawn doodle effects: soft white outlines around the subject, playful sparkles,
doodle hearts, tiny flowers, smiley icons, and floating white handwritten phrases like "shine", "bright night", and
"happy vibes".

The style seamlessly blends hyper-realistic photography with colorful, soft cartoon illustrations. Keep the original
face, body shape, and proportions of the main subject unchanged.
```

---

## 3D等距微缩模型

**命令**: `gen` | **宽高比**: `1:1` | **分辨率**: `1K`

```
A clean, minimal 3D isometric diorama of a [SCENE TYPE], featuring a [PRIMARY SUBJECT] in a clear, readable state, with
[KEY SUPPORTING ELEMENTS], subtle environmental details for context, soft studio lighting, realistic materials, smooth
edges, miniature model style, high detail, neutral background.
```

---

## 双重曝光照片网格

**命令**: `gen` | **宽高比**: `3:4` | **分辨率**: `2K`

```
Act as a high-end sports graphic designer creating a conceptual tribute poster. The style is a complex "dual exposure
photo-grid composite" with mixed-media textures.

CENTRAL STRUCTURE (THE VESSEL): The central focus is a large-scale, high-contrast black and white portrait silhouette of
[person name].This main portrait acts as the container.

THE GRID FILL & TEXTURES (MIXED MEDIA): The interior of the silhouette is populated by a dense "photo mosaic grid" of
action shots from the person's career.

CRITICAL TEXTURE INSTRUCTION: Do not just paste flat photos. Apply artistic textures to various grid cells to create a
tactile, collage feel. Use effects like: Halftone Dots: Comic-book style raster patterns on some cells.
Fabric/Embroidery: Subtle thread or canvas textures suggesting a jersey or patch.

Film Grain: Heavy noise on specific high-contrast action shots.

COLOR STRATEGY: The base is Monochrome B&W. Use selective color overlays (relevant to the team/flag) ONLY on specific
grid cells to create a rhythm.

TYPOGRAPHY & BRANDING (STRICT MICRO-SCALING): Top Left (The Name): Write "[Person Name]" strictly using the font Inter
Semibold. Kerning: Tight negative kerning (-4%). Size: SMALL and discreet. It must occupy MAXIMUM 20% of the canvas
width. Do NOT make it large or loud.

Top Right (The Symbol): Place the primary logo (Team/Brand/Flag). Size: VERY SMALL. It must occupy MAXIMUM 10% of the
canvas width.

COMPOSITION & BACKGROUND: Background: Off-white or light grey with a visible high-quality paper or concrete texture. It
should not be flat digital white.

Alignment: Center the figure perfectly. Maintain wide negative space around the object.
```

---

## 产品爆炸分解图

**命令**: `edit` | **宽高比**: `9:16` | **分辨率**: `2K`

```
Create a clean, commercial exploded view breakdown of the object shown in the uploaded image. Use the uploaded image as
the sole reference for the object's form, materials, proportions, and overall design.

The object may be any category (food, product, vehicle, device, apparel, or everyday item). Interpret the structure
naturally and logically based on the reference image.

Layout & Structure

Arrange the object into a top-to-bottom vertical exploded view

Separate the object into clearly defined layers or components

Components are evenly spaced, perfectly aligned, and visually balanced

Maintain realistic scale relationships between all parts

Components

Use simplified, generic component names (do not over-specify)

If not explicitly provided, generate reasonable component names automatically

Optionally include estimated weights, quantities, or functional labels when appropriate

Total number of components: auto-determined by the AI (or follow user-specified count if provided)

Annotations

Add clean infographic-style annotations for each component:

Minimal sans-serif font, medium weight

Text inside subtle boxes or frames

Thin, precise connector lines pointing directly to each component

No overlapping text or lines

High legibility, neutral and professional tone

Visual Style

Light, neutral background optimized for clarity

Soft, realistic shadows to preserve depth

No decorative elements, no stylization noise

Commercial, instructional, and brand-ready aesthetic

Suitable for marketing pages, product explainers, presentations, and landing visuals

Output Goal

A modern, minimal, vertical exploded breakdown that clearly communicates how the object is composed, in a visually
intuitive and commercially usable way.
```

---

## 城市景观笔触海报

**命令**: `gen` | **宽高比**: `4:5` | **分辨率**: `2K`

```
A brush, seemingly in the act of painting, traces a fine, elegant curve from the lower left to the upper right. Within
the stroke are miniature landscapes of an [New York] and its cultural region, featuring a carefully curated mix of:

– historical landmarks and heritage architecture – modern skyline elements and contemporary structures – symbolic urban
scenes representing daily life, movement, and energy – natural elements connected to the city (rivers, coastline,
mountains, or horizon silhouettes), subtly depicted in the distance

All landmarks and scenes are automatically selected by the AI to best represent the identity of the chosen city, forming
a continuous visual narrative within the stroke.

The overall style is a combination of impasto (oil painting style) and academic poster design: varying brushstrokes
create a strong sense of three-dimensionality, with 3D miniature landscapes and a refined bas-relief texture. Warm
cinematic tones dominate (sunset glow, ambient city lights, soft artificial illumination), blending traditional
architectural aesthetics with a modern metropolitan skyline.

The image is a minimalist top-down view, with large areas of white space outside the brushstroke. The background is pure
white textured paper (high-quality fiber texture). The overall design blends local cultural aesthetics with modern
three-dimensional art, featuring high detail, hyper-realism, HDR, and 8K resolution.

Poster text requires master-level typography: exquisite grid system, precise white space control, extremely accurate
letter spacing and visual hierarchy.

Main title: "{ City Name }" (Artistic display font, very eye-catching, high contrast, primary key visual)

Subtitle: A poetic, city-specific line automatically generated by AI, expressing the fusion of the city's history,
culture, and future.

Composition requirements: The brush tip should stop at the end of the stroke (upper right), leaving clean white space
outside the stroke; the miniature landscape exists only within the stroke, with dense details but not cluttered;
```

---

## 极简编辑风格回顾海报

**命令**: `gen` | **宽高比**: `3:4` | **分辨率**: `1K`

```
Minimalist editorial-style illustrated recap poster.

The image is divided into multiple clean illustrated sections, each section representing a different scene or idea. The
layout feels like a thoughtful visual summary, not a UI.

At the top of the image, generate ONE short reflective title sentence that summarizes the overall experience. The title
should feel calm, insightful, and minimal.

Illustration style: – clean hand-drawn lines – soft, muted colors – lots of white space – infographic-like but artistic
– minimal text, mostly visual symbols

Each section contains: – a small illustrated scene – abstract or symbolic elements with key words

Scenes to illustrate:

Scene 1: Vibe coding everyday Scene 2: Image generation and prompt testing Scene 3: Testing dozens of AI models

Overall mood: thoughtful, reflective, quiet optimism, a minimalist visual recap of personal AI experiences.
```

---

## 编辑品牌海报

**命令**: `gen` | **宽高比**: `9:16` | **分辨率**: `2K`

> 此示例为通用编辑品牌海报模板，可根据具体品牌需求自定义。

```
A clean, minimal 3D isometric diorama of a [SCENE TYPE], featuring a [PRIMARY SUBJECT] in a clear, readable state, with
[KEY SUPPORTING ELEMENTS], subtle environmental details for context, soft studio lighting, realistic materials, smooth
edges, miniature model style, high detail, neutral background.
```
