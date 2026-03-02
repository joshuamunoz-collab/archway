-- CreateTable
CREATE TABLE "system_preferences" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_preferences_pkey" PRIMARY KEY ("key")
);
