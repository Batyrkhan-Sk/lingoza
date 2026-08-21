-- Track how far through a planned item the learner is, so the item can
-- complete itself once its budgeted quantity is done.
ALTER TABLE "DailySessionItem" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
