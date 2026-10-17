/** Converts validated API operations to the wire shape expected by the authoring service. */
import { BadRequestException } from "@nestjs/common";
import { SUPPORTED_LANGUAGES, type SupportedLanguages } from "@repo/shared";

import type { AuthoringOperation } from "./schema/course-authoring-operations.schema";
import type { AuthoringOperation as WireOperation } from "@mentingo/luma-sdk";

/** Luma 0.4.0 has a closed language contract; never silently rewrite course language. */
export function requireLumaLanguage(language: SupportedLanguages) {
  if (language === SUPPORTED_LANGUAGES.PT_AO) {
    throw new BadRequestException("courseAuthoring.errors.unsupportedLanguage");
  }
  return language;
}

/** Preserve the operation discriminant when converting the grouped TypeBox union. */
/** Maps validated Core operation payloads to the generated client wire contract. */
export function toWireAuthoringOperation(input: AuthoringOperation): WireOperation {
  const language = requireLumaLanguage(input.language);
  const operation = { ...input, language };
  switch (operation.type) {
    case "lesson.create": {
      if (operation.payload.lessonType === "ai_mentor") {
        if (!operation.payload.judgeConfiguration)
          throw new BadRequestException("courseAuthoring.errors.mentorJudgeRequired");
        return {
          ...operation,
          type: "lesson.create",
          payload: {
            ...operation.payload,
            judgeConfiguration: operation.payload.judgeConfiguration,
          },
        };
      }
      return { ...operation, type: "lesson.create", payload: operation.payload };
    }
    case "lesson.update":
      return { ...operation, type: "lesson.update" };
    case "chapter.create":
      return { ...operation, type: "chapter.create" };
    case "chapter.update":
      return { ...operation, type: "chapter.update" };
    case "chapter.delete":
      return { ...operation, type: "chapter.delete" };
    case "lesson.delete":
      return { ...operation, type: "lesson.delete" };
    case "chapter.reorder":
      return { ...operation, type: "chapter.reorder" };
    case "lesson.reorder":
      return { ...operation, type: "lesson.reorder" };
    default:
      return operation;
  }
}
