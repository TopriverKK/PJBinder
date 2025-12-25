-- Weekly progress
-- One row per (weekStart YYYY-MM-DD) x (userId)

create table if not exists weeklyreports (
  weekStart text not null,
  userId text not null,
  issues text not null default '',
  done   text not null default '',
  createdAt text not null default to_char(now(), 'YYYY-MM-DD'),
  updatedAt text not null default to_char(now(), 'YYYY-MM-DD'),
  primary key (weekStart, userId)
);

-- (Optional) If you want to keep updatedAt correct even if client doesn't send it,
-- you can add a trigger later. For now, the app will set updatedAt on save.
