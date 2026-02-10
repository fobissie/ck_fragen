import type { PlanOption, YesChoiceType } from "../types";

interface YesOption {
  type: YesChoiceType;
  label: string;
}

interface PlanOptionLabel {
  id: PlanOption;
  label: string;
}

export const YES_OPTIONS: YesOption[] = [
  {
    type: "yes_no_idea",
    label: "Ja, auf jeden Fall, aber keine Ahnung was",
  },
  {
    type: "yes_have_idea",
    label: "Ja, auf jeden Fall und ich habe eine Idee",
  },
  {
    type: "yes_pick_option",
    label: "Ja, auf jeden Fall, und ich wähle aus deinen Optionen",
  },
  {
    type: "yes_no_idea",
    label: "Ja, aber big Überraschungstag",
  },
];

export const NO_OPTIONS = [
  "Ne, fuck nicht ab",
  "Ne, schon verplant",
  "Ne, eher nicht",
] as const;

export const PLAN_OPTIONS: PlanOptionLabel[] = [
  {
    id: "Weserpark+Kino",
    label: "Weserpark (z. B. neue Klamotten) (+) Kino",
  },
  {
    id: "Kino",
    label: "Kino",
  },
  {
    id: "Schwarzlicht Minigolf",
    label: "Schwarzlicht Minigolf",
  },
];
