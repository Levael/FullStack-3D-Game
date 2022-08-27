const   express     = require('express'),
        file        = require('fs'),
        path        = require('path'),
        bodyParser  = require('body-parser'),

        game_module = require('./game_module.js'),

        // -------------------------------------------------------------------------------------

        HTTP_PORT  = process.env.PORT || 5000,
        // IP      = process.env.IP   || 'localhost',

        // --------------------------------------------------------------------------------------

        root_folder     = path.join(__dirname, '../..'),
        sourse_folder   = path.join(root_folder, 'FrontEnd'),

        // --------------------------------------------------------------------------------------

        WSS_GAME = game_module.init(HTTP_PORT);

// ----------------------------------------------------------------------------------------------

const app = express();

app.listen(HTTP_PORT, () => {console.log('Http server works on port: ' + HTTP_PORT)});

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());

app.use(express.static(sourse_folder));
app.use(express.static(path.join(sourse_folder, 'images')));
app.use(express.static(path.join(sourse_folder, 'libs')));

app.get('/', (req, res) => {
    res.send('<h1>works</h1>');
});

app.get('/game', (req, res) => {
    // res.sendFile(path.join(sourse_folder, 'game_single_file/full_game_3d.html'));
    res.sendFile(path.join(sourse_folder, 'index.html'));

});
