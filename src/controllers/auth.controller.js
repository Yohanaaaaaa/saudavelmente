const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

module.exports = {

  async register(req, res) {
    const { nome, email, senha, tipo } = req.body;

    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        tipo
      }
    });

    res.status(201).json(user);
  },
  /**
   * Cadastro simplificado do paciente (card P0 - Cadastro Simplificado).
   * Rota publica, pede so o essencial e ja devolve o token para o paciente
   * continuar de onde parou no agendamento (reservaId opcional).
   */
  async cadastro(req, res) {
    try {
      const {
        nomeCompleto,
        nome,
        email,
        senha,
        cpf,
        celular,
        idade,
        cidade,
        estado,
        reservaId
      } = req.body;

      const nomeFinal = nomeCompleto || nome;
      const faltando = [];

      if (!nomeFinal) faltando.push('nomeCompleto');
      if (!email) faltando.push('email');
      if (!senha) faltando.push('senha');
      if (!cpf) faltando.push('cpf');
      if (!celular) faltando.push('celular');

      if (faltando.length > 0) {
        return res.status(400).json({
          message: `Campos obrigatorios: ${faltando.join(', ')}.`
        });
      }

      if (String(senha).length < 6) {
        return res.status(400).json({
          message: 'A senha deve ter ao menos 6 caracteres.'
        });
      }

      const cpfLimpo = String(cpf).replace(/\D/g, '');

      const jaExiste = await prisma.patient.findFirst({
        where: { OR: [{ email }, { cpf: cpfLimpo }] }
      });

      if (jaExiste) {
        return res.status(409).json({
          message: jaExiste.email === email
            ? 'Ja existe uma conta com esse e-mail.'
            : 'Ja existe uma conta com esse CPF.'
        });
      }

      const senhaHash = await bcrypt.hash(String(senha), 10);

      const patient = await prisma.patient.create({
        data: {
          nomeCompleto: nomeFinal,
          email,
          cpf: cpfLimpo,
          celular,
          senha: senhaHash,
          idade: idade === undefined || idade === null ? null : Number(idade),
          cidade: cidade || null,
          estado: estado || null
        }
      });

      let reserva = null;

      if (reservaId) {
        const encontrada = await prisma.reserva.findUnique({
          where: { id: String(reservaId) }
        });

        if (
          encontrada &&
          encontrada.status === 'ATIVA' &&
          encontrada.expiresAt > new Date() &&
          !encontrada.patientId
        ) {
          reserva = await prisma.reserva.update({
            where: { id: encontrada.id },
            data: { patientId: patient.id }
          });
        }
      }

      const token = jwt.sign(
        {
          id: patient.id,
          tipo: 'PATIENT',
          nome: patient.nomeCompleto,
          nomeCompleto: patient.nomeCompleto,
          email: patient.email,
          celular: patient.celular
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(201).json({
        token,
        user: {
          id: patient.id,
          nome: patient.nomeCompleto,
          tipo: 'PATIENT',
          email: patient.email
        },
        reservaId: reserva ? reserva.id : null
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          message: 'Ja existe uma conta com esse e-mail ou CPF.'
        });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao criar cadastro.' });
    }
  },

  async login(req, res) {
    const { email, cpf, tipo } = req.body;

    let user;

    if (tipo === 'PATIENT') {
      user = await prisma.patient.findUnique({ where: { email } });
    } else if (tipo === 'THERAPIST') {
      user = await prisma.therapist.findUnique({ where: { email } });
    } else if (tipo === 'ADMIN') {
      user = await prisma.admin.findUnique({ where: { email } });
    } else {
      return res.status(400).json({ message: 'Tipo inválido' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // 👉 ADMIN valida por SENHA
    if (tipo === 'ADMIN') {
      if (user.senha !== cpf) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    }
    // 👉 Contas criadas pelo cadastro novo validam por senha
    else if (user.senha && req.body.senha) {
      const senhaConfere = await bcrypt.compare(req.body.senha, user.senha);

      if (!senhaConfere) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    }
    // 👉 Contas antigas continuam validando por CPF
    else {
      const clean = v => String(v).replace(/\D/g, '');
      if (clean(user.cpf) !== clean(cpf)) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    }

    const nome = user.nomeCompleto || user.nome || null;

    const token = jwt.sign(
      {
        id: user.id,
        tipo,
        nome,
        nomeCompleto: user.nomeCompleto || null,
        email: user.email || null,
        celular: user.celular || null
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome,
        tipo,
        email: user.email || null
      }
    });
  }

};
