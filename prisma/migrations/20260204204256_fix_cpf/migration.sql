/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `Therapist` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "cpf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Therapist_cpf_key" ON "Therapist"("cpf");
