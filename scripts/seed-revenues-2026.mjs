// Seeds mock revenues for 2026, months 1-10, into Firestore `revenues`.
// Months that already have a document for 2026 are skipped, so existing data
// (and re-runs) are never duplicated or overwritten.
//
// Usage: ACCESS_TOKEN=<OAuth token with Firestore access> node scripts/seed-revenues-2026.mjs

const PROJECT_ID = "batch08-59043"
const YEAR = 2026
const MOCK_VALUES = {
  1: 98_500_000,
  2: 76_200_000,
  3: 112_800_000,
  4: 125_400_000,
  5: 131_000_000,
  6: 142_700_000,
  7: 138_900_000,
  8: 146_300_000,
  9: 150_000_000,
  10: 163_500_000,
}

const token = process.env.ACCESS_TOKEN
if (!token) {
  console.error("Set ACCESS_TOKEN first.")
  process.exit(1)
}

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}

async function request(url, init) {
  const response = await fetch(url, { headers, ...init })
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`)
  }
  return response.json()
}

const query = await request(`${base}:runQuery`, {
  method: "POST",
  body: JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: "revenues" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "year" },
          op: "EQUAL",
          value: { integerValue: String(YEAR) },
        },
      },
    },
  }),
})
const existingMonths = new Set(
  query
    .filter((row) => row.document)
    .map((row) => Number(row.document.fields.month?.integerValue ?? row.document.fields.month?.doubleValue))
)

for (const [month, value] of Object.entries(MOCK_VALUES)) {
  if (existingMonths.has(Number(month))) {
    console.log(`skip  ${YEAR}-${month}: already exists`)
    continue
  }
  const id = `${YEAR}-${String(month).padStart(2, "0")}`
  await request(`${base}/revenues?documentId=${id}`, {
    method: "POST",
    body: JSON.stringify({
      fields: {
        year: { integerValue: String(YEAR) },
        month: { integerValue: String(month) },
        value: { integerValue: String(value) },
      },
    }),
  })
  console.log(`added ${id}: ${value.toLocaleString("vi-VN")} VND`)
}
