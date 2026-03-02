-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "address_formatted" TEXT,
ADD COLUMN     "google_place_id" TEXT,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ADD COLUMN     "parent_property_id" UUID,
ADD COLUMN     "street_name" TEXT,
ADD COLUMN     "street_number" TEXT,
ADD COLUMN     "unit_designator" TEXT;

-- CreateIndex
CREATE INDEX "idx_properties_parent" ON "properties"("parent_property_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_parent_property_id_fkey" FOREIGN KEY ("parent_property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
