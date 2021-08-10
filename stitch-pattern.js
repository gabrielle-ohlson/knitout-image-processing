const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');


//--- define some variables ---
let stImg, stitchPixels;
let stPatOpts = ['Rib', 'Bubbles', 'Seed', 'Lace']; //TODO: add more
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

fs.unlinkSync('colorsData.txt');

// if (fs.existsSync('./out-colorwork-images/pattern_motif.png')) fs.unlinkSync('./out-colorwork-images/pattern_motif.png'); //remove

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
	if (choice === 'Rib') {
		let ribOptions = ['1x1', '2x2'],
			ribChoice = readlineSync.keyInSelect(ribOptions, chalk.blue.bold(`^Which type of rib? `));
		choice = `Rib ${ribOptions[ribChoice]}`;
	}
	console.log(chalk.green('-- Using pattern: ' + choice));
	stitchPatterns.push(new StitchPattern(choice));
	if (stImg) {
		if (!readlineSync.keyInYNStrict(
			chalk`{blue.bold \nWould you like to include another stitch pattern?}`
		)) stopPrompt = true;
	} else stopPrompt = true; //new
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
	if (stImg) {
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
	} else stitchPatterns[i].carrier = 1; //only one stitchPattern, so will be 1 automatically
	if (stitchPatterns[i].name === 'Bubbles' || stitchPatterns[i].name === 'Lace') {
		if (readlineSync.keyInYNStrict(chalk.blue.bold(`\nWould you like to add any other customizations for the '${stitchPatterns[i].name}' stitch pattern?`))) {
			if (stitchPatterns[i].name === 'Bubbles') {
				stitchPatterns[i].options.bubbleWidth = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches wide should the bubbles be? `)));
				stitchPatterns[i].options.bubbleHeight = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many rows long? `)));
				if (stitchPatterns[i].options.bubbleHeight % 2 !== 0) {
					stitchPatterns[i].options.bubbleHeight += 1;
					console.log('WARNING: added an extra row so carrier will end up on correct side.');
				}
				stitchPatterns[i].options.overlap = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches should overlap between the bubbles? `)));
			} else if (stitchPatterns[i].name === 'Lace') {
				stitchPatterns[i].options.laceRows = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many rows between xfers to form new lace holes? `)));
				stitchPatterns[i].options.spaceBtwHoles = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many knit stitches between lace holes? `)));
				stitchPatterns[i].options.offset = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many needles to offset the placement of lace holes relative to the prior lace formation pass? `)));
				stitchPatterns[i].options.offsetReset = Number(readlineSync.questionInt(chalk.blue.bold(`\nAfter how many rows should the offset reset? (input 0 to have the reset be automatic) `)));
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
			if (!stImg) { //only one stitch pattern
				stPatMap.push(stitchPatterns[0]);
				stPatMap[0].id = 0;
				stPatMap[0].rows = {};
				stPatMap[0].completed = 0;
				stPatMap[0].lastDir = undefined;
				stPatMap[0].rowDone = false;
				stPatMap[0].xfers = [undefined, undefined]; //new //check
				
				let row = [];
				for (let x = 1; x <= width; ++x) {
					row.push(x);
				}

				for (let y = 0; y < height; ++y) {
					let rowNum = height - y;
					stPatMap[0].rows[rowNum] = row;
				}

				resolve(stPatMap);
				return stPatMap;
			} else {
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

						image.write(`./out-colorwork-images/pattern_motif.png`);
						resolve(stPatMap);
						return stPatMap;
					});
				});
			}
		});
	});
	return processImage;
};

module.exports = { getStitchData, stPatMap };