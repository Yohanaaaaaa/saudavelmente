const express = require('express');
const cors = require("cors")
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swagger");


const app = express();
app.use(cors())
app.use(express.json());
app.use(require('./middlewares/sanitize.middleware'));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authController = require('./controllers/auth.controller');
const therapistController = require('./controllers/therapist.controller');
const patientController = require('./controllers/patient.controller');
const appointmentController = require('./controllers/appointment.controller');
const adminController = require('./controllers/admin.controller');
const paymentController = require('./controllers/payment.controller');
const availabilityController = require('./controllers/availability.controller');
const catalogoController = require('./controllers/catalogo.controller');
const reservaController = require('./controllers/reserva.controller');
const pagamentoController = require('./controllers/pagamento.controller');
const agendamentoFluxoController = require('./controllers/agendamento-fluxo.controller');
const contaController = require('./controllers/conta.controller');
const notificacaoController = require('./controllers/notificacao.controller');
const profissionalController = require('./controllers/profissional.controller');
const adminGestaoController = require('./controllers/admin-gestao.controller');
const suporteController = require('./controllers/suporte.controller');
const authMiddleware = require('./middlewares/auth.middleware');
const { requireTipo } = require('./middlewares/role.middleware');

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
 *           example: "123.456.789-00"
 *         tipo:
 *           type: string
 *           enum:
 *             - PATIENT
 *             - THERAPIST
 *             - ADMIN
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
 *     security:
 *       - bearerAuth: []
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
app.post('/auth/register', authMiddleware, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login (retorna token JWT)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Token gerado com dados basicos do usuario
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
 *     description: Rota publica (nao requer Bearer token).
 *     security: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     description: Rota publica (nao requer Bearer token).
 *     security: []
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

/* ------------------------------------------------------------------ *
 * Fluxo publico de agendamento (cards P0)
 * Documentado em src/docs/agendamento-publico.swagger.js
 * ------------------------------------------------------------------ */

// Catalogo e perfil publico do psicologo
app.get('/publico/psicologos', catalogoController.listar);
app.get('/publico/psicologos/especialidades', catalogoController.especialidades);
app.get('/publico/psicologos/:idOrSlug', catalogoController.perfil);
app.get('/publico/psicologos/:idOrSlug/horarios', catalogoController.horarios);

// Reserva temporaria do horario, feita antes do cadastro
app.post('/publico/reservas', reservaController.criar);
app.get('/publico/reservas/:id', reservaController.obter);
app.delete('/publico/reservas/:id', reservaController.cancelar);

// Cadastro simplificado do paciente
app.post('/auth/cadastro', authController.cadastro);

// Recuperacao de senha
app.post('/auth/esqueci-senha', contaController.esqueciSenha);
app.post('/auth/redefinir-senha', contaController.redefinirSenha);

// Webhook do provedor de pagamento
app.post('/webhooks/appmax', pagamentoController.webhook);

app.use(authMiddleware);

/* ------------------------------------------------------------------ *
 * Fluxo autenticado de agendamento (cards P0)
 * ------------------------------------------------------------------ */
app.post(
  '/reservas/:id/confirmar',
  requireTipo('PATIENT'),
  reservaController.confirmar
);
app.post(
  '/agendamentos/:appointmentId/pagamento',
  requireTipo('PATIENT', 'ADMIN'),
  pagamentoController.criar
);
app.get(
  '/agendamentos/:appointmentId/pagamento',
  pagamentoController.status
);

/* ------------------------------------------------------------------ *
 * Cards P1
 * Documentado em src/docs/gestao-plataforma.swagger.js
 * ------------------------------------------------------------------ */

// Confirmacao, cancelamento e remarcacao
app.get('/agendamentos/:id/confirmacao', agendamentoFluxoController.confirmacao);
app.post('/agendamentos/:id/cancelar', agendamentoFluxoController.cancelar);
app.post('/agendamentos/:id/remarcar', agendamentoFluxoController.remarcar);

// Configuracoes da conta
app.get('/me', contaController.meusDados);
app.patch('/me', contaController.atualizarDados);
app.patch('/me/senha', contaController.alterarSenha);
app.patch('/me/preferencias', contaController.atualizarPreferencias);

// Central de notificacoes
app.get('/notificacoes', notificacaoController.listar);
app.get('/notificacoes/nao-lidas', notificacaoController.contarNaoLidas);
app.patch('/notificacoes/lidas', notificacaoController.marcarTodasLidas);
app.patch('/notificacoes/:id/lida', notificacaoController.marcarLida);

// Area do psicologo: painel, perfil, agenda, historico e financeiro
app.get('/profissional/me', requireTipo('THERAPIST'), profissionalController.meuPerfil);
app.put('/profissional/me', requireTipo('THERAPIST'), profissionalController.atualizarPerfil);
app.get('/profissional/me/painel', requireTipo('THERAPIST'), profissionalController.painel);
app.get('/profissional/me/agenda', requireTipo('THERAPIST'), profissionalController.minhaAgenda);
app.post(
  '/profissional/me/agenda/recorrencia',
  requireTipo('THERAPIST'),
  profissionalController.criarRecorrencia
);
app.patch(
  '/profissional/me/disponibilidades/:id',
  requireTipo('THERAPIST'),
  profissionalController.alternarDisponibilidade
);
app.get(
  '/profissional/me/consultas',
  requireTipo('THERAPIST'),
  profissionalController.minhasConsultas
);
app.patch(
  '/profissional/me/consultas/:id/presenca',
  requireTipo('THERAPIST'),
  profissionalController.registrarPresenca
);
app.get(
  '/profissional/me/financeiro',
  requireTipo('THERAPIST'),
  profissionalController.financeiro
);

// Central de suporte
app.post('/suporte/tickets', requireTipo('PATIENT', 'THERAPIST'), suporteController.criar);
app.get('/suporte/tickets', requireTipo('PATIENT', 'THERAPIST'), suporteController.meusTickets);
app.get('/suporte/tickets/:id', suporteController.detalhar);
app.post('/suporte/tickets/:id/mensagens', suporteController.responder);
app.get('/admin/suporte/tickets', requireTipo('ADMIN'), suporteController.listarParaAdmin);
app.patch(
  '/admin/suporte/tickets/:id/status',
  requireTipo('ADMIN'),
  suporteController.alterarStatus
);

// Gestao administrativa
app.get('/admin/psicologos', requireTipo('ADMIN'), adminGestaoController.listarPsicologos);
app.get('/admin/psicologos/:id', requireTipo('ADMIN'), adminGestaoController.detalharPsicologo);
app.patch(
  '/admin/psicologos/:id/status',
  requireTipo('ADMIN'),
  adminGestaoController.alterarStatusCadastro
);
app.patch(
  '/admin/psicologos/:id/ativo',
  requireTipo('ADMIN'),
  adminGestaoController.alterarAtivo
);
app.get('/admin/pacientes/:id', requireTipo('ADMIN'), adminGestaoController.detalharPaciente);
app.get('/admin/agendamentos', requireTipo('ADMIN'), adminGestaoController.listarAgendamentos);
app.get('/admin/relatorios', requireTipo('ADMIN'), adminGestaoController.relatorios);
app.get('/admin/repasses', requireTipo('ADMIN'), adminGestaoController.listarRepasses);
app.patch('/admin/repasses/:id/pagar', requireTipo('ADMIN'), adminGestaoController.pagarRepasse);

/**
 * @swagger
 * /profissionais:
 *   get:
 *     summary: Listar profissionais
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de profissionais
 */
app.get('/profissionais', therapistController.list);
app.get('/profissionais/disponiveis', availabilityController.listAvailableProfessionalsByDate);
app.post('/profissionais/:therapistId/disponibilidades', availabilityController.create);
app.get('/profissionais/:therapistId/disponibilidades', availabilityController.listByTherapist);
app.get('/disponibilidades/:id', availabilityController.findById);
app.put('/disponibilidades/:id', availabilityController.update);
app.delete('/disponibilidades/:id', availabilityController.delete);

/**
 * @swagger
 * /profissionais/{id}:
 *   get:
 *     summary: Buscar profissional por ID
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
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
app.post('/solicitacoes', appointmentController.create);
app.get('/solicitacoes', appointmentController.list);
app.get('/solicitacoes/pendentes', appointmentController.listPending);
app.get('/solicitacoes/:id', appointmentController.getById);
app.put('/solicitacoes/:id', appointmentController.update);
app.delete('/solicitacoes/:id', appointmentController.delete);
app.patch('/solicitacoes/:id/aprovar', appointmentController.approve);
app.patch('/solicitacoes/:id/recusar', appointmentController.reject);

/**
 * @swagger
 * /atendimentos:
 *   post:
 *     summary: Criar atendimento (status inicial PENDENTE)
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
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
app.get('/atendimentos', appointmentController.list);

/**
 * @swagger
 * /atendimentos/pendentes:
 *   get:
 *     summary: Listar atendimentos pendentes
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de atendimentos pendentes
 */
app.get('/atendimentos/pendentes', appointmentController.listPending);
app.get('/atendimentos/:id', appointmentController.getById);
app.patch('/atendimentos/:id/aprovar', appointmentController.approve);
app.patch('/atendimentos/:id/recusar', appointmentController.reject);


/**
 * @swagger
 * /atendimentos/{id}:
 *   put:
 *     summary: Atualizar atendimento
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               horario_atendimento:
 *                 type: string
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Atendimento atualizado
 *       500:
 *         description: Erro interno
 */
app.put('/atendimentos/:id', appointmentController.update);


/**
 * @swagger
 * /atendimentos/{id}:
 *   delete:
 *     summary: Deletar atendimento
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: Integer
 *     responses:
 *       204:
 *         description: Atendimento deletado
 *       404:
 *         description: Atendimento não encontrado
 *       500:
 *         description: Erro interno
 */
app.delete('/atendimentos/:id', appointmentController.delete);


/**
 * @swagger
 * /admin/solicitacoes:
 *   get:
 *     summary: Listar solicitações pendentes (status PENDENTE)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
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
 * /profissional/{therapistid}:
 *   delete:
 *     summary: Deletar profissional
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: therapistid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Profissional deletado
 *       404:
 *         description: Profissional não encontrado
 *       500:
 *         description: Erro interno
 */
app.delete('/profissional/:therapistid', therapistController.delete);

/**
 * @swagger
 * /paciente/{patientid}:
 *   put:
 *     summary: Atualizar paciente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /paciente/{patientid}:
 *   delete:
 *     summary: Deletar paciente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Paciente deletado
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno
 */
app.delete('/paciente/:patientid', patientController.delete);


module.exports = app;
