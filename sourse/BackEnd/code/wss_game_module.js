module.exports.init = WSS_Init;

// ========================================================================
var WSS;  // web socket server
const players = {};

function WSS_Init (ws_server, IP, PORT) {
    console.log(
        `==================================================================`,'\n',
        `WSS server started at ws://${IP}:${PORT}`,'\n',
        `at ${new Date()}`,'\n',
        `------------------------------------------------------------------`,'\n'
    );

    WSS = ws_server;
    ws_server.on('connection', (wsc, req) => {WS_Connection(wsc, req)});
}

function WS_Connection(wsc, req) {
    console.log('new connection');

    let id, player_height = 2;

    // проверка чтобы в общем "массиве" не было игроков с таким же id
    while (true) {
        id = Math.random();
        if (!(id in players)) break;
    }

    players[id] = {
        id: id,
        color: GetRandomColor(),
        height: player_height,
        position: {
            x: RandomNumber(-30, 30),
            y: 2,
            z: RandomNumber(-30, 30),
        },
        direction: {x: 0, y: player_height, z: 0},
    };

    // по дефолту нет проверки на живое соединение, пришлось добавить самому
    wsc.pings = 0;
    wsc.timer = setInterval(() => {SendPing(wsc)}, 1000);


    wsc.on('pong', () => {GetPong(wsc)});

    wsc.on('error', (error) => {console.log('Cannot start server')});

    wsc.on('close', () => {CloseConnectionListener(wsc, id)});

    wsc.on('message', (message) => {MessageListener(wsc, message, id)});
}

function SendPing (wsc) {
    if (wsc.pings >= 3) {
        console.log('too many pings');

        // удаление интервала в обработчике закрытия соединения
        wsc.terminate();    // принудительное закрытие без обмена пакетами для "красивого" закрытия
        return;
    }

    // console.log('send ping');
    wsc.ping();
    wsc.pings++;
}

function GetPong (wsc) {
    // console.log('reseved pong');
    wsc.pings = 0;
}

function CloseConnectionListener (wsc, id) {
    console.log('connection was closed');
    delete players[id];
    clearInterval(wsc.timer);

    SendMessageToEveryClient(JSON.stringify({'mode': 'remove_player', 'player_id': id}));
}

function SendMessageToEveryClient (message, id) {
    WSS.clients.forEach((socket, index, set) => {
        socket.send(message);
    });
}

// ========================================================================================

function MessageListener (wsc, message, id) {
    let msg  = JSON.parse(message);

    if (msg.mode == 'AcceptToGame') {
        // console.log('autorisation');

        SendMessageToEveryClient(JSON.stringify({'mode': 'add_player', 'player': players[id]}));
        wsc.send(JSON.stringify({'mode': 'personal', 'id': id, 'players': players}));
    }

    if (msg.mode == 'PlayerMove') {
        players[id].position = msg.new_position;
        players[id].direction = msg.new_direction;

        SendMessageToEveryClient(JSON.stringify({'mode': 'player_move', 'new_position': players[id].position, 'new_direction': players[id].direction, 'player_id': id}));
    }

    if (msg.mode == 'PingCheck') {
        wsc.send(JSON.stringify({'mode': 'ping_answer'}));
    }

    // if (msg.mode == 'pong') {
    //     console.log('reseved pong');
    //     // SendMessageToEveryClient(JSON.stringify({'mode': 'massive_upd', 'players': players}));
    //     // wsc.send(JSON.stringify({'mode': 'personal', 'id': id}));
    // }
}

function RandomNumber (min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function GetRandomColor (alpha = 1) {
    return `hsla(${Math.random() * 360}, 70%, 50%, ${alpha})`;
 // return `rgb(${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`;
}
