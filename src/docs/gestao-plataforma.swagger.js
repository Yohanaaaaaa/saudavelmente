/**
 * @swagger
 * tags:
 *   - name: Conta
 *     description: Dados, senha e preferencias do usuario logado
 *   - name: Notificacoes
 *     description: Central de notificacoes
 *   - name: Area do Psicologo
 *     description: Painel, perfil, agenda, historico e financeiro
 *   - name: Suporte
 *     description: Central de chamados
 *   - name: Administracao
 *     description: Gestao de psicologos, pacientes, agendamentos e relatorios
 */

/**
 * @swagger
 * /agendamentos/{id}/confirmacao:
 *   get:
 *     summary: Dados da tela de confirmacao da consulta
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Resumo da consulta, orientacoes e politica de cancelamento
 *       403:
 *         description: Agendamento de outro usuario
 *
 * /agendamentos/{id}/cancelar:
 *   post:
 *     summary: Cancelar a consulta
 *     tags: [Agendamentos]
 *     description: >
 *       O paciente so cancela respeitando CANCELAMENTO_ANTECEDENCIA_HORAS.
 *       Psicologo e admin nao tem essa trava. Repasse pendente e cancelado junto.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo: { type: string }
 *     responses:
 *       200: { description: Agendamento cancelado }
 *       409: { description: Status nao permite cancelamento ou prazo estourado }
 *
 * /agendamentos/{id}/remarcar:
 *   post:
 *     summary: Remarcar a consulta para outro horario do mesmo psicologo
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data: { type: string, example: "2026-09-10" }
 *               inicio: { type: string, example: "14:00" }
 *               horario_atendimento: { type: string, format: date-time }
 *     responses:
 *       201: { description: Novo agendamento criado, o antigo vira REMARCADO }
 *       409: { description: Horario indisponivel ou prazo estourado }
 */

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Dados da conta logada
 *     tags: [Conta]
 *     responses:
 *       200: { description: Dados da conta }
 *   patch:
 *     summary: Atualizar dados pessoais
 *     tags: [Conta]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeCompleto: { type: string }
 *               celular: { type: string }
 *               cidade: { type: string }
 *               estado: { type: string }
 *               idade: { type: integer }
 *     responses:
 *       200: { description: Dados atualizados }
 *
 * /me/senha:
 *   patch:
 *     summary: Alterar a senha
 *     tags: [Conta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [novaSenha]
 *             properties:
 *               senhaAtual: { type: string }
 *               novaSenha: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Senha alterada }
 *       401: { description: Senha atual incorreta }
 *
 * /me/preferencias:
 *   patch:
 *     summary: Preferencias de comunicacao
 *     tags: [Conta]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificaEmail: { type: boolean }
 *               notificaWhatsapp: { type: boolean }
 *     responses:
 *       200: { description: Preferencias atualizadas }
 */

/**
 * @swagger
 * /auth/esqueci-senha:
 *   post:
 *     summary: Solicitar recuperacao de senha
 *     tags: [Auth]
 *     security: []
 *     description: >
 *       Responde sempre a mesma mensagem, exista ou nao o e-mail. O token vale
 *       60 minutos e vai pelo canal configurado em EMAIL_WEBHOOK_URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *               tipo: { type: string, enum: [PATIENT, THERAPIST], default: PATIENT }
 *     responses:
 *       200: { description: Instrucoes enviadas se o e-mail existir }
 *
 * /auth/redefinir-senha:
 *   post:
 *     summary: Criar a nova senha com o token recebido
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, novaSenha]
 *             properties:
 *               token: { type: string }
 *               novaSenha: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Senha redefinida }
 *       400: { description: Token invalido ou expirado }
 */

/**
 * @swagger
 * /notificacoes:
 *   get:
 *     summary: Notificacoes do usuario logado
 *     tags: [Notificacoes]
 *     parameters:
 *       - in: query
 *         name: lida
 *         schema: { type: boolean }
 *       - in: query
 *         name: tipo
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista paginada com o total de nao lidas }
 *
 * /notificacoes/nao-lidas:
 *   get:
 *     summary: Contador de notificacoes nao lidas
 *     tags: [Notificacoes]
 *     responses:
 *       200: { description: Quantidade de nao lidas }
 *
 * /notificacoes/lidas:
 *   patch:
 *     summary: Marcar todas como lidas
 *     tags: [Notificacoes]
 *     responses:
 *       200: { description: Notificacoes marcadas }
 *
 * /notificacoes/{id}/lida:
 *   patch:
 *     summary: Marcar uma notificacao como lida
 *     tags: [Notificacoes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Notificacao marcada }
 *       404: { description: Notificacao de outro usuario ou inexistente }
 */

