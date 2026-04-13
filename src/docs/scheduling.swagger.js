/**
 * @swagger
 * components:
 *   schemas:
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 57
 *         totalPages:
 *           type: integer
 *           example: 6
 *         hasNextPage:
 *           type: boolean
 *           example: true
 *         hasPreviousPage:
 *           type: boolean
 *           example: false
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
 *     PaginatedSolicitationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitationResponse'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     AvailabilityDayItem:
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
 *     TherapistAvailabilityCreateRequest:
 *       oneOf:
 *         - $ref: '#/components/schemas/AvailabilityDayItem'
 *         - type: object
 *           required:
 *             - days
 *           properties:
 *             days:
 *               type: array
 *               minItems: 1
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityDayItem'
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
 *     PaginatedTherapistAvailabilityResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     AvailableProfessionalResponse:
 *       type: object
 *       properties:
 *         therapist:
 *           type: object
 *         availabilities:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TherapistAvailabilityResponse'
 *     PaginatedAvailableProfessionalResponse:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AvailableProfessionalResponse'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
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
 *     summary: Listar solicitacoes (com paginacao e filtros)
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: therapistId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de solicitacoes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSolicitationResponse'
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
 *     summary: Listar solicitacoes pendentes (com paginacao e filtros)
 *     tags: [Solicitacoes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: therapistId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de solicitacoes pendentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSolicitationResponse'
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
 *     summary: Criar disponibilidade (unitaria ou em lote por lista de dias)
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
 *   get:
 *     summary: Listar disponibilidades do profissional (com paginacao)
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Lista paginada de disponibilidades
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTherapistAvailabilityResponse'
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
 *     summary: Listar profissionais disponiveis por data (com paginacao)
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-05-10"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Profissionais e horarios disponiveis na data informada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedAvailableProfessionalResponse'
 *       400:
 *         description: date nao informada ou invalida
 */
