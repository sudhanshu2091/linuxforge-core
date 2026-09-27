import type { ExerciseContract } from "./types";
import { assertExerciseContract } from "./contract";

const contracts = new Map<string, ExerciseContract>();

export function registerExerciseContract(contract: ExerciseContract): void {
  assertExerciseContract(contract);
  const key = `${contract.exerciseId}:v${contract.version}`;
  if (contracts.has(key)) throw new Error(`Exercise contract ${key} is already registered.`);
  contracts.set(key, structuredClone(contract));
}

export function getExerciseContract(exerciseId: string, version: number): ExerciseContract | null {
  const value = contracts.get(`${exerciseId}:v${version}`);
  return value ? structuredClone(value) : null;
}

export function clearExerciseContractsForTests(): void {
  contracts.clear();
}
