import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import "./index.css";
import {
  formatCountdown,
  formatDeadlineForDisplay,
  getCountdownParts,
  getNextBerlinWednesdayDeadline,
} from "./utils/deadline";
import { NO_OPTIONS, PLAN_OPTIONS, YES_OPTIONS } from "./utils/options";
import type {
  ChoiceType,
  PlanOption,
  SubmitResponseError,
  SubmitResponseRequest,
  SubmitResponseSuccess,
  YesChoiceType,
} from "./types";

const DEADLINE_JOKE = "Hahaha hast du gedacht dass ich es so einfach mache , schlecht";
const NO_TAUNTS = [
  "Netter Versuch. Noch mal tippen.",
  "Die Nein-Buttons sind heute im Speedrun-Modus.",
] as const;

const NO_MODAL_STEPS = [
  {
    title: "Bist du dir sicher?",
    text: "Ein Nein ist erlaubt, aber nur fuer Menschen mit wirklich starker Entschlossenheit.",
  },
  {
    title: "Wirklich sicher?",
    text: "Wir koennten auch einfach lachen, losziehen und den Samstag gewinnen.",
  },
  {
    title: "Letzte Chance!",
    text: "Ab hier wird dein Nein final gespeichert. Noch umdrehen?",
  },
] as const;

type CompletionState = "form" | "submitting" | "yes_done" | "no_done";
type NoOffsets = Record<string, { x: number; y: number }>;

function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function randomOffset(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * 25) - 12,
    y: Math.floor(Math.random() * 17) - 8,
  };
}

function buildNoOffsets(): NoOffsets {
  return Object.fromEntries(NO_OPTIONS.map((label) => [label, randomOffset()]));
}

