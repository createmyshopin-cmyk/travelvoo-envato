-- Link quotations to the booking they were generated from; at most one quotation per booking.
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.quotations.booking_id IS 'Originating booking when created from Admin Bookings; enforces no duplicate quotation per booking.';

CREATE UNIQUE INDEX IF NOT EXISTS quotations_booking_id_key
  ON public.quotations (booking_id)
  WHERE booking_id IS NOT NULL;
