// Public settings. The Supabase URL and publishable key are designed to be shipped to
// the browser: Row Level Security in Postgres decides what each person can read.
// Environment variables override these defaults, so the same code runs on any project.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hfehrjlebswicknalsgm.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_xRH-zW5Q6PLBqSkZ5BGl6Q_Rs4HsdvR";

export const REPOSITORY_URL = "https://github.com/cjajunior/atrium";
export const AUTHOR = {
  name: "Claudio Junior",
  upwork: "https://www.upwork.com/freelancers/~016df2ab6710b2a9a1",
  github: "https://github.com/cjajunior",
};

/** Public demo accounts. They are rebuilt every hour, so anything visitors change is temporary. */
export const DEMO_PASSWORD = "atrium-demo";
export const DEMO_ACCOUNTS = {
  admin: { email: "demo-admin@example.com", name: "Ana Ribeiro", title: "Agency owner" },
  team: { email: "demo-team@example.com", name: "Theo Martins", title: "Agency developer" },
  client: { email: "demo-client@example.com", name: "Clara Nunes", title: "Northwind Coffee" },
} as const;