function App() {
  const [deadline, setDeadline] = useState<Date>(() =>
    getNextBerlinWednesdayDeadline(),
  );
  const [countdown, setCountdown] = useState(() => getCountdownParts(deadline));
  const [deadlineJoke, setDeadlineJoke] = useState("");

  const [respondentName, setRespondentName] = useState("");
  const [selectedChoiceType, setSelectedChoiceType] = useState<ChoiceType | null>(
    null,
  );
  const [selectedChoiceLabel, setSelectedChoiceLabel] = useState("");
  const [selectedPlanOption, setSelectedPlanOption] = useState<PlanOption | "">("");
  const [ideaText, setIdeaText] = useState("");

  const [noAttemptCount, setNoAttemptCount] = useState(0);
  const [noOrder, setNoOrder] = useState<string[]>([...NO_OPTIONS]);
  const [noOffsets, setNoOffsets] = useState<NoOffsets>(() => buildNoOffsets());
  const [hiddenNoLabel, setHiddenNoLabel] = useState<string | null>(null);
  const [noTaunt, setNoTaunt] = useState("");
  const [noModalStage, setNoModalStage] = useState<0 | 1 | 2 | 3>(0);
  const [pendingNoLabel, setPendingNoLabel] = useState("");
  const [noConfirmLevel, setNoConfirmLevel] = useState(0);

  const [completionState, setCompletionState] =
    useState<CompletionState>("form");
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSummary, setSubmissionSummary] =
    useState<SubmitResponseRequest | null>(null);

  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (): void => {
      const nextDeadline = getNextBerlinWednesdayDeadline();
      setDeadline(nextDeadline);
      setCountdown(getCountdownParts(nextDeadline));
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(timer);
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (completionState !== "yes_done") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      return;
    }

    const animationEnd = Date.now() + 1800;
    const interval = window.setInterval(() => {
      if (Date.now() > animationEnd) {
        window.clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 70,
        spread: 80,
        startVelocity: 36,
        origin: { x: Math.random(), y: Math.random() * 0.6 },
        colors: ["#f5be2c", "#30b7aa", "#f0564a", "#fefefe"],
      });
    }, 240);

    return () => window.clearInterval(interval);
  }, [completionState]);

  const deadlineLabel = useMemo(
    () => formatDeadlineForDisplay(deadline),
    [deadline],
  );

  const remainingLabel = useMemo(() => formatCountdown(countdown), [countdown]);

  const clientTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const noModalContent =
    noModalStage > 0 ? NO_MODAL_STEPS[noModalStage - 1] : null;

  const isSubmitting = completionState === "submitting";

  const canSubmit = useMemo(() => {
    if (!selectedChoiceType) {
      return false;
    }

    if (selectedChoiceType === "yes_pick_option") {
      return selectedPlanOption !== "";
    }

    if (selectedChoiceType === "yes_have_idea") {
      return ideaText.trim().length > 3;
    }

    if (selectedChoiceType === "no") {
      return noConfirmLevel === 3;
    }

    return true;
  }, [ideaText, noConfirmLevel, selectedChoiceType, selectedPlanOption]);

  const resetNoChallenge = (): void => {
    setNoAttemptCount(0);
    setNoOrder([...NO_OPTIONS]);
    setNoOffsets(buildNoOffsets());
    setHiddenNoLabel(null);
    setNoTaunt("");
    setNoModalStage(0);
    setPendingNoLabel("");
    setNoConfirmLevel(0);
  };

  const resetEntireFlow = (): void => {
    setCompletionState("form");
    setSubmissionSummary(null);
    setSubmissionError("");
    setRespondentName("");
    setSelectedChoiceType(null);
    setSelectedChoiceLabel("");
    setSelectedPlanOption("");
    setIdeaText("");
    setDeadlineJoke("");
    setDeadline(getNextBerlinWednesdayDeadline());
    resetNoChallenge();
  };

  const chooseYesOption = (type: YesChoiceType, label: string): void => {
    resetNoChallenge();
    setSubmissionError("");
    setSelectedChoiceType(type);
    setSelectedChoiceLabel(label);
  };

  const randomizeNoButtons = (selectedLabel: string): void => {
    setNoOrder(shuffle(NO_OPTIONS));
    setNoOffsets(buildNoOffsets());

    if (noAttemptCount === 1) {
      const candidates = NO_OPTIONS.filter((label) => label !== selectedLabel);
      const choiceToHide =
        candidates[Math.floor(Math.random() * candidates.length)] ?? NO_OPTIONS[0];

      setHiddenNoLabel(choiceToHide);
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = window.setTimeout(() => {
        setHiddenNoLabel((current) => (current === choiceToHide ? null : current));
      }, 900);
    }
  };

  const chooseNoOption = (label: string): void => {
    setSubmissionError("");
    setPendingNoLabel(label);
    setSelectedChoiceType(null);
    setSelectedChoiceLabel("");
    setNoConfirmLevel(0);

    const nextAttempt = noAttemptCount + 1;
    setNoAttemptCount(nextAttempt);

    if (nextAttempt <= 2) {
      setNoTaunt(NO_TAUNTS[nextAttempt - 1]);
      randomizeNoButtons(label);
      return;
    }

    setNoModalStage(1);
  };

  const handleNoModalPrimary = (): void => {
    if (noModalStage < 3) {
      setNoModalStage((current) =>
        current === 0 ? 1 : ((current + 1) as 1 | 2 | 3),
      );
      return;
    }

    setNoModalStage(0);
    setNoConfirmLevel(3);
    setSelectedChoiceType("no");
    setSelectedChoiceLabel(pendingNoLabel || NO_OPTIONS[0]);
    setNoTaunt("Okay, respektiert. Dieses Nein ist jetzt final.");
    setHiddenNoLabel(null);
    setNoOffsets(buildNoOffsets());
    setNoOrder([...NO_OPTIONS]);
  };

  const pivotToYes = (): void => {
    chooseYesOption("yes_no_idea", YES_OPTIONS[0].label);
    setNoModalStage(0);
    setNoTaunt("Smart move. Dann planen wir lieber etwas Cooles.");
  };

  const submitResponse = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedChoiceType || !canSubmit) {
      return;
    }

    const finalChoiceType = selectedChoiceType;

    const payload: SubmitResponseRequest = {
      respondentName: respondentName.trim() || undefined,
      choiceType: finalChoiceType,
      choiceLabel: selectedChoiceLabel,
      selectedPlanOption:
        finalChoiceType === "yes_pick_option" ? selectedPlanOption || undefined : undefined,
      ideaText: finalChoiceType === "yes_have_idea" ? ideaText.trim() : undefined,
      noConfirmLevel: finalChoiceType === "no" ? noConfirmLevel : undefined,
      deadlineIso: deadline.toISOString(),
      submittedAtIso: new Date().toISOString(),
      clientTz: clientTimeZone,
    };

    try {
      setCompletionState("submitting");
      setSubmissionError("");

      const response = await fetch("/api/response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | SubmitResponseSuccess
        | SubmitResponseError
        | null;

      if (!response.ok || !body || !body.ok) {
        throw new Error(
          body && "message" in body
            ? body.message
            : "Antwort konnte nicht uebermittelt werden.",
        );
      }

      setSubmissionSummary(payload);
      setCompletionState(finalChoiceType === "no" ? "no_done" : "yes_done");
    } catch (error) {
      setCompletionState("form");
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Senden der Antwort.",
      );
    }
  };

  if (completionState === "yes_done" && submissionSummary) {
    return (
      <div className="app-shell">
        <main className="result-card result-yes">
          <p className="pill">Mission erfolgreich</p>
          <h1>Yes! Samstag unlocked.</h1>
          <p className="result-copy">
            Stark. Deine Zusage ist angekommen und die Vorfreude ist jetzt offiziell.
          </p>
          <img
            className="profile-image"
            src="/images/me-placeholder.svg"
            alt="Platzhalter fuer dein Bild"
          />
          <div className="summary-box">
            <p>
              <strong>Auswahl:</strong> {submissionSummary.choiceLabel}
            </p>
            {submissionSummary.selectedPlanOption ? (
              <p>
                <strong>Option:</strong> {submissionSummary.selectedPlanOption}
              </p>
            ) : null}
            {submissionSummary.ideaText ? (
              <p>
                <strong>Deine Idee:</strong> {submissionSummary.ideaText}
              </p>
            ) : null}
            <p>
              <strong>Name:</strong> {submissionSummary.respondentName || "anonym"}
            </p>
            <p>
              <strong>Abgesendet:</strong>{" "}
              {new Date(submissionSummary.submittedAtIso).toLocaleString("de-DE")}
            </p>
          </div>
          <button type="button" className="primary-button" onClick={resetEntireFlow}>
            Noch eine Runde
          </button>
        </main>
      </div>
    );
  }

  if (completionState === "no_done" && submissionSummary) {
    return (
      <div className="app-shell">
        <main className="result-card result-no">
          <p className="pill">Rueckmeldung gespeichert</p>
          <h1>Danke dir fuer deine Zeit.</h1>
          <p className="result-copy">
            Ehrliche Antwort ist besser als gar keine. Deine Rueckmeldung wurde sauber
            uebermittelt.
          </p>
          <div className="summary-box">
            <p>
              <strong>Auswahl:</strong> {submissionSummary.choiceLabel}
            </p>
            <p>
              <strong>Abgesendet:</strong>{" "}
              {new Date(submissionSummary.submittedAtIso).toLocaleString("de-DE")}
            </p>
          </div>
          <button type="button" className="primary-button" onClick={resetEntireFlow}>
            Zurueck zum Start
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="main-card">
        <p className="pill">Level: Samstag-Planung</p>
        <h1>Bock auf Samstag?</h1>
        <p className="intro-copy">
          Hey du! Ich habe gehoert, Samstag ist bei dir trainingsfrei. Oder vielleicht
          doch nicht. Egal. Ich setze diesmal aus und haette richtig Lust, mit dir
          etwas zu unternehmen. Klick dich durch und sag mir deine Meinung. Der
          Countdown laeuft bis Mittwoch, 04:44 Uhr in Deutschland (kein Druck... nur
          ein klitzekleiner).
        </p>

        <section className="timer-box" aria-live="polite">
          <p>
            <strong>Deadline:</strong> {deadlineLabel}
          </p>
          <p>
            <strong>Verbleibend:</strong> {remainingLabel}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setDeadlineJoke(DEADLINE_JOKE)}
          >
            Deadline verschieben
          </button>
          {deadlineJoke ? <p className="joke-message">{deadlineJoke}</p> : null}
        </section>

        <form className="answer-form" onSubmit={submitResponse}>
          <label htmlFor="respondent-name" className="input-label">
            Dein Name (optional)
          </label>
          <input
            id="respondent-name"
            name="respondentName"
            className="text-input"
            placeholder="Optional: dein Name"
            autoComplete="name"
            maxLength={80}
            value={respondentName}
            onChange={(event) => setRespondentName(event.target.value)}
          />

          <section className="option-block">
            <h2>Ja-Pfade</h2>
            <div className="option-grid">
              {YES_OPTIONS.map((option) => {
                const selected =
                  selectedChoiceType === option.type &&
                  selectedChoiceLabel === option.label;

                return (
                  <button
                    type="button"
                    key={option.label}
                    className={`option-button yes-button ${selected ? "selected" : ""}`}
                    onClick={() => chooseYesOption(option.type, option.label)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="option-block no-block">
            <h2>Nein-Pfade</h2>
            <p className="tiny-copy">Im High-Mode erst nach 3 Bestaetigungen final.</p>
            <div className="option-grid">
              {noOrder.map((label) => {
                const offset = noOffsets[label] ?? { x: 0, y: 0 };
                const isHidden = hiddenNoLabel === label;

                return (
                  <button
                    type="button"
                    key={label}
                    className="option-button no-button"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                      visibility: isHidden ? "hidden" : "visible",
                    }}
                    onClick={() => chooseNoOption(label)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {noTaunt ? <p className="taunt-message">{noTaunt}</p> : null}
          </section>

          {selectedChoiceType ? (
            <section className="selection-card">
              <p className="selection-headline">
                Ausgewaehlt: <strong>{selectedChoiceLabel}</strong>
              </p>

              {selectedChoiceType === "yes_pick_option" ? (
                <fieldset className="details-fieldset">
                  <legend>Welche Option soll es sein?</legend>
                  {PLAN_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`option-button small-option ${
                        selectedPlanOption === option.id ? "selected" : ""
                      }`}
                      onClick={() => setSelectedPlanOption(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </fieldset>
              ) : null}

              {selectedChoiceType === "yes_have_idea" ? (
                <label className="input-label" htmlFor="idea-text">
                  Deine Idee
                  <textarea
                    id="idea-text"
                    className="text-area"
                    placeholder="Was willst du am Samstag machen?"
                    maxLength={500}
                    value={ideaText}
                    onChange={(event) => setIdeaText(event.target.value)}
                  />
                </label>
              ) : null}

              {selectedChoiceType === "no" ? (
                <p className="tiny-copy">
                  Nein wurde korrekt finalisiert und kann nun abgeschickt werden.
                </p>
              ) : null}
            </section>
          ) : null}

          {submissionError ? (
            <p className="error-message" role="alert">
              {submissionError}
            </p>
          ) : null}

          <button
            type="submit"
            className="primary-button"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Wird uebermittelt..." : "Antwort absenden"}
          </button>
        </form>
      </main>

      {noModalContent ? (
        <div className="modal-overlay" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true">
            <p className="pill">Nein-Bestaetigung {noModalStage}/3</p>
            <h3>{noModalContent.title}</h3>
            <p>{noModalContent.text}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleNoModalPrimary}
              >
                {noModalStage < 3
                  ? "Weiter (ich bleibe bei Nein)"
                  : "Nein final bestaetigen"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={pivotToYes}
              >
                Doch lieber Ja
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default App;
