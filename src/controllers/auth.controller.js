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
    const { email, senha } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, tipo: user.tipo },
      'secret_key',
      { expiresIn: '1d' }
    );

    res.json({ token });
  }
};
