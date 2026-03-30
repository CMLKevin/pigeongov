export interface HomeOfficeCalculation {
  simplifiedDeduction: number;
  actualDeduction: number;
  recommendedMethod: "simplified" | "actual";
  savingsFromRecommended: number;
  details: {
    squareFootage: number;
    totalHomeSquareFootage: number;
    businessUsePercentage: number;
    simplifiedRate: number;
    simplifiedMaxSqft: number;
    actualExpenses: ActualHomeExpenses;
  };
}

export interface ActualHomeExpenses {
  mortgage: number;
  rent: number;
  utilities: number;
  insurance: number;
  repairs: number;
  depreciation: number;
  propertyTax: number;
  other: number;
  total: number;
}

// IRS simplified home office deduction: $5 per square foot, max 300 sq ft
const SIMPLIFIED_RATE = 5;
const SIMPLIFIED_MAX_SQFT = 300;

/**
 * Compare simplified method vs. actual expense method for home office deduction.
 *
 * Simplified: $5/sq ft up to 300 sq ft = max $1,500 deduction
 * Actual: percentage of home expenses based on office-to-home square footage ratio
 *
 * The home must be used regularly and exclusively for business.
 */
export function calculateHomeOfficeDeduction(
  officeSquareFootage: number,
  totalHomeSquareFootage: number,
  actualExpenses?: Partial<ActualHomeExpenses>,
): HomeOfficeCalculation {
  // Simplified method
  const qualifyingSqft = Math.min(officeSquareFootage, SIMPLIFIED_MAX_SQFT);
  const simplifiedDeduction = roundCurrency(qualifyingSqft * SIMPLIFIED_RATE);

  // Actual method
  const businessUsePercentage =
    totalHomeSquareFootage > 0 ? officeSquareFootage / totalHomeSquareFootage : 0;

  const expenses: ActualHomeExpenses = {
    mortgage: actualExpenses?.mortgage ?? 0,
    rent: actualExpenses?.rent ?? 0,
    utilities: actualExpenses?.utilities ?? 0,
    insurance: actualExpenses?.insurance ?? 0,
    repairs: actualExpenses?.repairs ?? 0,
    depreciation: actualExpenses?.depreciation ?? 0,
    propertyTax: actualExpenses?.propertyTax ?? 0,
    other: actualExpenses?.other ?? 0,
    total: 0,
  };
  expenses.total = roundCurrency(
    expenses.mortgage + expenses.rent + expenses.utilities +
    expenses.insurance + expenses.repairs + expenses.depreciation +
    expenses.propertyTax + expenses.other,
  );

  const actualDeduction = roundCurrency(expenses.total * businessUsePercentage);

  const recommendedMethod = simplifiedDeduction >= actualDeduction ? "simplified" : "actual";
  const savingsFromRecommended = roundCurrency(
    Math.abs(simplifiedDeduction - actualDeduction),
  );

  return {
    simplifiedDeduction,
    actualDeduction,
    recommendedMethod,
    savingsFromRecommended,
    details: {
      squareFootage: officeSquareFootage,
      totalHomeSquareFootage,
      businessUsePercentage: Number((businessUsePercentage * 100).toFixed(1)),
      simplifiedRate: SIMPLIFIED_RATE,
      simplifiedMaxSqft: SIMPLIFIED_MAX_SQFT,
      actualExpenses: expenses,
    },
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
