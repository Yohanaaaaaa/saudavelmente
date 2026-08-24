/**
 * @swagger
 * tags:
 *   - name: Catalogo
 *     description: Vitrine publica de psicologos (cards P0 de catalogo e perfil)
 *   - name: Reservas
 *     description: Reserva temporaria do horario antes do cadastro
 *   - name: Pagamentos
 *     description: Cobranca PIX do agendamento
 *
 * components:
 *   schemas:
 *     PsicologoPublico:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 3 }
 *         slug: { type: string, example: "ana-souza" }
 *         nome: { type: string, example: "Ana Souza" }
 *         foto: { type: string, nullable: true }
 *         crp: { type: string, example: "CRP 22/12345" }
 *         crpVerificado: { type: boolean }
 *         bio: { type: string, nullable: true }
 *         formacao: { type: string, nullable: true }
 *         abordagem: { type: string, nullable: true }
 *         especialidades:
 *           type: array
 *           items: { type: string }
 *           example: ["Ansiedade", "Depressao"]
 *         idiomas:
 *           type: array
 *           items: { type: string }
 *         modalidades:
 *           type: array
 *           items: { type: string, enum: [ONLINE, PRESENCIAL] }
 *         experienciaAnos: { type: integer, nullable: true }
 *         valorConsulta: { type: number, format: float, example: 110 }
 *         duracaoConsulta: { type: integer, example: 50 }
 *         cidade: { type: string, nullable: true }
 *         estado: { type: string, nullable: true }
 *     SlotDisponivel:
 *       type: object
 *       properties:
 *         inicio: { type: string, example: "09:00" }
 *         fim: { type: string, example: "09:50" }
 *         horario: { type: string, format: date-time, example: "2026-09-02T09:00:00.000Z" }
 *         availabilityId: { type: integer }
 *         duracaoMinutos: { type: integer, example: 50 }
 *     DiaDisponivel:
 *       type: object
 *       properties:
 *         date: { type: string, example: "2026-09-02" }
 *         slots:
 *           type: array
 *           items: { $ref: '#/components/schemas/SlotDisponivel' }
 *     Reserva:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         status: { type: string, enum: [ATIVA, CONVERTIDA, EXPIRADA, CANCELADA] }
 *         data: { type: string, example: "2026-09-02" }
 *         horario: { type: string, format: date-time }
 *         duracaoMinutos: { type: integer }
 *         modalidade: { type: string, enum: [ONLINE, PRESENCIAL] }
 *         valor: { type: number, format: float }
 *         expiresAt: { type: string, format: date-time }
 *         segundosRestantes: { type: integer, example: 840 }
 *         psicologo: { $ref: '#/components/schemas/PsicologoPublico' }
 *     PagamentoPix:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         status: { type: string, enum: [PENDENTE, PAGO, CANCELADO, EXPIRADO, ESTORNADO] }
 *         metodo: { type: string, example: "PIX" }
 *         valor: { type: number, format: float }
 *         qrCode: { type: string, nullable: true }
 *         copiaECola: { type: string, nullable: true }
 *         expiraEm: { type: string, format: date-time, nullable: true }
 *         pagoEm: { type: string, format: date-time, nullable: true }
 *         orderId: { type: string, nullable: true }
 */

/**
 * @swagger
 * /publico/psicologos:
 *   get:
 *     summary: Catalogo publico de psicologos
 *     tags: [Catalogo]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 12, maximum: 50 }
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *         description: Busca por nome, bio, formacao, abordagem ou especialidade
 *       - in: query
 *         name: especialidade
 *         schema: { type: string }
 *       - in: query
 *         name: modalidade
 *         schema: { type: string, enum: [ONLINE, PRESENCIAL] }
 *       - in: query
 *         name: precoMin
 *         schema: { type: number }
 *       - in: query
 *         name: precoMax
 *         schema: { type: number }
 *       - in: query
 *         name: ordenar
 *         schema: { type: string, enum: [nome, preco, preco_desc, recentes] }
 *     responses:
 *       200:
 *         description: Lista paginada de psicologos aprovados e ativos
 */

/**
 * @swagger
 * /publico/psicologos/especialidades:
 *   get:
 *     summary: Especialidades cadastradas (para montar o filtro)
 *     tags: [Catalogo]
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de especialidades distintas
 */

/**
 * @swagger
 * /publico/psicologos/{idOrSlug}:
 *   get:
 *     summary: Perfil completo do psicologo com os proximos 14 dias de agenda
 *     tags: [Catalogo]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema: { type: string }
 *         description: Aceita o id numerico ou o slug
 *     responses:
 *       200:
 *         description: Perfil publico
 *       404:
 *         description: Psicologo nao encontrado
 */

