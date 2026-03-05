-- CreateTable
CREATE TABLE "property_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "parcel_number" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "sqft" INTEGER,
    "lot_size" DECIMAL(10,2),
    "year_built" INTEGER,
    "zoning" TEXT,
    "assessed_value" DECIMAL(12,2),
    "ward" TEXT,
    "neighborhood" TEXT,
    "city_record_url" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "property_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_details_property_id_key" ON "property_details"("property_id");

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_details_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
