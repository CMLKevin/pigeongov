/**
 * Tax bracket visualization using Chart.js (loaded from CDN).
 * Renders a waterfall chart showing the tax calculation pipeline:
 * Gross Income → Adjustments → Deductions → Taxable Income → Tax by Bracket → Credits → Final
 */

function renderTaxBracketChart(containerId, calculationData) {
  const container = document.getElementById(containerId);
  if (!container || !calculationData) return;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.id = "tax-bracket-canvas";
  canvas.style.maxHeight = "400px";
  container.innerHTML = "";
  container.appendChild(canvas);

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const textColor = isDark ? "#cdd6f4" : "#1f2a1f";
  const gridColor = isDark ? "rgba(205, 214, 244, 0.1)" : "rgba(31, 42, 31, 0.1)";

  // Build waterfall data from calculation
  const data = calculationData;
  const labels = [];
  const values = [];
  const colors = [];

  // Gross income (positive)
  if (data.grossIncome) {
    labels.push("Gross Income");
    values.push(data.grossIncome);
    colors.push(isDark ? "#89b4fa" : "#1d5b5e");
  }

  // Adjustments (negative)
  const adjustments = data.grossIncome - data.adjustedGrossIncome;
  if (adjustments > 0) {
    labels.push("Adjustments");
    values.push(-adjustments);
    colors.push(isDark ? "#f9e2af" : "#9a5d16");
  }

  // AGI
  labels.push("AGI");
  values.push(data.adjustedGrossIncome);
  colors.push(isDark ? "#94e2d5" : "#1d5b5e");

  // Deduction (negative)
  if (data.deduction) {
    labels.push("Deduction");
    values.push(-data.deduction);
    colors.push(isDark ? "#f9e2af" : "#9a5d16");
  }

  // Taxable income
  labels.push("Taxable Income");
  values.push(data.taxableIncome);
  colors.push(isDark ? "#a6e3a1" : "#2d7d32");

  // Tax brackets breakdown
  if (data.breakdown && data.breakdown.length > 0) {
    for (const bracket of data.breakdown) {
      const pct = (bracket.rate * 100).toFixed(0);
      labels.push(`${pct}% bracket`);
      values.push(bracket.taxAmount);
      colors.push(isDark ? "#f38ba8" : "#9b2f2f");
    }
  }

  // Total tax
  labels.push("Total Tax");
  values.push(data.totalTax);
  colors.push(isDark ? "#f38ba8" : "#9b2f2f");

  // Credits (negative, shown as green)
  if (data.totalCredits > 0) {
    labels.push("Credits");
    values.push(-data.totalCredits);
    colors.push(isDark ? "#a6e3a1" : "#2d7d32");
  }

  // Refund or owed
  if (data.refund > 0) {
    labels.push("Refund");
    values.push(data.refund);
    colors.push(isDark ? "#a6e3a1" : "#2d7d32");
  } else if (data.amountOwed > 0) {
    labels.push("Amount Owed");
    values.push(data.amountOwed);
    colors.push(isDark ? "#f38ba8" : "#9b2f2f");
  }

  // Use Chart.js
  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const formatted = Math.abs(val).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              });
              return val < 0 ? `−${formatted}` : formatted;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: textColor,
            callback: function (value) {
              return "$" + Math.abs(value).toLocaleString();
            },
          },
          grid: { color: gridColor },
        },
      },
    },
  });
}

/**
 * Render effective vs marginal rate comparison.
 */
function renderRateComparison(containerId, calculationData) {
  const container = document.getElementById(containerId);
  if (!container || !calculationData) return;

  const canvas = document.createElement("canvas");
  canvas.style.maxHeight = "200px";
  container.innerHTML = "";
  container.appendChild(canvas);

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const textColor = isDark ? "#cdd6f4" : "#1f2a1f";

  const effectiveRate = (calculationData.effectiveRate * 100).toFixed(1);
  const marginalRate = (calculationData.marginalRate * 100).toFixed(1);

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: [`Effective Rate: ${effectiveRate}%`, `Marginal Rate: ${marginalRate}%`],
      datasets: [
        {
          data: [parseFloat(effectiveRate), parseFloat(marginalRate)],
          backgroundColor: [
            isDark ? "#89b4fa" : "#1d5b5e",
            isDark ? "#f38ba8" : "#9b2f2f",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, padding: 16 },
        },
      },
    },
  });
}

// Export for use in app.js
if (typeof window !== "undefined") {
  window.renderTaxBracketChart = renderTaxBracketChart;
  window.renderRateComparison = renderRateComparison;
}
