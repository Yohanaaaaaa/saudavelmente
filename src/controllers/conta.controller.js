const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { notificar } = require('../services/notificacao.service');

const prisma = new PrismaClient();

const MINUTOS_TOKEN = 60;

function modeloPorTipo(tipo) {
  switch (String(tipo || '').toUpperCase()) {
    case 'PATIENT':
      return prisma.patient;
    case 'THERAPIST':
      return prisma.therapist;
    case 'ADMIN':
      return prisma.admin;
    default:
      return null;
  }
}

function gerarTokenBruto() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function serializeConta(usuario, tipo) {
  return {
    id: usuario.id,
    tipo,
    nome: usuario.nomeCompleto || usuario.nome,
    email: usuario.email,
    celular: usuario.celular || null,
    cidade: usuario.cidade || null,
    estado: usuario.estado || null,
    idade: usuario.idade === undefined ? null : usuario.idade,
    temSenha: Boolean(usuario.senha),
    preferencias: {
      notificaEmail: usuario.notificaEmail,
      notificaWhatsapp: usuario.notificaWhatsapp
    }
  };
}

module.exports = {
  /**
   * Dados da conta do usuario logado (card P1 - Configuracoes da Conta).
   */
  async meusDados(req, res) {
    const tipo = String(req.user?.tipo || '').toUpperCase();
    const modelo = modeloPorTipo(tipo);

    if (!modelo) {
      return res.status(400).json({ message: 'Tipo de usuario invalido.' });
    }

    try {
      const usuario = await modelo.findUnique({ where: { id: Number(req.user.id) } });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario nao encontrado.' });
      }

      return res.json(serializeConta(usuario, tipo));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar conta.' });
    }
  },

  async atualizarDados(req, res) {
    const tipo = String(req.user?.tipo || '').toUpperCase();

    if (!['PATIENT', 'THERAPIST'].includes(tipo)) {
      return res.status(403).json({
        message: 'Somente paciente e psicologo editam os dados por aqui.'
      });
    }

    const data = {};
    const permitidos = tipo === 'PATIENT'
      ? ['nomeCompleto', 'celular', 'cidade', 'estado', 'idade']
      : ['nomeCompleto', 'celular', 'cidade', 'estado'];

    for (const campo of permitidos) {
      if (req.body[campo] === undefined) continue;

      if (campo === 'idade') {
        const idade = Number(req.body.idade);
        if (!Number.isInteger(idade) || idade < 0 || idade > 130) {
          return res.status(400).json({ message: 'Idade invalida.' });
        }
        data.idade = idade;
        continue;
      }

      data[campo] = req.body[campo];
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    try {
      const usuario = await modeloPorTipo(tipo).update({
        where: { id: Number(req.user.id) },
        data
      });

      return res.json({
        message: 'Dados atualizados.',
        conta: serializeConta(usuario, tipo)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar dados.' });
    }
  },

  async atualizarPreferencias(req, res) {
    const tipo = String(req.user?.tipo || '').toUpperCase();

    if (!['PATIENT', 'THERAPIST'].includes(tipo)) {
      return res.status(403).json({
        message: 'Preferencias disponiveis para paciente e psicologo.'
      });
    }

    const data = {};
    if (req.body.notificaEmail !== undefined) {
      data.notificaEmail = Boolean(req.body.notificaEmail);
    }
    if (req.body.notificaWhatsapp !== undefined) {
      data.notificaWhatsapp = Boolean(req.body.notificaWhatsapp);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: 'Informe notificaEmail e/ou notificaWhatsapp.'
      });
    }

    try {
      const usuario = await modeloPorTipo(tipo).update({
        where: { id: Number(req.user.id) },
        data
      });

      return res.json({
        message: 'Preferencias atualizadas.',
        preferencias: {
          notificaEmail: usuario.notificaEmail,
          notificaWhatsapp: usuario.notificaWhatsapp
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar preferencias.' });
    }
  },

  async alterarSenha(req, res) {
    const tipo = String(req.user?.tipo || '').toUpperCase();

    if (!['PATIENT', 'THERAPIST'].includes(tipo)) {
      return res.status(403).json({
        message: 'Troca de senha disponivel para paciente e psicologo.'
      });
    }

    const { senhaAtual, novaSenha } = req.body || {};

    if (!novaSenha || String(novaSenha).length < 6) {
      return res.status(400).json({
        message: 'A nova senha deve ter ao menos 6 caracteres.'
      });
    }

    try {
      const modelo = modeloPorTipo(tipo);
      const usuario = await modelo.findUnique({ where: { id: Number(req.user.id) } });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario nao encontrado.' });
      }

      if (usuario.senha) {
        const confere = senhaAtual
          ? await bcrypt.compare(String(senhaAtual), usuario.senha)
          : false;

        if (!confere) {
          return res.status(401).json({ message: 'Senha atual incorreta.' });
        }
      }

      await modelo.update({
        where: { id: usuario.id },
        data: { senha: await bcrypt.hash(String(novaSenha), 10) }
      });

      await notificar(prisma, {
        destinatarioTipo: tipo,
        destinatarioId: usuario.id,
        tipo: 'SENHA_ALTERADA',
        titulo: 'Senha alterada',
        mensagem: 'A senha da sua conta foi alterada. Se nao foi voce, fale com o suporte.',
        contato: {
          nome: usuario.nomeCompleto,
          email: usuario.email,
          celular: usuario.celular,
          notificaEmail: usuario.notificaEmail,
          notificaWhatsapp: usuario.notificaWhatsapp
        }
      });

      return res.json({ message: 'Senha alterada.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao alterar senha.' });
    }
  },

  /**
   * Recuperacao de senha (card P1 - Recuperacao de Senha).
   * A resposta e sempre generica para nao revelar quais e-mails existem.
   */
  async esqueciSenha(req, res) {
    const { email } = req.body || {};
    const tipo = String(req.body?.tipo || 'PATIENT').toUpperCase();

    const respostaPadrao = {
      message: 'Se o e-mail estiver cadastrado, enviamos as instrucoes de recuperacao.'
    };

    if (!email) {
      return res.status(400).json({ message: 'Informe o e-mail.' });
    }

    const modelo = modeloPorTipo(tipo);
    if (!modelo || tipo === 'ADMIN') {
      return res.status(400).json({ message: 'Tipo invalido. Use PATIENT ou THERAPIST.' });
    }

    try {
      const usuario = await modelo.findUnique({ where: { email } });

      if (!usuario) {
        return res.json(respostaPadrao);
      }

      const tokenBruto = gerarTokenBruto();

      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { usuarioTipo: tipo, usuarioId: usuario.id, usadoEm: null },
          data: { usadoEm: new Date() }
        }),
        prisma.passwordResetToken.create({
          data: {
            usuarioTipo: tipo,
            usuarioId: usuario.id,
            email,
            tokenHash: hashToken(tokenBruto),
            expiresAt: new Date(Date.now() + MINUTOS_TOKEN * 60000)
          }
        })
      ]);

      const link = `${process.env.APP_URL || 'https://saudavelmente.app.br'}/redefinir-senha?token=${tokenBruto}`;

      await notificar(prisma, {
        destinatarioTipo: tipo,
        destinatarioId: usuario.id,
        tipo: 'SENHA_ALTERADA',
        titulo: 'Recuperacao de senha',
        mensagem: `Use o link para criar uma nova senha. Ele vale por ${MINUTOS_TOKEN} minutos.`,
        payload: { link, expiraEmMinutos: MINUTOS_TOKEN },
        contato: {
          nome: usuario.nomeCompleto,
          email: usuario.email,
          celular: usuario.celular,
          notificaEmail: true,
          notificaWhatsapp: usuario.notificaWhatsapp
        }
      });

      // Facilita os testes automatizados em ambiente controlado.
      if (process.env.EXPOR_TOKEN_RECUPERACAO === 'true') {
        return res.json({ ...respostaPadrao, token: tokenBruto });
      }

      return res.json(respostaPadrao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao iniciar recuperacao.' });
    }
  },

  async redefinirSenha(req, res) {
    const { token, novaSenha } = req.body || {};

    if (!token || !novaSenha) {
      return res.status(400).json({ message: 'Informe token e novaSenha.' });
    }

    if (String(novaSenha).length < 6) {
      return res.status(400).json({
        message: 'A nova senha deve ter ao menos 6 caracteres.'
      });
    }

    try {
      const registro = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) }
      });

      if (!registro || registro.usadoEm || registro.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Token invalido ou expirado.' });
      }

      const modelo = modeloPorTipo(registro.usuarioTipo);

      await prisma.$transaction([
        modelo.update({
          where: { id: registro.usuarioId },
          data: { senha: await bcrypt.hash(String(novaSenha), 10) }
        }),
        prisma.passwordResetToken.update({
          where: { id: registro.id },
          data: { usadoEm: new Date() }
        })
      ]);

      return res.json({ message: 'Senha redefinida. Faca login com a nova senha.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao redefinir senha.' });
    }
  }
};
