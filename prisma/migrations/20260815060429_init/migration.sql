-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdVia" TEXT NOT NULL DEFAULT 'web',
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramChatId" TEXT,
    "linkCode" TEXT,
    "linkCodeExpires" TIMESTAMP(3),
    "dialectPreference" TEXT NOT NULL DEFAULT 'es-ES',
    "dailyTimeBudget" INTEGER NOT NULL DEFAULT 20,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHour" INTEGER NOT NULL DEFAULT 19,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentLevelCode" TEXT NOT NULL DEFAULT 'A1',
    "placementLevelCode" TEXT,
    "listeningScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speakingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "writingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vocabularyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "wordsLearned" INTEGER NOT NULL DEFAULT 0,
    "wordsMastered" INTEGER NOT NULL DEFAULT 0,
    "grammarMastered" INTEGER NOT NULL DEFAULT 0,
    "totalStudyMinutes" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "playerLevel" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "resumeLessonId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "canDo" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'BookOpen',
    "courseId" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 12,
    "explanation" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "culturalNote" TEXT,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPrerequisite" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "LessonPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonExample" (
    "id" TEXT NOT NULL,
    "spanish" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "note" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "lessonId" TEXT NOT NULL,

    CONSTRAINT "LessonExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "spanish" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "audioUrl" TEXT,
    "exampleSentence" TEXT NOT NULL,
    "exampleTranslation" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "levelCode" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "gender" TEXT,
    "pluralForm" TEXT,
    "frequencyRank" INTEGER,
    "region" TEXT,
    "regionalVariant" TEXT,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordRelation" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "WordRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonVocabulary" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "lessonId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,

    CONSTRAINT "LessonVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "lastReviewedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "whenToUse" TEXT NOT NULL,
    "formula" TEXT NOT NULL,

    CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarExample" (
    "id" TEXT NOT NULL,
    "spanish" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "note" TEXT,
    "realWorld" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "GrammarExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonMistake" (
    "id" TEXT NOT NULL,
    "wrong" TEXT NOT NULL,
    "right" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "CommonMistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarContrast" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "topicAId" TEXT NOT NULL,
    "labelA" TEXT NOT NULL,
    "topicBId" TEXT NOT NULL,
    "labelB" TEXT NOT NULL,

    CONSTRAINT "GrammarContrast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContrastRow" (
    "id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "sideA" TEXT NOT NULL,
    "sideB" TEXT NOT NULL,
    "exampleA" TEXT NOT NULL,
    "exampleB" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "contrastId" TEXT NOT NULL,

    CONSTRAINT "ContrastRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonGrammar" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "LessonGrammar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "lastPractisedAt" TIMESTAMP(3),

    CONSTRAINT "GrammarProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT NOT NULL DEFAULT 'practice',
    "lessonId" TEXT,
    "grammarTopicId" TEXT,
    "listeningId" TEXT,
    "readingId" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "context" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "acceptedAnswers" TEXT,
    "explanation" TEXT NOT NULL,
    "hint" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "orderIndex" INTEGER NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningExercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "speed" TEXT NOT NULL DEFAULT 'normal',
    "accent" TEXT NOT NULL DEFAULT 'Neutral',
    "region" TEXT NOT NULL DEFAULT 'es-ES',
    "audioUrl" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "intro" TEXT,
    "lessonId" TEXT,

    CONSTRAINT "ListeningExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningSegment" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "speaker" TEXT,
    "spanish" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listeningId" TEXT NOT NULL,

    CONSTRAINT "ListeningSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingText" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "translation" TEXT,
    "source" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 4,
    "intro" TEXT,
    "lessonId" TEXT,

    CONSTRAINT "ReadingText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingGlossaryEntry" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "note" TEXT,
    "readingId" TEXT NOT NULL,

    CONSTRAINT "ReadingGlossaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingPrompt" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "targetText" TEXT,
    "focusSounds" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'respond',
    "lessonId" TEXT,

    CONSTRAINT "SpeakingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT,
    "transcript" TEXT NOT NULL,
    "audioUrl" TEXT,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pronunciationScore" DOUBLE PRECISION NOT NULL,
    "vocabularyScore" DOUBLE PRECISION NOT NULL,
    "grammarScore" DOUBLE PRECISION NOT NULL,
    "fluencyScore" DOUBLE PRECISION NOT NULL,
    "structureScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT NOT NULL,
    "evaluatedBy" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingPrompt" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "minWords" INTEGER NOT NULL DEFAULT 40,
    "maxWords" INTEGER NOT NULL DEFAULT 150,
    "targetStructures" TEXT,
    "lessonId" TEXT,

    CONSTRAINT "WritingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "grammarScore" DOUBLE PRECISION NOT NULL,
    "vocabularyScore" DOUBLE PRECISION NOT NULL,
    "structureScore" DOUBLE PRECISION NOT NULL,
    "coherenceScore" DOUBLE PRECISION NOT NULL,
    "naturalnessScore" DOUBLE PRECISION NOT NULL,
    "spellingScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "improvedVersion" TEXT,
    "feedback" TEXT NOT NULL,
    "evaluatedBy" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "corrected" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'important',
    "speakingAttemptId" TEXT,
    "writingAttemptId" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'web',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "translation" TEXT,
    "audioUrl" TEXT,
    "coaching" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakePattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "exampleWrong" TEXT,
    "exampleRight" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "severity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "grammarTopicId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MistakePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "currentSection" TEXT NOT NULL DEFAULT 'explanation',
    "completedSections" TEXT NOT NULL DEFAULT '',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "studyMinutes" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "lessonId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "quizResultId" TEXT,
    "givenAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSeconds" INTEGER NOT NULL DEFAULT 0,
    "usedHint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DailySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 3,
    "orderIndex" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "lessonId" TEXT,
    "grammarTopicId" TEXT,
    "wordId" TEXT,

    CONSTRAINT "DailySessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "targetXp" INTEGER NOT NULL DEFAULT 50,
    "minutesDone" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "achieved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Award',
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'telegram',
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementQuestion" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "context" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "acceptedAnswers" TEXT,
    "explanation" TEXT NOT NULL,
    "audioText" TEXT,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "PlacementQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "PlacementOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estimatedLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vocabularyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listeningScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "constructionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speakingScore" DOUBLE PRECISION,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "recommendedModuleSlug" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultureNote" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "place" TEXT,

    CONSTRAINT "CultureNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "tutorRole" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'MessageCircle',
    "usefulPhrases" TEXT NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_linkCode_key" ON "User"("linkCode");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_levelId_idx" ON "Course"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_slug_key" ON "Module"("slug");

-- CreateIndex
CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPrerequisite_lessonId_prerequisiteId_key" ON "LessonPrerequisite"("lessonId", "prerequisiteId");

-- CreateIndex
CREATE INDEX "LessonExample_lessonId_idx" ON "LessonExample"("lessonId");

-- CreateIndex
CREATE INDEX "VocabularyWord_levelCode_topic_idx" ON "VocabularyWord"("levelCode", "topic");

-- CreateIndex
CREATE INDEX "VocabularyWord_frequencyRank_idx" ON "VocabularyWord"("frequencyRank");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyWord_spanish_levelCode_key" ON "VocabularyWord"("spanish", "levelCode");

-- CreateIndex
CREATE UNIQUE INDEX "WordRelation_sourceId_targetId_kind_key" ON "WordRelation"("sourceId", "targetId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "LessonVocabulary_lessonId_wordId_key" ON "LessonVocabulary"("lessonId", "wordId");

-- CreateIndex
CREATE INDEX "VocabularyProgress_userId_dueAt_idx" ON "VocabularyProgress"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "VocabularyProgress_userId_status_idx" ON "VocabularyProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyProgress_userId_wordId_key" ON "VocabularyProgress"("userId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarTopic_slug_key" ON "GrammarTopic"("slug");

-- CreateIndex
CREATE INDEX "GrammarTopic_levelCode_idx" ON "GrammarTopic"("levelCode");

-- CreateIndex
CREATE INDEX "GrammarExample_topicId_idx" ON "GrammarExample"("topicId");

-- CreateIndex
CREATE INDEX "CommonMistake_topicId_idx" ON "CommonMistake"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarContrast_slug_key" ON "GrammarContrast"("slug");

-- CreateIndex
CREATE INDEX "ContrastRow_contrastId_idx" ON "ContrastRow"("contrastId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonGrammar_lessonId_topicId_key" ON "LessonGrammar"("lessonId", "topicId");

-- CreateIndex
CREATE INDEX "GrammarProgress_userId_status_idx" ON "GrammarProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarProgress_userId_topicId_key" ON "GrammarProgress"("userId", "topicId");

-- CreateIndex
CREATE INDEX "Exercise_lessonId_idx" ON "Exercise"("lessonId");

-- CreateIndex
CREATE INDEX "Exercise_grammarTopicId_idx" ON "Exercise"("grammarTopicId");

-- CreateIndex
CREATE INDEX "Question_exerciseId_idx" ON "Question"("exerciseId");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningExercise_slug_key" ON "ListeningExercise"("slug");

-- CreateIndex
CREATE INDEX "ListeningExercise_levelCode_idx" ON "ListeningExercise"("levelCode");

-- CreateIndex
CREATE INDEX "ListeningSegment_listeningId_idx" ON "ListeningSegment"("listeningId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingText_slug_key" ON "ReadingText"("slug");

-- CreateIndex
CREATE INDEX "ReadingText_levelCode_idx" ON "ReadingText"("levelCode");

-- CreateIndex
CREATE INDEX "ReadingGlossaryEntry_readingId_idx" ON "ReadingGlossaryEntry"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingPrompt_slug_key" ON "SpeakingPrompt"("slug");

-- CreateIndex
CREATE INDEX "SpeakingPrompt_levelCode_idx" ON "SpeakingPrompt"("levelCode");

-- CreateIndex
CREATE INDEX "SpeakingAttempt_userId_createdAt_idx" ON "SpeakingAttempt"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WritingPrompt_slug_key" ON "WritingPrompt"("slug");

-- CreateIndex
CREATE INDEX "WritingPrompt_levelCode_idx" ON "WritingPrompt"("levelCode");

-- CreateIndex
CREATE INDEX "WritingAttempt_userId_createdAt_idx" ON "WritingAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MistakePattern_userId_severity_idx" ON "MistakePattern"("userId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "MistakePattern_userId_patternKey_key" ON "MistakePattern"("userId", "patternKey");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_status_idx" ON "LessonProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "QuizResult_userId_createdAt_idx" ON "QuizResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_questionId_idx" ON "QuestionAttempt"("userId", "questionId");

-- CreateIndex
CREATE INDEX "DailySession_userId_date_idx" ON "DailySession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySession_userId_date_key" ON "DailySession"("userId", "date");

-- CreateIndex
CREATE INDEX "DailySessionItem_sessionId_idx" ON "DailySessionItem"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyGoal_userId_date_key" ON "DailyGoal"("userId", "date");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlacementQuestion_section_levelCode_idx" ON "PlacementQuestion"("section", "levelCode");

-- CreateIndex
CREATE INDEX "PlacementOption_questionId_idx" ON "PlacementOption"("questionId");

-- CreateIndex
CREATE INDEX "PlacementResult_userId_createdAt_idx" ON "PlacementResult"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CultureNote_slug_key" ON "CultureNote"("slug");

-- CreateIndex
CREATE INDEX "CultureNote_levelCode_idx" ON "CultureNote"("levelCode");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_slug_key" ON "Scenario"("slug");

-- CreateIndex
CREATE INDEX "Scenario_levelCode_idx" ON "Scenario"("levelCode");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPrerequisite" ADD CONSTRAINT "LessonPrerequisite_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPrerequisite" ADD CONSTRAINT "LessonPrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonExample" ADD CONSTRAINT "LessonExample_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarExample" ADD CONSTRAINT "GrammarExample_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonMistake" ADD CONSTRAINT "CommonMistake_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarContrast" ADD CONSTRAINT "GrammarContrast_topicAId_fkey" FOREIGN KEY ("topicAId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarContrast" ADD CONSTRAINT "GrammarContrast_topicBId_fkey" FOREIGN KEY ("topicBId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContrastRow" ADD CONSTRAINT "ContrastRow_contrastId_fkey" FOREIGN KEY ("contrastId") REFERENCES "GrammarContrast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonGrammar" ADD CONSTRAINT "LessonGrammar_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonGrammar" ADD CONSTRAINT "LessonGrammar_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarProgress" ADD CONSTRAINT "GrammarProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarProgress" ADD CONSTRAINT "GrammarProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_grammarTopicId_fkey" FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_listeningId_fkey" FOREIGN KEY ("listeningId") REFERENCES "ListeningExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "ReadingText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningExercise" ADD CONSTRAINT "ListeningExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningSegment" ADD CONSTRAINT "ListeningSegment_listeningId_fkey" FOREIGN KEY ("listeningId") REFERENCES "ListeningExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingText" ADD CONSTRAINT "ReadingText_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingGlossaryEntry" ADD CONSTRAINT "ReadingGlossaryEntry_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "ReadingText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingPrompt" ADD CONSTRAINT "SpeakingPrompt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingAttempt" ADD CONSTRAINT "SpeakingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingAttempt" ADD CONSTRAINT "SpeakingAttempt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "SpeakingPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPrompt" ADD CONSTRAINT "WritingPrompt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAttempt" ADD CONSTRAINT "WritingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAttempt" ADD CONSTRAINT "WritingAttempt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "WritingPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_speakingAttemptId_fkey" FOREIGN KEY ("speakingAttemptId") REFERENCES "SpeakingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_writingAttemptId_fkey" FOREIGN KEY ("writingAttemptId") REFERENCES "WritingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ConversationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakePattern" ADD CONSTRAINT "MistakePattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_quizResultId_fkey" FOREIGN KEY ("quizResultId") REFERENCES "QuizResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySession" ADD CONSTRAINT "DailySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySessionItem" ADD CONSTRAINT "DailySessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DailySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySessionItem" ADD CONSTRAINT "DailySessionItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySessionItem" ADD CONSTRAINT "DailySessionItem_grammarTopicId_fkey" FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySessionItem" ADD CONSTRAINT "DailySessionItem_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyGoal" ADD CONSTRAINT "DailyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementOption" ADD CONSTRAINT "PlacementOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PlacementQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementResult" ADD CONSTRAINT "PlacementResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
