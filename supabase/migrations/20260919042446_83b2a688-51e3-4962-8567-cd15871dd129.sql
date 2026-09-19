UPDATE public.scraped_rfps SET
  location = CASE WHEN lower(btrim(location)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data') THEN NULL ELSE location END,
  category = CASE WHEN lower(btrim(category)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data') THEN NULL ELSE category END,
  organization = CASE WHEN lower(btrim(organization)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data') THEN NULL ELSE organization END,
  budget = CASE WHEN lower(btrim(budget)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data') THEN NULL ELSE budget END,
  description = CASE WHEN lower(btrim(description)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data') THEN NULL ELSE description END,
  updated_at = now()
WHERE lower(btrim(location)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data')
   OR lower(btrim(category)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data')
   OR lower(btrim(organization)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data')
   OR lower(btrim(budget)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data')
   OR lower(btrim(description)) IN ('null','none','n/a','na','n.a.','-','--','undefined','nil','unknown','unspecified','tbd','not specified','not available','no data');