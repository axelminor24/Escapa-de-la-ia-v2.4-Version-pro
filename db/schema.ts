import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const room = sqliteTable('escape_room', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull().default(0),
  payload: text('payload').notNull(),
});

export const loginAttempts = sqliteTable('escape_login_attempts', {
  id: text('id').primaryKey(),
  attempts: integer('attempts').notNull(),
  windowStart: integer('window_start').notNull(),
});
