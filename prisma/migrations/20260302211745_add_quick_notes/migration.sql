-- CreateTable
CREATE TABLE "quick_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "content_html" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "author_id" UUID NOT NULL,
    "task_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quick_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_note_properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "note_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "mention_text" TEXT NOT NULL,

    CONSTRAINT "quick_note_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_quick_notes_author" ON "quick_notes"("author_id");

-- CreateIndex
CREATE INDEX "idx_quick_notes_task" ON "quick_notes"("task_id");

-- CreateIndex
CREATE INDEX "idx_quick_notes_category" ON "quick_notes"("category");

-- CreateIndex
CREATE INDEX "idx_quick_note_properties_note" ON "quick_note_properties"("note_id");

-- CreateIndex
CREATE INDEX "idx_quick_note_properties_property" ON "quick_note_properties"("property_id");

-- AddForeignKey
ALTER TABLE "quick_notes" ADD CONSTRAINT "quick_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_notes" ADD CONSTRAINT "quick_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_note_properties" ADD CONSTRAINT "quick_note_properties_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "quick_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_note_properties" ADD CONSTRAINT "quick_note_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
