# Website Confidence Detection Feature Spec

## Problem

Current detection primarily relies on Google Business Profile website fields.

Many businesses do have websites but have not linked them to their Google profile.

This creates false positives.

False positives reduce trust in NoSiteFinder.

The goal is to increase confidence that businesses labeled "No Website" genuinely do not have a discoverable website.

---

## User Story

As a web designer,

I want confidence that a lead truly lacks a website,

So I don't waste time contacting businesses that already have one.

---

## Confidence States

### High Confidence No Website

No website found after multiple verification checks.

Display:

"No Website (High Confidence)"

---

### Possible Website Found

Potential website discovered but not fully verified.

Display:

"Possible Website"

---

### Website Confirmed

Business website located and verified.

Display:

"Website Found"

---

## Detection Strategy

No single source should determine status.

Use multiple signals.

---

## Check 1

Google Business Profile

Current implementation.

If website field exists:

Website Confirmed

---

## Check 2

Google Search

Search:

Business Name
City
State

Examples:

Joe's Plumbing Pittsburgh PA

Evaluate top search results.

Look for:

* matching business name
* matching phone number
* matching address

---

## Check 3

Facebook Business Page

Check whether business has:

* active Facebook page
* website link in profile

If found:

Possible Website

or

Website Confirmed

depending on confidence.

---

## Check 4

Yelp Listing

Check Yelp profile.

Many businesses place website URLs there.

If found:

Website Confirmed

---

## Check 5

Bing Search

Repeat business lookup.

Google occasionally misses weak websites.

---

## Check 6

Phone Number Correlation

Search business phone number.

If phone appears on a domain:

Increase confidence.

---

## Check 7

Address Correlation

Search business address.

If address appears on a domain:

Increase confidence.

---

## Confidence Scoring

Example:

GBP Website:
+100

Exact Domain Match:
+80

Phone Match:
+50

Address Match:
+30

Facebook Website:
+30

Yelp Website:
+40

Confidence Rules:

80+ Website Confirmed

40-79 Possible Website

0-39 High Confidence No Website

---

## UI Requirements

Show:

Status Badge

Confidence Score

Evidence Tooltip

Example:

Possible Website

Confidence: 65%

Evidence:

* Matching Facebook page
* Phone number found on domain

---

## Success Metric

Reduce false positives by at least 75%.

Users should trust that "High Confidence No Website" means the business likely does not have a discoverable website.
