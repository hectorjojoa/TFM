const express = require('express');
const app = express();
const server = require('http').createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);
const mongoose = require('mongoose');
const moment = require('moment-timezone');                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
const { SerialPort } = require('serialport');                                                                                                                                
const { ReadlineParser } = require('@serialport/parser-readline');

// Connect to MongoDB using Mongoose
mongoose.connect('mongodb://127.0.0.1:27017/vivero', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (err) => {
  console.error('Error al conectar a MongoDB:', err);
});

db.once('open', () => {
  console.log('Conexión a MongoDB establecida');
});

// Define un esquema para tus datos
const dataSchema_outdoor = new mongoose.Schema({
  temperatura: Number,
  humedad: Number,
  humedadSuelo: Number,
  luz: Number,
  timestamp: { type: Date, default: Date.now }
});

// Define a schema for your data
const dataSchema = new mongoose.Schema({
  temperature_inside_env: Number,
  humidity_inside_env: Number,
  photocellValue: Number,
  soilHumidityValue_1: Number,
  soilHumidityValue_2: Number,
  d: Number,
  timestamp: Date,
});

// Create a model for your data
const DataModel = mongoose.model('indoor_inside', dataSchema);
// Crea un modelo para tus datos
const DataModel_outdoor = mongoose.model('Data_outdoor', dataSchema_outdoor);
// Maneja las solicitudes POST desde el ESP32
app.use(express.json());

app.post('/data', (req, res) => {
  const { temperatura, humedad, humedadSuelo, luz} = req.body;

  if (!temperatura || !humedad) {
    return res.status(400).json({ error: 'Temperatura y humedad son campos obligatorios' });
  }

  const newData = new DataModel_outdoor({
    temperatura,
    humedad,
    humedadSuelo,
    luz
  });

  newData.save()
    .then(() => {
      console.log('Datos guardados en MongoDB:', newData);
      io.emit('data', newData);
      res.status(201).json({ message: 'Datos guardados correctamente' });
    })
    .catch((error) => {
      console.error('Error al guardar datos en MongoDB:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    });
});


server.listen(3000, function () {
  console.log('Servidor en el puerto', 3000);
});


const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('open', () => {
  console.log('Conexión abierta con el puerto serie');
});

parser.on('data', async (data) => {
  const [temperature_inside_env, humidity_inside_env, photocellValue, soilHumidityValue_1, soilHumidityValue_2, d] = data.split(',');

  if (humidity_inside_env && temperature_inside_env && photocellValue && soilHumidityValue_1 && soilHumidityValue_2 && d) {
    const timestampDate = new Date();
    const timestampBogota = moment(timestampDate).tz('America/Bogota').toDate();
    const dataToInsert = new DataModel({
      humidity_inside_env: parseFloat(humidity_inside_env),
      temperature_inside_env: parseFloat(temperature_inside_env),
      photocellValue: parseFloat(photocellValue),
      soilHumidityValue_1: parseFloat(soilHumidityValue_1),
      soilHumidityValue_2: parseFloat(soilHumidityValue_2),
      d: parseFloat(d),
      timestamp: timestampBogota,
    });

    try {
      await dataToInsert.save();
      console.log('Datos guardados en MongoDB:', {
        ...dataToInsert._doc,
        timestamp: moment(timestampBogota).format('YYYY-MM-DD HH:mm:ss'),
      });

      io.emit('data', dataToInsert.toObject());
      
    } catch (err) {
      console.error('Error al guardar datos en MongoDB:', err);
    }
  }
});

parser.on('error', (err) => console.log(err));
port.on('error', (err) => {
  console.error('Error en el puerto serie:', err);
});
