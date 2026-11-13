import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Users } from "lucide-react";
import type { ClassStanding, EligibilityRule, VoterListSummary } from "@asa/shared";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { TabPanel } from "../ui/TabPanel";
import { cn } from "../../utils/cn";
import { CLASS_ORDER, eligibilitySentence, UNDERGRAD_CLASSES } from "../../utils/adminElections";
import { CLASS_STANDING_LABELS } from "@asa/shared";

type Mode = EligibilityRule["type"];

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "ALL_STUDENTS", label: "All students" },
  { id: "CLASS_STANDING", label: "Class years" },
  { id: "VOTER_LIST", label: "Voter list" },
];

interface EligibilityRuleEditorProps {
  /** Unique base id (tabs, fields). */
  id: string;
  legend?: ReactNode;
  value: EligibilityRule;
  onChange: (rule: EligibilityRule) => void;
  /** Voter lists of the election's organization; undefined while loading. */
  voterLists?: ReadonlyArray<Pick<VoterListSummary, "id" | "name" | "memberCount">>;
  voterListsLoading?: boolean;
  /** Read-only: shows the sentence only (e.g. when the election is locked). */
  disabled?: boolean;
  disabledNote?: ReactNode;
  error?: string;
  manageListsHref?: string;
}

/**
 * Picks who may vote: all students, specific class years (checkbox pills with an
 * "Undergraduates" shortcut) or a voter list of the election's organization.
 * Always shows the resulting rule as a plain-language sentence.
 */
export function EligibilityRuleEditor({
  id,
  legend = "Who can vote",
  value,
  onChange,
  voterLists,
  voterListsLoading = false,
  disabled = false,
  disabledNote,
  error,
  manageListsHref = "/admin/voter-lists",
}: EligibilityRuleEditorProps) {
  // Remember choices per mode so switching back and forth doesn't lose them.
  const lastClasses = useRef<ClassStanding[]>(value.type === "CLASS_STANDING" ? value.classes : []);
  const lastListId = useRef<string>(value.type === "VOTER_LIST" ? value.listId : "");
  if (value.type === "CLASS_STANDING") lastClasses.current = value.classes;
  if (value.type === "VOTER_LIST") lastListId.current = value.listId;

  const sentenceId = `${id}-sentence`;
  const errorId = `${id}-error`;
  const sentence = eligibilitySentence(value, voterLists ?? []);
  const incomplete =
    (value.type === "CLASS_STANDING" && value.classes.length === 0) || (value.type === "VOTER_LIST" && !value.listId);

  function setMode(mode: Mode) {
    if (mode === value.type) return;
    if (mode === "ALL_STUDENTS") onChange({ type: "ALL_STUDENTS" });
    if (mode === "CLASS_STANDING") onChange({ type: "CLASS_STANDING", classes: lastClasses.current });
    if (mode === "VOTER_LIST") onChange({ type: "VOTER_LIST", listId: lastListId.current });
  }

  function toggleClass(cls: ClassStanding) {
    if (value.type !== "CLASS_STANDING") return;
    const next = value.classes.includes(cls) ? value.classes.filter((c) => c !== cls) : [...value.classes, cls];
    onChange({ type: "CLASS_STANDING", classes: CLASS_ORDER.filter((c) => next.includes(c)) });
  }

  const sentenceNode = (
    <p
      id={sentenceId}
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 text-callout",
        incomplete ? "text-ink-2" : "text-ink",
      )}
    >
      <Users className="mt-[3px] size-4 shrink-0 text-navy-900" aria-hidden="true" />
      <span>{sentence}</span>
    </p>
  );

  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-footnote text-ink">{legend}</p>
        <div className="rounded-row bg-inset px-4 py-3">{sentenceNode}</div>
        {disabledNote && <p className="text-footnote font-normal text-ink-2">{disabledNote}</p>}
      </div>
    );
  }

  const lists = voterLists ?? [];

  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-footnote text-ink">{legend}</legend>
      <SegmentedControl
        id={id}
        label="Eligibility type"
        items={MODES}
        value={value.type}
        onChange={setMode}
        className="w-full sm:w-auto"
      />
      <TabPanel tabsId={id} value={value.type} className="mt-4 space-y-4">
        {value.type === "CLASS_STANDING" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Class years">
              {CLASS_ORDER.map((cls) => {
                const checked = value.classes.includes(cls);
                return (
                  <label key={cls} className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() => toggleClass(cls)}
                    />
                    <span
                      className={cn(
                        "inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-callout font-medium transition-colors duration-160 select-none sm:h-9",
                        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-900",
                        checked
                          ? "border-navy-900 bg-navy-900 text-white"
                          : "border-hairline-strong bg-surface text-ink hover:bg-inset",
                      )}
                    >
                      {checked && <Check className="size-4" aria-hidden="true" />}
                      {CLASS_STANDING_LABELS[cls]}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-callout">
              <button
                type="button"
                className="min-h-11 font-medium text-navy-900 hover:text-navy-600 sm:min-h-0"
                onClick={() => onChange({ type: "CLASS_STANDING", classes: UNDERGRAD_CLASSES })}
              >
                Undergraduates
              </button>
              <button
                type="button"
                className="min-h-11 font-medium text-navy-900 hover:text-navy-600 sm:min-h-0"
                onClick={() => onChange({ type: "CLASS_STANDING", classes: [...CLASS_ORDER] })}
              >
                All classes
              </button>
              {value.classes.length > 0 && (
                <button
                  type="button"
                  className="min-h-11 font-medium text-ink-2 hover:text-ink sm:min-h-0"
                  onClick={() => onChange({ type: "CLASS_STANDING", classes: [] })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {value.type === "VOTER_LIST" && (
          <div className="space-y-2">
            {!voterListsLoading && lists.length === 0 ? (
              <p className="text-callout text-ink-2">
                This organization has no voter lists yet.{" "}
                <Link to={manageListsHref} className="font-medium text-navy-900 underline-offset-2 hover:underline">
                  Create one
                </Link>
                , then come back.
              </p>
            ) : (
              <Select
                id={`${id}-list`}
                label="Voter list"
                placeholder={voterListsLoading ? "Loading lists…" : "Choose a list"}
                disabled={voterListsLoading}
                options={lists.map((l) => ({
                  value: l.id,
                  label: `${l.name} (${l.memberCount.toLocaleString()} ${l.memberCount === 1 ? "member" : "members"})`,
                }))}
                value={value.listId}
                onChange={(e) => onChange({ type: "VOTER_LIST", listId: e.target.value })}
              />
            )}
            <Link
              to={manageListsHref}
              className="inline-flex min-h-11 items-center gap-0.5 text-callout font-medium text-navy-900 hover:text-navy-600 sm:min-h-0"
            >
              Manage voter lists
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        <div className="rounded-row bg-inset px-4 py-3">{sentenceNode}</div>
      </TabPanel>
      {error && (
        <p id={errorId} className="mt-2 text-footnote text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
