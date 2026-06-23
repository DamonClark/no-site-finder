# Facebook Profile Discovery Feature Spec

## Overview

This feature enriches each lead with a likely Facebook Business Page URL.

The goal is to improve contactability by giving users an alternate outreach channel when websites are missing or unresponsive.

---

## User Story

As a web designer,

I want to quickly find a business’s Facebook page,

So I can message them directly if needed.

---

## Problem

Many small businesses:

* Do not maintain websites
* Actively use Facebook as their primary online presence
* Respond faster on Facebook Messenger than email

Current system does not surface this channel.

---

## Functional Requirements

### Facebook Profile Detection

For each lead, attempt to find:

* Official Facebook Business Page URL

Example:

https://www.facebook.com/joesplumbingpittsburgh

---

### Detection Strategy

Use multi-source discovery:

#### 1. Google Search

Query format:

"{business name} {city} facebook"

Extract best match business page.

---

#### 2. Google Business Profile Links

Check if Facebook is listed in:

* GBP “Social profiles”
* Knowledge panel links

---

#### 3. Website Footer Links (if website exists)

If a website is found:

* scan for Facebook icon links

---

#### 4. Name + Phone Matching

Validate Facebook page by checking:

* business name similarity
* phone number match (if available)

---

## Confidence Scoring

Each result must include confidence:

High Confidence:

* Exact name match + location match

Medium Confidence:

* Partial match on name

Low Confidence:

* Generic or ambiguous page

---

## UI Requirements

Lead card should display:

Facebook icon + link

Example:

[Facebook] View Page

If confidence is low:

Show warning indicator:

“Possible match”

---

## Lead Detail View

Display:

* Facebook URL
* Confidence score
* Evidence used to match

---

## Data Model

Add field to lead:

facebook_url

facebook_confidence

facebook_source

---

## Constraints

* Do NOT crawl private profiles
* Do NOT scrape login-gated content
* Only use publicly available pages

---

## Success Metric

Users can:

1. Find a lead
2. Open Facebook page
3. Message business within 60 seconds

Without leaving NoSiteFinder

This increases contact rates and reduces dependency on email discovery.
