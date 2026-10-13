export type DemoBounty = {
  id: string;
  title: string;
  category: string;
  summary: string;
  skills: string[];
  rewardLamports: bigint;
  hours: string;
  dueIn: string;
  state: "Open" | "Assigned" | "Submitted";
};

export const demoBounties: DemoBounty[] = [
  {
    id: "sb-001",
    title: "Map activation drop-off",
    category: "Analytics",
    summary:
      "Find the largest onboarding drop-off using a sample event dataset. Deliver a short analysis and one chart with actionable findings.",
    skills: ["SQL", "Python", "Data visualization", "Product analytics"],
    rewardLamports: 350_000_000n,
    hours: "4–6 hours",
    dueIn: "4 days left",
    state: "Open",
  },
  {
    id: "sb-002",
    title: "Audit a signup funnel",
    category: "Product data",
    summary:
      "Use the supplied, anonymized events to identify two friction points and recommend a measurable experiment.",
    skills: ["SQL", "Product analytics", "Research"],
    rewardLamports: 250_000_000n,
    hours: "3–5 hours",
    dueIn: "6 days left",
    state: "Open",
  },
  {
    id: "sb-003",
    title: "Build a weekly metrics view",
    category: "Data tooling",
    summary:
      "Turn a small CSV export into a clear weekly metrics summary with a reproducible notebook and concise notes.",
    skills: ["Python", "Data visualization", "Statistics"],
    rewardLamports: 400_000_000n,
    hours: "5–7 hours",
    dueIn: "8 days left",
    state: "Open",
  },
];

export const formatSol = (lamports: bigint | null | undefined): string => {
  if (lamports == null || lamports < 0n) return "--";
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "");
  const formattedWhole = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(whole);
  return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
};
