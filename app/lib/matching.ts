export type Candidate = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  verifiedProjects: number;
  evidence: string;
};

export type Match = Candidate & {
  score: number;
  matchingSkills: string[];
  explanation: string;
};

export const demoCandidates: Candidate[] = [
  {
    id: "aida-k",
    name: "Aida K.",
    role: "Data analyst",
    skills: ["sql", "python", "data visualization", "product analytics"],
    verifiedProjects: 2,
    evidence:
      "Built a funnel analysis in SQL and presented three product insights.",
  },
  {
    id: "timur-s",
    name: "Timur S.",
    role: "Junior data scientist",
    skills: ["python", "pandas", "statistics", "machine learning"],
    verifiedProjects: 3,
    evidence:
      "Published reproducible notebooks with clean datasets and methodology.",
  },
  {
    id: "dana-r",
    name: "Dana R.",
    role: "Product researcher",
    skills: ["product analytics", "data visualization", "research", "sql"],
    verifiedProjects: 1,
    evidence:
      "Mapped onboarding friction and translated findings into product actions.",
  },
];

const MAX_SKILLS = 12;

export function rankCandidates(requiredSkills: string[]): Match[] {
  const skills = [
    ...new Map(
      requiredSkills
        .map((skill) => [normalizeSkill(skill), skill.trim()] as const)
        .filter(([normalized]) => normalized.length > 0)
    ).values(),
  ].slice(0, MAX_SKILLS);
  const normalizedSkills = skills.map(normalizeSkill);

  return demoCandidates
    .map((candidate) => {
      const candidateSkills = candidate.skills.map(normalizeSkill);
      const matchingSkills = skills.filter((_, index) =>
        candidateSkills.includes(normalizedSkills[index])
      );
      const coverage =
        skills.length === 0 ? 0 : matchingSkills.length / skills.length;
      const evidenceScore = Math.min(candidate.verifiedProjects, 3) / 3;
      // Skill coverage is the main signal; project evidence adds context, never an auto-hire decision.
      const score = Math.round(coverage * 80 + evidenceScore * 20);
      return {
        ...candidate,
        score,
        matchingSkills,
        explanation:
          matchingSkills.length > 0
            ? `Matches ${matchingSkills.join(", ")}. ${candidate.verifiedProjects} sample project${candidate.verifiedProjects === 1 ? " provides" : "s provide"} additional context.`
            : "No direct skill overlap in this sample. Review the portfolio manually before deciding.",
      };
    })
    .sort((a, b) => b.score - a.score);
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
