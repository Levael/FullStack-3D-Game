class Fps {
	constructor () {
		this.fps_calls = [];
		this.fps = 0;

		this.fps_canvas = document.createElement('canvas');
		this.fps_canvas.setAttribute("id", "fps_canvas");
		this.fps_canvas.style.backgroundColor = "rgba(77, 213, 99, 0.5)";
		this.fps_canvas.style.position = 'absolute';
		this.font_size = 15;
		document.body.appendChild(this.fps_canvas);

		this.fps_ctx = this.fps_canvas.getContext('2d');

		this.width  = this.fps_canvas.width  = 110;
		this.height = this.fps_canvas.height = 30;
	}

	calculation () {
		let now = performance.now();

	    while (this.fps_calls.length > 0 && now - this.fps_calls[0] >= 1000) {
	    	this.fps_calls.shift();
	    }

	    this.fps_calls.push(now);
	    return this.fps_calls.length;
	}

	clear () {
		this.fps_ctx.clearRect(0, 0, this.width, this.height);
	}

	display (data_array) {
		this.height = this.fps_canvas.height = (this.font_size + 5) * (data_array.length + 1) + 5;	// 5 is for bottom padding

		this.clear();
		this.fps_ctx.beginPath();

		this.fps_ctx.font = `${this.font_size}px Arial`;
		this.fps_ctx.fillStyle = 'white';

		let start_x = 8,
			start_y = 5 + this.font_size;

		// always show fps
		this.fps_ctx.fillText(`fps: ${this.calculation()}`, start_x, start_y);

		for (let i = 0; i < data_array.length; i++) {
			let	y_pos = (start_y) + (this.font_size + 3) * (i + 1);
			this.fps_ctx.fillText(`${data_array[i].pre_text}: ${data_array[i].data} ${data_array[i].post_text}`, start_x, y_pos);
		}
	}
}
