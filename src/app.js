const express = require('express');
const cors = require("cors")
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swagger");


const app = express();
app.use(cors())
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authController = require('./controllers/auth.controller');
const therapistController = require('./controllers/therapist.controller');
const patientController = require('./controllers/patient.controller');
const appointmentController = require('./controllers/appointment.controller');
const adminController = require('./controllers/admin.controller');
const paymentController = require('./controllers/payment.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthRegister:
 *       type: object
 *       required: [nome, email, senha, tipo]
 *       properties:
 *         nome: { type: string, example: "João Silva" }
 *         email: { type: string, example: "joao@email.com" }
 *         senha: { type: string, example: "123456" }
 *         tipo: { type: string, example: "PACIENTE" }
 *     AuthLogin:
 *       type: object
 *       required:
 *         - email
 *         - cpf
 *         - tipo
 *       properties:
 *         email:
 *           type: string
 *           example: "user@email.com"
 *         cpf:
 *           type: string
 *           example: "12345678900"
 *         tipo:
 *           type: string
 *           enum:
 *             - PATIENT
 *             - THERAPIST
 *           example: "PATIENT"
 *     PatientCreate:
 *       type: object
 *       required: [nomeCompleto, email, cpf, celular, idade, cidade, estado]
 *       properties:
 *         nomeCompleto: { type: string, example: "Maria Souza" }
 *         email: { type: string, example: "maria@email.com" }
 *         cpf: { type: string, example: "123.456.789-00" }
 *         celular: { type: string, example: "5598999999999" }
 *         idade: { type: integer, example: 22 }
 *         cidade: { type: string, example: "São Luís" }
 *         estado: { type: string, example: "MA" }
 *     TherapistCreate:
 *       type: object
 *       required: [nomeCompleto, email, celular, horarioDisponivel, numero_registro, abordagem_e_experiencia, pix]
 *       properties:
 *         nomeCompleto: { type: string, example: "Dra. Ana Lima" }
 *         email: { type: string, example: "ana@email.com" }
 *         celular: { type: string, example: "5598999999999" }
 *         horarioDisponivel: { type: string, example: "Seg-Sex 18:00-21:00" }
 *         numero_registro: { type: string, example: "CRP 00/00000" }
 *         abordagem_e_experiencia: { type: string, example: "TCC, 5 anos de experiência..." }
 *         pix: { type: string, example: "chave-pix@email.com" }
 *         cpf: { type: string, example: "123.456.789-00" }
 *     AppointmentCreate:
 *       type: object
 *       required: [descricao, horario_atendimento, therapistId, patientId]
 *       properties:
 *         descricao: { type: string, example: "Ansiedade e estresse" }
 *         horario_atendimento: { type: string, example: "2026-02-01T14:00:00.000Z" }
 *         therapistId: { type: integer, example: 1 }
 *         patientId: { type: integer, example: 10 }
 *         tipo_atendimento: { type: string, example: "SOCIAL" }
 */


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       201:
 *         description: Usuário criado
 *       400:
 *         description: Usuário já existe
 */
app.post('/auth/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login (retorna token JWT)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Token gerado
 *       400:
 *         description: Tipo de usuário inválido
 *       401:
 *         description: Credenciais inválidas
 */
app.post('/auth/login', authController.login);

/**
 * @swagger
 * /pacientes:
 *   post:
 *     summary: Criar paciente
 *     tags: [Pacientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientCreate'
 *     responses:
 *       201:
 *         description: Paciente criado
 */
app.post('/pacientes', patientController.create);

/**
 * @swagger
 * /pacientes:
 *   get:
 *     summary: Listar pacientes
 *     tags: [Pacientes]
 *     responses:
 *       200:
 *         description: Lista de pacientes
 */
app.get('/pacientes', patientController.list);

/**
 * @swagger
 * /pacientes/{id}:
 *   get:
 *     summary: Buscar paciente por ID
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do paciente
 *       404:
 *         description: Paciente não encontrado
 */
app.get('/pacientes/:id', patientController.findById);


/**
 * @swagger
 * /profissionais:
 *   post:
 *     summary: Criar profissional (terapeuta)
 *     tags: [Profissionais]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TherapistCreate'
 *     responses:
 *       201:
 *         description: Profissional criado
 */
app.post('/profissionais', therapistController.create);

/**
 * @swagger
 * /profissionais:
 *   get:
 *     summary: Listar profissionais
 *     tags: [Profissionais]
 *     responses:
 *       200:
 *         description: Lista de profissionais
 */
app.get('/profissionais', therapistController.list);

/**
 * @swagger
 * /profissionais/{id}:
 *   get:
 *     summary: Buscar profissional por ID
 *     tags: [Profissionais]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do profissional
 *       404:
 *         description: Profissional não encontrado
 */
app.get('/profissionais/:id', therapistController.findById);

/**
 * @swagger
 * /atendimentos:
 *   post:
 *     summary: Criar atendimento (status inicial PENDENTE)
 *     tags: [Atendimentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentCreate'
 *     responses:
 *       201:
 *         description: Atendimento criado
 */
app.post('/atendimentos', appointmentController.create);

/**
 * @swagger
 * /atendimentos/pendentes:
 *   get:
 *     summary: Listar atendimentos pendentes
 *     tags: [Atendimentos]
 *     responses:
 *       200:
 *         description: Lista de atendimentos pendentes
 */
app.get('/atendimentos/pendentes', appointmentController.listPending);


/**
 * @swagger
 * /admin/solicitacoes:
 *   get:
 *     summary: Listar solicitações pendentes (status PENDENTE)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de solicitações
 */
app.get('/admin/solicitacoes', adminController.listSolicitations);

/**
 * @swagger
 * /admin/atendimentos:
 *   get:
 *     summary: Listar todos os atendimentos (inclui pagamento)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de atendimentos
 */
app.get('/admin/atendimentos', adminController.listAppointments);

/**
 * @swagger
 * /admin/profissionais:
 *   get:
 *     summary: Listar todos os profissionais
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de profissionais
 */
app.get('/admin/profissionais', adminController.listTherapists);

/**
 * @swagger
 * /admin/pacientes:
 *   get:
 *     summary: Listar todos os pacientes (users tipo PACIENTE)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de pacientes
 */
app.get('/admin/pacientes', adminController.listPatients);

/**
 * @swagger
 * /pay:
 *   post:
 *     summary: Gerar pagamento PIX
 *     tags: [Pagamento]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metodo
 *               - nome
 *               - email
 *               - telefone
 *               - cpf
 *             properties:
 *               metodo:
 *                 type: string
 *                 example: pix
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@email.com
 *               telefone:
 *                 type: string
 *                 example: 5598999999999
 *               cpf:
 *                 type: string
 *                 example: 31150286016
 *     responses:
 *       201:
 *         description: PIX gerado com sucesso
 *       400:
 *         description: Dados inválidos ou erro ao criar pedido
 *       500:
 *         description: Erro interno ao gerar pagamento
 */
app.post('/pay', paymentController.pay);

/**
 * @swagger
 * /pay/status/{orderId}:
 *   get:
 *     summary: Verificar status do pagamento
 *     tags: [Pagamento]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status do pagamento retornado
 *       400:
 *         description: orderId não fornecido
 *       500:
 *         description: Erro interno
 */
app.get('/pay/status/:orderId', paymentController.checkPaymentStatus);


/**
 * @swagger
 * /dashboard/paciente/{pacienteid}:
 *   get:
 *     summary: Dashboard do paciente
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: pacienteid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do dashboard retornados
 *       404:
 *         description: Paciente não encontrado
 */
app.get('/dashboard/paciente/:pacienteid', patientController.dashboardPaciente);

/**
 * @swagger
 * /dashboard/profissional/{profissionalid}:
 *   get:
 *     summary: Dashboard do profissional
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: profissionalid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do dashboard retornados
 *       404:
 *         description: Profissional não encontrado
 */
app.get('/dashboard/profissional/:profissionalid', therapistController.dashboardProfissional);

/**
 * @swagger
 * /profissional/{therapistid}:
 *   put:
 *     summary: Atualizar profissional
 *     tags: [Profissional]
 *     parameters:
 *       - in: path
 *         name: therapistid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profissional atualizado
 *       404:
 *         description: Profissional não encontrado
 */
app.put('/profissional/:therapistid', therapistController.updateByTherapist);

/**
 * @swagger
 * /paciente/{patientid}:
 *   put:
 *     summary: Atualizar paciente
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: patientid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Paciente atualizado
 *       404:
 *         description: Paciente não encontrado
 */
app.put('/paciente/:patientid', patientController.updateByPatient);


module.exports = app;
