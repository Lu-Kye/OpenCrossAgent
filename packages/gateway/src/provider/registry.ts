/**
 * ProviderRegistry — Agent Provider 注册表
 *
 * 管理所有已注册的 IAgentProvider 实例，
 * 支持按名称查找和默认 provider 切换。
 */

import type { IAgentProvider } from "./types.js";

export class ProviderRegistry {
  private providers = new Map<string, IAgentProvider>();
  private defaultName: string | undefined;

  register(provider: IAgentProvider): void {
    this.providers.set(provider.name, provider);
    if (this.defaultName === undefined) {
      this.defaultName = provider.name;
    }
  }

  get(name: string): IAgentProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): IAgentProvider {
    if (!this.defaultName) {
      throw new Error("No provider registered");
    }
    const provider = this.providers.get(this.defaultName);
    if (!provider) {
      throw new Error(`Default provider "${this.defaultName}" not found`);
    }
    return provider;
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultName = name;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  resolve(providerName?: string): IAgentProvider {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider "${providerName}" not registered`);
      }
      return provider;
    }
    return this.getDefault();
  }

  async disposeAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.dispose();
    }
    this.providers.clear();
    this.defaultName = undefined;
  }
}
