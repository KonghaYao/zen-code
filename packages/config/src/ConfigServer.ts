import type { ConfigManager } from './ConfigManager.js';
import type { AppConfig, SkillContent, PluginConfig, PluginSource } from './types/index.js';

/**
 * HTTP 方法类型
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * 路由处理器
 */
type RouteHandler = (request: Request) => Promise<Response>;

/**
 * 路由定义
 */
interface Route {
  method: HttpMethod;
  pathname: string;
  handler: RouteHandler;
}

/**
 * 配置服务器（跨平台，基于原生 fetch API）
 */
export class ConfigServer {
  private manager: ConfigManager;
  private routes: Route[] = [];

  constructor(manager: ConfigManager) {
    this.manager = manager;
    this.registerRoutes();
  }

  /**
   * 注册所有路由
   */
  private registerRoutes(): void {
    // 配置相关
    this.addRoute('GET', '/api/config', this.getConfig.bind(this));
    this.addRoute('POST', '/api/config', this.updateConfig.bind(this));

    // Skills 相关
    this.addRoute('GET', '/api/skills', this.listSkills.bind(this));
    this.addRoute('GET', '/api/skill', this.getSkill.bind(this));
    this.addRoute('PUT', '/api/skill', this.saveSkill.bind(this));
    this.addRoute('DELETE', '/api/skill', this.deleteSkill.bind(this));
    this.addRoute('POST', '/api/skills/sync', this.syncSkills.bind(this));

    // Plugins 相关
    this.addRoute('GET', '/api/plugins', this.listPlugins.bind(this));
    this.addRoute('GET', '/api/plugin/config', this.getPluginConfig.bind(this));
    this.addRoute('PUT', '/api/plugin/config', this.updatePluginConfig.bind(this));
    this.addRoute('POST', '/api/plugin/install', this.installPlugin.bind(this));
    this.addRoute('DELETE', '/api/plugin', this.uninstallPlugin.bind(this));

    // 健康检查
    this.addRoute('GET', '/api/health', this.healthCheck.bind(this));
  }

  /**
   * 添加路由
   */
  private addRoute(method: HttpMethod, pathname: string, handler: RouteHandler): void {
    this.routes.push({ method, pathname, handler });
  }

  /**
   * 精确匹配路由
   */
  private matchRoute(routePath: string, requestPath: string): boolean {
    return routePath === requestPath;
  }

  /**
   * 处理请求（跨平台入口）
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method as HttpMethod;
    const pathname = url.pathname;

    // 路由匹配
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (!this.matchRoute(route.pathname, pathname)) continue;

      try {
        return await route.handler(request);
      } catch (error) {
        return this.errorResponse(error);
      }
    }

    return this.notFoundResponse();
  }

  // ============ 响应辅助方法 ============

  private jsonResponse<T>(data: T, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private errorResponse(error: unknown): Response {
    console.error('Request error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return this.jsonResponse({ error: message }, 500);
  }

  private notFoundResponse(): Response {
    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  private async parseJson<T>(request: Request): Promise<T> {
    const body = await request.text();
    if (!body) {
      throw new Error('Request body is empty');
    }
    return JSON.parse(body) as T;
  }

  private getQueryParam(request: Request, key: string): string | null {
    const url = new URL(request.url);
    return url.searchParams.get(key);
  }

  private requireQueryParam(request: Request, key: string): string {
    const value = this.getQueryParam(request, key);
    if (!value) {
      throw new Error(`Missing required query parameter: ${key}`);
    }
    return value;
  }

  // ============ 路由处理器 ============

  // 健康检查
  private async healthCheck(): Promise<Response> {
    return this.jsonResponse({ status: 'ok', timestamp: Date.now() });
  }

  // 配置相关
  private async getConfig(): Promise<Response> {
    const config = await this.manager.getConfig();
    return this.jsonResponse(config);
  }

  private async updateConfig(request: Request): Promise<Response> {
    const config = await this.parseJson<Partial<AppConfig>>(request);
    await this.manager.updateConfig(config);
    return this.jsonResponse({ success: true });
  }

  // Skills 相关
  private async listSkills(): Promise<Response> {
    const skills = await this.manager.listSkills();
    return this.jsonResponse(skills);
  }

  private async getSkill(request: Request): Promise<Response> {
    const name = this.requireQueryParam(request, 'name');
    const skill = await this.manager.getSkill(name);
    if (!skill) {
      return this.jsonResponse({ error: 'Skill not found' }, 404);
    }
    return this.jsonResponse(skill);
  }

  private async saveSkill(request: Request): Promise<Response> {
    const body = await this.parseJson<{ name: string; content: SkillContent }>(request);
    await this.manager.saveSkill(body.name, body.content);
    return this.jsonResponse({ success: true });
  }

  private async deleteSkill(request: Request): Promise<Response> {
    const body = await this.parseJson<{ name: string }>(request);
    await this.manager.deleteSkill(body.name);
    return this.jsonResponse({ success: true });
  }

  private async syncSkills(): Promise<Response> {
    await this.manager.syncSkillsFromRemote();
    return this.jsonResponse({ success: true });
  }

  // Plugins 相关
  private async listPlugins(): Promise<Response> {
    const plugins = await this.manager.listPlugins();
    return this.jsonResponse(plugins);
  }

  private async getPluginConfig(request: Request): Promise<Response> {
    const name = this.requireQueryParam(request, 'name');
    const config = await this.manager.getPluginConfig(name);
    if (!config) {
      return this.jsonResponse({ error: 'Plugin config not found' }, 404);
    }
    return this.jsonResponse(config);
  }

  private async updatePluginConfig(request: Request): Promise<Response> {
    const body = await this.parseJson<{ name: string; config: PluginConfig }>(request);
    await this.manager.updatePluginConfig(body.name, body.config);
    return this.jsonResponse({ success: true });
  }

  private async installPlugin(request: Request): Promise<Response> {
    const body = await this.parseJson<{ name: string; source: PluginSource }>(request);
    await this.manager.installPlugin(body.name, body.source);
    return this.jsonResponse({ success: true });
  }

  private async uninstallPlugin(request: Request): Promise<Response> {
    const body = await this.parseJson<{ name: string }>(request);
    await this.manager.uninstallPlugin(body.name);
    return this.jsonResponse({ success: true });
  }
}
