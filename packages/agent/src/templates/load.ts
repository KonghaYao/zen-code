/**
 * Template loader with caching support.
 * Scans ./.claude/templates directory for .md files and extracts YAML frontmatter.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface TemplateMetadata {
	name: string;
	description: string;
	content: string;
	path: string;
}

// Cache for template metadata
let templateCache: Map<string, TemplateMetadata> | null = null;

/**
 * Parse YAML frontmatter from markdown content.
 * Expected format:
 * ---
 * name: Template Name
 * description: Template description
 * ---
 * Template content here
 */
function parseYamlFrontmatter(content: string): { metadata: Partial<TemplateMetadata>; content: string } {
	const lines = content.split('\n');

	// Check if file starts with ---
	if (lines[0] !== '---') {
		return { metadata: {}, content };
	}

	// Find closing ---
	const endIdx = lines.indexOf('---', 1);
	if (endIdx === -1) {
		return { metadata: {}, content };
	}

	// Parse frontmatter lines
	const frontmatterLines = lines.slice(1, endIdx);
	const metadata: Partial<TemplateMetadata> = {};

	for (const line of frontmatterLines) {
		const match = line.match(/^(\w+):\s*(.+)$/);
		if (match) {
			const [, key, value] = match;
			if (key === 'name') metadata.name = value.trim();
			if (key === 'description') metadata.description = value.trim();
		}
	}

	// Extract content (remove frontmatter)
	const templateContent = lines.slice(endIdx + 1).join('\n').trim();

	return { metadata, content: templateContent };
}

/**
 * Recursively scan directory for template files.
 */
function scanTemplatesDir(dir: string, baseDir: string): Map<string, TemplateMetadata> {
	const templates = new Map<string, TemplateMetadata>();

	try {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively scan subdirectories
				const subTemplates = scanTemplatesDir(fullPath, baseDir);
				subTemplates.forEach((template) => templates.set(template.name, template));
			} else if (entry.name.endsWith('.md')) {
				// Parse markdown file
				try {
					const content = readFileSync(fullPath, 'utf-8');
					const { metadata, content: templateContent } = parseYamlFrontmatter(content);

					// Use name from frontmatter or filename
					const templateName = metadata.name || entry.name.replace(/\.md$/, '');

					if (!metadata.name) {
						console.warn(`Template missing "name" in frontmatter: ${fullPath}`);
					}

					templates.set(templateName, {
						name: templateName,
						description: metadata.description || 'No description',
						content: templateContent,
						path: fullPath,
					});
				} catch (error) {
					console.warn(`Failed to read template file: ${fullPath}`, error);
				}
			}
		}
	} catch (error: any) {
		if (error.code !== 'ENOENT') {
			console.warn(`Error scanning templates directory: ${dir}`, error);
		}
	}

	return templates;
}

/**
 * Clear the template cache. Use after adding/removing template files.
 */
export function clearTemplateCache(): void {
	templateCache = null;
}

/**
 * List all available templates.
 * Returns cached results if available, otherwise scans the templates directory.
 * 
 * @param templatesDir - Path to templates directory (default: ./.claude/templates)
 * @returns Array of template metadata
 */
export function listTemplates(templatesDir: string = './.claude/templates'): TemplateMetadata[] {
	// Return cached results if available
	if (templateCache) {
		return Array.from(templateCache.values());
	}

	// Resolve absolute path
	const absoluteDir = templatesDir.startsWith('/')
		? templatesDir
		: join(process.cwd(), templatesDir);

	// Scan templates directory
	templateCache = scanTemplatesDir(absoluteDir, absoluteDir);

	return Array.from(templateCache.values());
}

/**
 * Get a specific template by name.
 * 
 * @param name - Template name
 * @param templatesDir - Path to templates directory
 * @returns Template metadata or undefined if not found
 */
export function getTemplate(name: string, templatesDir: string = './.claude/templates'): TemplateMetadata | undefined {
	const templates = listTemplates(templatesDir);
	return templates.find(t => t.name === name);
}
