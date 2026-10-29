import { defineLineup } from "./lib/config";

/**
 * Your Lineup, in one file. Change what you want; anything you leave out keeps its default
 * (see lib/config.ts for every option and what it does).
 *
 * The public card at "/" reads profile.json. The private dashboard at /dashboard reads this.
 */
export default defineLineup({
  lang: "es", // "es" or "en"
  name: "Tu Nombre", // the greeting says "Buenos días, Tu Nombre"
  appName: "Lineup",
  projectName: "Mi Proyecto",
  about: "Una o dos frases sobre lo que construyes. El coach de IA las lee para darte mejores consejos.",

  currency: "$",
  metric: {
    short: "MRR",
    long: "Ingreso recurrente mensual",
    goal: 10000, // the wave climbs toward this number
  },
  // The islands on the horizon. Put your goal last. "profit" counts revenue minus monthly costs.
  milestones: [
    { type: "first" },
    { type: "mrr", value: 1000 },
    { type: "mrr", value: 5000 },
    { type: "mrr", value: 10000 },
  ],

  logo: null, // for example "/logo.svg" after you put the file in public/
  theme: {
    // Override any color variable of the page, for example:
    // "--foam": "#7c3aed",
    // "--sand": "#f59e0b",
  },

  coach: {
    // Extra models in the dashboard select, as OpenRouter ids. The default is AI_MODEL in .env.
    models: [
      { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5" },
      { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5" },
    ],
    // Facts the coach should know: your offer, your prices, your constraints.
    context: "",
  },

  profile: { enabled: true },
});
