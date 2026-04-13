/**
 * @swagger
 * components:
 *   schemas:
 *     AuthLoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             nome:
 *               type: string
 *               example: "Joao da Silva"
 *             tipo:
 *               type: string
 *               example: "PATIENT"
 *             email:
 *               type: string
 *               example: "joao@email.com"
 *     PaginatedPatientsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             type: object
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     PaginatedTherapistsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             type: object
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *
 * /auth/login:
 *   post:
 *     security: []
 *     responses:
 *       200:
 *         description: Login realizado com token e dados do usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *
 * /pacientes:
 *   get:
 *     summary: Listar pacientes com paginacao
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Lista paginada de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPatientsResponse'
 *
 * /profissionais:
 *   get:
 *     summary: Listar profissionais com paginacao
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Lista paginada de profissionais
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTherapistsResponse'
 *
 * /atendimentos:
 *   get:
 *     summary: Listar atendimentos com paginacao e filtros
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
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
 *         description: Lista paginada de atendimentos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSolicitationResponse'
 *
 * /atendimentos/pendentes:
 *   get:
 *     summary: Listar atendimentos pendentes com paginacao e filtros
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
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
 *         description: Lista paginada de atendimentos pendentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSolicitationResponse'
 *
 * /admin/solicitacoes:
 *   get:
 *     summary: Listar solicitacoes pendentes com paginacao e filtros
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
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
 * /admin/atendimentos:
 *   get:
 *     summary: Listar atendimentos com paginacao e filtros
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
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
 *         description: Lista paginada de atendimentos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSolicitationResponse'
 *
 * /admin/profissionais:
 *   get:
 *     summary: Listar profissionais com paginacao
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de profissionais
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTherapistsResponse'
 *
 * /admin/pacientes:
 *   get:
 *     summary: Listar pacientes com paginacao
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPatientsResponse'
 */
