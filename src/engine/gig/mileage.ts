export interface MileageCalculation {
  standardDeduction: number;
  actualDeduction: number;
  recommendedMethod: "standard" | "actual";
  savingsFromRecommended: number;
  details: {
    totalMiles: number;
    businessMiles: number;
    standardRate: number;
    actualExpenses: ActualVehicleExpenses;
    businessUsePercentage: number;
  };
}

export interface ActualVehicleExpenses {
  gas: number;
  insurance: number;
  repairs: number;
  depreciation: number;
  registration: number;
  leasePayments: number;
  parking: number;
  tolls: number;
  other: number;
  total: number;
}

// IRS standard mileage rate for 2025
const STANDARD_MILEAGE_RATE_2025 = 0.70; // 70 cents per mile

/**
 * Compare standard mileage deduction vs. actual expense method.
 * The IRS allows self-employed individuals to choose whichever is higher.
 */
export function calculateMileageDeduction(
  totalMiles: number,
  businessMiles: number,
  actualExpenses?: Partial<ActualVehicleExpenses>,
): MileageCalculation {
  const standardDeduction = roundCurrency(businessMiles * STANDARD_MILEAGE_RATE_2025);

  const expenses: ActualVehicleExpenses = {
    gas: actualExpenses?.gas ?? 0,
    insurance: actualExpenses?.insurance ?? 0,
    repairs: actualExpenses?.repairs ?? 0,
    depreciation: actualExpenses?.depreciation ?? 0,
    registration: actualExpenses?.registration ?? 0,
    leasePayments: actualExpenses?.leasePayments ?? 0,
    parking: actualExpenses?.parking ?? 0,
    tolls: actualExpenses?.tolls ?? 0,
    other: actualExpenses?.other ?? 0,
    total: 0,
  };
  expenses.total = roundCurrency(
    expenses.gas + expenses.insurance + expenses.repairs +
    expenses.depreciation + expenses.registration + expenses.leasePayments +
    expenses.parking + expenses.tolls + expenses.other,
  );

  const businessUsePercentage = totalMiles > 0 ? businessMiles / totalMiles : 0;
  const actualDeduction = roundCurrency(expenses.total * businessUsePercentage);

  const recommendedMethod = standardDeduction >= actualDeduction ? "standard" : "actual";
  const savingsFromRecommended = roundCurrency(
    Math.abs(standardDeduction - actualDeduction),
  );

  return {
    standardDeduction,
    actualDeduction,
    recommendedMethod,
    savingsFromRecommended,
    details: {
      totalMiles,
      businessMiles,
      standardRate: STANDARD_MILEAGE_RATE_2025,
      actualExpenses: expenses,
      businessUsePercentage: Number((businessUsePercentage * 100).toFixed(1)),
    },
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
