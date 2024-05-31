$(function(){
    const url = 'http://192.168.1.11:3000';
    const socket = io(url);
    const tiempo_a_registrar = 300;
    var data_tiempo_real = [];


    var req = $.get(url+'/inicio');

    req.done(function(data) {
        data_tiempo_real = data.slice(0, tiempo_a_registrar);
        data_tiempo_real.reverse();
    });

    // Corrección del evento "connect"
    socket.on("connect", () => {
        console.log("socket-io",socket.id)
    });

    socket.on('data', (newData) => {
        console.log('Datos recibidos desde el servidor:', newData);
        // Actualiza tu gráfico o realiza otras acciones con los nuevos datos
    });

    socket.on("data", (registro) => {
        if (data_tiempo_real.length > tiempo_a_registrar) {
            data_tiempo_real.shift(); // Eliminar el primer elemento
        }
        data_tiempo_real.push(registro);
        actualizarGrafico();
    });
        
    var myChart;

    
    
});