/**
 * @swagger
 * /profissional/me:
 *   get:
 *     summary: Meu perfil profissional
 *     tags: [Area do Psicologo]
 *     responses:
 *       200: { description: Perfil completo do psicologo logado }
 *   put:
 *     summary: Atualizar o perfil profissional
 *     tags: [Area do Psicologo]
 *     description: >
 *       As mudancas refletem no catalogo e no perfil publico. Alterar o CRP
 *       zera a verificacao do registro. O slug e regerado a partir do nome.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeCompleto: { type: string }
 *               fotoUrl: { type: string }
 *               bio: { type: string }
 *               formacao: { type: string }
 *               abordagem_e_experiencia: { type: string }
 *               especialidades: { type: array, items: { type: string } }
 *               idiomas: { type: array, items: { type: string } }
 *               modalidades: { type: array, items: { type: string, enum: [ONLINE, PRESENCIAL] } }
 *               experienciaAnos: { type: integer }
 *               valorConsulta: { type: number }
 *               duracaoConsulta: { type: integer }
 *               cidade: { type: string }
 *               estado: { type: string }
 *               pix: { type: string }
 *     responses:
 *       200: { description: Perfil atualizado }
 *
 * /profissional/me/painel:
 *   get:
 *     summary: Painel do psicologo
 *     tags: [Area do Psicologo]
 *     responses:
 *       200:
 *         description: Agenda do dia, proximas consultas, resumo e financeiro
 *
 * /profissional/me/agenda:
 *   get:
 *     summary: Blocos de disponibilidade do periodo
 *     tags: [Area do Psicologo]
 *     parameters:
 *       - in: query
 *         name: de
 *         schema: { type: string, example: "2026-09-01" }
 *       - in: query
 *         name: ate
 *         schema: { type: string, example: "2026-09-30" }
 *     responses:
 *       200: { description: Blocos com a contagem de consultas marcadas }
 *
 * /profissional/me/agenda/recorrencia:
 *   post:
 *     summary: Gerar agenda repetindo um padrao semanal
 *     tags: [Area do Psicologo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [de, ate, dias]
 *             properties:
 *               de: { type: string, example: "2026-09-01" }
 *               ate: { type: string, example: "2026-10-31" }
 *               dias:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     diaSemana: { type: integer, minimum: 0, maximum: 6, description: "0 = domingo" }
 *                     startTime: { type: string, example: "09:00" }
 *                     endTime: { type: string, example: "12:00" }
 *     responses:
 *       201: { description: Blocos criados (duplicados sao ignorados) }
 *
 * /profissional/me/disponibilidades/{id}:
 *   patch:
 *     summary: Bloquear ou liberar um bloco da agenda
 *     tags: [Area do Psicologo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable: { type: boolean }
 *     responses:
 *       200: { description: Bloco atualizado }
 *       409: { description: Bloco com consulta marcada }
 *
 * /profissional/me/consultas:
 *   get:
 *     summary: Historico de consultas
 *     tags: [Area do Psicologo]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "CONFIRMADO,REALIZADO" }
 *       - in: query
 *         name: periodo
 *         schema: { type: string, enum: [futuras, passadas] }
 *       - in: query
 *         name: de
 *         schema: { type: string }
 *       - in: query
 *         name: ate
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista paginada de consultas }
 *
 * /profissional/me/consultas/{id}/presenca:
 *   patch:
 *     summary: Marcar a consulta como realizada ou como falta
 *     tags: [Area do Psicologo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [situacao]
 *             properties:
 *               situacao: { type: string, enum: [REALIZADO, FALTA] }
 *     responses:
 *       200: { description: Presenca registrada }
 *
 * /profissional/me/financeiro:
 *   get:
 *     summary: Repasses e valores da plataforma
 *     tags: [Area do Psicologo]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDENTE, PAGO, CANCELADO] }
 *     responses:
 *       200: { description: Totais a receber e recebido, com a lista de repasses }
 */

