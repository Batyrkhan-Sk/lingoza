-- How many underlying units a daily plan item covers (words, questions).
--
-- Persisted because it is a budget rather than display text: the vocabulary
-- session uses it to stop once the day's new words have been introduced,
-- instead of serving new material indefinitely.
ALTER TABLE "DailySessionItem" ADD COLUMN "quantity" INTEGER;
