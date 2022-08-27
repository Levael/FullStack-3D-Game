class Fps {
	constructor (container_id) {
		this.fps_calls = [];
		this.fps = 0;

		this.container = document.querySelector(`#${container_id}`);
	}

	calculation () {
		let now = performance.now();

	    while (this.fps_calls.length > 0 && now - this.fps_calls[0] >= 1000) {
	    	this.fps_calls.shift();
	    }

	    this.fps_calls.push(now);
	    return this.fps_calls.length;
	}

	display (data_array) {
		this.container.innerText = `fps: ${this.calculation()}\n`;

		for (let i = 0; i < data_array.length; i++) {
			this.container.innerText += `${data_array[i].pre_text}: ${data_array[i].data} ${data_array[i].post_text}\n`;
		}
	}
}
