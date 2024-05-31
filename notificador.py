import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
import sys
import time
from pymongo import MongoClient
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Input

# Configurar la codificación de la salida a UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Conexión a MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['sensor_data']

# Cargar datos de las colecciones
out_data = list(db.out_data.find())
in_data = list(db.in_data.find())

# Convertir a DataFrame de pandas para facilitar el manejo
out_df = pd.DataFrame(out_data)
in_df = pd.DataFrame(in_data)

# Filtrar y preparar datos relevantes
features = ['out_humidity', 'out_light', 'out_temperature']
X = out_df[features].values
threshold_value = 300  # Umbral definido para baja humedad
y = (out_df['out_Soil_humidity'] < threshold_value).astype(int).values

# Dividir los datos en conjunto de entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Escalar los datos
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Definir el modelo con la capa de entrada
model = Sequential([
    Input(shape=(len(features),)),
    Dense(16, activation='relu'),
    Dense(8, activation='relu'),
    Dense(1, activation='sigmoid')
])

# Compilar el modelo
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Entrenar el modelo
model.fit(X_train, y_train, epochs=50, batch_size=8, validation_split=0.2)

def send_notification(message):
    print(message)

# Función para monitorear y predecir
def monitor_and_notify():
    # Obtener nuevos datos (simulamos obteniendo el último documento)
    latest_data = db.out_data.find().sort([('$natural', -1)]).limit(1)[0]
    
    # Preparar los datos
    input_data = scaler.transform([[latest_data[feature] for feature in features]])
    
    # Hacer una predicción
    prediction = model.predict(input_data)[0][0]
    
    # Si la predicción indica baja humedad, enviar notificación
    print(prediction)

    # Si la predicción indica baja humedad, enviar notificación
    if prediction > 0.5:
        message_body = f'Alerta de Baja Humedad del Suelo: {latest_data["out_Soil_humidity"]}'
        send_notification(message_body)

# Bucle infinito para monitorear cada cierto tiempo (ej., cada 5 minutos)
while True:
    monitor_and_notify()
    time.sleep(300)  # Espera de 5 minutos
