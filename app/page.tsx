"use client";

import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./components/theme-toggle";
import { WalletButton } from "./components/wallet-button";
import { BountyChainPanel } from "./components/bounty-chain-panel";
import { useWallet } from "./lib/wallet/context";
import { demoBounties, formatSol, type DemoBounty } from "./lib/demo-data";
import type { Match } from "./lib/matching";

type MatchResponse = { matches: Match[]; note: string; error?: string };

function Mark() {
  return (
    <span
      className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 7.5h14M5 12h9M5 16.5h14" />
        <circle cx="17" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

export default function Home() {
  const { wallet, status } = useWallet();
  const [selectedId, setSelectedId] = useState(demoBounties[0].id);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchNote, setMatchNote] = useState("");
  const [matchState, setMatchState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [matchError, setMatchError] = useState("");
  const [matchAttempt, setMatchAttempt] = useState(0);
  const [showDraft, setShowDraft] = useState(false);
  const [draft, setDraft] = useState<DemoBounty | null>(null);
  const [draftError, setDraftError] = useState("");

  const bounty = useMemo(
    () =>
      [...(draft ? [draft] : []), ...demoBounties].find(
        (item) => item.id === selectedId
      ) ?? demoBounties[0],
    [draft, selectedId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requiredSkills: bounty.skills }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as MatchResponse;
        if (!response.ok)
          throw new Error(
            payload.error ?? "Could not load match recommendations."
          );
        setMatches(payload.matches);
        setMatchNote(payload.note);
        setMatchState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMatchError(
          error instanceof Error
            ? error.message
            : "Could not load match recommendations."
        );
        setMatchState("error");
      });
    return () => controller.abort();
  }, [bounty, matchAttempt]);

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraftError("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const summary = String(form.get("summary") ?? "").trim();
    const skillList = String(form.get("skills") ?? "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const reward = Number(form.get("reward"));
    if (title.length < 8 || summary.length < 20 || skillList.length === 0) {
      setDraftError(
        "Add a clear title, a 20-character brief, and at least one skill."
      );
      return;
    }
    if (!Number.isFinite(reward) || reward <= 0 || reward > 10) {
      setDraftError(
        "Enter a reward greater than 0 and no more than 10 test SOL."
      );
      return;
    }
    const nextDraft: DemoBounty = {
      id: `draft-${Date.now()}`,
      title,
      category: "New bounty",
      summary,
      skills: skillList.slice(0, 12),
      rewardLamports: BigInt(Math.round(reward * 1_000_000_000)),
      hours: "Set with worker",
      dueIn: "Draft",
      state: "Open",
    };
    setDraft(nextDraft);
    setSelectedId(nextDraft.id);
    setMatchState("loading");
    setMatches([]);
    setShowDraft(false);
  }

  function selectBounty(id: string) {
    if (id === selectedId) {
      setMatchState("loading");
      setMatchAttempt((attempt) => attempt + 1);
      return;
    }
    setSelectedId(id);
    setMatchState("loading");
    setMatches([]);
    setMatchError("");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#main"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="SkillBounty home"
          >
            <Mark />
            <span className="text-sm font-semibold tracking-tight">
              SkillBounty
              <span className="ml-2 hidden font-normal text-muted-foreground sm:inline">
                WORK, WITH PROOF
              </span>
            </span>
          </a>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
          >
            <a className="text-foreground" href="#bounties">
              Explore work
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#how-it-works"
            >
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground sm:flex">
              <i
                className="size-1.5 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              Solana Devnet
            </span>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/45 px-4 py-2 text-center text-xs text-muted-foreground">
        Demo preview · example tasks and candidate profiles · on-chain escrow
        unlocks when the SkillBounty program is deployed to Devnet
      </div>

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <SectionLabel>
                Early talent · real projects · onchain rewards
              </SectionLabel>
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Your first proof of work starts here.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Find focused projects from teams that need a result. Get matched
              on demonstrated skills. Get paid when the work is accepted.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#bounties"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Explore open work
              </a>
              <button
                type="button"
                onClick={() => setShowDraft((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Post a project
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-64">
            <div className="rounded-lg border border-border bg-background p-4">
              <SectionLabel>Open projects</SectionLabel>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
                {demoBounties.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sample opportunities
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <SectionLabel>Network</SectionLabel>
              <p className="mt-2 font-mono text-2xl font-semibold">Devnet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Test SOL only
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-3 sm:px-6"
      >
        {[
          [
            "01",
            "Choose a real task",
            "See the scope, required skills, and proposed reward.",
          ],
          [
            "02",
            "Review your fit",
            "A transparent score shows which skills overlap.",
          ],
          [
            "03",
            "Deliver and get paid",
            "Employer approval releases the escrow on Solana.",
          ],
        ].map(([number, title, description]) => (
          <div
            key={number}
            className="flex gap-3 rounded-lg border border-border bg-card/40 p-4"
          >
            <span className="font-mono text-xs text-primary">{number}</span>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {showDraft && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <form
            onSubmit={saveDraft}
            className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
            aria-label="Draft a bounty"
          >
            <div className="md:col-span-2 flex items-center justify-between">
              <div>
                <SectionLabel>Project intake</SectionLabel>
                <h2 className="mt-1 text-lg font-semibold">
                  Draft a focused bounty
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDraft(false)}
                className="min-h-10 rounded-md border border-border px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Close
              </button>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Project title
              <input
                name="title"
                minLength={8}
                maxLength={80}
                required
                className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Analyze our activation funnel"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Reward in test SOL
              <input
                name="reward"
                type="text"
                inputMode="decimal"
                pattern="(?:0|[1-9]\d?)(?:\.\d{1,9})?"
                required
                className="min-h-11 rounded-md border border-input bg-background px-3 font-mono text-sm font-normal tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="0.35"
                aria-describedby="reward-hint"
              />
              <span id="reward-hint" className="text-xs text-muted-foreground">
                Devnet only. No real funds.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Brief
              <textarea
                name="summary"
                minLength={20}
                maxLength={600}
                required
                rows={3}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe the deliverable and how you will accept it."
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Required skills
              <input
                name="skills"
                required
                className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="SQL, Python, Product analytics"
              />
              <span className="text-xs text-muted-foreground">
                Separate skills with commas.
              </span>
            </label>
            {draftError && (
              <p
                role="alert"
                className="md:col-span-2 text-sm text-destructive"
              >
                {draftError}
              </p>
            )}
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                This saves a local demo draft only. The escrow program is not
                yet deployed to Devnet, so no payment transaction can be created
                here.
              </p>
              <button
                type="submit"
                className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Save demo draft
              </button>
            </div>
          </form>
        </section>
      )}

      <section
        id="bounties"
        className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel>Curated for early talent</SectionLabel>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Open bounties
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Sample tasks · no personal data
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(250px,.82fr)]">
          <div
            className="space-y-2"
            role="list"
            aria-label="Available bounties"
          >
            {[...(draft ? [draft] : []), ...demoBounties].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectBounty(item.id)}
                aria-pressed={selectedId === item.id}
                className={`w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === item.id ? "border-primary/55 bg-primary/5" : "border-border bg-card hover:bg-accent/55"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {item.category}
                  </span>
                  <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.state}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-5">
                  {item.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.summary}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatSol(item.rewardLamports)} SOL
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.hours}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <article className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded border border-primary/35 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-primary">
                {bounty.category} · {bounty.state}
              </span>
              <span className="text-xs text-muted-foreground">
                {bounty.dueIn}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">
              {bounty.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {bounty.summary}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-background p-3">
                <SectionLabel>Reward</SectionLabel>
                <p className="mt-2 font-mono text-lg font-semibold tabular-nums">
                  {formatSol(bounty.rewardLamports)}{" "}
                  <span className="text-sm text-muted-foreground">SOL</span>
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <SectionLabel>Estimated scope</SectionLabel>
                <p className="mt-2 text-sm font-medium">{bounty.hours}</p>
              </div>
            </div>
            <div className="mt-6">
              <SectionLabel>Skills used in matching</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {bounty.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground/85"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-md border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <span
                  className="grid size-7 place-items-center rounded border border-primary/30 bg-primary/10 font-mono text-[10px] text-primary"
                  aria-hidden="true"
                >
                  AI
                </span>
                <div>
                  <p className="text-xs font-semibold">
                    Recommendation, with reasons
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    The employer makes the final choice.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside
            className="rounded-lg border border-border bg-card p-5"
            aria-label="Candidate match recommendations"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <SectionLabel>Talent signals</SectionLabel>
                <h3 className="mt-1 text-lg font-semibold">Best fit</h3>
              </div>
              <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
                DEMO DATA
              </span>
            </div>
            {matchState === "loading" && (
              <div
                className="mt-5 space-y-3"
                aria-label="Loading recommendations"
                aria-busy="true"
              >
                <div className="h-16 animate-pulse rounded-md bg-muted" />
                <div className="h-16 animate-pulse rounded-md bg-muted" />
                <div className="h-16 animate-pulse rounded-md bg-muted" />
              </div>
            )}
            {matchState === "error" && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p role="alert" className="text-sm text-destructive">
                  {matchError || "Recommendations could not be loaded."}
                </p>
                <button
                  onClick={() => {
                    setMatchState("loading");
                    setMatchAttempt((attempt) => attempt + 1);
                  }}
                  className="mt-3 min-h-10 rounded border border-border px-3 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Retry recommendations
                </button>
              </div>
            )}
            {matchState === "ready" && (
              <div className="mt-4 space-y-3" aria-live="polite">
                {matches.map((match, index) => (
                  <div
                    key={match.id}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-medium">
                          {match.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{match.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {match.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold tabular-nums text-primary">
                          {match.score}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          match
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.matchingSkills.length ? (
                        match.matchingSkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded bg-accent px-2 py-1 text-[10px] text-accent-foreground"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No direct overlap
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {match.explanation}
                    </p>
                    {index === 0 && (
                      <div className="mt-3 border-t border-border pt-2 text-[11px] font-medium text-primary">
                        Strongest sample match
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {matchNote}
                </p>
              </div>
            )}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium">
                {status === "connected"
                  ? "Wallet connected"
                  : "Ready to explore"}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                {status === "connected" && wallet
                  ? wallet.account.address
                  : "Escrow wallet flow unlocks after program deployment to Devnet."}
              </p>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Employer approval and wallet signatures stay in human hands.
                Scores explain overlap; they do not accept or reject anyone.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section id="escrow" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <BountyChainPanel draft={draft} />
      </section>

      <footer className="border-t border-border bg-card/35">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>SkillBounty · Skill backed by evidence.</span>
          <span className="font-mono">SOLANA DEVNET · SAMPLE PROFILES</span>
        </div>
      </footer>
    </main>
  );
}
