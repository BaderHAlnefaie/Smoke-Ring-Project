-- Smoke Ring — persisted opening hours
--
-- Store the week as a 7-entry JSON array on truck_status, in Monday-first order
-- (index 0 = Monday … 6 = Sunday). Each entry: { open, close, closed }.
-- Written only via the service-role admin actions, like the rest of truck_status.

alter table public.truck_status
  add column if not exists opening_hours jsonb not null default
  '[{"open":"07:30","close":"14:00","closed":false},{"open":"07:30","close":"14:00","closed":false},{"open":"07:30","close":"14:00","closed":false},{"open":"07:30","close":"14:00","closed":false},{"open":"00:00","close":"00:00","closed":true},{"open":"08:00","close":"15:00","closed":false},{"open":"08:00","close":"15:00","closed":false}]'::jsonb;
