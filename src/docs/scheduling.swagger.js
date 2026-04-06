/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentStatus:
 *       type: object
 *       required:
 *         - code
 *         - description
 *       properties:
 *         code:
 *           type: string
 *           enum:
 *             - PENDENTE
 *             - APROVADO
 *             - RECUSADO
 *             - CANCELADO
 *         description:
 *           type: string
 *           example: "Solicitacao aguardando analise do profissional."
 *     SolicitationCreateRequest:
 *       type: object
 *       required:
 *         - descricao
 *         - horario_atendimento
 *         - therapistId
 *         - patientId
 *       properties:
 *         descricao:
 *           type: string
 *           example: "Sessao inicial"
 *         horario_atendimento:
 *           type: string
 *           format: date-time
 *           example: "2026-05-10T14:00:00.000Z"
 *         data_atendimento:
 *           type: string
 *           example: "2026-05-10"
 *         therapistId:
 *           type: integer
 *           example: 2
 *         patientId:
 *           type: integer
 *           example: 10
 *     SolicitationUpdateRequest:
 *       type: object
 *       properties:
 *         descricao:
 *           type: string
 *         horario_atendimento:
 *           type: string
 *           format: date-time
 *         data_atendimento:
 *           type: string
 *           example: "2026-05-12"
 *         therapistId:
 *           type: integer
 *         patientId:
 *           type: integer
 *         status:
 *           oneOf:
 *             - type: string
 *               enum:
 *                 - PENDENTE
 *                 - APROVADO
 *                 - RECUSADO
 *                 - CANCELADO
 *             - $ref: '#/components/schemas/AppointmentStatus'
 *     SolicitationResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         descricao:
 *           type: string
 *         horario_atendimento:
 *           type: string
 *           format: date-time
 *         data_atendimento:
 *           type: string
 *           example: "2026-05-10"
 *         status:
 *           $ref: '#/components/schemas/AppointmentStatus'
 *         patientId:
 *           type: integer
 *         therapistId:
 *           type: integer
 *         patient:
 *           type: object
 *         therapist:
 *           type: object
 *         payment:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *     TherapistAvailabilityCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - startTime
 *         - endTime
 *       properties:
 *         date:
 *           type: string
 *           example: "2026-05-10"
 *         startTime:
 *           type: string
 *           example: "14:00"
 *         endTime:
 *           type: string
 *           example: "15:00"
 *         isAvailable:
 *           type: boolean
 *           default: true
 *     TherapistAvailabilityUpdateRequest:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           example: "2026-05-10"
 *         startTime:
 *           type: string
 *           example: "16:00"
 *         endTime:
 *           type: string
 *           example: "17:00"
 *         isAvailable:
 *           type: boolean
 *         therapistId:
 *           type: integer
 *     TherapistAvailabilityResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         therapistId:
 *           type: integer
 *         date:
 *           type: string
 *           example: "2026-05-10"
 *         startTime:
 *           type: string
 *           example: "14:00"
 *         endTime:
 *           type: string
 *           example: "15:00"
 *         isAvailable:
 *           type: boolean
 *         therapist:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 * /solicitacoes:
 *   post:
 *     summary: Criar solicitacao de agendamento
 *     tags: [Solicitacoes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SolicitationCreateRequest'
 *     responses:
 *       201:
 *         description: Solicitacao criada com status pendente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SolicitationResponse'
 *       400:
 *         description: Dados invalidos
 *   get:
 *     summary: Listar solicitacoes
 *     tags: [Solicitacoes]
 *     responses:
 *       200:
 *         description: Lista de solicitacoes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SolicitationResponse'
 *
 * /solicitacoes/{id}:
 *   get:
 *     summary: Buscar solicitacao por ID
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Solicitacao encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SolicitationResponse'
 *       404:
 *         description: Solicitacao nao encontrada
 *   put:
 *     summary: Atualizar solicitacao
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SolicitationUpdateRequest'
 *     responses:
 *       200:
 *         description: Solicitacao atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SolicitationResponse'
 *   delete:
 *     summary: Deletar solicitacao
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Solicitacao removida
 *
 * /solicitacoes/pendentes:
 *   get:
 *     summary: Listar solicitacoes pendentes
 *     tags: [Solicitacoes]
 *     responses:
 *       200:
 *         description: Lista de solicitacoes pendentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SolicitationResponse'
 *
 * /solicitacoes/{id}/aprovar:
 *   patch:
 *     summary: Aprovar solicitacao
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Solicitacao aprovada
 *       404:
 *         description: Solicitacao nao encontrada
 *
 * /solicitacoes/{id}/recusar:
 *   patch:
 *     summary: Recusar solicitacao
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Solicitacao recusada
 *       404:
 *         description: Solicitacao nao encontrada
 *
 * /profissionais/{therapistId}/disponibilidades:
 *   post:
 *     summary: Criar disponibilidade para um profissional
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: therapistId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TherapistAvailabilityCreateRequest'
 *     responses:
 *       201:
 *         description: Disponibilidade criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *   get:
 *     summary: Listar disponibilidades do profissional
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: therapistId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: "2026-05-10"
 *         description: Filtro opcional por data (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de disponibilidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *
 * /disponibilidades/{id}:
 *   get:
 *     summary: Buscar disponibilidade por ID
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *       404:
 *         description: Disponibilidade nao encontrada
 *   put:
 *     summary: Atualizar disponibilidade
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TherapistAvailabilityUpdateRequest'
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *   delete:
 *     summary: Deletar disponibilidade
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Disponibilidade removida
 *
 * /profissionais/disponiveis:
 *   get:
 *     summary: Listar profissionais disponiveis por data
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-05-10"
 *     responses:
 *       200:
 *         description: Profissionais e horarios disponiveis na data informada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                 professionals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       therapist:
 *                         type: object
 *                       availabilities:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *       400:
 *         description: date nao informada ou invalida
 */
