# Admin "trigger alert email" bookmarklet

A one-click operator tool for nudging a stuck availability email during a live demo. It
calls `POST /api/admin/trigger-alert` from whatever Ember tab you're on, so your logged-in
admin session cookie attaches automatically — works on `localhost` and the deployed domain
alike. Requires you to be signed in as `EMBER_ADMIN_EMAIL`.

## Install

1. Create a new browser bookmark (bookmark any page, then edit it).
2. Name it e.g. **Ember: trigger alert**.
3. Replace its **URL** with the one-liner below.
4. While on an Ember tab (logged in as admin), click it. It prompts for an alert id and an
   optional recipient (blank = the alert's owner), fires the email, and shows the result.

## The bookmarklet (paste as the bookmark URL)

```
javascript:(async()=>{const a=prompt('Alert ID:');if(!a)return;const e=prompt('Send to (blank = alert owner):')||void 0;try{const r=await fetch('/api/admin/trigger-alert',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e?{alertId:a,email:e}:{alertId:a})});const d=await r.json();alert(r.ok?`✅ Sent to ${d.email}\n${d.dateRange}`:`❌ ${r.status}: ${d.error||''}${d.detail?'\n'+d.detail:''}`)}catch(x){alert('❌ '+x)}})();
```

## Readable source

```js
(async () => {
  const alertId = prompt("Alert ID:");
  if (!alertId) return;
  const email = prompt("Send to (blank = alert owner):") || undefined;
  try {
    const res = await fetch("/api/admin/trigger-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { alertId, email } : { alertId }),
    });
    const data = await res.json();
    alert(
      res.ok
        ? `✅ Sent to ${data.email}\n${data.dateRange}`
        : `❌ ${res.status}: ${data.error || ""}${data.detail ? "\n" + data.detail : ""}`
    );
  } catch (e) {
    alert("❌ " + e);
  }
})();
```

## Finding an alert id mid-demo

In Supabase Studio → SQL editor (or local psql):

```sql
select a.id, a.facility_id, a.date_from, a.date_to, u.email
from alerts a join auth.users u on u.id = a.user_id
order by a.created_at desc limit 10;
```

Copy the visitor's `id`, click the bookmarklet, paste it. To send the visitor's email to
your own inbox instead (to confirm rendering), enter your address at the second prompt.
