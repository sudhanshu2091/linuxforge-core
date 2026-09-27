import type { AssessmentScope } from "./professional-assessment";

export type IntegrityFinding = {
  code:
    | "TARGET_OUT_OF_SCOPE"
    | "NETWORK_OUT_OF_SCOPE"
    | "PORT_OUT_OF_SCOPE"
    | "TECHNIQUE_PROHIBITED"
    | "TOOL_PROHIBITED";
  detail: string;
};
export type IntegrityResult = {
  status: "CLEAN" | "REVIEW_REQUIRED" | "POLICY_VIOLATION";
  findings: IntegrityFinding[];
};

export function inspectAssessmentAction(input: {
  scope: AssessmentScope;
  target?: string;
  network?: string;
  port?: number;
  technique?: string;
  tool?: string;
}): IntegrityResult {
  const findings: IntegrityFinding[] = [];
  if (
    input.target &&
    input.scope.allowedTargets.length &&
    !input.scope.allowedTargets.includes(input.target)
  )
    findings.push({
      code: "TARGET_OUT_OF_SCOPE",
      detail: `Target ${input.target} is outside assessment scope.`,
    });
  if (
    input.network &&
    input.scope.allowedNetworks.length &&
    !input.scope.allowedNetworks.includes(input.network)
  )
    findings.push({
      code: "NETWORK_OUT_OF_SCOPE",
      detail: `Network ${input.network} is outside assessment scope.`,
    });
  if (
    input.port !== undefined &&
    input.scope.allowedPorts.length &&
    !input.scope.allowedPorts.includes(input.port)
  )
    findings.push({
      code: "PORT_OUT_OF_SCOPE",
      detail: `Port ${input.port} is outside assessment scope.`,
    });
  if (input.technique && input.scope.prohibitedTechniques.includes(input.technique))
    findings.push({
      code: "TECHNIQUE_PROHIBITED",
      detail: `Technique ${input.technique} is prohibited.`,
    });
  if (input.tool && input.scope.prohibitedTools.includes(input.tool))
    findings.push({ code: "TOOL_PROHIBITED", detail: `Tool ${input.tool} is prohibited.` });
  return { status: findings.length ? "POLICY_VIOLATION" : "CLEAN", findings };
}
