# Project Aura — Database Schema (MySQL)

This document confirms the proposed tables and adds recommended types, constraints, and indexes for Laravel + MySQL.

MySQL version: 8.0+ (JSON columns supported)
Collation: utf8mb4 (emoji-safe)

## Tables

### users
- id: BIGINT UNSIGNED, PK, AI
- first_name: VARCHAR(100), NOT NULL
- middle_name: VARCHAR(100), NULL
- last_name: VARCHAR(100), NOT NULL
- birthday: DATE, NULL
- age: TINYINT UNSIGNED, NULL
  - Note: Redundant with `birthday`; prefer computing age in queries. Keep only if strictly needed.
- address: VARCHAR(255), NULL
- contact_number: VARCHAR(30), NULL
- email: VARCHAR(191), UNIQUE, NOT NULL
- password: VARCHAR(255), NOT NULL (bcrypt/argon hash)
- role: ENUM('student','teacher','admin') NOT NULL DEFAULT 'student'
- created_by: BIGINT UNSIGNED, NULL → FK users(id) ON DELETE SET NULL
  - Note: For students, references the teacher who created the account. NULL for teachers/admins.
- timestamps: created_at, updated_at (TIMESTAMP NULL)

Indexes
- UNIQUE(email)
- INDEX(created_by)
- Optional composite for frequent lookups (e.g., `(role, last_name)`)

---

### reports
- id: BIGINT UNSIGNED, PK, AI
- student_id: BIGINT UNSIGNED, NOT NULL → FK users(id) ON DELETE CASCADE
- type: VARCHAR(50), NOT NULL (e.g., Physical/Verbal/Sexual/Bullying/Other)
- answers: JSON, NOT NULL (question/answer payload)
- status: ENUM('submitted','in_review','resolved','archived') NOT NULL DEFAULT 'submitted'
- submitted_at: DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
- timestamps: created_at, updated_at

Indexes
- INDEX(student_id)
- INDEX(status)
- INDEX(submitted_at)

Notes
- Consider storing a denormalized `student_name` snapshot if needed for reporting (optional).

---

### threads
- id: BIGINT UNSIGNED, PK, AI
- subject: VARCHAR(255), NOT NULL
- created_by: BIGINT UNSIGNED, NOT NULL → FK users(id) ON DELETE CASCADE
- timestamps: created_at, updated_at

Indexes
- INDEX(created_by)

---

### thread_participants
- thread_id: BIGINT UNSIGNED, NOT NULL → FK threads(id) ON DELETE CASCADE
- user_id: BIGINT UNSIGNED, NOT NULL → FK users(id) ON DELETE CASCADE
- added_at: TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP

Constraints
- PRIMARY KEY (thread_id, user_id)

Indexes
- INDEX(user_id) for fast inbox queries

---

### messages
- id: BIGINT UNSIGNED, PK, AI
- thread_id: BIGINT UNSIGNED, NOT NULL → FK threads(id) ON DELETE CASCADE
- from_user_id: BIGINT UNSIGNED, NOT NULL → FK users(id) ON DELETE CASCADE
- body: TEXT, NOT NULL
- timestamps: created_at (DEFAULT CURRENT_TIMESTAMP), updated_at (NULL)

Indexes
- INDEX(thread_id, created_at) for pagination
- INDEX(from_user_id)

Optional Columns
- read_at: DATETIME NULL (per-recipient read receipts usually tracked in a separate table; omit for now)
- attachments: JSON NULL (store metadata if needed)

---

### question_sets
- id: BIGINT UNSIGNED, PK, AI
- key: VARCHAR(100), UNIQUE, NOT NULL (machine key, e.g., "Physical")
- title: VARCHAR(255), NULL (human readable)
- schema: JSON, NOT NULL (array of questions with id, q, type, required, options[])
- created_by: BIGINT UNSIGNED, NOT NULL → FK users(id) ON DELETE RESTRICT
- is_active: TINYINT(1) NOT NULL DEFAULT 1
- timestamps: created_at, updated_at

Indexes
- UNIQUE(key)
- INDEX(created_by)

## General Notes
- Use InnoDB with `utf8mb4` charset and `utf8mb4_unicode_ci` collation.
- Prefer `BIGINT UNSIGNED` for ids to align with Laravel defaults when using `bigIncrements`.
- JSON fields (`answers`, `schema`) allow flexible structures; validate shape in Laravel FormRequests.
- Soft deletes are not required; add if you need reversible deletes (`deleted_at`).
- Enforce access via Policies/Gates (teachers view reports; students only their own).

## Next Steps
1. Create Laravel migrations mirroring this schema.
2. Add Eloquent models with relationships and policies.
3. Seed minimal users (one teacher, one student) for local testing.
4. Implement Auth (Sanctum) and start wiring endpoints.
