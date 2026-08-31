import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { posthog } from "@/lib/posthog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ types */

type SurveyQuestion = {
  id: string;
  type: string;
  question: string;
  description?: string;
  optional?: boolean;
  choices?: string[];
  scale?: number;
  lowerBoundLabel?: string;
  upperBoundLabel?: string;
};

type ApiSurvey = {
  id: string;
  name?: string;
  type: string;
  questions: SurveyQuestion[];
};

type RuleCondition = {
  question: number;
  any_of?: string[];
  all_of?: string[];
  none_of?: string[];
  min_selected?: number;
  max_selected?: number;
};

type BranchingRule = { when: RuleCondition; show: number[] };

type BranchingRules = {
  survey_id?: string;
  version?: number;
  always_show: number[];
  rules: BranchingRule[];
  pipe_choices: Record<string, number>;
};

type AnswerValue = string | string[] | number | undefined;
type Answers = Record<number, AnswerValue>;

/* -------------------------------------------------------------- pure logic */

const toSelected = (value: AnswerValue): string[] => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return value ? [value] : [];
  if (typeof value === "number") return [String(value)];
  return [];
};

const matchesCondition = (selected: string[], when: RuleCondition): boolean => {
  const checks: boolean[] = [];
  if (Array.isArray(when.any_of)) checks.push(when.any_of.some((v) => selected.includes(v)));
  if (Array.isArray(when.all_of)) checks.push(when.all_of.every((v) => selected.includes(v)));
  if (Array.isArray(when.none_of)) checks.push(!when.none_of.some((v) => selected.includes(v)));
  if (typeof when.min_selected === "number") checks.push(selected.length >= when.min_selected);
  if (typeof when.max_selected === "number") checks.push(selected.length <= when.max_selected);
  if (checks.length === 0) return false;
  return checks.every(Boolean);
};

export const computeVisibleQuestions = (
  answers: Answers,
  rules: BranchingRules,
  questions: SurveyQuestion[],
): number[] => {
  const out = new Set<number>();
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < questions.length;

  (rules.always_show ?? []).forEach((i) => {
    if (valid(i)) out.add(i);
  });

  (rules.rules ?? []).forEach((rule) => {
    if (!rule?.when || typeof rule.when.question !== "number") return;
    const selected = toSelected(answers[rule.when.question]);
    if (selected.length === 0 && typeof rule.when.none_of === "undefined") {
      // no answer yet: nothing to branch on (except none_of style rules)
      if (!matchesCondition(selected, rule.when)) return;
    }
    if (!matchesCondition(selected, rule.when)) return;
    (rule.show ?? []).forEach((i) => {
      if (valid(i)) out.add(i);
    });
  });

  return Array.from(out).sort((a, b) => a - b);
};

const defaultRules = (questionCount: number): BranchingRules => ({
  always_show: questionCount > 0 ? [0, Math.max(0, questionCount - 1)] : [],
  rules: [],
  pipe_choices: {},
});

const parseRules = (raw: unknown, questionCount: number): BranchingRules => {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return defaultRules(questionCount);
    const candidate = obj as Partial<BranchingRules>;
    if (!Array.isArray(candidate.always_show)) return defaultRules(questionCount);
    return {
      survey_id: candidate.survey_id,
      version: candidate.version,
      always_show: candidate.always_show.filter((n) => typeof n === "number"),
      rules: Array.isArray(candidate.rules) ? candidate.rules : [],
      pipe_choices:
        candidate.pipe_choices && typeof candidate.pipe_choices === "object"
          ? (candidate.pipe_choices as Record<string, number>)
          : {},
    };
  } catch {
    return defaultRules(questionCount);
  }
};

/* -------------------------------------------------------------- component */

