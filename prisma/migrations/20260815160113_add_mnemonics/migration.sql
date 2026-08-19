-- CreateTable
CREATE TABLE "Mnemonic" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "imagery" TEXT,
    "explanation" TEXT,
    "keyword" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'curated',
    "wordId" TEXT,
    "grammarTopicId" TEXT,
    "userId" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mnemonic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MnemonicRating" (
    "id" TEXT NOT NULL,
    "mnemonicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MnemonicRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mnemonic_wordId_idx" ON "Mnemonic"("wordId");

-- CreateIndex
CREATE INDEX "Mnemonic_grammarTopicId_idx" ON "Mnemonic"("grammarTopicId");

-- CreateIndex
CREATE INDEX "Mnemonic_userId_idx" ON "Mnemonic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MnemonicRating_mnemonicId_userId_key" ON "MnemonicRating"("mnemonicId", "userId");

-- AddForeignKey
ALTER TABLE "Mnemonic" ADD CONSTRAINT "Mnemonic_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mnemonic" ADD CONSTRAINT "Mnemonic_grammarTopicId_fkey" FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mnemonic" ADD CONSTRAINT "Mnemonic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MnemonicRating" ADD CONSTRAINT "MnemonicRating_mnemonicId_fkey" FOREIGN KEY ("mnemonicId") REFERENCES "Mnemonic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MnemonicRating" ADD CONSTRAINT "MnemonicRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
