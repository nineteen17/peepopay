1. PeepoPay must NOT have one universal refund/cancellation policy.

Just like Selfbook, you are the software layer, not the service provider.

So:

✔️ Each business (plumber, mechanic, barber, etc) sets:
	•	Cancellation window (free cancellation until X hours before)
	•	Late-cancellation fee (optional)
	•	No-show fee (optional)
	•	Deposit % or fixed amount
	•	Refund method: full, partial, or none
	•	Automatic or manual refunds

PeepoPay enforces their policy but does not define it.

This keeps you legally protected + flexible.

⸻

🧠 2. PeepoPay provides the enforcement engine (like Selfbook)

Your system handles:
	•	Time-based cancellation windows
	•	Deposits
	•	Refund triggers
	•	No-show charges
	•	Automated Stripe payments + refunds
	•	Policy display at time of booking

Everything is automated but controlled by the business’s settings.

⸻

🧠 3. Add the “Flexible Cancellation” upsell (Selfbook’s secret revenue feature)

Selfbook makes $$$ by letting customers pay extra to change or protect the cancellation terms.

For PeepoPay, you can do this EXACTLY but adapted for trades.

Example Features:

Option A — “Cancellation Protection”
User pays +$3–$10 to allow:
	•	Cancel up to 1 hour before appointment
	•	No late-cancellation fee

PeepoPay takes a cut of this fee.

Option B — “Priority Reschedule Pass”
User pays +$2–$5 to:
	•	Skip reschedule fees
	•	Get priority rebooking next available slot

Option C — “Bad Weather Protection” (for outdoor services)
Pay small fee → cancel anytime if raining.

✔️ You can take 50–70% of the fee.
The business gets the rest.

This becomes a massive revenue stream, just like Selfbook.

⸻

🧠 4. Core architecture you should implement in PeepoPay

Database fields per business profile
cancellation_window_hours
late_cancellation_fee
no_show_fee
deposit_required
deposit_amount
allow_partial_refunds
auto_refund_on_cancel (boolean)
flex_pass_enabled (boolean)
flex_pass_price
flex_pass_rules_json


Database fields per booking
booking_status (active, cancelled, completed, no_show)
cancellation_time
refund_status
flex_pass_purchased (boolean)
flex_pass_fee
policy_snapshot_json
Important:
Policy must be snapshotted at the time of booking so later changes don’t break old bookings.
Selfbook does this too.

⸻

🧠 5. User Flow

A. Customer books a job

They see the business’s policies:
✔️ Cancel free up to 24 hours
✔️ Deposit: $30
✔️ Late cancel fee: $20
✔️ No-show fee: $40
✔️ Add Cancellation Protection for $5

B. PeepoPay automatically takes payment
	•	Deposit (if required)
	•	Flex pass (if chosen)

C. Customer cancels

PeepoPay checks rules:
	•	If within free window → full refund (minus Flex fee)
	•	If outside window but Flex purchased → refund deposit
	•	If outside window without Flex → charge late fee
	•	If no-show → charge no-show fee automatically

D. Stripe handles actual payment/refund

You’re just orchestrating.

⸻

🧠 6. Legal Position

Like Selfbook:

PeepoPay does NOT own the policy.

The business owns the policy.

PeepoPay just enforces it and provides the engine.

This protects you from disputes.

⸻

🧠 7. This makes your platform extremely valuable

Because:
	•	Most NZ/AU trades have no automated cancellation system
	•	No-shows cost electricians/plumbers thousands
	•	Even chains like Auto Super Shoppe have basic contact forms
	•	Giving them a Stripe-powered enforcement system is a huge upgrade
