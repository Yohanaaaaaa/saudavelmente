const express = require('express');

const app = express();
app.use(express.json());

module.exports = app;

const authController = require('./controllers/auth.controller');
//const patientController = require('./controllers/patient.controller');
const therapistController = require('./controllers/therapist.controller');
const appointmentController = require('./controllers/appointment.controller');
const adminController = require('./controllers/admin.controller');

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

//app.post('/pacientes', patientController.create);
//app.get('/pacientes', patientController.list);

app.post('/profissionais', therapistController.create);
app.get('/profissionais', therapistController.list);

app.post('/atendimentos', appointmentController.create);
//app.get('/atendimentos', appointmentController.list);
app.get('/atendimentos/pendentes', appointmentController.listPending);

app.get('/admin/solicitacoes', adminController.listSolicitations);
app.get('/admin/atendimentos', adminController.listAppointments);
app.get('/admin/profissionais', adminController.listTherapists);
app.get('/admin/pacientes', adminController.listPatients);

module.exports = app;