/**
 * @swagger
 * /publico/psicologos/{idOrSlug}/horarios:
 *   get:
 *     summary: Horarios livres do psicologo
 *     tags: [Catalogo]
 *     security: []
 *     description: >
 *       Quebra os blocos de disponibilidade em slots do tamanho da consulta e
 *       remove o que ja esta ocupado por agendamento ou reserva ativa.
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: de
 *         schema: { type: string, example: "2026-09-01" }
 *       - in: query
 *         name: ate
 *         schema: { type: string, example: "2026-09-30" }
 *     responses:
 *       200:
 *         description: Dias com os horarios disponiveis
 *       400:
 *         description: Periodo invalido
 */

/**
 * @swagger
 * /publico/reservas:
 *   post:
 *     summary: Reservar um horario por alguns minutos (antes do cadastro)
 *     tags: [Reservas]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [therapistId, data, inicio]
 *             properties:
 *               therapistId:
 *                 oneOf: [{ type: integer }, { type: string }]
 *                 description: Id ou slug do psicologo
 *               data: { type: string, example: "2026-09-02" }
 *               inicio: { type: string, example: "09:00" }
 *               horario_atendimento:
 *                 type: string
 *                 format: date-time
 *                 description: Alternativa a data + inicio
 *               modalidade: { type: string, enum: [ONLINE, PRESENCIAL] }
 *     responses:
 *       201:
 *         description: Horario reservado
 *       404:
 *         description: Psicologo nao encontrado
 *       409:
 *         description: Horario indisponivel ou ja reservado
 */

/**
 * @swagger
 * /publico/reservas/{id}:
 *   get:
 *     summary: Consultar a reserva e o tempo restante
 *     tags: [Reservas]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dados da reserva
 *       404:
 *         description: Reserva nao encontrada
 *   delete:
 *     summary: Cancelar a reserva (paciente voltou atras no fluxo)
 *     tags: [Reservas]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reserva cancelada
 *       409:
 *         description: Reserva nao esta ativa
 */

/**
 * @swagger
 * /auth/cadastro:
 *   post:
 *     summary: Cadastro simplificado do paciente
 *     tags: [Auth]
 *     security: []
 *     description: >
 *       Cria a conta com o minimo de dados e ja devolve o token. Se receber
 *       reservaId, vincula a reserva ao paciente para ele continuar de onde parou.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nomeCompleto, email, senha, cpf, celular]
 *             properties:
 *               nomeCompleto: { type: string, example: "Maria Silva" }
 *               email: { type: string, example: "maria@email.com" }
 *               senha: { type: string, minLength: 6 }
 *               cpf: { type: string, example: "12345678900" }
 *               celular: { type: string, example: "98999998888" }
 *               idade: { type: integer, nullable: true }
 *               cidade: { type: string, nullable: true }
 *               estado: { type: string, nullable: true }
 *               reservaId: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Conta criada, token retornado
 *       400:
 *         description: Campos obrigatorios faltando
 *       409:
 *         description: E-mail ou CPF ja cadastrado
 */

/**
 * @swagger
 * /reservas/{id}/confirmar:
 *   post:
 *     summary: Transformar a reserva em agendamento aguardando pagamento
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descricao: { type: string, example: "Primeira consulta" }
 *     responses:
 *       201:
 *         description: Agendamento criado com status AGUARDANDO_PAGAMENTO
 *       403:
 *         description: Reserva de outro paciente
 *       409:
 *         description: Reserva expirada ou horario ocupado
 */

/**
 * @swagger
 * /agendamentos/{appointmentId}/pagamento:
 *   post:
 *     summary: Gerar a cobranca PIX do agendamento
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Cobranca gerada
 *       409:
 *         description: Agendamento ja pago ou em status que nao aceita pagamento
 *       422:
 *         description: Psicologo sem valor de consulta configurado
 *       502:
 *         description: Falha na comunicacao com o provedor
 *   get:
 *     summary: Consultar o status do pagamento
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Status atual; quando pago, confirma o agendamento
 *       404:
 *         description: Nenhuma cobranca gerada
 */

/**
 * @swagger
 * /webhooks/appmax:
 *   post:
 *     summary: Webhook de confirmacao de pagamento da Appmax
 *     tags: [Pagamentos]
 *     security: []
 *     description: >
 *       Caminho principal de confirmacao. Protegido por APPMAX_WEBHOOK_SECRET
 *       quando a variavel esta definida (header x-webhook-secret).
 *     responses:
 *       200:
 *         description: Evento recebido
 *       401:
 *         description: Assinatura invalida
 */
