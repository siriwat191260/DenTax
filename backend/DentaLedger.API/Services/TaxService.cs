namespace DentaLedger.API.Services;

public interface ITaxService
{
    TaxCalculationResult Calculate(TaxCalculationInput input);
}

public record TaxCalculationInput(
    decimal GrossIncome,
    decimal ExtraIncome,
    string  IncomeType,       // 40-1 | 40-2 | 40-6
    decimal DeductPersonal,
    decimal DeductSpouse,
    decimal DeductChild,
    decimal DeductParent,
    decimal DeductLifeIns,
    decimal DeductHealthIns,
    decimal DeductRmf,
    decimal DeductSsf,
    decimal DeductPvd,
    decimal DeductOther,
    // For half-year estimation
    decimal HalfYearIncome = 0
);

public record TaxCalculationResult(
    decimal GrossIncome,
    decimal ExpenseDeduction,
    decimal NetAfterExpense,
    decimal TotalDeductions,
    decimal NetIncome,
    decimal Tax,
    double  EffectiveRate,
    int     Bracket,
    decimal HalfYearTax
);

public class TaxService : ITaxService
{
    private static readonly (decimal Min, decimal Max, decimal Rate)[] Brackets =
    [
        (0,         150_000,    0.00m),
        (150_001,   300_000,    0.05m),
        (300_001,   500_000,    0.10m),
        (500_001,   750_000,    0.15m),
        (750_001,   1_000_000,  0.20m),
        (1_000_001, 2_000_000,  0.25m),
        (2_000_001, 5_000_000,  0.30m),
        (5_000_001, decimal.MaxValue, 0.35m),
    ];

    public TaxCalculationResult Calculate(TaxCalculationInput input)
    {
        var totalIncome = input.GrossIncome + input.ExtraIncome;

        // 1. Expense deduction by income type
        decimal expenseDeduction = input.IncomeType switch
        {
            "40-6" => Math.Min(totalIncome * 0.60m, 600_000m),
            "40-1" => Math.Min(totalIncome * 0.50m, 100_000m),
            "40-2" => Math.Min(totalIncome * 0.50m, 100_000m), // combined with 40-1 cap
            _      => Math.Min(totalIncome * 0.60m, 600_000m),
        };

        var netAfterExpense = Math.Max(0, totalIncome - expenseDeduction);

        // 2. Personal deductions (with legal caps)
        var deductions =
            input.DeductPersonal +
            input.DeductSpouse +
            input.DeductChild +
            input.DeductParent +
            Math.Min(input.DeductLifeIns,   100_000m) +
            Math.Min(input.DeductHealthIns,  25_000m) +
            Math.Min(input.DeductRmf,   totalIncome * 0.30m) +
            Math.Min(input.DeductSsf,   Math.Min(totalIncome * 0.30m, 200_000m)) +
            Math.Min(input.DeductPvd,   Math.Min(totalIncome * 0.15m, 500_000m)) +
            input.DeductOther;

        var netIncome = Math.Max(0, netAfterExpense - deductions);

        // 3. Progressive tax
        var (tax, bracket) = CalculateProgressiveTax(netIncome);

        // 4. Half-year tax estimate (for 40-6, ภ.ง.ด.94)
        decimal halfYearTax = 0;
        if (input.IncomeType == "40-6" && input.HalfYearIncome > 0)
        {
            var halfExp     = Math.Min(input.HalfYearIncome * 0.60m, 300_000m);
            var halfNet     = Math.Max(0, input.HalfYearIncome - halfExp - deductions / 2);
            (halfYearTax, _) = CalculateProgressiveTax(halfNet);
        }

        var effectiveRate = totalIncome > 0 ? (double)(tax / totalIncome * 100) : 0;

        return new TaxCalculationResult(
            GrossIncome:       totalIncome,
            ExpenseDeduction:  expenseDeduction,
            NetAfterExpense:   netAfterExpense,
            TotalDeductions:   deductions,
            NetIncome:         netIncome,
            Tax:               Math.Round(tax),
            EffectiveRate:     Math.Round(effectiveRate, 2),
            Bracket:           bracket,
            HalfYearTax:       Math.Round(halfYearTax)
        );
    }

    private static (decimal Tax, int Bracket) CalculateProgressiveTax(decimal netIncome)
    {
        decimal tax    = 0;
        int     bracket = 0;

        for (int i = 0; i < Brackets.Length; i++)
        {
            var (min, max, rate) = Brackets[i];
            if (netIncome <= min) break;
            bracket = i;
            var taxable = Math.Min(netIncome, max) - min;
            tax += taxable * rate;
        }

        return (tax, bracket);
    }
}
