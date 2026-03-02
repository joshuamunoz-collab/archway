-- DropForeignKey
ALTER TABLE "pm_bill_messages" DROP CONSTRAINT "pm_bill_messages_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "pm_task_messages" DROP CONSTRAINT "pm_task_messages_task_id_fkey";

-- DropForeignKey
ALTER TABLE "rehab_milestones" DROP CONSTRAINT "rehab_milestones_rehab_project_id_fkey";

-- CreateIndex
CREATE INDEX "idx_leases_tenant" ON "leases"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_leases_property_status" ON "leases"("property_id", "status");

-- CreateIndex
CREATE INDEX "idx_pm_bill_messages_bill" ON "pm_bill_messages"("bill_id");

-- CreateIndex
CREATE INDEX "idx_pm_task_messages_task" ON "pm_task_messages"("task_id");

-- CreateIndex
CREATE INDEX "idx_pm_tasks_property" ON "pm_tasks"("property_id");

-- CreateIndex
CREATE INDEX "idx_pm_tasks_status" ON "pm_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_rehab_milestones_project" ON "rehab_milestones"("rehab_project_id");

-- AddForeignKey
ALTER TABLE "pm_bill_messages" ADD CONSTRAINT "pm_bill_messages_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "pm_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_messages" ADD CONSTRAINT "pm_task_messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehab_milestones" ADD CONSTRAINT "rehab_milestones_rehab_project_id_fkey" FOREIGN KEY ("rehab_project_id") REFERENCES "rehab_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
