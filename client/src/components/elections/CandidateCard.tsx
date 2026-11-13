import type { CandidateDto } from "@asa/shared";
import { Avatar } from "../ui/Avatar";

export function CandidateCard({ candidate }: { candidate: CandidateDto }) {
  return (
    <article className="flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <Avatar name={candidate.name} src={candidate.photoUrl} size="lg" />
      <div className="min-w-0">
        <h4 className="text-base font-semibold text-slate-900">{candidate.name}</h4>
        {candidate.bio ? (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-600">{candidate.bio}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-500 italic">No statement provided.</p>
        )}
      </div>
    </article>
  );
}
