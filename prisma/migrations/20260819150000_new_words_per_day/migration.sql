-- How many new words a learner wants to start each day.
-- NULL keeps the previous behaviour of deriving it from the time budget.
ALTER TABLE "User" ADD COLUMN "newWordsPerDay" INTEGER;
