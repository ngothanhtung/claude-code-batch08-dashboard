# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server (Turbopack) on http://localhost:3000
npm run build    # production build, includes TypeScript check
npm run lint     # ESLint (eslint-config-next, includes react-hooks rules)
npx tsc --noEmit # type check only
```

There is no test framework configured.

Next.js refuses to start a second `next dev` for the same directory. If one is already running (often the user's own on port 3000), reuse it instead of killing it; it hot-reloads code and `.env.local` changes.

### Adding shadcn components

Run the locally installed CLI, not `npx shadcn`:

```bash
./node_modules/.bin/shadcn add <component-or-block> --dry-run   # always preview first
./node_modules/.bin/shadcn add <component-or-block> --yes
```

`npx shadcn ...` fails with `EALLOWSCRIPTS`: the user's `~/.npmrc` sets `allow-scripts`, `npx` re-exports it as an env var, and npm 11 rejects it for the nested `npm install`. Calling the binary directly avoids this.

Blocks (`dashboard-*`, `sidebar-*`, `login-*`) overwrite existing files such as `src/app/dashboard/page.tsx`, `src/components/app-sidebar.tsx`, `nav-*.tsx`, and `src/hooks/use-mobile.ts`. Check the `--dry-run` output and back up or restore files the block should not replace.

## Stack specifics

- **Next.js 16 App Router** under `src/`, alias `@/*` → `src/*`. Route types such as `LayoutProps<"/dashboard">` are global and need no import.
- **Tailwind CSS v4**: no `tailwind.config`. The theme (CSS variables, `@theme inline`) lives in `src/app/globals.css`. The font is wired via the `--font-sans` variable set in `src/app/layout.tsx`.
- **shadcn/ui, style `base-nova`** (`components.json`): components are built on **`@base-ui/react`, not Radix**. Composition uses the `render` prop (e.g. `<DropdownMenuTrigger render={<SidebarMenuButton />}>`), not `asChild`.
- `cn` comes from the **`cn` npm package** (`import { cn } from "cn"`, re-exported by `src/lib/utils.ts`), not clsx + tailwind-merge.
- Icons: `lucide-react`. Toasts: `sonner` (`<Toaster />` is mounted in the root layout).

## Architecture

### Authentication (Firebase, client-side only)

- `src/lib/firebase.ts` initializes the Firebase app (guarded against double init on hot reload) and exports `auth`. Config comes from `NEXT_PUBLIC_FIREBASE_*` in `.env.local`, which is gitignored and must be recreated per machine and set again on any deploy target.
- `src/components/auth-provider.tsx` wraps the whole app in `src/app/layout.tsx`. It exposes `useAuth()` → `{ user, loading }` from `onAuthStateChanged`.
- `src/app/dashboard/layout.tsx` wraps every `/dashboard` route in `RequireAuth`, which redirects to `/login` when there is no user. New protected pages go under `src/app/dashboard/`.
- Redirects are driven by auth state, not by the sign-in/sign-out calls:
  - `login-form.tsx` redirects to `/dashboard` whenever `user` becomes non-null, which also covers already-signed-in visitors.
  - `nav-user.tsx` only calls `signOut(auth)`; `RequireAuth` then redirects to `/login`.
- Enabled providers: Email/Password and Google (`signInWithPopup`). Apple is not enabled in the Firebase project. There is no sign-up or password-reset flow; users are created in the Firebase Console.
- No server-side session or token verification exists. Anything server-side (route handlers, server actions) must verify Firebase ID tokens itself.

### Features (`src/features/<name>/`)

Feature code lives outside `src/app`; route files under `src/app` stay thin and render feature components.

- `types.ts`: data types, display labels, and helpers. For tasks this includes `canEditTask`/`canDeleteTask`, which mirror the Firestore rules so the UI disables actions the rules would reject.
- `services/`: the only place that talks to Firestore (`db` from `src/lib/firebase.ts`). Services are plain async functions. `getTaskErrorMessage` maps `FirebaseError` codes to UI text.
- `components/`: client components that call services directly (no data-fetching library) and reload the list after each mutation.

Tasks are stored in the Firestore `tasks` collection. Task details open in a `Sheet` on `/tasks`, and the open task is kept in the URL as `?task=<id>`. Because of `useSearchParams`, `TasksView` must stay inside the `Suspense` in `src/app/tasks/page.tsx`. `/tasks/[id]` only redirects to that URL. Due dates are stored as Firestore `Timestamp`s (local midnight) but are `YYYY-MM-DD` strings in the app; `tasks.service.ts` converts both ways and still reads legacy string values. Other timestamps use `serverTimestamp()`. Lists are fetched ordered by `createdAt`, and filtering happens client-side so no composite indexes are needed.

Customers (`/customers`, Firestore `customers`) use React Hook Form + Zod (`src/features/customers/schema.ts`, rendered with shadcn `Field` + `Controller`) and a TanStack Table v9 (`useTable` + `tableFeatures`), sorted by priority high → medium → low by default. `assignedTo`, `createdBy` and `updatedBy` are stored as `users/{uid}` `DocumentReference`s but are plain uids in the app. Any signed-in user may edit a customer; only the creator may delete.

Customer activities (call/email/meeting/note) live in the `customers/{id}/activities` subcollection and are shown in a `Sheet` opened via `/customers?customer=<id>` (so `CustomersView` is inside a `Suspense`, like tasks). The activity form is one flat Zod schema with a `refine` for type-specific required fields; fields that don't apply to the type are stored as `null`. Activity dates are full date-times (`Date` in the app, `Timestamp` in Firestore) picked with `DateTimePicker` (`src/components/date-time-picker.tsx`, shadcn date picker + time input); older activities saved before times existed sit at local midnight. Customer attachments are uploaded to Firebase Storage at `customers/{customerId}/files/{fileId}-{name}` (`storage` from `src/lib/firebase.ts`) and recorded in the `customers/{id}/files` subcollection (name, url, contentType, size, storagePath, uploadedAt, uploadedBy). `files.service.ts` creates the document id first so the Storage path and the document match, and removes the uploaded object if the document write fails. `deleteCustomer` deletes files (Storage objects and documents) and activities first, because Firestore does not delete subcollections with their parent.

`users/{uid}` holds public profiles that `AuthProvider` writes on every sign-in (`saveUserProfile`). They feed the assignee picker, so a user appears there only after signing in once.

Security rules live in `firestore.rules` (read: any signed-in user; update: creator or assignee by email; delete: creator only). Storage rules live in `storage.rules`; they use cross-service `firestore.get()`/`firestore.exists()` to check the customer. Deploy both with `firebase deploy --only firestore:rules,storage --project batch08-59043` (add `--dry-run` to only compile). The Storage service agent already has `roles/firebaserules.firestoreServiceAgent` for the cross-service calls. The CLI only grants it when storage rules changed and it runs interactively: without a TTY (e.g. from an agent shell) it silently skips the grant, so use `script -q /dev/null firebase deploy ... --force` if it ever needs re-granting. When adding fields that the rules validate, update both files.

### Routes and UI

- Signed-in pages wrap their content in `AppShell` (`src/components/app-shell.tsx`: sidebar + `SiteHeader` with a `title`). Protect a new top-level route by adding a `layout.tsx` that wraps it in `RequireAuth`, as `src/app/tasks/layout.tsx` does.
- `NavMain` renders items without sub-items as direct links, highlighted for the current path. Items with sub-items render as collapsibles.
- `/` redirects to `/dashboard`.
- `/dashboard` is the shadcn `dashboard-01` content (section cards, interactive area chart, draggable data table fed by `src/app/dashboard/data.json`) inside the `sidebar-07` sidebar (collapsible to icons).
- Sidebar navigation, teams and projects are static sample data in the `data` object in `src/components/app-sidebar.tsx`. The user shown in the sidebar comes from Firebase.
- `/login` is the shadcn `login-03` block with Firebase handlers in `src/components/login-form.tsx`.

### Local deviations from upstream shadcn code

These files were changed to pass the `react-hooks/set-state-in-effect` lint rule. Re-adding the components with `--overwrite` reverts them:

- `src/hooks/use-mobile.ts` uses `useSyncExternalStore` instead of `setState` in an effect.
- `src/components/chart-area-interactive.tsx` switches to the 7-day range on mobile by adjusting state during render, not in an effect.
