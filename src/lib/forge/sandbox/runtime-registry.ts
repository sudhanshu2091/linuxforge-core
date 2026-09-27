/** Runtime-node registration and placement boundary. */
import type { RuntimeClass } from "./contract";
import { assertRuntimeNodeCanLaunch, type RuntimeNode } from "./runtime-backend";
import type { RuntimeLaunchSpec } from "./runtime-admission";

export type RuntimeRegistry = {
  register(node: RuntimeNode): void;
  unregister(nodeId: string): boolean;
  get(nodeId: string): RuntimeNode | null;
  list(runtimeClass?: RuntimeClass): RuntimeNode[];
  select(launch: RuntimeLaunchSpec): RuntimeNode;
  reserve(nodeId: string): RuntimeNode;
  release(nodeId: string): RuntimeNode;
};

export class InMemoryRuntimeRegistry implements RuntimeRegistry {
  private readonly nodes = new Map<string, RuntimeNode>();

  register(node: RuntimeNode): void {
    if (!node.nodeId || !node.backendId) throw new Error("Runtime node identity is required.");
    if (this.nodes.has(node.nodeId))
      throw new Error(`Runtime node ${node.nodeId} is already registered.`);
    if (node.activeEnvironments < 0)
      throw new Error("Runtime node active count cannot be negative.");
    if (node.maxEnvironments !== null && node.maxEnvironments < 1) {
      throw new Error("Runtime node capacity must be positive or null.");
    }
    this.nodes.set(node.nodeId, { ...node, metadata: { ...node.metadata } });
  }

  unregister(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    if (node.activeEnvironments > 0)
      throw new Error("Cannot unregister a runtime node with active environments.");
    return this.nodes.delete(nodeId);
  }

  get(nodeId: string): RuntimeNode | null {
    const node = this.nodes.get(nodeId);
    return node ? { ...node, metadata: { ...node.metadata } } : null;
  }

  list(runtimeClass?: RuntimeClass): RuntimeNode[] {
    return [...this.nodes.values()]
      .filter((node) => runtimeClass === undefined || node.runtimeClass === runtimeClass)
      .map((node) => ({ ...node, metadata: { ...node.metadata } }))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  select(launch: RuntimeLaunchSpec): RuntimeNode {
    const candidates = this.list(launch.runtimeClass).filter((node) => {
      try {
        assertRuntimeNodeCanLaunch(node, launch);
        return true;
      } catch {
        return false;
      }
    });
    const selected = candidates.sort((a, b) => {
      const capacityA =
        a.maxEnvironments === null
          ? Number.POSITIVE_INFINITY
          : a.maxEnvironments - a.activeEnvironments;
      const capacityB =
        b.maxEnvironments === null
          ? Number.POSITIVE_INFINITY
          : b.maxEnvironments - b.activeEnvironments;
      return (
        capacityB - capacityA ||
        a.activeEnvironments - b.activeEnvironments ||
        a.nodeId.localeCompare(b.nodeId)
      );
    })[0];
    if (!selected) throw new Error("No admitted runtime node is available for this launch.");
    return selected;
  }

  reserve(nodeId: string): RuntimeNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Runtime node ${nodeId} is not registered.`);
    if (node.maxEnvironments !== null && node.activeEnvironments >= node.maxEnvironments) {
      throw new Error(`Runtime node ${nodeId} is at capacity.`);
    }
    const updated = { ...node, activeEnvironments: node.activeEnvironments + 1 };
    this.nodes.set(nodeId, updated);
    return { ...updated, metadata: { ...updated.metadata } };
  }

  release(nodeId: string): RuntimeNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Runtime node ${nodeId} is not registered.`);
    const updated = { ...node, activeEnvironments: Math.max(0, node.activeEnvironments - 1) };
    this.nodes.set(nodeId, updated);
    return { ...updated, metadata: { ...updated.metadata } };
  }
}
