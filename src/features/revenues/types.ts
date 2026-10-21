/** A document in the Firestore `revenues` collection. */
export type Revenue = {
  id: string
  year: number
  /** 1-12. */
  month: number
  /** Amount in VND. */
  value: number
}

export type MonthlyRevenue = {
  month: number
  label: string
  value: number
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" })

export const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  monthFormatter.format(new Date(2000, index, 1))
)

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

const compactFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatVnd(value: number) {
  return currencyFormatter.format(value)
}

/** Short form for axis ticks, e.g. "150 Tr". */
export function formatVndCompact(value: number) {
  return compactFormatter.format(value)
}

/** Years that have data, newest first. */
export function getRevenueYears(revenues: Revenue[]) {
  return [...new Set(revenues.map((revenue) => revenue.year))].sort(
    (a, b) => b - a
  )
}

/**
 * Totals for each of the 12 months of `year`. Months without documents are 0;
 * several documents for the same month are summed.
 */
export function getMonthlyRevenue(
  revenues: Revenue[],
  year: number
): MonthlyRevenue[] {
  const totals = new Array<number>(12).fill(0)
  for (const revenue of revenues) {
    if (revenue.year === year && revenue.month >= 1 && revenue.month <= 12) {
      totals[revenue.month - 1] += revenue.value
    }
  }
  return totals.map((value, index) => ({
    month: index + 1,
    label: MONTH_LABELS[index],
    value,
  }))
}