/**
 * @swagger
 * /suporte/tickets:
 *   post:
 *     summary: Abrir chamado
 *     tags: [Suporte]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assunto, descricao]
 *             properties:
 *               assunto: { type: string }
 *               descricao: { type: string }
 *               prioridade: { type: string, enum: [BAIXA, MEDIA, ALTA] }
 *               appointmentId: { type: integer }
 *     responses:
 *       201: { description: Chamado aberto }
 *   get:
 *     summary: Meus chamados
 *     tags: [Suporte]
 *     responses:
 *       200: { description: Lista paginada }
 *
 * /suporte/tickets/{id}:
 *   get:
 *     summary: Detalhe do chamado com o historico de mensagens
 *     tags: [Suporte]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Chamado }
 *       404: { description: Chamado de outro usuario ou inexistente }
 *
 * /suporte/tickets/{id}/mensagens:
 *   post:
 *     summary: Responder o chamado
 *     tags: [Suporte]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mensagem]
 *             properties:
 *               mensagem: { type: string }
 *               interna: { type: boolean, description: "Somente admin: nota interna" }
 *     responses:
 *       201: { description: Mensagem registrada }
 *
 * /admin/suporte/tickets:
 *   get:
 *     summary: Fila de chamados (equipe)
 *     tags: [Suporte]
 *     responses:
 *       200: { description: Lista paginada com o total em aberto }
 *
 * /admin/suporte/tickets/{id}/status:
 *   patch:
 *     summary: Mudar o status do chamado
 *     tags: [Suporte]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ABERTO, EM_ANDAMENTO, RESOLVIDO, FECHADO] }
 *     responses:
 *       200: { description: Chamado atualizado }
 */

/**
 * @swagger
 * /admin/psicologos:
 *   get:
 *     summary: Gestao de psicologos
 *     tags: [Administracao]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDENTE, APROVADO, REJEITADO] }
 *       - in: query
 *         name: ativo
 *         schema: { type: boolean }
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista paginada }
 *
 * /admin/psicologos/{id}:
 *   get:
 *     summary: Detalhe do psicologo com consultas por status e repasse pendente
 *     tags: [Administracao]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Detalhe }
 *
 * /admin/psicologos/{id}/status:
 *   patch:
 *     summary: Aprovar ou reprovar o cadastro
 *     tags: [Administracao]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDENTE, APROVADO, REJEITADO] }
 *               motivo: { type: string, description: "Obrigatorio ao rejeitar" }
 *     responses:
 *       200: { description: Status alterado, psicologo notificado }
 *
 * /admin/psicologos/{id}/ativo:
 *   patch:
 *     summary: Ativar ou desativar o psicologo
 *     tags: [Administracao]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ativo]
 *             properties:
 *               ativo: { type: boolean }
 *     responses:
 *       200: { description: Psicologo atualizado }
 *
 * /admin/pacientes/{id}:
 *   get:
 *     summary: Detalhe do paciente com historico e total pago
 *     tags: [Administracao]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Detalhe }
 *
 * /admin/agendamentos:
 *   get:
 *     summary: Todos os agendamentos, com filtros
 *     tags: [Administracao]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: de
 *         schema: { type: string }
 *       - in: query
 *         name: ate
 *         schema: { type: string }
 *       - in: query
 *         name: therapistId
 *         schema: { type: integer }
 *       - in: query
 *         name: patientId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista paginada }
 *
 * /admin/relatorios:
 *   get:
 *     summary: Indicadores da plataforma
 *     tags: [Administracao]
 *     parameters:
 *       - in: query
 *         name: de
 *         schema: { type: string }
 *       - in: query
 *         name: ate
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuarios, consultas por status, taxa de cancelamento e financeiro
 *
 * /admin/repasses:
 *   get:
 *     summary: Repasses aos psicologos
 *     tags: [Administracao]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDENTE, PAGO, CANCELADO] }
 *     responses:
 *       200: { description: Lista paginada }
 *
 * /admin/repasses/{id}/pagar:
 *   patch:
 *     summary: Marcar o repasse como pago
 *     tags: [Administracao]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Repasse pago }
 *       409: { description: Repasse ja pago }
 */
