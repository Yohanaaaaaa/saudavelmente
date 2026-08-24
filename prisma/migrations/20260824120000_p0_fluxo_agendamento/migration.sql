-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('ONLINE', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "StatusCadastro" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "ReservaStatus" AS ENUM ('ATIVA', 'CONVERTIDA', 'EXPIRADA', 'CANCELADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "AppointmentStatus" ADD VALUE 'CONFIRMADO';
ALTER TYPE "AppointmentStatus" ADD VALUE 'REMARCADO';
ALTER TYPE "AppointmentStatus" ADD VALUE 'REALIZADO';
ALTER TYPE "AppointmentStatus" ADD VALUE 'FALTA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRADO';
ALTER TYPE "PaymentStatus" ADD VALUE 'ESTORNADO';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "senha" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "idade" DROP NOT NULL,
ALTER COLUMN "cidade" DROP NOT NULL,
ALTER COLUMN "estado" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "duracaoConsulta" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "especialidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "experienciaAnos" INTEGER,
ADD COLUMN     "formacao" TEXT,
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "idiomas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "modalidades" "Modalidade"[] DEFAULT ARRAY[]::"Modalidade"[],
ADD COLUMN     "senha" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "statusCadastro" "StatusCadastro" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valorConsulta" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "availabilityId" INTEGER,
ADD COLUMN     "duracaoMinutos" INTEGER,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "modalidade" "Modalidade" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valor" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "copiaECola" TEXT,
ADD COLUMN     "expiraEm" TIMESTAMP(3),
ADD COLUMN     "externalCustomerId" TEXT,
ADD COLUMN     "externalOrderId" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3),
ADD COLUMN     "provedor" TEXT NOT NULL DEFAULT 'appmax',
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "taxaPlataforma" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valorProfissional" DOUBLE PRECISION,
ALTER COLUMN "status" SET DEFAULT 'PENDENTE',
ALTER COLUMN "metodo" SET DEFAULT 'PIX';

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "therapistId" INTEGER NOT NULL,
    "availabilityId" INTEGER,
    "data_atendimento" TEXT NOT NULL,
    "horario_atendimento" TIMESTAMP(3) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'ONLINE',
    "valor" DOUBLE PRECISION,
    "status" "ReservaStatus" NOT NULL DEFAULT 'ATIVA',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "patientId" INTEGER,
    "appointmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_appointmentId_key" ON "Reserva"("appointmentId");

-- CreateIndex
CREATE INDEX "Reserva_therapistId_horario_atendimento_idx" ON "Reserva"("therapistId", "horario_atendimento");

-- CreateIndex
CREATE INDEX "Reserva_status_expiresAt_idx" ON "Reserva"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Therapist_slug_key" ON "Therapist"("slug");

-- CreateIndex
CREATE INDEX "Appointment_therapistId_horario_atendimento_idx" ON "Appointment"("therapistId", "horario_atendimento");

-- CreateIndex
CREATE INDEX "Appointment_status_expiresAt_idx" ON "Appointment"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Payment_externalOrderId_idx" ON "Payment"("externalOrderId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "TherapistAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "TherapistAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: profissionais que ja existiam continuam visiveis no catalogo.
UPDATE "Therapist" SET "statusCadastro" = 'APROVADO' WHERE "statusCadastro" = 'PENDENTE';
