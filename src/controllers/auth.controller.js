const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    // 👉 Outros validam por CPF
    else {
      const clean = v => String(v).replace(/\D/g, '');
      if (clean(user.cpf) !== clean(cpf)) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        tipo,
        nomeCompleto: user.nomeCompleto,
        email: user.email,
        celular: user.celular
      },
      'secret_key',
      { expiresIn: '1d' }
    );

    res.json({ token });
  }

};
