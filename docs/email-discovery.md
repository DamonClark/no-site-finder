# Email Discovery Feature Spec

## Goal

Help users contact businesses discovered through NoSiteFinder.

The objective is not perfect email coverage.

The objective is to increase outreach success rates.

---

## User Story

As a web designer,

I want contact email addresses for leads,

So I can perform outreach without manual research.

---

## Initial Version

Focus on business emails.

Not personal emails.

Examples:

info@

contact@

support@

hello@

sales@

office@

---

## Discovery Sources

### Provider Enrichment

Evaluate:

* Apollo
* Hunter
* Dropcontact
* Prospeo
* Snov
* Clay enrichment providers

System should support multiple providers.

---

## Provider Abstraction Layer

Create:

EmailProvider interface

Methods:

findEmail()

verifyEmail()

getConfidence()

This allows swapping providers later.

---

## Email Confidence

Each result should include:

Email Address

Confidence Score

Source

Verification Status

---

## Confidence Levels

High

Medium

Low

Unknown

---

## UI

Lead Card:

Business Name

Phone

Website Status

Email Address

Confidence Badge

Reveal Email Button

---

## Credits

Email discovery should consume credits.

Reason:

Provider lookups cost money.

Searches should remain unlimited or largely unrestricted.

Only enrichment should consume credits.

---

## Suggested Economics

Example:

Provider Cost:
$0.03-$0.10

User Cost:
$0.20-$0.50

Maintain strong margins.

---

## Bulk Enrichment

Users can select:

10 leads

25 leads

50 leads

and enrich all at once.

---

## Export

CSV should include:

Email

Confidence

Verification Status

Source

---

## Future Enhancements

Decision Maker Discovery

Owner Lookup

LinkedIn Discovery

Cold Outreach Integrations

These are not required for Version 1.

---

## Success Metric

User can:

Find Lead

Reveal Email

Export Lead

Perform Outreach

Within 60 seconds.
