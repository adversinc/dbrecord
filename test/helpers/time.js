const
	Fiber = require('fibers');

module.exports = {
	sleep(ms) {
		const fiber = Fiber.current;

		setTimeout(function() {
			fiber.run();
		}, ms);
		Fiber.yield();
	}

};
