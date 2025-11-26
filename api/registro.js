// api/registro.js
// 🚀 Endpoint POST para registrar datos de cliente potencial
// Datos recibidos: nombre, email, producto
// Los guarda en un JSON local simulando una BD real

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { nombre, email, producto } = req.body;

    // Validación básica
    if (!nombre || !email || !producto) {
      return res.status(400).json({ mensaje: "Faltan datos requeridos" });
    }

    // Ruta del archivo de datos
    const filePath = path.join(process.cwd(), 'clientes.json');

    // Leer archivo actual o crear uno nuevo
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath));
    }

    // Agregar nuevo registro
    const nuevoRegistro = {
      nombre,
      email,
      producto,
      fecha: new Date().toISOString()
    };

    data.push(nuevoRegistro);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return res.status(200).json({ mensaje: "Registro guardado exitosamente" });
  }

  // Si no es POST, devolvemos error
  return res.status(405).json({ mensaje: "Método no permitido" });
}