export const CustomSurvey = () => {
  const [survey, setSurvey] = useState<ApiSurvey | null>(null);
  const [rules, setRules] = useState<BranchingRules | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const shownRef = useRef(false);
  const submittedRef = useRef(false);

  const questions = survey?.questions ?? [];

  const visibleIndexes = useMemo(
    () => (survey && rules ? computeVisibleQuestions(answers, rules, questions) : []),
    [answers, rules, survey, questions],
  );

  const seenKey = survey ? `hasInteractedWithSurvey_${survey.id}` : "";

  /* ---- fetch survey + rules */
  useEffect(() => {
    let cancelled = false;
    try {
      posthog.onFeatureFlags(() => {
        try {
          (posthog as any).getActiveMatchingSurveys?.((found: ApiSurvey[]) => {
            try {
              if (cancelled) return;
              const api = (found ?? []).find((s) => s?.type === "api");
              if (!api || !Array.isArray(api.questions) || api.questions.length === 0) return;
              const payload = posthog.getFeatureFlagPayload("survey-branching-rules");
              setRules(parseRules(payload, api.questions.length));
              setSurvey(api);
            } catch {
              /* silent */
            }
          }, true);
        } catch {
          /* silent */
        }
      });
    } catch {
      /* silent */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- decide whether to show */
  useEffect(() => {
    if (!survey) return;
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).get("survey") === "1";
    } catch {
      forced = false;
    }
    let seen = false;
    try {
      seen = window.localStorage.getItem(seenKey) === "true";
    } catch {
      seen = false;
    }
    if (forced || !seen) setVisible(true);
  }, [survey, seenKey]);

  /* ---- survey shown */
  useEffect(() => {
    if (!visible || !survey || shownRef.current) return;
    shownRef.current = true;
    try {
      posthog.capture("survey shown", { $survey_id: survey.id });
    } catch {
      /* silent */
    }
  }, [visible, survey]);

  /* ---- prune answers that dropped out of the path */
  useEffect(() => {
    if (!survey || !rules) return;
    setAnswers((prev) => {
      const allowed = new Set(computeVisibleQuestions(prev, rules, questions));
      let changed = false;
      const next: Answers = {};
      Object.keys(prev).forEach((k) => {
        const idx = Number(k);
        if (allowed.has(idx)) next[idx] = prev[idx];
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [answers, rules, survey, questions]);

  /* ---- keep step within bounds */
  useEffect(() => {
    if (visibleIndexes.length === 0) return;
    setStepIdx((s) => Math.min(s, visibleIndexes.length - 1));
  }, [visibleIndexes.length]);

  const markSeen = useCallback(() => {
    try {
      if (seenKey) window.localStorage.setItem(seenKey, "true");
    } catch {
      /* silent */
    }
  }, [seenKey]);

  const handleDismiss = useCallback(() => {
    if (survey) {
      try {
        posthog.capture("survey dismissed", { $survey_id: survey.id });
      } catch {
        /* silent */
      }
    }
    markSeen();
    setVisible(false);
  }, [survey, markSeen]);

  const handleSubmit = useCallback(() => {
    if (!survey || submittedRef.current) return;
    submittedRef.current = true;
    try {
      const props: Record<string, unknown> = {
        $survey_id: survey.id,
        $survey_questions: questions.map((q) => ({ id: q.id, question: q.question })),
      };
      visibleIndexes.forEach((qi) => {
        const q = questions[qi];
        const value = answers[qi];
        if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return;
        props[`$survey_response_${q.id}`] =
          typeof value === "number" ? String(value) : value;
      });
      posthog.capture("survey sent", props);
    } catch {
      /* silent */
    }
    markSeen();
    setSubmitted(true);
    window.setTimeout(() => setVisible(false), 2500);
  }, [survey, questions, visibleIndexes, answers, markSeen]);

  /* ---- debug handle */
  useEffect(() => {
    (window as any).__hogshopSurvey = {
      open: () => setVisible(true),
      reset: () => {
        try {
          if (seenKey) window.localStorage.removeItem(seenKey);
        } catch {
          /* silent */
        }
        setAnswers({});
        setStepIdx(0);
        setSubmitted(false);
        shownRef.current = false;
        submittedRef.current = false;
      },
      state: () => ({ answers, visibleIndexes, rules }),
    };
  }, [answers, visibleIndexes, rules, seenKey]);

  if (!survey || !rules || !visible || visibleIndexes.length === 0) return null;

  const currentIdx = visibleIndexes[Math.min(stepIdx, visibleIndexes.length - 1)];
  const question = questions[currentIdx];
  if (!question) return null;

  const answer = answers[currentIdx];
  const setAnswer = (value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [currentIdx]: value }));

  /* piped choices */
  const pipeSource = rules.pipe_choices?.[String(currentIdx)];
  const baseChoices = question.choices ?? [];
  let choices = baseChoices;
  if (typeof pipeSource === "number") {
    const src = toSelected(answers[pipeSource]);
    const filtered = baseChoices.filter((c) => src.includes(c));
    if (filtered.length >= 1) choices = filtered;
  }

  const hasAnswer = (() => {
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "number") return true;
    if (typeof answer === "string") return answer.trim().length > 0;
    return false;
  })();
  const canAdvance = question.optional === true || hasAnswer;
  const isLast = stepIdx >= visibleIndexes.length - 1;
  const progress = ((stepIdx + 1) / visibleIndexes.length) * 100;

  /* demo footer: fired rules */
  const firedRules = (rules.rules ?? [])
    .filter((r) => r?.when && matchesCondition(toSelected(answers[r.when.question]), r.when))
    .map((r) => {
      const w = r.when;
      const label = w.any_of?.length
        ? `${w.any_of.join(", ")} selected`
        : w.all_of?.length
          ? `all of ${w.all_of.join(", ")} selected`
          : w.none_of?.length
            ? `none of ${w.none_of.join(", ")} selected`
            : typeof w.min_selected === "number"
              ? `${w.min_selected}+ options selected`
              : typeof w.max_selected === "number"
                ? `${w.max_selected} or fewer selected`
                : "condition met";
      return `${label} → ask ${r.show.map((i) => `Q${i + 1}`).join(", ")}`;
    });

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-md">
      <Card className="p-5 shadow-elevated border bg-card">
        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <p className="font-display font-bold text-lg">Thank you!</p>
            <p className="text-sm text-muted-foreground">
              Your feedback has been recorded.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Step {stepIdx + 1} of {visibleIndexes.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1 -mr-1 shrink-0"
                aria-label="Dismiss survey"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Progress value={progress} className="h-1.5 mb-4" />

            <h3 className="font-display font-bold text-base leading-snug mb-1">
              {question.question}
            </h3>
            {question.description && (
              <p className="text-sm text-muted-foreground mb-3">{question.description}</p>
            )}

            <div className="my-4 space-y-3">
              {question.type === "multiple_choice" && (
                <div className="space-y-2.5">
                  {choices.map((choice) => {
                    const selected = toSelected(answer);
                    const checked = selected.includes(choice);
                    return (
                      <div key={choice} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`${question.id}-${choice}`}
                          checked={checked}
                          onCheckedChange={(v) =>
                            setAnswer(
                              v
                                ? [...selected, choice]
                                : selected.filter((s) => s !== choice),
                            )
                          }
                        />
                        <Label
                          htmlFor={`${question.id}-${choice}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {choice}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {question.type === "single_choice" && (
                <RadioGroup
                  value={typeof answer === "string" ? answer : ""}
                  onValueChange={(v) => setAnswer(v)}
                  className="space-y-2.5"
                >
                  {choices.map((choice) => (
                    <div key={choice} className="flex items-center gap-2.5">
                      <RadioGroupItem value={choice} id={`${question.id}-${choice}`} />
                      <Label
                        htmlFor={`${question.id}-${choice}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {choice}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === "open" && (
                <Textarea
                  value={typeof answer === "string" ? answer : ""}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  rows={3}
                />
              )}

              {question.type === "rating" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: question.scale ?? 5 }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={answer === n ? "default" : "outline"}
                        className="w-9 px-0"
                        onClick={() => setAnswer(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                  {(question.lowerBoundLabel || question.upperBoundLabel) && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{question.lowerBoundLabel}</span>
                      <span>{question.upperBoundLabel}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
                disabled={stepIdx === 0}
              >
                Back
              </Button>
              <div className="flex items-center gap-3">
                {!canAdvance && (
                  <p className="text-xs text-muted-foreground" role="status">
                    Please answer to continue.
                  </p>
                )}
                <Button
                  size="sm"
                  disabled={!canAdvance}
                  onClick={() => (isLast ? handleSubmit() : setStepIdx((s) => s + 1))}
                >
                  {isLast ? "Submit" : "Next"}
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t space-y-1 text-xs text-muted-foreground">
              <p>Path: {visibleIndexes.map((i) => `Q${i + 1}`).join(" → ")}</p>
              {firedRules.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default CustomSurvey;
