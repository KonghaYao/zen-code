# @konghayao/bun-plugin-tailwind

A fast and smart Tailwind CSS v4 plugin for Bun bundler with automatic source detection.

## Features

- 🚀 **Fast** - Built on Tailwind CSS v4's oxide engine
- 🎯 **Smart Detection** - Automatically detects source files from your Tailwind config
- 🔧 **Zero Config** - Works out of the box for most projects
- 📦 **Framework Support** - Works with Vue, Svelte, Astro CSS files

## Installation

```bash
bun add @konghayao/bun-plugin-tailwind
```

## Usage

### Basic Usage

```typescript
import { tailwindPlugin } from '@konghayao/bun-plugin-tailwind';

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    plugins: [tailwindPlugin],
});
```

### With TypeScript Build Script

```typescript
// build.ts
import { tailwindPlugin } from '@konghayao/bun-plugin-tailwind';

const result = await Bun.build({
    entrypoints: ['./src/main.ts'],
    outdir: './dist',
    plugins: [tailwindPlugin],
    minify: true,
    sourcemap: 'external',
});

if (!result.success) {
    console.error('Build failed:', result.logs);
    process.exit(1);
}

console.log('Build successful:', result.outputs);
```

### CSS Entry Point

Create a CSS file that imports Tailwind:

```css
/* styles.css */
@import 'tailwindcss';

/* Or with custom configuration */
@import 'tailwindcss/theme' theme;
@import 'tailwindcss/preflight';
@import 'tailwindcss/utilities';

/* Your custom styles */
@layer components {
    .btn {
        @apply px-4 py-2 rounded-lg;
    }
}
```

## How It Works

1. **Automatic Detection**: The plugin scans your CSS files for Tailwind directives
2. **Source Scanning**: Uses Tailwind v4's oxide scanner to find class usage in your project
3. **Smart Compilation**: Only processes files that use Tailwind features
4. **Optimized Output**: Returns compiled CSS directly to Bun's bundler for further optimization

## Supported File Types

- `.css` - Standard CSS files
- `.vue` - Vue SFC with `<style>` blocks
- `.svelte` - Svelte components with CSS
- `.astro` - Astro components with CSS

## Why This Plugin?

The official Tailwind CSS tooling is primarily designed for Vite. This plugin provides:

1. **Native Bun Support** - No Vite dependency required
2. **Better Performance** - Leverages Bun's fast bundler
3. **Simple Setup** - Single plugin, zero configuration

## Comparison with Official Tools

| Feature     | @konghayao/bun-plugin-tailwind | @tailwindcss/vite  |
| ----------- | ------------------------------ | ------------------ |
| Runtime     | Bun only                       | Vite only          |
| Config      | Zero config                    | Vite plugin config |
| Performance | Very fast                      | Fast               |
| HMR         | Manual                         | Built-in           |

## Requirements

- Bun >= 1.0.0
- Tailwind CSS v4 (peer dependency)

## License

MIT
