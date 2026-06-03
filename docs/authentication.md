# Authentication — How It Works

Ember uses **Google OAuth** as its identity provider and **Supabase Auth** as its session
manager. Users sign in with their Google account; Supabase handles the token exchange and
issues a session the app can read on both client and server.

---

## The three players

### Google (Identity Provider)
Google's job is to verify that a user is who they claim to be. When someone clicks
"Sign in with Google", Google shows its own consent screen, authenticates the user
against their Google account, and if approved, issues a short-lived **authorization code**
that proves the sign-in happened.

Google does not know anything about Ember's database or sessions — it only vouches for
identity.

### Supabase Auth (Session Manager)
Supabase takes Google's authorization code and exchanges it (server-to-server, privately)
for the user's profile. It then:
- Creates or looks up the user in its own `auth.users` table
- Issues a **JWT access token** and a **refresh token** for our app
- Manages session expiry and token refresh

Supabase is the bridge between "Google says this person is real" and "our app has a logged-in
user with an ID we can store in the database."

### Our App (Consumer)
The app reads the Supabase session from a cookie on every request. Server components and
API routes can call `supabase.auth.getUser()` to get the authenticated user. The `user.id`
is what we store as a foreign key on `alerts` rows.

---

## The sign-in flow, step by step

```
Browser                          Supabase                         Google
  │                                  │                               │
  │  1. "Sign in with Google"        │                               │
  │  ── signInWithOAuth() ──────────>│                               │
  │                                  │  2. Redirect to Google        │
  │  <──────────────────────────────────────────────────────────────>│
  │                                  │                               │
  │  3. User approves on Google      │                               │
  │  <─────────────────────────────────── auth code ────────────────│
  │                                  │                               │
  │  4. Browser → Supabase callback  │                               │
  │  ── /auth/v1/callback?code= ────>│                               │
  │                                  │  5. Exchange code for tokens  │
  │                                  │  ── client_id + secret ──────>│
  │                                  │  <── access_token + profile ──│
  │                                  │                               │
  │                                  │  6. Upsert user in auth.users │
  │                                  │  7. Issue Supabase JWT        │
  │                                  │                               │
  │  8. Redirect to /auth/callback   │                               │
  │  <── session cookie ────────────│                               │
  │                                  │                               │
  │  9. App reads session, user is   │                               │
  │     now authenticated            │                               │
```

---

## Credentials

### Client ID
`11643753668-1s2da7lhsftvbhrgvqsikd0u3ijnncpp.apps.googleusercontent.com`

This is the **public identifier** of Ember with Google. It tells Google which app is
requesting sign-in. It is visible in browser network requests and in the OAuth redirect
URL — this is expected and not a security concern.

### Client Secret
Stored **only** in the Supabase dashboard (Authentication → Providers → Google). Never
in the codebase, environment variables, or version control.

The secret is what Supabase uses in step 5 above to privately prove to Google that it is
really Ember making the token exchange — not a third party who copied our Client ID.

### Supabase redirect URL
When Google finishes authenticating the user (step 3), it redirects to:
```
https://hbbqnptnopgrxproigux.supabase.co/auth/v1/callback
```
Supabase handles this internally, then redirects the browser to our app's callback route.

### App callback route
`app/auth/callback/route.ts` — exchanges the Supabase session code for a cookie and
redirects the user back into the app. This is what makes the session readable on the
server side via `@supabase/ssr`.

---

## Where the session lives in the app

Supabase Auth uses **cookies** (not localStorage) when used with `@supabase/ssr`. This
means:

- **Server components** can call `supabase.auth.getUser()` and get the authenticated user
  without any client-side JavaScript.
- **API routes / server actions** can also read the session from the incoming request
  cookies — so alert creation is fully server-side and the client never touches the
  database directly.
- **Client components** can subscribe to `supabase.auth.onAuthStateChange()` for reactive
  UI updates (e.g. showing a signed-in avatar).

---

## The `auth.users` table

Supabase manages this table automatically. Key columns we use:

| Column | Value (Google sign-in) |
|---|---|
| `id` | UUID — used as `user_id` FK on our `alerts` table |
| `email` | Verified Google email — used for alert notifications |
| `raw_user_meta_data` | Google profile (name, avatar URL) |
| `created_at` | First sign-in timestamp |

We never write to `auth.users` directly — Supabase manages it.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL       # https://hbbqnptnopgrxproigux.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  # safe to expose — enforces RLS, not admin access
```

The anon key is not a secret. It is the public key that allows read access to tables
where Row Level Security permits it. The actual session verification happens inside
Supabase using the JWT, not the anon key.

---

## How this connects to the alert flow

Before auth, the alert setup panel had a "How should we notify you?" step where users
chose Email or SMS and typed their contact info. Auth replaces this entirely:

- **SMS is dropped.** Twilio phone verification adds too much friction and cost for a
  portfolio demo. Email is the only notification channel.
- **Email is implicit.** Once the user has signed in with Google, we already have their
  verified email from `auth.users.email`. The "How should we notify you?" step becomes
  unnecessary — we just show "We'll notify you at [email]".
- **The `alerts.user_id` column is nullable.** Any alerts created before auth was added
  will have a null `user_id`. When proper auth is in place, every new alert gets the
  signed-in user's UUID. This allows a future migration to associate old alerts with
  users without breaking existing rows.

The updated alert setup flow:
```
1. User selects dates on listing page → availability is "booked"
2. User clicks "Set up an alert"
3. If not signed in → Google OAuth sign-in (modal or redirect)
4. After sign-in → alert-setup panel opens with flexibility toggle
5. User clicks "Confirm alert"
6. Server action inserts into `alerts` with user_id = auth.users.id
7. Notification fires to auth.users.email when a cancellation is detected
```

---

## Notification channel

Email only for now. Sent to the verified address on `auth.users.email`. No phone number
collection, no Twilio, no OTP verification required.

---

## Future: adding phone / SMS

When SMS notifications are added (via Twilio), the flow will extend to require phone
verification after Google sign-in. Supabase Auth has built-in phone OTP support. The
`auth.users` table has a `phone` column that would be populated at that point.

No schema changes to `alerts` will be needed — notifications are sent to the contact
info on `auth.users`, not stored on the alert row itself.
