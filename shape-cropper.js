const Jimp = require('jimp');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');

let img, source_dir;
let needle_count = 0;
let row_count = 0;
function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

let options = ['Custom Shape', 'Template'],
	choice = readlineSync.keyInSelect(options, chalk.blue.bold(`^Would you like to input an image for a custom shape, or use a pre-made template?`));
choice = options[choice];
console.log(chalk.green('-- Using a: ' + choice));
if (choice === 'Template') {
	process.exit();
} else {
	readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nShape image file: ') });
	readlineSync.promptLoop(function (input) {
		img = input;
		if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-shape-images/${input}`)) {
			let error_message = console.log(chalk.red(`The image must be a PNG, JPG, or BMP that exists in the 'in-shape-images' folder.`));
			return error_message;
		}
		if (fs.existsSync(`./in-shape-images/${input}`)) {
			return /\.jpg|\.jpeg|\.png$/i.test(input);
		}
	});
	console.log(chalk.green(`-- Reading shape data from: ${img}`));
	readlineSync.setDefaultOptions({ prompt: '' });

	//TODO: maybe add option of writing file front scratch here? (with no colorwork); for now, just using a file from image processing program (don't think there is proper support for panels with stitch patterns yet, need to do that)
	needle_count = readlineSync.question(chalk`{blue.bold \nWhat is the name of the file that you would like to add shaping to? }`, {
		limit: [
			function (input) {
				if (input.includes('.') && !isNumeric(input)) input = input.slice(0, input.indexOf('.'));
				input = `${input}.k`;
				return isNumeric(input) || fs.existsSync(`./knit-in-files/${input}`) || fs.existsSync(`./knit-out-files/${input}`);
			},
		],
		limitMessage: chalk`{red -- Input valid name of a knitout (.k) file that exists in either the 'knit-out-files' or 'knit-in-files' folder, please.}`,
	});
	if (isNumeric(needle_count)) {
		needle_count = Number(needle_count);
		console.log(chalk.green(`-- Needle count: ${needle_count}`));
		row_count = readlineSync.question(chalk`{blue.bold \nHow many rows long?} {blue.italic (press enter to scale rows according to img dimensions) }`, {
			defaultInput: -1,
			limit: Number,
			limitMessage: chalk.red('-- $<lastInput> is not a number.'),
		});
		row_count === '-1' ? console.log(chalk.green('-- Row count: AUTO')) : console.log(chalk.green(`-- Row count: ${row_count}`));
	} else { ////needle_count serving as temporary substitute for input file
		if (needle_count.includes('.')) needle_count = needle_count.slice(0, needle_count.indexOf('.'));
		needle_count = `${needle_count}.k`;
		console.log(chalk.green(`-- Reading from: ${needle_count}\n\nPlease wait...`));
		if (fs.existsSync(`./knit-in-files/${needle_count}`)) {
			source_dir = './knit-in-files/';
		} else if (fs.existsSync(`./knit-out-files/${needle_count}`)) {
			source_dir = './knit-out-files/';
		}
		fs.writeFileSync('SOURCE_FILE.txt', `${needle_count}\n${source_dir}`);
		let source_file = fs
			.readFileSync(source_dir + needle_count)
			.toString()
			.split('\n');
		let row_count_arr = source_file.filter((el) => el.includes(';row:'));
		row_count = row_count_arr[row_count_arr.length - 1].replace(';row: ', '');
		let needle_count_arr = source_file.filter((el) => el.trim().length && !el.includes(';') && !el.includes('x-') && !el.includes('miss') && !el.includes('tuck') && !el.includes('drop') && !el.includes('xfer') && !el.includes('pause') && !el.includes('rack'));
		let copyN = [...needle_count_arr]; //remove //debug
		needle_count_arr = needle_count_arr.map((el) => el.match(/\d+/g));

		for (let i = 0; i < needle_count_arr.length; ++i) {
			if (needle_count_arr[i] === null) {
				console.log(copyN[i]); //remove //debug
				console.log(needle_count_arr[i]);
				console.log(needle_count_arr[i].splice(0, 1)); //remove //debug
			}
		}

		needle_count_arr = needle_count_arr.map((arr) => arr.splice(0, 1));
		needle_count_arr = needle_count_arr.map((el) => Number(el));
		(function getMax() {
			let len = needle_count_arr.length;
			let max = -Infinity;
			while (len--) {
				max = needle_count_arr[len] > max ? needle_count_arr[len] : max;
			}
			return (needle_count = max);
		})();
	}
	row_count = Number(row_count);

	let cropX_left;
	let cropX_right;
	let cropY_top;
	let cropY_bot;
	////Create two-dimensional pixels rgb array based on image
	Jimp.read(`./in-shape-images/${img}`)
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
			image.crop(cropX_left, cropY_bot, crop_width, crop_height).resize(needle_count, row_count).write('cropped_shape.png');
			return image;
		})
		.catch((err) => {
			throw err;
		});
}
