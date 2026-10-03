# Premium is sold only through Google Play; the web app recognises it but cannot sell it

Calorie Tracks launches on Google Play only (iOS deferred), and Premium is sold as a Google Play Subscription managed through RevenueCat. The web app at app.calorietracks.com stays free to use and honours Premium for signed-in Accounts, but has no checkout. We chose this to avoid running a second payment system (Stripe, tax, refunds, a second source of truth for Premium) before the product has proven itself, at the cost of not being able to convert web-only and iPhone users. Admin Grants exist alongside Subscriptions for demo and trial Accounts; an admin cannot change a Subscription.

## Consequences

- iPhone users can use the web app but cannot buy Premium until an iOS release adds App Store purchases.
- Adding web checkout later means a second purchase source that must merge with Google Play and Grants into one Premium state.
