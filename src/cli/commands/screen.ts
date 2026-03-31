import { Command } from "commander";
import chalk from "chalk";
import { input, select, confirm, number } from "@inquirer/prompts";
import { isJsonMode, emit, emitError } from "../output.js";
import { PigeonGovError, CLI_EXIT_CODES } from "../support.js";
import { screenerInputSchema, SCREENER_QUESTIONS } from "../../advisory/screener/intake.js";
import type { ScreenerInput } from "../../advisory/screener/intake.js";
import { screenEligibility, formatScreenerResults } from "../../advisory/screener/engine.js";

export function registerScreenCommand(program: Command): void {
  program
    .command("screen")
    .description(
      `Universal eligibility screener — answer 10 questions, get program matches.

  Evaluates eligibility for SNAP, Medicaid, WIC, LIHEAP, ACA subsidies,
  and other benefit programs based on household data. Interactive mode
  prompts for answers; non-interactive mode reads from a JSON file.

  The --input JSON file must contain:
    {
      "householdSize": 4,
      "annualHouseholdIncome": 28000,
      "state": "CA",
      "citizenshipStatus": "us_citizen",
      "ages": [35, 33, 5, 2],
      "hasDisability": false,
      "employmentStatus": "employed",
      "isVeteran": false,
      "hasHealthInsurance": true,
      "monthlyRent": 1200
    }

  citizenshipStatus: us_citizen | permanent_resident | conditional_resident
    | ead_holder | refugee_asylee | undocumented | other
  employmentStatus: employed | unemployed | self_employed | retired | disabled

  Examples:
    $ pigeongov screen                              # interactive
    $ pigeongov screen --input data.json --json     # non-interactive`,
    )
    .option("--input <file>", "Read screener answers from JSON file")
    .action(async (options: { input?: string }) => {
      let screenerData: ScreenerInput;

      if (options.input) {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(options.input, "utf-8");
        const parsed = screenerInputSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          emitError(new PigeonGovError({
            code: "schema_error",
            message: `Invalid screener input: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
            exitCode: CLI_EXIT_CODES.schemaError,
            suggestion: "See 'pigeongov guide screen' for the expected input format.",
          }));
          return;
        }
        screenerData = parsed.data;
      } else {
        if (!process.stdin.isTTY) {
          console.error(chalk.red("Interactive mode requires a TTY. Use --input <file> for non-interactive use."));
          process.exitCode = 4;
          return;
        }

        console.log(chalk.bold("\nUniversal Eligibility Screener"));
        console.log(chalk.dim("Answer 10 questions to find programs you may qualify for.\n"));

        const householdSize = (await number({ message: "How many people live in your household?", min: 1, max: 20 })) ?? 1;
        const annualIncome = (await number({ message: "What is your household's total annual income (before taxes)?" })) ?? 0;
        const state = await input({ message: "What state do you live in? (2-letter code, e.g., CA)" });

        const citizenshipStatus = await select({
          message: "What is your citizenship or immigration status?",
          choices: [
            { name: "U.S. Citizen", value: "us_citizen" },
            { name: "Permanent Resident (Green Card)", value: "permanent_resident" },
            { name: "Conditional Resident", value: "conditional_resident" },
            { name: "Work Authorization (EAD)", value: "ead_holder" },
            { name: "Refugee or Asylee", value: "refugee_asylee" },
            { name: "Undocumented", value: "undocumented" },
            { name: "Other", value: "other" },
          ],
        });

        const agesStr = await input({
          message: "What are the ages of everyone in your household? (comma-separated, e.g., 35,33,5,2)",
        });
        const ages = agesStr.split(",").map((a) => parseInt(a.trim(), 10)).filter((a) => !isNaN(a));

        const hasDisability = await confirm({ message: "Does anyone in your household have a disability?", default: false });

        const employmentStatus = await select({
          message: "What is your current employment status?",
          choices: [
            { name: "Employed", value: "employed" },
            { name: "Unemployed", value: "unemployed" },
            { name: "Self-employed", value: "self_employed" },
            { name: "Retired", value: "retired" },
            { name: "Disabled / Unable to work", value: "disabled" },
          ],
        });

        const isVeteran = await confirm({ message: "Is anyone in your household a military veteran?", default: false });
        const hasHealthInsurance = await confirm({ message: "Does everyone in your household have health insurance?", default: true });
        const monthlyRent = (await number({ message: "What is your monthly rent or mortgage payment?" })) ?? 0;

        screenerData = screenerInputSchema.parse({
          householdSize,
          annualHouseholdIncome: annualIncome,
          state: state.toUpperCase(),
          citizenshipStatus: citizenshipStatus as ScreenerInput["citizenshipStatus"],
          ages,
          hasDisability,
          employmentStatus: employmentStatus as ScreenerInput["employmentStatus"],
          isVeteran,
          hasHealthInsurance,
          monthlyRent,
        });
      }

      const results = screenEligibility(screenerData);

      if (isJsonMode()) {
        emit({ input: screenerData, results });
        return;
      }

      console.log("");
      console.log(formatScreenerResults(results));
      console.log("");
    });
}
