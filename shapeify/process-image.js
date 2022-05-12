const Jimp = require('jimp');

const processor = require('./shape-processor.js');


function cropImg(img, needle_count, row_count, out_path) {
	let cropX_left;
	let cropX_right;
	let cropY_top;
	let cropY_bot;

	const cropped = new Promise((resolve) => {
		// let cropped_shape_path = './public/images/out-shape-images/cropped_shape.png';
		// // img buffer

		needle_count ? needle_count = Number(needle_count) : needle_count = Jimp.AUTO;
		row_count ? row_count = Number(row_count): row_count = Jimp.AUTO;

		if (img) {
			//Create two-dimensional pixels rgb array based on image
			Jimp.read(img)
			.then((image) => {
				let width = image.bitmap.width;
				let height = image.bitmap.height;
				for (let y = 0; y < height; ++y) {
					for (let x = 0; x < width; ++x) {
						let pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
						// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
						let hsp = Math.sqrt(0.299 * (pixel.r * pixel.r) + 0.587 * (pixel.g * pixel.g) + 0.114 * (pixel.b * pixel.b));
						// Using the HSP value, determine whether the color is light or dark
						if (hsp < 127.5) {
							if (x < cropX_left || cropX_left === undefined) {
								cropX_left = x;
							}
							if (x > cropX_right || cropX_right === undefined) {
								cropX_right = x;
							}
							if (cropY_bot === undefined) {
								cropY_bot = y;
							}
							if (y > cropY_top || cropY_top === undefined) {
								cropY_top = y;
							}
						}
					}
				}
				let crop_width = cropX_right - cropX_left + 1;
				let crop_height = cropY_top - cropY_bot + 1;
				if (row_count === 0) {
					row_count = Jimp.AUTO;
				}
				// image.crop(cropX_left, cropY_bot, crop_width, crop_height).resize(needle_count, row_count).write(cropped_shape_path);
				// // return image;
        image.crop(cropX_left, cropY_bot, crop_width, crop_height).resize(needle_count, row_count).write(`${out_path}/cropped_shape.png`);
				// return image;
				resolve(image);
			})
			.catch((err) => {
				throw err;
			});
		}
	});

	return cropped;
}


function getData(img) {
	let pixels;

	const processImage = new Promise((resolve) => {
		Jimp.read(img)
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

			resolve(pixels);
		})
		.catch((err) => {
			throw err;
		});
	});
	return processImage;
}


let pixels;

function resolvePromises(cropped_img, out_path) {
	const promises = new Promise((resolve) => {
		getData(cropped_img).then((result) => {
			pixels = result;
		}).then(() => {
			let shape_info = processor.process(pixels, out_path);
			
			resolve(shape_info);
			return shape_info;
		});
	});
	return promises;
}


function process(img_path, crop_img, needle_count, row_count, out_path) { //crop_img is bool //out_path is //new
	return new Promise((resolve) => {
		const crop = new Promise((resolve, reject) => { //new location
			if (crop_img) {
				cropImg(img_path, needle_count, row_count, out_path).then((result) => {
					resolve(result);
					return result; //?
				});
			} else {
				resolve(img_path);
				return img_path;
			}
		});

		crop.then((processed_img) => {
			resolvePromises(processed_img, out_path)
			.then((shape_info) => {
				resolve(shape_info);
				return shape_info;
			});
		});
	});
}


module.exports = { process };