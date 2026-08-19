-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderHours" TEXT NOT NULL DEFAULT '9,13,20',
ADD COLUMN     "lastRemindedAt" TIMESTAMP(3);

-- Carry existing single-slot preferences forward: a learner who chose 19:00
-- keeps an evening reminder, with a morning and midday slot added around it.
UPDATE "User"
SET "reminderHours" = CASE
    WHEN "reminderHour" < 9  THEN "reminderHour" || ',13,20'
    WHEN "reminderHour" < 16 THEN '9,' || "reminderHour" || ',20'
    ELSE '9,13,' || "reminderHour"
END
WHERE "reminderHour" <> 19;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_kind_createdAt_idx" ON "Notification"("userId", "kind", "createdAt");
