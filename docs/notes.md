# Notes Feature Spec

## Overview

The Notes feature allows users to store outreach history and important details about a lead.

The goal is to prevent users from forgetting conversations and follow-up actions.

Notes should be lightweight and fast.

---

## User Story

As a web designer,

I want to save notes about a lead,

So I can remember conversations and next steps.

---

## Functional Requirements

### Create Note

Users can add notes to a lead.

Examples:

Called owner. No answer.

Owner interested. Follow up Friday.

Has Facebook page but no website.

---

### Edit Note

Users can edit existing notes.

---

### Delete Note

Users can delete notes.

---

### Timestamp

Every note should store:

* Created At
* Updated At

---

### User Ownership

Notes belong to:

* User
* Lead

Users should only see their own notes.

---

### Lead Detail View

Display notes under lead information.

Sort newest first.

---

### Recent Notes Preview

Search results may optionally display:

Last Note Date

Example:

Last Activity: 3 days ago

---

## Database Design

lead_notes

* id
* user_id
* lead_id
* content
* created_at
* updated_at

---

## MVP

Version 1 includes:

* Add note
* Edit note
* Delete note
* Display notes

No rich text.

No attachments.

No mentions.

No AI summaries.

---

## Success Metric

A user can revisit a lead after several weeks and immediately understand prior outreach activity.
