const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');


//--- define some variables ---
let stImg, stitchPixels;
let stPatOpts = ['Rib', 'Bubbles', 'Seed']; //TODO: add more
let stitchPatterns = [];
class StitchPattern {
	constructor(name, hex, carrier) {
		this.name = name;
		this.color = hex;
		this.carrier = carrier;
		this.options = {};
	}
}

let palette, reduced;
let pal_hist = [];

let hexColors = {
	white: '#FFFFFF',
	black: '#000000',
	grey: '#808080',
	gray: '#808080',
	red: '#FF0000',
	orange: '#FFA500',
	yellow: '#FFFF00',
	green: '#00FF00',
	blue: '#0000FF',
	purple: '#6a0dad',
	pink: '#FF00FF',
};

let carrierColors = fs.readFileSync('colorsData.txt', 'utf8');
// .split('\n');
// for (let c in carrierColors) {
// 	carrierColors[c] = carrierColors[c].split(' ');
// } //remove
fs.unlinkSync('colorsData.txt');

//--- get stitch pattern img file path ---
console.log(chalk`{white.bold NOTE: image should only include a white background and the colors denoting stitch patterns.}`);
readlineSync.setDefaultOptions({ prompt: chalk`{blue.italic \n(press Enter to skip if using only *one* stitch pattern that *comprises the whole piece*) }{blue.bold Stitch pattern image file: }` });
// readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold Stitch pattern image file: }`});
readlineSync.promptLoop(function (input) {
	stImg = input;

	if (input === '') { //if skipping
		stImg = undefined;
		return true;
	}

	if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-stitch-pattern-images/${input}`)) {
		let error_message = console.log(chalk.red(`-- The image must be a PNG or JPG that exists in the 'in-stitch-pattern-images' folder.`));
		return error_message;
	}
	if (fs.existsSync(`./in-stitch-pattern-images/${input}`)) {
		return /\.jpg|\.jpeg|\.png$/i.test(input);
	}
});
if (stImg) console.log(chalk.green(`-- Reading stitch pattern data from: ${stImg}`));

//--- collect stitch pattern names + denoting color data ---
let stopPrompt = false;

let patOpts = [...stPatOpts];
while (!stopPrompt) {
	let options = [...patOpts],
		choice = readlineSync.keyInSelect(options, chalk.blue.bold(`^Select a stitch pattern to use in your motif.`));
	choice = stPatOpts[choice];
	// patOpts.splice(patOpts.indexOf(choice), 1);
	if (choice === 'Rib') {
		let ribOptions = ['1x1', '2x2'],
			ribChoice = readlineSync.keyInSelect(ribOptions, chalk.blue.bold(`^Which type of rib? `));
		choice = `Rib ${ribOptions[ribChoice]}`;
	}
	console.log(chalk.green('-- Using pattern: ' + choice));
	stitchPatterns.push(new StitchPattern(choice));
	// if (patOpts.length) {
	if (!readlineSync.keyInYNStrict( //TODO: remove if !stImg
		chalk`{blue.bold \nWould you like to include another stitch pattern?}`
	)) stopPrompt = true;
	// } else stopPrompt = true;
}

const hexToRGB = (hex) => {
	let alpha = false,
		h = hex.slice(hex.startsWith('#') ? 1 : 0);
	if (h.length === 3) h = [...h].map((x) => x + x).join('');
	else if (h.length === 8) alpha = true;
	h = parseInt(h, 16);
	return [
		Number((alpha ? a : '') + (h >>> (alpha ? 24 : 16))),
		Number((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)),
		Number(((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) + (alpha ? h & 0x000000ff : '')),
	];
};

let colors = [hexToRGB('#FFFFFF')];

for (let i = 0; i < stitchPatterns.length; ++i) {
	stopPrompt = false;
	while (!stopPrompt) {
		stitchPatterns[i].color = readlineSync.question(chalk.blue.bold(`\nEnter the hex-code (or color name) for the color you used to denote the '${stitchPatterns[i].name}' stitch pattern (e.g. #0000FF or blue): `)); //TODO: list available colors to do this for
		if (Object.keys(hexColors).includes(stitchPatterns[i].color)) {
			stitchPatterns[i].color = hexColors[stitchPatterns[i].color];
			stopPrompt = true;
		} else if (/^#[0-9A-F]{6}$/i.test(stitchPatterns[i].color) || /^[0-9A-F]{6}$/i.test(stitchPatterns[i].color)) stopPrompt = true;
		else console.log(chalk.red(`-- ${stitchPatterns[i].color} is not a valid hex-code or supported color name.`));
	}
	console.log(chalk.green('-- Hex-code: ' + stitchPatterns[i].color));

	stitchPatterns[i].color = hexToRGB(stitchPatterns[i].color); //check
	colors.push(stitchPatterns[i].color);

	stopPrompt = false;
	if (i === 0) { //TODO: remove if !stImg
		console.log(chalk`{white.bold \nYou may choose from the following list of existing carriers (along with the hex-code for the corresponding color), or specify a new carrier (if enough are left over).\nCarriers used in the motif thus far:}{white ${carrierColors}}`);
	}
	while (!stopPrompt) {
		stitchPatterns[i].carrier = readlineSync.question(chalk.blue.bold(`\nEnter the carrier you'd like to use for the '${stitchPatterns[i].name}' stitch pattern (e.g. 1): `)); //TODO: present data of colors attached to each carrier
		if (!isNaN(stitchPatterns[i].carrier)) {
			stitchPatterns[i].carrier = Number(stitchPatterns[i].carrier);
			stopPrompt = true;
		}
		else console.log(chalk.red(`-- ${stitchPatterns[i].carrier} is not a valid carrier number.`)); //TODO: add support for 'A' etc. (kniterate)
	}
	console.log(chalk.green('-- Carrier: ' + stitchPatterns[i].carrier));

	if (stitchPatterns[i].name === 'Bubbles') {
		if (readlineSync.keyInYNStrict(chalk.blue.bold(`\nWould you like to add any other customizations for the '${stitchPatterns[i].name}' stitch pattern?`))) {
			if (stitchPatterns[i].name === 'Bubbles') {
				stitchPatterns[i].options.bubbleWidth = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches wide should the bubbles be? `)));
				stitchPatterns[i].options.bubbleHeight = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many rows long? `)));
				if (stitchPatterns[i].options.bubbleHeight % 2 !== 0) {
					stitchPatterns[i].options.bubbleHeight += 1;
					console.log('WARNING: added an extra row so carrier will end up on correct side.');
				}
				stitchPatterns[i].options.overlap = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches should overlap between the bubbles? `)));
			}
		} else stitchPatterns[i].options = undefined;
	} else stitchPatterns[i].options = undefined;
}

//--- get motif size & then resize pattern img accordingly ---
let width, height, data;
let leftN = 1, rightN;

let stPatMap = [];

// console.log('stitchPatterns:', stitchPatterns); //remove //debug
// console.log('stPatMap:', stPatMap); //remove //debug

function getStitchData() {
	const processImage = new Promise((resolve) => {
		Jimp.read(`./out-colorwork-images/colorwork.png`).then(image => {
			width = image.bitmap.width;
			rightN = width;
			height = image.bitmap.height;
		}).then(function() {
			Jimp.read(`./in-stitch-pattern-images/${stImg}`).then(image => { //TODO: edit this with option of 'Enter' for stitch pattern
				image.resize(width, height, (err, image) => {
					data = image.bitmap.data;
					let opts = {
						colors: colors.length + 1,
						method: 2,
						//TODO: method: 1, //2 seems overall better, but could be good to test on more images
						minHueCols: colors.length + 1,
						dithKern: null,
						reIndex: false,
						palette: colors
					};
					let q = new RgbQuant(opts);
					q.sample(data, width);
					palette = q.palette(true, true);
					q.idxi32.forEach(function (i32) { //remove //?
						////return array of palette color occurrences
						pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
						// pal_hist.push(q.histogram[i32]);
					});
					// // sort it yourself //go back! //?
					// pal_hist.sort(function (a, b) {
					// 	return a.count == b.count ? 0 : a.count < b.count ? 1 : -1;
					// });
	
					q = new RgbQuant(opts);
					q.sample(data, width);
					palette = q.palette(true, true);
	
					reduced = q.reduce(data, 2); ////indexed array
					stitchPixels = [...reduced];
	
					let hex_arr = [Jimp.rgbaToInt(palette[0][0], palette[0][1], palette[0][2], 255)]; //background color
					for (let h = 1; h < palette.length; ++h) {
						stitchPatterns[h - 1].color = Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255);
						hex_arr.push(stitchPatterns[h - 1].color); //255 bc hex
					}
	
					for (let i = 0; i < stitchPatterns.length; ++i) {
						stPatMap.push(stitchPatterns[i]);
						stPatMap[i].id = i;
						stPatMap[i].rows = {};
						stPatMap[i].completed = 0;
						stPatMap[i].lastDir = undefined;
						stPatMap[i].rowDone = false;
						stPatMap[i].xfers = [undefined, undefined]; //new //check
					}
	
					for (let y = 0; y < height; ++y) {
						let px_arr = reduced.splice(0, width);
						for (let x = 0; x < width; ++x) {
							let hex = hex_arr[px_arr[x]];
							image.setPixelColor(hex, x, y);
						}
					}

	
					hex_arr.shift(); // remove background color, don't need it anymore
	
					for (let y = 0; y < height; ++y) {
					// for (let y = height - 1; y >= 0; --y) { //backwards because reads from top down
						let rowNum = height - y; //?
						for (let x = 0; x < width; ++x) {
							let pixColor = image.getPixelColor(x, y);
							if (hex_arr.includes(pixColor)) {
								let idx = hex_arr.indexOf(pixColor);
								if (!stPatMap[idx].rows[rowNum]) stPatMap[idx].rows[rowNum] = [];
								stPatMap[idx].rows[rowNum].push(x + 1);
							} 
						}
					}

					// stPatMap.forEach(pat => {
					// 	let sorted_rows = {};
					// 	Object.keys(pat.rows)
					// 		.sort(function(a, b) {
					// 			/** Insert your custom sorting function here */
					// 			return a - b;
					// 		})
					// 		.forEach(function(key) {
					// 			sorted_rows[key] = pat.rows[key];
					// 		});

					// 	pat.rows = {...sorted_rows};
					// }); //remove

					image.write(`./out-colorwork-images/pattern_motif.png`);
					resolve(stPatMap);
					return stPatMap;
				});
			});
		});
	});
	return processImage;
};

module.exports = { getStitchData, stPatMap };


// function getStitchData() {
// 	console.log('!!!!', processStitch()); //remove //debug
// 	return processStitch();
// }

// Jimp.read(`./out-colorwork-images/colorwork.png`, (err, image) => {
// 	if (err) throw err;
// 	width = image.bitmap.width;
// 	rightN = width;
// 	height = image.bitmap.height;
// }); //remove

// Jimp.read(`./in-stitch-pattern-images/${stImg}`).then(image => {
// 	image.resize(width, height, (err, image) => {
// 		data = image.bitmap.data;
// 		let opts = {
// 			colors: colors.length + 1,
// 			method: 2,
// 			//TODO: method: 1, //2 seems overall better, but could be good to test on more images
// 			minHueCols: colors.length + 1,
// 			dithKern: null,
// 			reIndex: false,
// 			palette: colors
// 		};
// 		let q = new RgbQuant(opts);
// 		q.sample(data, width);
// 		palette = q.palette(true, true);
// 		q.idxi32.forEach(function (i32) { //remove //?
// 			////return array of palette color occurrences
// 			pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
// 			// pal_hist.push(q.histogram[i32]);
// 		});
// 		// // sort it yourself //go back! //?
// 		// pal_hist.sort(function (a, b) {
// 		// 	return a.count == b.count ? 0 : a.count < b.count ? 1 : -1;
// 		// });

// 		q = new RgbQuant(opts);
// 		q.sample(data, width);
// 		palette = q.palette(true, true);

// 		reduced = q.reduce(data, 2); ////indexed array
// 		stitchPixels = [...reduced];
// 		// console.log('reduced:', reduced); //remove //debug
// 		// console.log(new Set([...reduced])); //remove //debug

// 		let hex_arr = [Jimp.rgbaToInt(palette[0][0], palette[0][1], palette[0][2], 255)]; //background color
// 		for (let h = 1; h < palette.length; ++h) {
// 			stitchPatterns[h - 1].color = Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255);
// 			hex_arr.push(stitchPatterns[h - 1].color); //255 bc hex
// 		}

// 		for (let i = 0; i < stitchPatterns.length; ++i) {
// 			stPatMap.push(stitchPatterns[i]);
// 			stPatMap[i].rows = {};
// 			stPatMap[i].completed = 0; //new //check
// 		}

// 		for (let y = 0; y < height; ++y) {
// 			let px_arr = reduced.splice(0, width);
// 			for (let x = 0; x < width; ++x) {
// 				let hex = hex_arr[px_arr[x]];
// 				image.setPixelColor(hex, x, y);
// 			}
// 		}

// 		hex_arr.shift(); // remove background color, don't need it anymore

// 		for (let y = 0; y < height; ++y) {
// 			for (let x = 0; x < width; ++x) {
// 				let pixColor = image.getPixelColor(x, y);
// 				if (hex_arr.includes(pixColor)) {
// 					let idx = hex_arr.indexOf(pixColor);
// 					if (!stPatMap[idx].rows[y + 1]) stPatMap[idx].rows[y + 1] = [];
// 					stPatMap[idx].rows[y + 1].push(x + 1);
// 				}
// 			}
// 		}

// 		image.write(`./out-colorwork-images/pattern_motif.png`);
// 	});
// });

// module.exports = { stPatMap };

// new Jimp(width, height, (err, img) => {
// 	if (err) throw err;
// 	for (let y = 0; y < height; ++y) {
// 		let px_arr = reduced.splice(0, width);
// 		background.push(px_arr[0], px_arr[px_arr.length - 1]); ////push edge colors to background array
// 		let px_map = [...px_arr];
// 		px_map = px_map.map((el) => (el += 1)); ////so starting from 1
// 		colors_arr.push(px_map); ////make it into an array with rows
// 		for (let x = 0; x < width; ++x) {
// 			let hex = hex_arr[px_arr[x]];
// 			img.setPixelColor(hex, x, y);
// 		}
// 	}
// 	////assign edge colors higher carrier numbers to prevent pockets
// 	function sortByFrequency(array) {
// 		let frequency = {};
// 		array.forEach(function (value) {
// 			frequency[value] = 0;
// 		});
// 		let uniques = array.filter(function (value) {
// 			return ++frequency[value] == 1;
// 		});
// 		return uniques.sort(function (a, b) {
// 			return frequency[b] - frequency[a];
// 		});
// 	}
// 	let edge_colors = sortByFrequency(background);
// 	edge_colors = edge_colors.map((el) => (el += 1)); ////so starting from 1
// 	background = edge_colors[0];
// 	if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
// 		background = 1; ////most common color according to sorting, +1 (so not strarting from 0)
// 	}
// 	//////
// 	for (let i = 1; i <= colors_data.length; ++i) {
// 		if (!edge_colors.includes(i)) {
// 			edge_colors.push(i);
// 		}
// 	}
// 	////
// 	if (edge_colors.length > 0) {
// 		/////////
// 		let new_colors_data = [];
// 		for (let i = 0; i < edge_colors.length; ++i) {
// 			new_colors_data.unshift(colors_data[edge_colors[i] - 1]);
// 		}
// 		////
// 		let replaced_bg = false;
// 		for (let i = 0; i < edge_colors.length; ++i) {
// 			edge_colors[i] = [edge_colors[i], edge_colors.length - i];
// 			if (edge_colors[i][0] === background && !replaced_bg) {
// 				background = edge_colors[i][1];
// 				replaced_bg = true;
// 			}
// 		}
// 		colors_data = [...new_colors_data];
// 		/////
// 		for (let r = 0; r < colors_arr.length; ++r) {
// 			for (let i = edge_colors.length - 1; i >= 0; --i) {
// 				colors_arr[r] = colors_arr[r].map((c) => {
// 					if (c === edge_colors[i][0]) {
// 						return (c = `${edge_colors[i][1]}`); //turn into string so doesn't get replaced later
// 					} else {
// 						return c;
// 					}
// 				});
// 			}
// 		}
// 		for (let r = 0; r < colors_arr.length; ++r) {
// 			colors_arr[r] = colors_arr[r].map((c) => (c = Number(c)));
// 		}
// 		/////
// 	}
// 	for (let h = 1; h <= colors_data.length; ++h) {
// 		colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
// 	}
// 	///
// 	colors_arr.push(palette, machine, background, colors_data);
// 	img.write(motif_path);
// 	resolve(colors_arr);
// });


// 		for (let y = 0; y < height; ++y) {
// 			for (let x = 0; x < width; ++x) {
// 				let pixColor = image.getPixelColor(x, y);
// 				if (!pixColors.includes(pixColor)) pixColors.push(pixColor); //remove //debug
// 				if (colors.includes(pixColor)) {
// 					if (!stPatMap[pixColor][y]) stPatMap[pixColor][y] = new stPatRow;
// 					stPatMap[pixColor][y].needleArr.push(x);
// 				}
// 			}
// 		}
// 		console.log('pixcolors:', pixColors); //remove //debug
// 		image.write(`./out-colorwork-images/pattern_motif.png`);
// 	});
// });

// Jimp.read(`./in-stitch-pattern-images/${stImg}`).then(image => {
// 	image.resize(width, height, (err, image) => {
// 		for (let y = 0; y < height; ++y) {
// 			for (let x = 0; x < width; ++x) {

// 			}
// 		}
// 		image.scale(0.5, (err, image) => {
// 			image.write('lena-half-bw.png');
// 		});
// 	});
// });

// Jimp.read(`./in-stitch-pattern-images/${stImg}`)
// 	.then(image => {
// 		return lenna
// 			.resize(256, 256) // resize
// 			.quality(60) // set JPEG quality
// 			.greyscale() // set greyscale
// 			.write('lena-small-bw.jpg'); // save
// 	})
// 	.catch(err => {
// 		console.error(err);
// 	});

// Jimp.read(`./in-stitch-pattern-images/${stImg}`, (err, image) => {
// 	if (err) throw err;
// 	image.resize(width, height).write(`./out-colorwork-images/pattern_motif.png`);
// }).then();







// function getData() {
// 	const processImage = new Promise((resolve) => {
// 		Jimp.read(`./out-colorwork-images/colorwork.png`).then((image) => {
// 			width = image.bitmap.width;
// 			rightN = width;
// 			height = image.bitmap.height;
// 			data = image.bitmap.data;





// 			let q = new RgbQuant(opts);
// 			q.sample(data, width);
// 			palette = q.palette(true, true);
// 			q.idxi32.forEach(function (i32) {
// 				////return array of palette color occurrences
// 				pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
// 			});
// 			// sort it yourself
// 			pal_hist.sort(function (a, b) {
// 				return a.count == b.count ? 0 : a.count < b.count ? 1 : -1;
// 			});
// 			////
// 			opts.palette = pal_hist.map((el) => (el = el.color));
// 			pal_hist = pal_hist.map((el) => (el = el.count));
// 			q = new RgbQuant(opts);
// 			q.sample(data, width);
// 			palette = q.palette(true, true);
// 			/////
// 			let hex_arr = [];
// 			const RGBToHex = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
// 			for (let h = 0; h < palette.length; ++h) {
// 				hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
// 				colors_data.push(RGBToHex(palette[h][0], palette[h][1], palette[h][2]));
// 			}
// 			/////
// 			reduced = q.reduce(data, 2); ////indexed array
// 			let motif_path = `./out-colorwork-images/knit_motif.png`;
// 			if (fs.existsSync(motif_path)) {
// 				rename: for (let i = 1; i < 100; ++i) {
// 					if (!fs.existsSync(`./out-colorwork-images/knit_motif${i}.png`)) {
// 						fs.renameSync(motif_path, `./out-colorwork-images/knit_motif${i}.png`);
// 						break rename;
// 					}
// 				}
// 			}
// 			new Jimp(width, height, (err, img) => {
// 				if (err) throw err;
// 				for (let y = 0; y < height; ++y) {
// 					let px_arr = reduced.splice(0, width);
// 					background.push(px_arr[0], px_arr[px_arr.length - 1]); ////push edge colors to background array
// 					let px_map = [...px_arr];
// 					px_map = px_map.map((el) => (el += 1)); ////so starting from 1
// 					colors_arr.push(px_map); ////make it into an array with rows
// 					for (let x = 0; x < width; ++x) {
// 						let hex = hex_arr[px_arr[x]];
// 						img.setPixelColor(hex, x, y);
// 					}
// 				}
// 				////assign edge colors higher carrier numbers to prevent pockets
// 				function sortByFrequency(array) {
// 					let frequency = {};
// 					array.forEach(function (value) {
// 						frequency[value] = 0;
// 					});
// 					let uniques = array.filter(function (value) {
// 						return ++frequency[value] == 1;
// 					});
// 					return uniques.sort(function (a, b) {
// 						return frequency[b] - frequency[a];
// 					});
// 				}
// 				let edge_colors = sortByFrequency(background);
// 				edge_colors = edge_colors.map((el) => (el += 1)); ////so starting from 1
// 				background = edge_colors[0];
// 				if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
// 					background = 1; ////most common color according to sorting, +1 (so not strarting from 0)
// 				}
// 				//////
// 				for (let i = 1; i <= colors_data.length; ++i) {
// 					if (!edge_colors.includes(i)) {
// 						edge_colors.push(i);
// 					}
// 				}
// 				////
// 				if (edge_colors.length > 0) {
// 					/////////
// 					let new_colors_data = [];
// 					for (let i = 0; i < edge_colors.length; ++i) {
// 						new_colors_data.unshift(colors_data[edge_colors[i] - 1]);
// 					}
// 					////
// 					let replaced_bg = false;
// 					for (let i = 0; i < edge_colors.length; ++i) {
// 						edge_colors[i] = [edge_colors[i], edge_colors.length - i];
// 						if (edge_colors[i][0] === background && !replaced_bg) {
// 							background = edge_colors[i][1];
// 							replaced_bg = true;
// 						}
// 					}
// 					colors_data = [...new_colors_data];
// 					/////
// 					for (let r = 0; r < colors_arr.length; ++r) {
// 						for (let i = edge_colors.length - 1; i >= 0; --i) {
// 							colors_arr[r] = colors_arr[r].map((c) => {
// 								if (c === edge_colors[i][0]) {
// 									return (c = `${edge_colors[i][1]}`); //turn into string so doesn't get replaced later
// 								} else {
// 									return c;
// 								}
// 							});
// 						}
// 					}
// 					for (let r = 0; r < colors_arr.length; ++r) {
// 						colors_arr[r] = colors_arr[r].map((c) => (c = Number(c)));
// 					}
// 					/////
// 				}
// 				for (let h = 1; h <= colors_data.length; ++h) {
// 					colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
// 				}
// 				///
// 				colors_arr.push(palette, machine, background, colors_data);
// 				img.write(motif_path);
// 				resolve(colors_arr);
// 			});
// 		});
// 	});
// 	return processImage;
// }




// let img;
// let needle_count = 0;
// let row_count = 0;

// readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nColorwork image file: ') });
// readlineSync.promptLoop(function (input) {
// 	img = input;
// 	if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-colorwork-images/${input}`)) {
// 		let error_message = console.log(chalk.red(`-- The image must be a PNG, JPG, or BMP that exists in the 'in-colorwork-images' folder.`));
// 		return error_message;
// 	}
// 	if (fs.existsSync(`./in-colorwork-images/${input}`)) {
// 		return /\.jpg|\.jpeg|\.png$/i.test(input); //TODO: test that the program does work with .bmp
// 	}
// });
// console.log(chalk.green(`-- Reading colorwork data from: ${img}`));
// readlineSync.setDefaultOptions({ prompt: '' });
// needle_count = readlineSync.questionInt(chalk.blue.bold('\nHow many stitches wide? '), {
// 	limit: Number,
// 	limitMessage: chalk.red('-- $<lastInput> is not a number.'),
// });
// console.log(chalk.green(`-- Needle count: ${needle_count}`));
// //TODO: maybe limit needle_count and row_count to whole numbers (and limit needle_count to >0) ? or could just do .toFixed
// row_count = readlineSync.question(chalk`{blue.bold \nHow many rows long?} {blue.italic (press enter to scale rows according to img dimensions) }`, {
// 	defaultInput: -1,
// 	limit: Number,
// 	limitMessage: chalk.red('-- $<lastInput> is not a number.'),
// });
// row_count = Number(row_count);
// row_count === -1 ? console.log(chalk.green(`-- Row count: AUTO`)) : console.log(chalk.green(`-- Row count: ${row_count}`));


// if (row_count === -1) {
// 	row_count = Jimp.AUTO;
// }
// let colorwork_path = `./out-colorwork-images/colorwork.png`;
// if (fs.existsSync(colorwork_path)) {
// 	rename: for (let i = 1; i < 100; ++i) {
// 		if (!fs.existsSync(`./out-colorwork-images/colorwork${i}.png`)) {
// 			fs.renameSync(colorwork_path, `./out-colorwork-images/colorwork${i}.png`);
// 			break rename;
// 		}
// 	}
// }
// Jimp.read(`./in-colorwork-images/${img}`, (err, image) => {
// 	if (err) throw err;
// 	image.resize(needle_count, row_count).write(colorwork_path);
// });
