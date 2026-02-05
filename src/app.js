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
 *         horario_atendimento: { type: string, example: "2026-01-30T19:00:00" }
 *         therapistId: { type: integer, example: 1 }
 *         patientId: { type: integer, example: 10 }
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

app.post('/appointments/:appointmentId/pay', paymentController.pay);
app.get('/dashboard/paciente/:pacienteid',patientController.dashboardPatient);
app.put('/profissional/:therapistid',therapistController.updateByTherapist);
app.put('/paciente/:patientid',patientController.updateByPatient);

module.exports = app;
