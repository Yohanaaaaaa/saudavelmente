-- CreateEnum
CREATE TYPE "UsuarioTipo" AS ENUM ('PATIENT', 'THERAPIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "NotificationTipo" AS ENUM ('AGENDAMENTO_CRIADO', 'AGENDAMENTO_CONFIRMADO', 'AGENDAMENTO_CANCELADO', 'AGENDAMENTO_REMARCADO', 'PAGAMENTO_CONFIRMADO', 'CADASTRO_APROVADO', 'CADASTRO_REJEITADO', 'SUPORTE_ATUALIZADO', 'SENHA_ALTERADA');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO');

-- CreateEnum
CREATE TYPE "TicketPrioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "notificaEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificaWhatsapp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "motivoRejeicao" TEXT,
ADD COLUMN     "notificaEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificaWhatsapp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoPor" TEXT,
ADD COLUMN     "motivoCancelamento" TEXT,
ADD COLUMN     "realizadoEm" TIMESTAMP(3),
ADD COLUMN     "remarcadoDeId" INTEGER;

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDENTE',
    "previsaoData" TIMESTAMP(3) NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "therapistId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "destinatarioTipo" "UsuarioTipo" NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "tipo" "NotificationTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "payload" JSONB,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "appointmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "usuarioTipo" "UsuarioTipo" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
    "prioridade" "TicketPrioridade" NOT NULL DEFAULT 'MEDIA',
    "solicitanteTipo" "UsuarioTipo" NOT NULL,
    "solicitanteId" INTEGER NOT NULL,
    "solicitanteNome" TEXT NOT NULL,
    "appointmentId" INTEGER,
    "resolvidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "autorTipo" "UsuarioTipo" NOT NULL,
    "autorId" INTEGER NOT NULL,
    "autorNome" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "interna" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_paymentId_key" ON "Payout"("paymentId");

-- CreateIndex
CREATE INDEX "Payout_therapistId_status_idx" ON "Payout"("therapistId", "status");

-- CreateIndex
CREATE INDEX "Notification_destinatarioTipo_destinatarioId_lida_idx" ON "Notification"("destinatarioTipo", "destinatarioId", "lida");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usuarioTipo_usuarioId_idx" ON "PasswordResetToken"("usuarioTipo", "usuarioId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_solicitanteTipo_solicitanteId_idx" ON "SupportTicket"("solicitanteTipo", "solicitanteId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_remarcadoDeId_key" ON "Appointment"("remarcadoDeId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_horario_atendimento_idx" ON "Appointment"("patientId", "horario_atendimento");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_remarcadoDeId_fkey" FOREIGN KEY ("remarcadoDeId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

