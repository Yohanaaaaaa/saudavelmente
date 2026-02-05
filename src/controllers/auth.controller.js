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
    user = await prisma.patient.findUnique({
      where: { email }
    });
  } else if (tipo === 'THERAPIST') {
    user = await prisma.therapist.findUnique({
      where: { email }
    });
  } else {
    return res.status(400).json({ message: 'Tipo de usuário inválido' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const cpfValido = user.cpf == cpf;

  if (!cpfValido) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, tipo },
    'secret_key',
    { expiresIn: '1d' }
  );

  res.json({ token });
}

};
