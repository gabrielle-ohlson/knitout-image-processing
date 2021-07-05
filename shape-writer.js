const Jimp = require('jimp');
const fs = require('fs');

let pixels;
if (fs.existsSync('cropped_shape.png')) {
	Jimp.read('cropped_shape.png')
		.then((image) => {
			let width = image.bitmap.width;
			let height = image.bitmap.height;
			pixels = [];
			for (let y = 0; y < height; ++y) {
				let rowPixels = [];
				for (let x = 0; x < width; ++x) {
					let pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
					rowPixels.push(`${pixel.r};${pixel.g};${pixel.b};${x};${y}`);
				}
				pixels.push(rowPixels);
			}
			fs.writeFile('INPUT_DATA.json', JSON.stringify(pixels), 'utf8', (err) => {
				if (err) {
					throw err;
				}
			});
		})
		.catch((err) => {
			throw err;
		});
}