class SocketGame {

    init(settings) {

        // LOGIC PART ------------------------------------------------------------------
        this.data_canvas = new Fps('fps_data'); // подключение "модуля" fps + div id

        this.players = {};
        this.ping = 'wait';
        this.connectionIsAlive = false;
        this.pressedKeys = {};
        this.full_screen_mode = false;
        this.show_tech_data = true;

        this.canvas = document.querySelector(`#${settings.canvas_id}`);
        this.canvas_width = settings.canvas_width || 300;
        this.canvas_height = settings.canvas_height || 200;

        this.config = {
            shadows: true,
            shadow_type: THREE.PCFSoftShadowMap,
            antialias: true,
        };

        this.player = {
            id: '',
            height: 2,
            color: '#83BCFF',
            speed: 0.2,
            // view_direction: this.camera.getWorldDirection(),
        };

        this.player.temp = {
            position: {},
            direction: {},
        };

        window.addEventListener('keydown', (e) => {
            // console.log(e.keyCode);
            this.pressedKeys[e.keyCode] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.pressedKeys[e.keyCode] = false;
        });

        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.controls.lock();

            document.getElementById('mini_instruction').classList.toggle('hidden');
        });

        // THREE JS PART ---------------------------------------------------------------

        // CAMERA
        // Camera position and view direction will be set up after server autorisation

        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas_width / this.canvas_height,
            // window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // LOADERS

        this.cube_loader = new THREE.CubeTextureLoader();
        this.gltf_loader = new THREE.GLTFLoader();
        // this.basic_texture_loader = new THREE.TextureLoader();

        // RENDERER

        this.renderer = new THREE.WebGLRenderer({
            // canvas: document.querySelector(`#${this.canvas_id}`),	// id of html canvas
            canvas: this.canvas,
            antialias: this.config.antialias,
        });
        this.renderer.shadowMap.enabled = this.config.shadows;
        this.renderer.shadowMap.type = this.config.shadow_type;

        this.renderer.setClearColor('#9AD6FF');
        this.UpdScreenParams(this.canvas_width, this.canvas_height);

        window.addEventListener('resize', () => {
            if (this.full_screen_mode) {
                this.UpdScreenParams(window.innerWidth, window.innerHeight);
            }
        });

        // Skybox

        this.cube_loader.setPath('Skyboxs/');
        this.texture_cube = this.cube_loader.load([
            'right.png', // x+
            'left.png', // x-
            'top.png', // y+
            'bottom.png', // y-
            'front.png', // z+
            'back.png' // z-
        ]);

        // SCENE

        this.scene = new THREE.Scene();
        this.scene.background = this.texture_cube;

        this.scene.add(this.CreateAmbientLight());
        this.scene.add(this.CreateFloor());
        this.scene.add(this.CreatePointLight());
        this.scene.add(this.CreatePedestals());

        // CONTROLS

        this.controls = new THREE.PointerLockControls(this.camera, document.body);

        this.controls.addEventListener('lock', () => {
            this.full_screen_mode = true;

            if (this.canvas.requestFullscreen) {				// Default
                this.canvas.requestFullscreen();
            } else if (this.canvas.mozRequestFullScreen) {		// Firefox
                this.canvas.mozRequestFullScreen();
            } else if (this.canvas.webkitRequestFullscreen) {	// Chrome, Safari & Opera
                this.canvas.webkitRequestFullscreen();
            } else if (this.canvas.msRequestFullscreen) {		// IE/Edge
                this.canvas.msRequestFullscreen();
            }
            // this.canvas.style.width = '100%';
            // this.canvas.style.height = '100%';
        });

        this.controls.addEventListener('unlock', () => {
            this.full_screen_mode = false;

            this.UpdScreenParams(this.canvas_width, this.canvas_height);
        });

        // WEB SOCKET PART --------------------------------------------------------------
        this.wsc = new WebSocket(`ws://${settings.ip}:${settings.port}`);

        this.wsc.addEventListener('open', () => {
            this.onOpen()
        });
        this.wsc.addEventListener('close', () => {
            this.onClose()
        });
        this.wsc.addEventListener('message', (message) => {
            this.onMessage(message)
        });
    }

    // INNER FUNCTIONS

    UpdScreenParams (width, height) {
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    };

    // MAKE OBJECTS

    CreateAmbientLight () {
        return new THREE.AmbientLight('#FFFFFF', 0.9);
    }

    CreatePointLight () {
        let point_light = new THREE.PointLight('#FFFFFF', 1);
        point_light.position.set(0,7,0);
        point_light.castShadow = true;

        return point_light;
    }

    CreateFloor () {
        let floor_plane = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshPhongMaterial({color: 0xE1EDF9, side: THREE.DoubleSide})
        );
        floor_plane.rotateX(-Math.PI/2);
        floor_plane.receiveShadow = true;

        return floor_plane;
    }

    TestCustomShader () {
        let vshader = `
            uniform float time;

            void main() {
                vec2 wind_direction = vec2(0.866, 0.5);		// 60deg
                float wind_force = float(sin(time) + sin(time/2.0) - sin(time * 2.9)) / 10.0 + 0.27;	// pseudo rand graph

                float y_influence = float((position.y + 1.0)/2.0);
                vec4 pre_gl_pos = modelMatrix * vec4(position, 1.0);

                gl_Position =  projectionMatrix * viewMatrix * vec4 (
                    pre_gl_pos.x + (wind_force * y_influence * wind_direction[0]),
                    pre_gl_pos.y,	// idk how to change y
                    // float(sqrt(pow(position.y + 1.0, 2.0) - pow(wind_force, 2.0))) * y_influence,
                    pre_gl_pos.z + (wind_force * y_influence * wind_direction[1]),
                    pre_gl_pos.w
                );
            }

            // first of all "model matrix" (object in world rotation), then "mine calculations" (wind effect), then "view matrix (camera rotation)"
            // and the last one is "projection matrix" (from 3D to 2D)
        `;

        this.test_uniforms = {
            time: {value: 0.0}
        };

        let mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 2, 2, 4),
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                wireframe: true,
                vertexShader: vshader,
                transparent: true,
                depthWrite: false,	// без depthWrite всё идёт по пизде
                uniforms: this.test_uniforms,
            })
            // new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide, wireframe: true})
        );

        let mesh_2 = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 2, 2, 4),
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                wireframe: true,
                vertexShader: vshader,
                transparent: true,
                depthWrite: false,	// без depthWrite всё идёт по пизде
                uniforms: this.test_uniforms,
            })
            // new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide, wireframe: true})
        );

        mesh.position.y += 4;
        mesh_2.position.y += 4;
        mesh_2.rotateY(Math.PI/2);

        let group = new THREE.Group();
        group.add(mesh);
        group.add(mesh_2);

        return group;
    }

    SecondCustomShader () {
        let vshader = `
            uniform float u_time;
            uniform float outer_radius;
            uniform float array[252];
            varying float pick;

            void main() {
                float delta = ((sin(u_time)+1.0)/2.0);	// value from 0 to 1, changes in time

                int x = int(position.x * 420.69);
                int y = 252;
                int index = int(float(x) - float(y) * floor(float(x)/float(y)));
                // так как шеёдер применяется к одному единсвенному vertex-у, то цикла нет и я через модуль от псевдорандома выбираю элемент из массива с рили рандомными значениями


                vec3 v = normalize(position) * (outer_radius + array[index]);	// gl_VertexID
                vec3 pos = mix(position, v, delta);

                pick = distance(position, v) * 1.1;

                gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
            }
        `;

        let fshader = `
            uniform float u_time;
            varying float pick;

            void main() {
                float delta = ((sin(u_time)+1.0)/2.0);	// value from 0 to 1, changes in time

                vec3 first_color = vec3(0.031,0.031,0.321);
                vec3 second_color = vec3(2,2,2);
                vec3 final_color = mix(first_color, second_color, pick*delta);
                gl_FragColor = vec4(final_color, 1.0);
            }
        `;

        this.sphere_uniforms = {
            u_time: 		{value: 0.0},
            outer_radius: 	{value: 1.0},
            needs_upd: 		{value: true}
        };

        this.sphere_uniforms.array = this.GetRandomArray();

        let mutant = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1, 10),
            new THREE.ShaderMaterial({
                uniforms: this.sphere_uniforms,
                vertexShader: vshader,
                fragmentShader: fshader,
                wireframe: false,
                // lights: true
            })
        );

        return mutant;
    }

    FirstCustomShader () {
        let vshader = `
            uniform float u_time;
            uniform float u_radius;


            void main() {
              float delta = ((sin(u_time)+1.0)/2.0);

              vec3 v = normalize(position) * u_radius;
              vec3 pos = mix(position, v, delta);

              gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
            }
        `;

        this.square_uniforms = {
            u_time: 	{value: 0.0},
            u_radius: 	{value: 1.0}
        };

        let mutant = new THREE.Mesh(
            new THREE.BoxGeometry(1,1,1, 6,6,6),
            new THREE.ShaderMaterial({
                uniforms: this.square_uniforms,
                vertexShader: vshader,
                wireframe: true
                // needsUpdate: true
            })
        );

        return mutant;
    }

    GetRandomArray () {
        return {type: "fv1", value: Array.from({length: 252}, () => {
            let num = Math.random() / 2.5;
            return num;
        })};
    }

    CreatePedestals (number = 8) {
        this.pedestals = [];
        let all_pedestals_group = new THREE.Group();
        let meshes_on_pedestals = [
            this.CreateGrassBush(4),	// grass bush
            this.FirstCustomShader(),	// cube-sphere
            this.SecondCustomShader(),	// explozion sphere
            // this.TestCustomShader(),	// for tests
        ];

        // custom settings for meshes

        meshes_on_pedestals[0].scale.set(0.7, 0.7, 0.7);
        meshes_on_pedestals[0].position.y = 3.4;
        // meshes_on_pedestals[0].castShadow = true;

        meshes_on_pedestals[1].scale.set(0.65, 0.65, 0.65);
        meshes_on_pedestals[1].position.y = 3.4;
        // meshes_on_pedestals[1].castShadow = true;
        // meshes_on_pedestals[1].needsUpdate = true;

        meshes_on_pedestals[2].scale.set(0.5, 0.5, 0.5);
        meshes_on_pedestals[2].position.y = 3.4;
        meshes_on_pedestals[2].castShadow = true;
        meshes_on_pedestals[2].receiveShadow = true;

        let pedestal = this.gltf_loader.load('/models/pedestal.gltf', (object) => {
            let pedestal = object.scene.children[0];
            pedestal.castShadow = true;
            // pedestal.receiveShadow = true;

            for (let n = 0; n < number; n++) {
                let group = new THREE.Group();

                group.add(pedestal.clone());
                if (meshes_on_pedestals[n]) group.add(meshes_on_pedestals[n]);
                group.rotateY((Math.PI / number) * (n + 1)); 	// rotation
                // group.position.x = (-number/2 + n)*3;		// in line order
                group.translateZ(7);							// in radial order

                all_pedestals_group.add(group);
                // this.scene.add(group);
            }
        });

        return all_pedestals_group;
        // this.scene.add(all_pedestals_group);
    }

    CreateSlicedGrass () {
        let vshader = `
            #define USE_MAP true
            uniform float time;
            varying vec2 vUv;

            void main() {
                vUv = uv;

                vec2 wind_direction = vec2(0.866, 0.5);		// 60deg
                float wind_force = float(sin(time) + sin(time/2.0) - sin(time * 2.9)) / 10.0 + 0.27;	// pseudo rand graph

                float y_influence = float((position.y + 1.0)/2.0);
                vec4 pre_gl_pos = modelMatrix * vec4(position, 1.0);

                gl_Position =  projectionMatrix * viewMatrix * vec4 (
                    pre_gl_pos.x + (wind_force * y_influence * wind_direction[0]),
                    pre_gl_pos.y,	// idk how to change y
                    // float(sqrt(pow(position.y + 1.0, 2.0) - pow(wind_force, 2.0))) * y_influence,
                    pre_gl_pos.z + (wind_force * y_influence * wind_direction[1]),
                    pre_gl_pos.w
                );
            }
        `;

        let fshader_left = `
            uniform sampler2D texture_left;
            varying vec2 vUv;

            void main() {
                gl_FragColor = texture2D(texture_left, vUv);
            }
        `;

        let fshader_right = `
            uniform sampler2D texture_right;
            varying vec2 vUv;

            void main() {
                gl_FragColor = texture2D(texture_right, vUv);
            }
        `;


        if (!this.grass_uniforms) this.grass_uniforms = {
            time: 			{value: 0.0},
            texture_left: 	{type: "t", value: new THREE.TextureLoader().load("textures/grass_v4_left.png")},
            texture_right: {type: "t", value: new THREE.TextureLoader().load("textures/grass_v4_right.png")}
        };

        let left_part = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 2, 2, 4),
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                wireframe: false,
                fragmentShader: fshader_left,
                vertexShader: vshader,
                transparent: true,
                depthWrite: false,
                uniforms: this.grass_uniforms
            })
        );

        let right_part = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 2, 2, 4),
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                wireframe: false,
                fragmentShader: fshader_right,
                vertexShader: vshader,
                transparent: true,
                depthWrite: false,
                uniforms: this.grass_uniforms
            })
        );

        left_part.position.x -= left_part.geometry.parameters.width / 2;
        right_part.position.x += right_part.geometry.parameters.width / 2;

        // trasparent PNG also cast shadow

        let group = new THREE.Group();
        group.add(left_part);
        group.add(right_part);

        return group;
    }

    CreateGrassBush (sides, first_texture, second_texture) {
        let group = new THREE.Group();

        for (let i = 0; i < sides; i++) {
            let slice = this.CreateSlicedGrass(first_texture, second_texture);
            slice.rotateY((Math.PI / sides) * (i + 1)); 	//calculation for equal slices rotation
            group.add(slice);
        }

        // поднятие по У на пол высота, так как центр меша в центре, а не у основания. Данные из первой полустороны
        group.position.y += group.children[0].children[0].geometry.parameters.height / 2;

        return group;
    }


    // FUNCTIONS CONTROLS

    MovePlayer() {
        this.player.temp.direction = this.camera.getWorldDirection();

        if (this.pressedKeys['87']) this.CalcMoveForward(); // W
        if (this.pressedKeys['65']) this.CalcMoveLeft(); // A
        if (this.pressedKeys['83']) this.CalcMoveBack(); // S
        if (this.pressedKeys['68']) this.CalcMoveRight(); // D

        if (this.pressedKeys['32']) this.CalcMoveUp(); // Space
        if (this.pressedKeys['16']) this.CalcMoveDown(); // L_shift

        this.SendPlayerTempPosition();
    }

    GetCameraYangle() {
        // это поебота с вектором нужна только потому что автор движка, блять, считает угол по 180 градусов, а не 360. Пидарас. Или нет

        let vector = this.camera.getWorldDirection(),
            Y_angle = Math.atan2(vector.x, vector.z);
        // Y_angle = (Math.atan2(vector.x, vector.z) + Math.PI*2) % (Math.PI*2);

        return Y_angle;
    }

    CalcMoveForward() {
        let angle = this.GetCameraYangle();

        this.player.temp.position.x += Math.sin(angle) * this.player.speed;
        this.player.temp.position.z += Math.cos(angle) * this.player.speed;
    }

    CalcMoveBack() {
        let angle = this.GetCameraYangle();

        this.player.temp.position.x += -Math.sin(angle) * this.player.speed;
        this.player.temp.position.z += -Math.cos(angle) * this.player.speed;
    }

    CalcMoveLeft() {
        let angle = this.GetCameraYangle();

        this.player.temp.position.x += Math.sin(angle + Math.PI / 2) * this.player.speed;
        this.player.temp.position.z += Math.cos(angle + Math.PI / 2) * this.player.speed;
    }

    CalcMoveRight() {
        let angle = this.GetCameraYangle();

        this.player.temp.position.x += Math.sin(angle - Math.PI / 2) * this.player.speed;
        this.player.temp.position.z += Math.cos(angle - Math.PI / 2) * this.player.speed;
    }

    CalcMoveUp() {
        this.player.temp.position.y += this.player.speed;
    }

    CalcMoveDown() {
        this.player.temp.position.y -= this.player.speed;
    }

    // ANIMATION PART

    animationLoop() {
        if (this.connectionIsAlive) {

            this.MovePlayer(); // каждый тик проверяет передвинулся я куда-либо или нет
            this.drawNewFrame({
                ping: this.ping,
                players_count: Object.keys(this.players).length
            });
            // this.drawNewFrame();

            window.requestAnimationFrame(() => this.animationLoop());
        }
    }

    animationStart() {
        this.animationLoop();
    }

    drawNewFrame(params = {}) {
        this.RenderPedestals();

        for (let player in this.players) {

            if (this.players[player].object) {
                let PP = this.players[player].position,
                    PD = this.players[player].direction;

                this.players[player].object.position.set(PP.x, PP.y, PP.z);
                // let angle = this.GetCameraYangle();
                this.players[player].object.lookAt(PP.x + PD.x * 10, PP.y + PD.y * 10, PP.z + PD.z * 10);
            }

        }

        let my_pos = this.players[this.player.id].position;
        this.camera.position.set(my_pos.x, my_pos.y, my_pos.z);

        if (this.show_tech_data) {
            // fps and another data to display on other 2D canvas
            let data_to_display = [];

            if (params.ping) data_to_display.push({
                data: params.ping,
                index: 1,
                pre_text: 'ping',
                post_text: 'ms'
            });

            if (params.players_count) data_to_display.push({
                data: params.players_count,
                index: 3,
                pre_text: 'players',
                post_text: ''
            });

            // todo later (change to part of canvas)
            this.data_canvas.display(data_to_display); // if (data_to_display.length != 0)
        }

        this.renderer.render(this.scene, this.camera);
    }

    RenderPedestals () {
        // First pedestal - grass
        if (this.grass_uniforms) {
            this.grass_uniforms.time.value += 0.03;
        }

        // Second pedestal - cube sphere
        if (this.square_uniforms) {
            this.square_uniforms.u_time.value += 0.03;
        }

        // Third pedestal - explosion sphere
        if (this.sphere_uniforms) {
            // вся эта поебота нужна чтобы массив рандомных значений менялся во время схлопывания и не было видно рывков
            if(Math.sin(this.sphere_uniforms.u_time.value) < -0.97 && this.sphere_uniforms.needs_upd.value) {
                this.sphere_uniforms.needs_upd.value = false;
                this.sphere_uniforms.array = this.GetRandomArray();
            } else if (Math.sin(this.sphere_uniforms.u_time.value) > -0.97) this.sphere_uniforms.needs_upd.value = true;

            this.sphere_uniforms.u_time.value += Math.PI/80;	// ~0.04
        }

        // Fourht pedestal - for tests
        if (this.test_uniforms) {
            this.test_uniforms.time.value += 0.04;
        }

    }

    disconectMode() {
        this.connectionIsAlive = false;
        clearInterval(this.pingCkeck);
    }

    // WEB SOCKET PART

    onOpen() {
        // autorisation asking
        this.wsc.send(JSON.stringify({
            'mode': 'AcceptToGame',
        }));
    }

    onClose() {
        // console.log('conection closed');
        // нет нужды в чём-либо, сервер сам разорвёт соединение и удалит объект игрока из массива
        this.disconectMode();
    }

    onMessage(message) {
        let msg = JSON.parse(message.data);

        switch (msg.mode) {

            case 'personal':

                this.players = Object.assign({}, msg.players);
                this.player.id = msg.id;
                this.player.position = new THREE.Vector3(msg.players[msg.id].position.x, msg.players[msg.id].position.y, msg.players[msg.id].position.z);
                this.player.temp.position = this.player.position;

                this.player.direction = new THREE.Vector3(msg.players[msg.id].direction.x, msg.players[msg.id].direction.y, msg.players[msg.id].direction.z);
                this.player.temp.direction = this.player.direction;

                this.camera.position.set(this.player.position.x, this.player.position.y, this.player.position.z);
                this.camera.lookAt(this.player.direction);


                for (let player in this.players) {
                    // Rendering all players except myself
                    if (this.players[player].id != this.player.id) this.addPlayerBoxToScene(this.players[player]);
                }

                this.connectionIsAlive = true;
                this.animationStart();

                this.pingCkeck = setInterval(() => {
                    this.last_ping_sended_time = performance.now();
                    this.wsc.send(JSON.stringify({
                        'mode': 'PingCheck'
                    }));
                }, 1000);

                break;

            case 'ping_answer':
                // оставляем только два знака после запятой, а то там длинно выходит) то 0, то 15 цифр в длину
                // performance.now() это "правильная" замена new Date().getTime() => более точно рассчитывает время

                this.ping = (performance.now() - this.last_ping_sended_time).toFixed(2);
                break;

            case 'player_move':
                // console.log('move');
                // console.log(msg.new_direction);

                this.updatePlayerPosition(msg.player_id, msg.new_position, msg.new_direction);
                break;

            case 'add_player':
                // console.log('add');
                if (this.player.id) this.addPlayer(msg.player);
                break;

            case 'remove_player':
                // console.log('remove');
                this.removePlayer(msg.player_id);
                break;
        }
    }

    // LOGIC PART

    updatePlayerPosition(player_id, new_position, new_direction) {
        this.players[player_id].position = new_position;
        this.players[player_id].direction = new_direction;
    }

    SendPlayerTempPosition() {
        this.wsc.send(JSON.stringify({
            'mode': 'PlayerMove',
            'new_position': this.player.temp.position,
            'new_direction': this.player.temp.direction,
        }));
    }

    removePlayer(player_id) {
        this.scene.remove(this.players[player_id].object);
        delete this.players[player_id];
    }

    addPlayer(player) {
        this.players[player.id] = player;
        this.addPlayerBoxToScene(player);
    }

    addPlayerBoxToScene(player_obj) {
        let player_box = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({
                color: player_obj.color,
                wireframe: false
            })
        );

        player_box.position.set(
            player_obj.position.x,
            2,
            player_obj.position.z,
        );

        player_box.setRotationFromEuler(new THREE.Euler().setFromVector3(player_obj.direction));

        this.scene.add(player_box);
        this.players[player_obj.id].object = player_box;
    }

}
