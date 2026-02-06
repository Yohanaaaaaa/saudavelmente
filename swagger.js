const swaggerJsdoc = require("swagger-jsdoc");

module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API",
      version: "1.0.0",
    },
    servers: [{ url: process.env.BASE_URL || "https://api.saudavelmente.app.br"   }],
  },
  apis: ["./src/app.js"],
});
