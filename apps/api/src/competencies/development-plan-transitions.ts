import { BadRequestException, ForbiddenException } from "@nestjs/common";

import type { DevelopmentPlanCommand, DevelopmentPlanState } from "./development-plans.schema";
/** Course/activity completion never establishes proficiency. Only the explicit complete command does. */
export function transitionDevelopmentPlan(
  state: DevelopmentPlanState,
  action: DevelopmentPlanCommand["action"],
  canApprove: boolean,
): DevelopmentPlanState {
  if (["approve", "return", "complete"].includes(action) && !canApprove)
    throw new ForbiddenException("competencies.errors.forbidden");
  const next: Partial<
    Record<
      DevelopmentPlanState,
      Partial<Record<DevelopmentPlanCommand["action"], DevelopmentPlanState>>
    >
  > = {
    draft: { request_approval: "pending_approval", cancel: "cancelled" },
    pending_approval: { approve: "active", return: "draft", cancel: "cancelled" },
    active: { report_activity: "active", submit: "submitted", cancel: "cancelled" },
    submitted: { return: "active", complete: "completed", cancel: "cancelled" },
  };
  const result = next[state]?.[action];
  if (!result) throw new BadRequestException("competencies.errors.invalidPlanTransition");
  return result;
}
