-- CreateIndex
CREATE INDEX "idx_city_notices_property" ON "city_notices"("property_id");

-- CreateIndex
CREATE INDEX "idx_documents_property" ON "documents"("property_id");

-- CreateIndex
CREATE INDEX "idx_documents_tenant" ON "documents"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_expenses_property_date" ON "expenses"("property_id", "date");

-- CreateIndex
CREATE INDEX "idx_expenses_bank_account" ON "expenses"("bank_account_id");

-- CreateIndex
CREATE INDEX "idx_expenses_bill" ON "expenses"("bill_id");

-- CreateIndex
CREATE INDEX "idx_inspections_property" ON "inspections"("property_id");

-- CreateIndex
CREATE INDEX "idx_insurance_policies_property" ON "insurance_policies"("property_id");

-- CreateIndex
CREATE INDEX "idx_payments_property_date" ON "payments"("property_id", "date");

-- CreateIndex
CREATE INDEX "idx_payments_lease" ON "payments"("lease_id");

-- CreateIndex
CREATE INDEX "idx_payments_bank_account" ON "payments"("bank_account_id");

-- CreateIndex
CREATE INDEX "idx_photos_property" ON "photos"("property_id");

-- CreateIndex
CREATE INDEX "idx_photos_rehab_project" ON "photos"("rehab_project_id");

-- CreateIndex
CREATE INDEX "idx_pm_bill_line_items_bill" ON "pm_bill_line_items"("bill_id");

-- CreateIndex
CREATE INDEX "idx_pm_bills_bank_account" ON "pm_bills"("bank_account_id");

-- CreateIndex
CREATE INDEX "idx_properties_vacant_since" ON "properties"("vacant_since");

-- CreateIndex
CREATE INDEX "idx_properties_status_vacant" ON "properties"("status", "vacant_since");

-- CreateIndex
CREATE INDEX "idx_property_taxes_property" ON "property_taxes"("property_id");

-- CreateIndex
CREATE INDEX "idx_rehab_projects_property" ON "rehab_projects"("property_id");

-- CreateIndex
CREATE INDEX "idx_user_profiles_email" ON "user_profiles"("email");
