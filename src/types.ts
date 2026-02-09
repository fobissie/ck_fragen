export type YesChoiceType = "yes_no_idea" | "yes_have_idea" | "yes_pick_option";
export type ChoiceType = YesChoiceType | "no";

export type PlanOption =
  | "Weserpark+Kino"
  | "Kino"
  | "Schwarzlicht Minigolf";

export interface SubmitResponseRequest {
  respondentName?: string;
  choiceType: ChoiceType;
  choiceLabel: string;
  selectedPlanOption?: PlanOption;
  ideaText?: string;
  noConfirmLevel?: number;
  deadlineIso: string;
  submittedAtIso: string;
  clientTz: string;
}

export interface SubmitResponseSuccess {
  ok: true;
  message: "saved_and_notified";
  requestId: string;
}

export interface SubmitResponseError {
  ok: false;
  message: string;
}
