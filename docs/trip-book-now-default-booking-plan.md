# Trip "Book Now" — connect to default `BookingFormModal`

## Goal

When the user clicks **Book Now** on a trip/package page (`/trip/[slug]`), open the **same** [`BookingFormModal`](src/components/BookingFormModal.tsx) used on stay detail pages — not a separate lightweight dialog — so UX, validation, coupons, confirmation, and WhatsApp flows stay consistent.

## Why this is not a one-line change

[`BookingFormModal`](src/components/BookingFormModal.tsx) is built for **stays**:

- Requires **`stayId`** and **`roomCategories`** (fetches `room_categories`, `useCalendarPricing(stayId)`, add-ons).
- Submit uses **`create_booking_enquiry`** with **`p_stay_id: stayId`** (see `handleSubmit` ~414–470).

Trips are **`trips` + `trip_dates`**, not `stays`. The modal cannot be mounted without addressing data + RPC semantics.

## Recommended approach: **trip mode** inside `BookingFormModal`

Extend the modal with an explicit mode so the default booking UI stays one component.

### 1. New props (conceptual)

- `bookingMode?: "stay" | "trip"` (default `"stay"` for backward compatibility).
- When `bookingMode === "trip"`:
  - Pass **`tripId`** (UUID), **`tripName`**, **`tripSlug`**, **`tripDates`** ([`TripDate[]`](src/types/trip.ts) from [`useTripDetail`](src/hooks/useTrips.ts)).
  - **Do not** require `roomCategories` for mount — or pass a **single synthetic “Package” room** row built in the parent for display only (see alternative below).

### 2. UI behavior in trip mode

- **Hide or simplify** stay-only pieces: multi-room calendar tied to `calendar_pricing` per stay (replace with):
  - **Batch selector** driven by `trip_dates` (start/end + price per row), **or** fixed check-in/check-out from the selected batch.
- **Guests / contact / coupons / confirmation / WhatsApp** — reuse existing steps and styling from `BookingFormModal` where possible.
- **Pricing**: use selected `trip_dates` row `price` × policy (e.g. per adult) — align with product rules (may match sidebar “starting from” logic).

### 3. Backend: extend booking creation for trips

Today the RPC expects a **stay**.

Pick one (product decision):

| Path | Description |
|------|-------------|
| **A. Extend `create_booking_enquiry`** | Add optional `p_trip_id uuid`, allow **`p_stay_id` null** when `p_trip_id` is set; validate trip ownership/tenant; write `bookings` with `stay_id` null and store `trip_id` (needs **`trip_id` column** on `bookings` — migration). |
| **B. New RPC `create_trip_booking_enquiry`** | Mirrors create flow but for trips only; inserts into `bookings` or `leads` + optional invoice flags. |
| **C. Bridge stay (not ideal)** | Tenant sets a **dummy/default stay** only to satisfy RPC; trip metadata in `special_requests` — keeps one RPC but is misleading in admin reports. |

**Recommendation:** **Path A or B** with a real **`trip_id`** on `bookings` (nullable FK) + migration, so Admin **Bookings** can filter stay vs trip.

### 4. Wire [`TripDetails.tsx`](src/spa-pages/TripDetails.tsx)

- State: `bookingOpen`.
- **`onBookNow`** on [`TripHero`](src/components/trip/TripHero.tsx) → `setBookingOpen(true)`.
- Render:

```tsx
<BookingFormModal
  open={bookingOpen}
  onOpenChange={setBookingOpen}
  bookingMode="trip"
  tripId={trip.id}
  tripName={trip.name}
  tripSlug={trip.slug}
  tripDates={dates}
  // stay props omitted or optional when mode=trip
/>
```

(Exact prop names to match implementation.)

### 5. Files likely touched

| Area | Files |
|------|--------|
| Modal | [`src/components/BookingFormModal.tsx`](src/components/BookingFormModal.tsx) — branch on `bookingMode`, trip date UI, submit branch |
| Trip page | [`src/spa-pages/TripDetails.tsx`](src/spa-pages/TripDetails.tsx) — open modal, pass trip props |
| DB | New migration: `bookings.trip_id` nullable FK → `trips(id)`; optional RLS updates |
| RPC | Supabase function: extend or add `create_trip_booking_enquiry` / extend `create_booking_enquiry` |
| Types | [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts) — regenerate or patch after migration |

### 6. Testing

- Stay page: unchanged (`bookingMode` default stay).
- Trip page: Book Now opens **same** modal shell; submit creates booking/enquiry with trip linkage.
- Admin bookings list: shows trip bookings if `trip_id` populated.

## Out of scope (unless requested)

- Full invoice automation for trips (reuse stay invoice path only if RPC returns booking id and `stay_id` is null — may need small admin UI tweaks).

---

## Database update (migration)

Add a new file under `supabase/migrations/` (timestamp + name, e.g. `YYYYMMDDHHMMSS_bookings_trip_id.sql`). Apply with `supabase db push` after linking the project.

### DDL (reference)

```sql
-- Link package/trip bookings to trips; stay bookings keep stay_id set and trip_id null.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON public.bookings (trip_id)
  WHERE trip_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.trip_id IS 'Set for package/trip bookings; stay_id may be null.';
```

### Optional business rule (stricter)

If you want DB-enforced “either stay or trip, not both”:

```sql
-- Optional: only if product forbids setting both stay_id and trip_id on one row
-- ALTER TABLE public.bookings ADD CONSTRAINT bookings_stay_xor_trip CHECK (
--   (stay_id IS NOT NULL AND trip_id IS NULL) OR
--   (stay_id IS NULL AND trip_id IS NOT NULL)
-- );
```

### RPC

DDL alone does not update **`create_booking_enquiry`**. A follow-up migration or SQL in the dashboard must:

- Accept `p_trip_id uuid` (optional) and allow `p_stay_id` null when inserting trip bookings, **or**
- Add **`create_trip_booking_enquiry(...)`** that inserts into `bookings` including `trip_id`.

Regenerate TypeScript types after deploy (`bookings.Row.trip_id`).

### Apply to remote

```bash
supabase db push
```

---

## Implementation todos

1. **Migration**: add `bookings.trip_id` (SQL above) + deploy with `supabase db push`.
2. **RPC**: extend or add enquiry creation for trip bookings (separate from DDL).
3. **`BookingFormModal`**: `bookingMode === "trip"` UI + submit path.
4. **`TripDetails`**: wire Book Now → `BookingFormModal` in trip mode.
