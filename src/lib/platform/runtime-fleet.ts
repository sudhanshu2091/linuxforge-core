import type { RuntimeNode } from "./types";

export function chooseRuntimeNode(
  nodes: readonly RuntimeNode[],
  now = new Date(),
): RuntimeNode | null {
  const healthy = nodes.filter((node) => {
    if (node.state !== "ONLINE") return false;
    if (now.getTime() - Date.parse(node.lastHeartbeatAt) > 30_000) return false;
    return node.activeEnvironments < node.maxEnvironments;
  });
  return (
    [...healthy].sort((a, b) => {
      const ar = a.activeEnvironments / Math.max(1, a.maxEnvironments);
      const br = b.activeEnvironments / Math.max(1, b.maxEnvironments);
      return ar - br || a.nodeId.localeCompare(b.nodeId);
    })[0] ?? null
  );
}

export function markNodeDraining(node: RuntimeNode): RuntimeNode {
  return { ...node, state: "DRAINING" };
}
