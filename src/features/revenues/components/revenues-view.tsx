"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getRevenueErrorMessage,
  subscribeToRevenues,
} from "@/features/revenues/services/revenues.service"
import {
  formatVnd,
  formatVndCompact,
  getMonthlyRevenue,
  getRevenueYears,
  type Revenue,
} from "@/features/revenues/types"

const chartConfig = {
  value: {
    label: "Revenue",
    color: "var(--primary)",
  },
} satisfies ChartConfig

type RevenuesState = {
  revenues: Revenue[]
  loading: boolean
  error: string | null
}

export function RevenuesView() {
  const [state, setState] = React.useState<RevenuesState>({
    revenues: [],
    loading: true,
    error: null,
  })
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null)

  React.useEffect(
    () =>
      subscribeToRevenues(
        (revenues) => setState({ revenues, loading: false, error: null }),
        (err) =>
          setState((current) => ({
            ...current,
            loading: false,
            error: getRevenueErrorMessage(err),
          }))
      ),
    []
  )

  const years = React.useMemo(() => {
    const dataYears = getRevenueYears(state.revenues)
    return dataYears.length ? dataYears : [new Date().getFullYear()]
  }, [state.revenues])
  // Default to the current year if it has data, otherwise the newest year.
  const currentYear = new Date().getFullYear()
  const year =
    selectedYear ?? (years.includes(currentYear) ? currentYear : years[0])

  const monthly = React.useMemo(
    () => getMonthlyRevenue(state.revenues, year),
    [state.revenues, year]
  )
  const total = monthly.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Revenues</h2>
        <p className="text-sm text-muted-foreground">
          Monthly revenue for the selected year, updated in real time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by month</CardTitle>
          <CardDescription>
            Total {year}:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatVnd(total)}
            </span>
          </CardDescription>
          <CardAction>
            <Select
              value={String(year)}
              onValueChange={(value) => {
                if (value !== null) {
                  setSelectedYear(Number(value))
                }
              }}
            >
              <SelectTrigger className="w-28" size="sm" aria-label="Year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {state.error ? (
            <p className="py-12 text-center text-sm text-destructive">
              {state.error}
            </p>
          ) : state.loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[320px] w-full"
            >
              <BarChart data={monthly} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={56}
                  tickFormatter={(value: number) => formatVndCompact(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const month = payload[0]?.payload?.label
                        return month ? `${month} ${year}` : null
                      }}
                      formatter={(value) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Revenue
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatVnd(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
