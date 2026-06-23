# Contact Pipeline Feature Spec

## Overview

The Contact Pipeline allows users to track outreach progress for leads discovered through NoSiteFinder.

The goal is to turn NoSiteFinder from a lead discovery tool into a lightweight prospecting CRM.

Users should be able to move leads through a simple sales pipeline and quickly understand where every opportunity stands.

---

## User Story

As a web designer or agency owner,

I want to track the status of businesses I contact,

So I can manage outreach and avoid losing opportunities.

---

## Pipeline Stages

Each lead can have one status.

Available statuses:

* New
* Contacted
* Follow Up
* Meeting Scheduled
* Proposal Sent
* Won
* Lost

Default status:

New

---

## Functional Requirements

### Status Assignment

Users can:

* Assign status to a lead
* Change status later
* Filter leads by status

Status changes should save immediately.

---

### Lead Ownership

Pipeline records belong to the authenticated user.

One user's status changes should not affect another user's lead records.

---

### Search Results Integration

Each search result should display:

* Current status badge
* Quick status selector

Example:

[New ▼]

User can change status without opening a separate page.

---

### Lead Detail View

Lead detail page should display:

* Business name
* Contact information
* Opportunity score
* Current pipeline status
* Notes section

Pipeline status should be editable.

---

### Filtering

Users should be able to filter:

* All Leads
* New
* Contacted
* Follow Up
* Meeting Scheduled
* Proposal Sent
* Won
* Lost

---

### Pipeline Dashboard

Create a simple dashboard showing:

New: 32

Contacted: 15

Follow Up: 8

Meeting Scheduled: 2

Proposal Sent: 1

Won: 0

Lost: 4

No charts required initially.

Simple counts are sufficient.

---

## Database Design

Create a user_leads table.

Suggested fields:

id

user_id

lead_id

status

created_at

updated_at

Status stored as enum/string.

---

## Non-Goals

Not building:

* Full CRM
* Email automation
* Team collaboration
* Activity timelines
* Complex reporting

Keep implementation simple.

---

## Success Criteria

A user can:

1. Find a lead
2. Mark it Contacted
3. Add a note
4. Move it to Follow Up
5. Mark it Won

Without leaving NoSiteFinder

The feature should feel lightweight and fast.
