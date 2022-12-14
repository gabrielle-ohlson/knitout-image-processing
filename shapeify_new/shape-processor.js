const Jimp = require('jimp');
const fs = require('fs');
// const chalk = require('chalk');

console = require('./utils').console;
const styler = require('./utils').styler;
const generateError = require('./utils').generateError;


function lightOrDark(color) {
	//variables for red, green, blue values
	let r, g, b, hsp;
	r = color[0];
	g = color[1];
	b = color[2];
	// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
	hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
	// Using the HSP value, determine whether the color is light or dark
	if (hsp > 127.5) {
		return 'light';
	} else {
		return 'dark';
	}
}

function process(pixels, out_path) {
	let brightness, max, last_row, first_short_row, last_short_row, shape_error, shape_err_row;
	let shape_code = [];
	let shape_code_reverse = [];
	let short_row_section = false;
	let section_count = 1;

	let colors_str = JSON.stringify(pixels); //TODO: check this (and then have it just be pixels when go over non-web code)

	if (fs.existsSync(`${out_path}/shape_code.png`)) fs.unlinkSync(`${out_path}/shape_code.png`);

// if (fs.existsSync('INPUT_DATA.json')) {
	// let colors_str = fs.readFileSync('INPUT_DATA.json').toString();
	let rgb_arr = colors_str.split(',');
	for (let i = 0; i < rgb_arr.length; ++i) {
		let rgb_values = rgb_arr[i].replace(/"|\[|\]/g, '').split(';');

		for (let n = 0; n < rgb_values.length; ++n) {
			rgb_values[n] = Number(rgb_values[n]);
		}
		rgb_arr[i] = rgb_values;
		brightness = lightOrDark(rgb_arr[i]);
		rgb_arr[i].splice(0, 3, brightness);
		if (i === rgb_arr.length - 1) {
			max = [...rgb_arr[i]];
			last_row = max.pop();
		}
	}
	let shape_row = [];
	let curr_row = 0;
	for (let i = 0; i < rgb_arr.length; ++i) {
		if (rgb_arr[i].includes('light')) {
			shape_row.push(0);
		} else {
			shape_row.push(1);
		}
		if (i === rgb_arr.length - 1) {
			shape_code.push(shape_row);
			break;
		}
		let sub_arr = rgb_arr[i + 1];
		let next_row = sub_arr.pop();
		if (next_row !== curr_row) {
			++curr_row;
			shape_code.push(shape_row);
			shape_row = [];
		}
	}
	//TODO: maybe remove this
	// let xtra_char;
	// for (let i = 0; i < shape_code.length - 1; ++i) { //NOTE: - 1 is correct
	// 	// console.log(shape_code[i].length); //remove //debug
	// 	if (shape_code[i].length === last_row + 2) {
	// 		xtra_char = shape_code[i].pop();
	// 		console.log(chalk.red('!!too long!!')); //remove
	// 	}
	// 	if (shape_code[i + 1].length === last_row) {
	// 		shape_code[i + 1].push(xtra_char);
	// 		console.log(chalk.red('!!too short!!')); //remove
	// 	}
	// }
	
	////make sure there aren't any floating white dots in the middle //TODO: maybe remove this?
	let splice_arr = [];
	// for (let y = 0; y < shape_code.length - 1; ++y) { //remove //?
	for (let y = 0; y < shape_code.length; ++y) { //?
		let px_arr = shape_code[y];
		if (px_arr.includes(0) && px_arr.includes(1)) {
			let px0_arr = []; ////array for white pixels
			for (let i = 0; i < px_arr.length; ++i) {
				if (px_arr.indexOf(0, i) === -1) {
					break;
				}
				let px_idx = px_arr.indexOf(0, i);
				if (!px0_arr.includes(px_idx)) {
					px0_arr.push(px_idx);
				}
			}
			let left_px1 = px_arr.indexOf(1); // first black px
			let right_px1 = px_arr.lastIndexOf(1); // last black px
			px0_arr.forEach((px0) => {
				if (px0 > left_px1 && px0 < right_px1) {
					shape_code[y].splice(px0, 1, '*'); // means it was replaced
					splice_arr.push(y); // to show where the first * row is
				}
			});
			//TODO: write func for cleaning up floating black dots in the background
			//TODO: figure out how to deal with kelp situation
		}
	}

	let white_space;
	let rowSectCount = 1;
	for (let r = splice_arr[splice_arr.length - 1]; r >= 0; --r) {
		let white_arr = [];
		let prevPxIdx;
		if (rowSectCount > section_count) section_count = rowSectCount; //new //check
		rowSectCount = 1; //reset it
		for (let i = 0; i < shape_code[0].length; ++i) {
			if (shape_code[r].indexOf('*', i) === -1) {
				break;
			}
			let px_idx = shape_code[r].indexOf('*', i);

			if (prevPxIdx) {
				if ((px_idx-prevPxIdx) > 1) {
					rowSectCount += 1;
				}
			} else rowSectCount += 1;
			prevPxIdx = px_idx;

			if (!white_arr.includes(px_idx)) {
				white_arr.push(px_idx);
			}
		}
		for (let w = 0; w < white_arr.length; ++w) {
			let w_px = white_arr[w];
			for (let z = r - 1; z > 0; --z) {
				let next_row = shape_code[z];
				if (next_row[w_px] === '*') {
					white_space = true;
				} else {
					white_space = false;
					break;
				}
			}
			if (white_space === true) {
				shape_code[r].splice(w_px, 1, 0);
				short_row_section = true;
			} else {
				shape_code[r].splice(w_px, 1, 1);
			}
		}
	}
	
	for (let y = 0; y < shape_code.length; ++y) {
		let px_arr = shape_code[y];
		let overlap1;
		for (let x = 0; x < shape_code[0].length; ++x) {
			if (shape_code[y + 1] !== undefined) {
				if (px_arr[x] === 0) { ////to prevent throwing errors after overlapping stitches to the left, if consecutive
					overlap1 === undefined;
				}
				if (px_arr[x] === 1) {
					if (px_arr[x] !== shape_code[y + 1][x] && overlap1 !== true) {
						if (px_arr[x + 1] === 1) {
							for (let o = x + 1; o <= px_arr.lastIndexOf(1); ++o) {
								if (px_arr[o] === 1) {
									if (px_arr[o] !== shape_code[y + 1][o]) {
										overlap1 = false;
									} else {
										overlap1 = true;
										break;
									}
								}
							}
						} else {
							overlap1 = false;
						}
					} else {
						overlap1 = true;
					}
				}
				if (overlap1 === false) {
					shape_err_row = y; //remove
					// console.log(
					// 	chalk.red(
					// 		`ShapeError: no overlapping stitches between row #${y + 1} and row #${
					// 			y + 2
					// 		}.\nCheck working directory for 'shape_code.png' to see visualization of first error in image. (Error pixels are red)\n`
					// 	)
					// ); //remove
					shape_error = true;
					break;
				}
			}
		}
		if (shape_error === true) {
			break;
		}
	}
	new Jimp(shape_code[0].length, shape_code.length, (err, image) => {
		if (err) throw err;
		for (let y = 0; y < shape_code.length; ++y) {
			let px_arr = shape_code[y];
			for (let x = 0; x < shape_code[0].length; ++x) {
				if (y !== shape_err_row && y !== shape_err_row + 1) {
					if (px_arr[x] === 0) {
						image.setPixelColor(0xffffffff, x, y); //white
					} else if (px_arr[x] === 1) {
						image.setPixelColor(255, x, y); //black
					} else {
						// console.log(chalk.red(`ShapeError: invalid character (such as '*') still in array`)); //remove
						generateError(styler(`ShapeError: invalid character (such as '*') still in array`, ['red']));
					}
				} else {
					if (px_arr[x] === 0) {
						image.setPixelColor(4293520639, x, y); //light pink
					} else if (px_arr[x] === 1) {
						image.setPixelColor(4278190335, x, y); //red
					}
				}
			}
		}
		image.dither565();
		image.write(`${out_path}/shape_code.png`);
		// image.write('shape_code.png');
	});
	////create flipped (horiz & vert) version of shape code array for it is processed in the right direction //TODO: fix this, actually shouldn't flip horizontally it seems (?)
	// for (let i = 0; i < shape_code.length; ++i) { //TODO: remove this?
	// 	let subarr_reverse = shape_code[i].reverse();
	// 	shape_code_reverse.push(subarr_reverse);
	// }px0_arr
	shape_code_reverse = [...shape_code]; //new
	shape_code_reverse = shape_code_reverse.reverse();
	first_short_row = shape_code_reverse.length - 1 - splice_arr[splice_arr.length - 1];
	last_short_row = shape_code_reverse.length - 1 - splice_arr[0];
	


	let shortrow_code;
	/* //new //*//*//*
	if (short_row_section) {
		shortrow_code = [...shape_code_reverse];
		shape_code_reverse = shortrow_code.splice(0, first_short_row);
	}
	*/

	let return_info = [
		shape_code,
		shape_code_reverse,
		shortrow_code,
		short_row_section,
		first_short_row,
		last_short_row,
		section_count,
		// shape_error,
		// shape_err_row
	];

	if (shape_error) {
			generateError(
			styler('\nERR: ', ['red', 'bold']) +
			styler(`ShapeError: no overlapping stitches between row #${shape_err_row + 1} and row #${shape_err_row + 2}.\nCheck working directory for 'shape_code.png' to see visualization of first error in image. (Error pixels are red)\n`, ['red'])
		);
	}

	return return_info;
}

module.exports = {process};

// module.exports = {
// 	shape_code,
// 	shape_code_reverse,
// 	shortrow_code,
// 	short_row_section,
// 	first_short_row,
// 	last_short_row,
// 	section_count,
// 	shape_error,
// 	shape_err_row,
// };
