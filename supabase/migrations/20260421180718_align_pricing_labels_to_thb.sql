update public.bikes
set pricing_label = '฿' || substring(pricing_label from 2)
where pricing_label ~ '^\$[0-9]+(\.[0-9]{2})? / 10 min$';
