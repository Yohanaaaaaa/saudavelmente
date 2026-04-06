-- Add enum value to support explicit refusal flow in solicitations
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'RECUSADO';

-- CreateTable
CREATE TABLE "TherapistAvailability" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "therapistId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapistAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapistAvailability_therapistId_date_idx" ON "TherapistAvailability"("therapistId", "date");

-- CreateIndex
CREATE INDEX "TherapistAvailability_date_isAvailable_idx" ON "TherapistAvailability"("date", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "TherapistAvailability_therapistId_date_startTime_endTime_key"
ON "TherapistAvailability"("therapistId", "date", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "TherapistAvailability"
ADD CONSTRAINT "TherapistAvailability_therapistId_fkey"
FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
