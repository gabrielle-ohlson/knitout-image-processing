const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let errors = false;

//---------------------------------------------------------------------------------------------
//--- RUN/GET VARIABLES FROM SHAPE-PROCESSOR.JS OR SHAPE-TEMPLATES.JS, EXTRACT SHAPE INFO ---//
//---------------------------------------------------------------------------------------------
console.log(
	chalk`{bgYellow.black.bold WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.\nIf you would like to edit the shape in the .txt file, please do so now.\nValid characters are: 0 }{black.bgYellow [white space] }{bgYellow.black.bold and 1 }{black.bgYellow [shape]}`
);

readlineSync.keyInYNStrict(chalk.blue.bold('Are you ready to proceed?'));
let { shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, section_count, shape_error, shape_err_row } = require('./shape-processor');

let shortrow_time = false;

let shaping_arr = [];
const SHAPING = ({ ROW, LEFT, RIGHT }) => ({
	ROW,
	LEFT,
	RIGHT,
});
shaping_arr.push(SHAPING({ //first row, nothing!
	ROW: 0,
	LEFT: 0,
	RIGHT: 0,
}));

let left_shortrow_arr = [];
let right_shortrow_arr = [];

if (fs.existsSync('SHAPE-CODE.txt')) {
	fs.unlinkSync('SHAPE-CODE.txt');
	console.log('Clearing shape code data...');
}
if (fs.existsSync('INPUT_DATA.json')) {
	fs.unlinkSync('INPUT_DATA.json');
	console.log('Clearing pixel data...');
}
if (fs.existsSync('cropped_shape.png')) {
	fs.unlinkSync('cropped_shape.png');
	console.log('Clearing image data...');
}

let patternEmptyNeedles = {};

const EMPTY = ({ FRONT, BACK }) => ({
	FRONT,
	BACK
});

let emptyRow = [];


//-------------------------------------------------------------------
//--- ORGANIZE SHAPING ARRAYS / DETERMINE IF TEMPLATE IS NEEDED ---//
//-------------------------------------------------------------------
let Template, piece_code1, piece_shortrow_codeL, piece_shortrow_codeR;

let stitch_patterns = [];

const PATTERN = ({ IDX, PATTERN }) => ({
	IDX,
	PATTERN,
});

let increasing = false;

if (shape_code === null) {
	Template = require('./shape-templates');
	piece_code1 = Object.values(Template.piece_obj1);
	piece_shortrow_codeL = Object.values(Template.piece_shortrow_objL);
	piece_shortrow_codeR = Object.values(Template.piece_shortrow_objR);
	pieces_arr = Object.values(Template.pieces_arr);
	
	for (let i = 0; i < piece_code1.length; ++i) {
		if (typeof piece_code1[i] === 'string') {
			stitch_patterns.push(
				PATTERN({
					IDX: i,
					PATTERN: piece_code1[i].split(' ')[1],
				})
			);
		}
	}
	
	shape_code_reverse = [...piece_code1];
	shortrow_code = [...piece_shortrow_codeL];
	first_short_row = shape_code_reverse.length;
	last_short_row = first_short_row + shortrow_code.length - 1;
	short_row_section = true;
}

//------------------------------------------------------------
//--- GET SHAPAING INFO FOR SHORT ROWING (if applicable) ---//
//------------------------------------------------------------
let shortrow_sides = [];
let shortrow_bindoff = [];
function shortRowSides(code) {
	shortrow_sides = [];
	for (let r = 0; r < code.length; ++r) {
		let idx_arr = [];
		let z = 0;
		code[r].forEach((element) => {
			if (element === 1) {
				idx_arr.push(code[r].indexOf(element, z));
			}
			++z;
		});
		let short_arr = [];
		for (let i = 0; i < idx_arr.length; ++i) {
			if (idx_arr[i] !== idx_arr[i - 1] + 1 || idx_arr[i] !== idx_arr[i + 1] - 1) {
				short_arr.push(idx_arr[i]);
			}
		}
		shortrow_sides.push(short_arr);
	}
	shortrow_bindoff.push(shortrow_sides[0][1], shortrow_sides[0][2]);
}
/////left side
function shortRowInfo(left, right, arr, main_left, main_right) {
	for (let r = 0; r < shortrow_sides.length; ++r) {
		let shape_left_dec = 0;
		let shape_left_inc = 0;
		let shape_right_dec = 0;
		let shape_right_inc = 0;
		let curr_row = shortrow_sides[r];
		let prev_row = shortrow_sides[r - 1];
		if (r > 0) {
			if (curr_row[left] !== prev_row[left]) {
				curr_row[left] > prev_row[left] ? (shape_left_dec = prev_row[left] - curr_row[left]) : (shape_left_inc = prev_row[left] - curr_row[left]);
			}
			if (curr_row[right] !== prev_row[right]) {
				curr_row[right] < prev_row[right] ? (shape_right_dec = curr_row[right] - prev_row[right]) : (shape_right_inc = curr_row[right] - prev_row[right]);
			}
		} else {
			if (curr_row[left] !== main_left && main_left !== null) {
				curr_row[left] > main_left ? (shape_left_dec = main_left - curr_row[left]) : (shape_left_inc = main_left - curr_row[left]);
			}
			if (curr_row[right] !== main_right && main_right !== null) {
				curr_row[right] < main_right ? (shape_right_dec = curr_row[right] - main_right) : (shape_right_inc = curr_row[right] - main_right);
			}
		}
		if (!increasing && (shape_left_inc !== 0 || shape_right_inc !== 0)) increasing = true;
		let shaping = SHAPING({
			ROW: shape_code_reverse.length + r,
			LEFT: shape_left_dec + shape_left_inc, ////if >0 (pos), then it's an inc. if <0 (neg). then it's a dec.
			RIGHT: shape_right_dec + shape_right_inc,
		});
		arr.push(shaping);
	}
}

//----------------------------------------
//--- GET SHAPING INFO FOR MAIN BODY ---//
//----------------------------------------
let row1_small = false;
const L_NEEDLE = 1;
const R_NEEDLE = shape_code_reverse[0].length;
let row1_Lneedle = L_NEEDLE;
let row1_Rneedle = R_NEEDLE;
function shapeInfo(code, arr) {
	for (let i = 0; i < code.length; ++i) {
		let shape_left_dec = 0;
		let shape_left_inc = 0;
		let shape_right_dec = 0;
		let shape_right_inc = 0;
		let shape_knit = true;
		let left_px1 = code[i].indexOf(1); ////first black px
		let right_px1 = code[i].lastIndexOf(1); ////last black px
		let prev_left;
		let prev_right;
		
		if (i === 0) { ////for when there are increases: check to see if the shape starts out smaller than max width
			if (left_px1 !== 0) {
				row1_small = true;
				row1_Lneedle = left_px1 + 1;
			}
			if (right_px1 !== code[i].length - 1) {
				row1_small = true;
				row1_Rneedle = right_px1 + 1;
			}
		}
		
		if (i > 0) {
			prev_left = code[i - 1].indexOf(1);
			prev_right = code[i - 1].lastIndexOf(1);
		}
		const MAIN = ({ shape_left_dec, shape_left_inc, shape_knit, shape_right_dec, shape_right_inc } = shapingDetection(
			i,
			left_px1,
			shape_left_dec,
			shape_left_inc,
			shape_knit,
			right_px1,
			shape_right_dec,
			shape_right_inc,
			prev_left,
			prev_right
		));
		if (!shape_knit) {
			if (!increasing && (shape_left_inc !== 0 || shape_right_inc !== 0)) increasing = true;
			let shaping = SHAPING({
				ROW: i,
				LEFT: MAIN.shape_left_dec + MAIN.shape_left_inc, //if >0 (pos), then it's an inc. if <0 (neg). then it's a dec.
				RIGHT: MAIN.shape_right_dec + MAIN.shape_right_inc,
			});
			arr.push(shaping);
		}
	}
}

//------------------------------------------------------------------------------------------------------------------
//--- FUNCTION FOR DETECTION SHAPING PARAMETERS FOR ACTIVE ROWS FROM SHAPE-PROCESSOR IMAGE (used in shapeInfo) ---//
//------------------------------------------------------------------------------------------------------------------
function shapingDetection(i, left_px1, shape_left_dec, shape_left_inc, shape_knit, right_px1, shape_right_dec, shape_right_inc, prev_left, prev_right) {
	if (i > 0 && left_px1 !== prev_left) {
		if (left_px1 > prev_left) {
			shape_left_dec = prev_left - left_px1;
			shape_knit = false;
		} else {
			shape_left_inc = prev_left - left_px1;
			shape_knit = false;
		}
	}
	if (i > 0 && right_px1 !== prev_right) {
		if (right_px1 < prev_right) {
			shape_right_dec = right_px1 - prev_right;
			shape_knit = false;
		} else {
			shape_right_inc = right_px1 - prev_right;
			shape_knit = false;
		}
	}
	return { shape_left_dec, shape_left_inc, shape_knit, shape_right_dec, shape_right_inc };
}

//------------------------------------------
//--- CALL FUNCTIONS TO GET SHAPE INFO ---//
//------------------------------------------
let totalRows;
if (shape_code_reverse !== null) {
	totalRows = shape_code_reverse.length; //new
	shapeInfo(shape_code_reverse, shaping_arr); //main body
	// if (shaping_arr.length === 0) { //remove
	if (shaping_arr.length === 1) { //*//*//*
		shaping_arr.push(
			SHAPING({
				ROW: first_short_row - 2,
				LEFT: 0,
				RIGHT: 0,
			}),
			SHAPING({
				ROW: first_short_row - 1,
				LEFT: 0,
				RIGHT: 0,
			})
		);
	}
	if (short_row_section) {
		totalRows += shortrow_code.length; //new //check
		if (shape_code !== null) {
			shortRowSides(shortrow_code);
			shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
			shortRowInfo(2, 3, right_shortrow_arr, null, shape_code_reverse[shape_code_reverse.length - 1].lastIndexOf(1)); ////right side
		} else {
			shortRowSides(shortrow_code);
			shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
			shortrow_code = [...piece_shortrow_codeR];
			shortRowSides(shortrow_code);
			shortRowInfo(0, 1, right_shortrow_arr, null, shape_code_reverse[shape_code_reverse.length - 1].lastIndexOf(1)); ////right side
		}
		shortrow_bindoff = shortrow_bindoff.filter((e) => e);
	}
}

//--------------------------------------------------------------------
//--- GET USER INPUT (IN FILE & SAVE AS) AND WRITE FILE TO ARRAY ---//
//--------------------------------------------------------------------
let source_file, source_dir;
if (fs.existsSync('SOURCE_FILE.txt')) {
	console.log('Reading source file data...');
	let source_data = fs.readFileSync('SOURCE_FILE.txt').toString().split('\n');
	source_file = source_data[0];
	source_dir = source_data[1];
	fs.unlinkSync('SOURCE_FILE.txt');
}
//TODO: limit it to creating new files or just editing ones produced by image processing program (and remove option of pulling from 'knit-in-files' folder)
if (source_file === undefined) {
	readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold \nWhat is the name of the file that you would like to add shaping to? }` });
	readlineSync.promptLoop(function (input) {
		if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
		input = `${input}.k`;
		source_file = input;
		if (
			!fs.existsSync(`./knit-out-files/${input}`) &&
      !fs.existsSync(`./knit-out-files/${input}.k`) &&
      !fs.existsSync(`./knit-in-files/${input}`) &&
      !fs.existsSync(`./knit-in-files/${input}.k`)
		) {
			console.log(chalk`{red -- Input valid name of a knitout (.k) file that exists in either the 'knit-out-files' or 'knit-in-files' folder, please.}`);
		}
		if (fs.existsSync(`./knit-in-files/${input}`)) {
			source_dir = './knit-in-files/';
		} else if (fs.existsSync(`./knit-out-files/${input}`)) {
			source_dir = './knit-out-files/';
		}
		return fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-in-files/${input}`);
	});
	console.log(chalk.green(`-- Reading from: ${source_file}`));
}

readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave new file as: ') });
let new_file, overwrite;
readlineSync.promptLoop(function (input) {
	if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
	input = `${input}.k`;
	new_file = input;
	if (fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-out-files/${input}.k`)) {
		overwrite = readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`);
		return overwrite;
	}
	if (!fs.existsSync(`./knit-out-files/${input}`)) {
		return !fs.existsSync(`./knit-out-files/${input}.k`);
	}
});
console.log(chalk.green(`-- Saving new file as: ${new_file}`));
readlineSync.setDefaultOptions({ prompt: '' });

let sinkers = readlineSync.keyInYNStrict(
	chalk`{blue.bold \nDoes the machine you are using have sinkers?} {blue.italic (If you are using a kniterate machine, the answer is no [enter 'n']. Otherwise, the answer is likely yes [enter 'y'], but you should double-check to ensure no damage is done to your machine during short-rowing.)}`
);

let in_file = fs
	.readFileSync(source_dir + source_file)
	.toString()
	.split(';r');
for (let i = 0; i < in_file.length; ++i) {
	in_file[i] = in_file[i].split('\n');
	in_file[i] = in_file[i].filter((el) => !el.includes('ow:')); //;row (just just 'ow:' because split at ';r')
}

let yarn_out, yarn_in;
sinkers ? ((yarn_out = 'outhook'), (yarn_in = 'inhook')) : ((yarn_out = 'out'), (yarn_in = 'in'));
let caston_section = in_file.shift();
// if (short_row_section) {
// 	caston_section = caston_section.filter((el) => !el.includes(`${yarn_out} `)); //// remove yarn-outs so can add them back in @ correct positions
// }
caston_section = caston_section.filter((el) => !el.includes(`${yarn_out} `)); //// remove yarn-outs so can add them back in @ correct positions //new //check //*

let stitch_number = 6; //default
let stitch_header = caston_section.find((line) => line.includes('x-stitch-number'));
if (stitch_header !== undefined) stitch_number = Number(stitch_header.split(' ')[1]);

let speed_number = 300; //default
let speed_header = caston_section.find((line) => line.includes('x-speed-number'));
if (speed_header !== undefined) speed_number = Number(speed_header.split(' ')[1]);

let roller_advance = 100;
let roller_header = caston_section.find((line) => line.includes('x-roller-advance'));
if (roller_header !== undefined) roller_advance = Number(speed_header.split(' ')[1]);


let bg_color = caston_section.find((line) => line.includes(';background color:')); ////method to do fake seam carving (use background needles only when xfering in middle of panel)
bg_color = bg_color.charAt(bg_color.length - 1);

let draw_thread = caston_section.find((line) => line.includes(';draw thread:')); ////for shortrowcarriers, know that first one ends up on the right (because draw thread) and rest are on left
draw_thread = draw_thread.charAt(draw_thread.length - 1);

let rib_top, rib_top_carrier, rib_top_dir, bindoff_section;

let rib_start = in_file[in_file.length - 1].findIndex((el) => el === ';begin rib');
if (rib_start !== -1) {
	rib_top = in_file[in_file.length - 1].splice(rib_start);
	bindoff_section = rib_top.splice(rib_top.indexOf(';bindoff section'));
	rib_dir: for (let i = rib_top.length - 1; i >= 0; --i) {
		if (rib_top[i].includes('knit ')) {
			rib_top_carrier = rib_top[i].split(' ')[2]; //new //check
			rib_top[i].includes('+') ? (rib_top_dir = '+') : (rib_top_dir = '-');
			break rib_dir;
		}
	}
} else {
	bindoff_section = in_file[in_file.length - 1].splice(in_file[in_file.length - 1].indexOf(';bindoff section'));
}

//---------------------------------------------------
//--- CREATE ARRAY OF CARRIERS USED IN THE FILE ---//
//---------------------------------------------------
let carriers = [];
in_file.forEach((arr) =>
	arr.map((element) => {
		if (element.includes(' + ') || element.includes(' - ')) {
			carriers.push(element.charAt(element.length - 1));
		}
	})
);
carriers = [...new Set(carriers)];
carriers = carriers.sort((a, b) => a - b);

//---------------------------------------------------------------
//--- GET USER INPUT (PREFERNCES/MACHINE SPECS/SWATCH INFO) ---//
//---------------------------------------------------------------
let inc_methods, inc_method;
if (increasing) {
	(inc_methods = ['xfer', 'twisted-stitch', 'split']), (inc_method = readlineSync.keyInSelect(inc_methods, chalk.blue.bold(`^Which increasing method would you like to use?`)));
	inc_method = inc_methods[inc_method];
}

let xfer_speed_number = readlineSync.question(
	chalk`{blue.bold \nWhat carriage speed would you like to use for transfer operations?} {blue.italic (press Enter to use default speed, 300.) }`,
	{
		defaultInput: 300,
		limit: Number,
		limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	}
);
xfer_speed_number = Number(xfer_speed_number);

let split_speed_number = 100; //come back

console.log(chalk.green('\nPlease wait...'));

//--------------------------------------------------------------------------------------------------------------
//--- FOR KNITERATE: CREATE ARRAY OF CARRIERS AVAILABLE TO USE FOR SHORT ROWING, & THROW ERR IF NOT ENOUGH ---//
//--------------------------------------------------------------------------------------------------------------
let short_row_carriers = ['6', '5', '4', '3', '2', '1'];
if (short_row_section) {
	for (let r = first_short_row; r <= last_short_row; ++r) {
		for (let c = 1; c <= 6; ++c) {
			c = c.toString();
			in_file[r].map((element) => {
				if ((element.includes(' + ') || element.includes(' - ')) && element.charAt(element.length - 1) === c) {
					short_row_carriers = short_row_carriers.filter((el) => el !== c);
				}
			});
			c = Number(c);
		}
	}
}
let redefine_carriers = [];
let xtra_neg_carriers = []; //carriers to be added in for short_row_section
if (short_row_section) xtra_neg_carriers = short_row_carriers.filter((el) => !carriers.includes(el) && el !== draw_thread);
if (short_row_carriers.length === 5 && !carriers.includes(draw_thread)) {
	xtra_neg_carriers = [];
}

if (short_row_carriers.length < 3 && short_row_section && !sinkers) {
	console.log(
		chalk`{red.bold \nERR:} {red the section of the panel that will be altered to include short-rowing contains ${
			6 - short_row_carriers.length
		} colors, but the maximum color-count for that section is 3 (to allow for separate carriers to work either side while short-rowing).}`
	);
	errors = true;
}

//--------------------------------------------------------------------------------------------
//--- SHIFT CAST-ON SECTION OVER IF NECESSARY/ADD IN SHORTROW YARN CARRIERS IF NECESSARY ---//
//--------------------------------------------------------------------------------------------
//TODO: add this for shima caston
let header = caston_section,
	yarns_in = [],
	rib_bottom = [],
	base = [];

//TODO: only have xtra_neg_carriers brought in if they are necessary (i.e. if only one color is used in short row section, no xtra carriers [or if math works out so carriers are on correct side])
yarns_in = header.splice(header.findIndex((el) => el.includes(';background color:')) + 1);
caston_section = yarns_in.splice(yarns_in.findIndex((el) => el.includes(';kniterate yarns in')));

let caston_carrier;
let waste_carrier = caston_section[caston_section.findIndex(el => el.includes('drop ')) - 1];
let waste_dir, waste_needle1, waste_needle2;
waste_carrier.includes('+')
	? ((waste_dir = '+'), (waste_needle1 = row1_Lneedle), (waste_needle2 = row1_Rneedle))
	: ((waste_dir = '-'), (waste_needle1 = row1_Rneedle), (waste_needle2 = row1_Lneedle));
waste_carrier = waste_carrier.charAt(waste_carrier.length - 1);

rib_start = caston_section.findIndex((el) => el === ';begin rib');
let rib_bottom_carrier, rib_bottom_dir;
if (rib_start !== -1) { //TODO: check
	rib_bottom = caston_section.splice(rib_start);

	for (let i = 0; i < rib_bottom.length; ++i) { //new //check //*
		if (rib_bottom[i].includes('knit ')) {
			let rib_info = rib_bottom[i].split(' ');
			if (!rib_bottom_carrier) rib_bottom_carrier = rib_info[3];

			if (rib_info[1] !== rib_bottom_dir) {
				rib_bottom_dir = rib_info[1];
				if (rib_bottom_dir === '+') rib_bottom.splice(i, 0, `;pass: rib ;${rib_bottom_dir};${rib_bottom_carrier};${row1_Lneedle};${row1_Rneedle}`);
				else  rib_bottom.splice(i, 0, `;pass: rib ;${rib_bottom_dir};${rib_bottom_carrier};${row1_Rneedle};${row1_Lneedle}`);
				++i; //check
			}
		}
	}
}

let left_diff = row1_Lneedle - L_NEEDLE;
let kniterate_caston = [];

// let missedEndN = false; //remove
yarnsin: for (let i = 0; i < yarns_in.length; ++i) {
	let line = yarns_in[i].split(' ');

	if ((i === yarns_in.length - 1 || yarns_in[i + 1].includes(yarn_in)) && line[1] === '+' && line[3] != waste_carrier) { //*
		if (Number(kniterate_caston[kniterate_caston.length-1].split(' ')[2].substr(1)) < row1_Rneedle) kniterate_caston.push(`miss + f${row1_Rneedle} ${line[3]}`); //new //check
		// kniterate_caston.push(`miss + f${row1_Rneedle+1} ${line[3]}`); //new //check //go back! //?

		kniterate_caston.splice(
			kniterate_caston.findIndex((el) => el.includes(`;pass: yarn in ;-;${line[3]}`)),
			1,
			`;pass: yarn in ;+;${line[3]};${row1_Lneedle};${row1_Rneedle}`
		);
	}

	if (line[0] === yarn_in && line[1] != waste_carrier) {
		// missedEndN = false; //remove //?
		kniterate_caston.push(`;pass: yarn in ;-;${line[1]};${row1_Rneedle};${row1_Lneedle}`);
	}

	if (line[0] === 'knit' || line[0] === 'miss') {
		let n = 2;
		[bed, line[n]] = [line[n][0], line[n].substr(1)];
		let n_count = Number(line[n]) + left_diff;
		line[n] = `${bed}${n_count}`;
		
		if (n_count <= row1_Rneedle) {
			kniterate_caston.push(line.join(' '));
			// if (!missedEndN && ((line[1] === '+' && n_count === row1_Rneedle) || (line[1] === '-' && n_count === row1_Lneedle))) missedEndN = true; //new //*
		} else {
			// if (!missedEndN) { //new //*
			// 	if (line[1] === '+') kniterate_caston.push(`miss + f${row1_Rneedle} ${line[3]}`);
			// 	else kniterate_caston.push(`miss - f${row1_Lneedle} ${line[3]}`);
			// 	missedEndN = true;
			// }
			continue yarnsin;
		}

	} else if (line[0] !== 'drop') {
		kniterate_caston.push(yarns_in[i]);
	}
}

let draw_dir, caston_dir;
caston: for (let i = 0; i < caston_section.length; ++i) {
	let line = caston_section[i].split(' ');
	if (line[0] === 'knit' || line[0] === 'miss' || line[0] === 'drop') {
		let n = 2;
		line[0] === 'drop' ? (n = 1) : (n = 2);
		[bed, line[n]] = [line[n][0], line[n].substr(1)];
		let n_count = Number(line[n]) + left_diff;
		line[n] = `${bed}${n_count}`;
		// if (caston_section[i - 1] === 'rack 0.25') {
		if (caston_section[i - 1] === 'rack 0.25' || caston_section[i - 1] === ';single bed cast-on') {
			kniterate_caston.splice(kniterate_caston.findIndex((el) => el.includes(`;${line[3]};`)), 1); ///// remove this so don't have worry about inc_miss inserting backpass
			
			caston_carrier = line[3];

			findCastonDir: for (let ln = i; ln < caston_section.length; ++ln) { //new //v
				let info = caston_section[ln].split(' ');
				if (info[0] === 'knit') {
					if (info[3] === caston_carrier) caston_dir = info[1];
					else break findCastonDir;
				}
			} //new //^
			let waste_needle1, waste_needle2;
			caston_dir ? ((waste_needle1 = row1_Lneedle), (waste_needle2 = row1_Rneedle)) : ((waste_needle1 = row1_Rneedle), (waste_needle2 = row1_Lneedle));
			kniterate_caston.push(`;pass: caston ;${caston_dir};${caston_carrier};${waste_needle1};${waste_needle2}`);
			// line[1] === '+' ? ((waste_needle1 = row1_Lneedle), (waste_needle2 = row1_Rneedle)) : ((waste_needle1 = row1_Rneedle), (waste_needle2 = row1_Lneedle));
			// kniterate_caston.push(`;pass: caston ;${line[1]};${caston_carrier};${waste_needle1};${waste_needle2}`);
		}
		if (n_count <= row1_Rneedle) {
			kniterate_caston.push(line.join(' '));
		} else {
			// if (!carriers.includes(draw_thread) && caston_section[i + 1] === 'rack 0.25') {
			if (!carriers.includes(draw_thread) && (caston_section[i + 1] === 'rack 0.25' || caston_section[i + 1] === ';single bed cast-on')) {
				if (draw_dir === '-') kniterate_caston.push(`miss - f${L_NEEDLE} ${draw_thread}`);
				else kniterate_caston.push(`miss + f${R_NEEDLE} ${draw_thread}`); //TODO: make this dependent on direction of draw thread, if change knitify to have option of draw thread in diff direction
			}
			continue caston;
		}
	} else {
		kniterate_caston.push(caston_section[i]);
		if (i === 0) kniterate_caston.push(`;pass: waste yarn ;${waste_dir};${waste_carrier};${waste_needle1};${waste_needle2}`);
		if (caston_section[i].includes(';draw thread')) {
			draw_dir = caston_section[i+1].split(' ')[1];
			let draw_needle1, draw_needle2;
			if (row1_small && carriers.includes(draw_thread)) {
				if (draw_dir === '+') {
					draw_needle1 = row1_Lneedle;
					draw_needle2 = row1_Rneedle;
				} else {
					draw_needle1 = row1_Rneedle;
					draw_needle2 = row1_Lneedle;
				}
			} else {
				if (draw_dir === '+') {
					draw_needle1 = L_NEEDLE;
					draw_needle2 = R_NEEDLE;
				} else {
					draw_needle1 = R_NEEDLE;
					draw_needle2 = L_NEEDLE;
				}
			}
			let draw_Rneedle;
			row1_small && carriers.includes(draw_thread) ? (draw_Rneedle = row1_Rneedle) : (draw_Rneedle = R_NEEDLE);
			kniterate_caston.push(`;pass: draw thread ;${draw_dir};${draw_thread};${draw_needle1};${draw_needle2}`);
			// kniterate_caston.push(`;pass: draw thread ;+;${draw_thread};${row1_Lneedle};${draw_Rneedle}`);
		}
	}
}

if (rib_bottom.length > 0) {
	if (row1_small) {
		if (row1_Lneedle !== L_NEEDLE) {
			for (let cc = L_NEEDLE; cc < row1_Lneedle; ++cc) {
				rib_bottom = rib_bottom.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}
		if (row1_Rneedle !== R_NEEDLE) {
			for (let cc = R_NEEDLE; cc > row1_Rneedle; --cc) {
				rib_bottom = rib_bottom.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}
	}
	kniterate_caston.push(rib_bottom);
}
caston_section = kniterate_caston.flat();

//--------------------------------------------------------------
//--- FACTORY FUNCTIONS TO STORE CARRIER PARKING POSITIONS ---//
//--------------------------------------------------------------
let tracked_carriers = [];
let carrier_track = {}; //new //check
let final_carrier_pos = []; //TODO: remove code for final_carrier_pos since no longer using

const CARRIER_PARK = ({ CARRIER, SIDE, ROW, IDX }) => ({
	CARRIER,
	SIDE,
	ROW,
	IDX,
});

let doneCs = [];
let maybeNewCs = [draw_thread, waste_carrier, caston_carrier, rib_bottom_carrier, rib_top_carrier];
maybeNewCs = maybeNewCs.filter(el => el !== undefined);
let cDirs = [draw_dir, waste_dir, caston_dir, rib_bottom_dir, rib_top_dir];

for (let c = 0; c < maybeNewCs.length; ++c) {
	let carrier_side = (cDirs[c] === '+' ? 'right' : 'left');
	let carrier_row = 0; //to indicate before main knitting
	if (c === maybeNewCs.length-1) carrier_row = totalRows; //if rib top
	if (!doneCs.includes(maybeNewCs[c])) {
		final_carrier_pos.push(
			CARRIER_PARK({
				CARRIER: maybeNewCs[c], //could be altered if draw_thread is used in main body section too
				// SIDE: 'right',
				SIDE: carrier_side,
				ROW: carrier_row, //to indicate waste yarn section
				// ROW: 0, //to indicate waste yarn section
				IDX: 0,
			})
		);
	} else {
		let posIdx = final_carrier_pos.findIndex((el) => el.CARRIER == maybeNewCs[c]);
		final_carrier_pos[posIdx].SIDE = carrier_side;
		if (c === maybeNewCs.length-1) final_carrier_pos[posIdx].ROW = totalRows; //if rib top
	}
	doneCs.push(maybeNewCs[c]);
}


//----------------------------------------------------------------
//--- SPLIT FILE INTO ARRAY OF ROWS WITH SUBARRAYS OF PASSES ---//
//----------------------------------------------------------------
let shapeifyIgnore = false;

let rows = [];
let pass_count = 1;
const OP = ({ TYPE, DIR, NEEDLE, CARRIER }) => ({
	TYPE,
	DIR,
	NEEDLE,
	CARRIER,
});
let dir, needle, carrier;
for (let i = 0; i < in_file.length; ++i) {
	let pass_check = [];
	let row = [];
	let pass = [];
	pass_loop: for (let p = 0; p < in_file[i].length; ++p) {
		let op_arr = in_file[i][p].split(' ');
		let type = op_arr[0];
		if (type.includes(';') || type.includes('out')) { //TODO: maybe push comments
			if (type === ';empty:') { //come back!
				let passEmptyNeedles = op_arr.filter(el => el.charAt(0) === 'f' || el.charAt(0) === 'b');
				if (!patternEmptyNeedles[rows.length - 1]) patternEmptyNeedles[rows.length - 1] = [];
				patternEmptyNeedles[rows.length - 1] = [...patternEmptyNeedles[rows.length - 1], ...passEmptyNeedles]; //new //*
				// patternEmptyNeedles[rows.length - 1] = op_arr.filter(el => el.charAt(0) === 'f' || el.charAt(0) === 'b');
			} else if (type === ';shapeify_ignore') { //new //*
				if (op_arr[1] === 'start') shapeifyIgnore = true;
				else if (op_arr[1] === 'end') shapeifyIgnore = false;
			}
			continue pass_loop;
		}

		if (shapeifyIgnore || type.includes('x-') || (type === 'rack')) {
			pass.push(in_file[i][p]);
			continue pass_loop;
		}
		
		let extension = false;

		if ((type.charAt(0) === 'x' &&  type.charAt(1) === '-') || type === 'pause' || type === 'rack') {
			if (pass.length === 0 || pass.every(el => el.includes('x-') || el.includes('rack') || el.charAt(0) === ';' || el.includes('pause'))) {
				pass.push(in_file[i][p]);
				continue pass_loop;
			} else {
				extension = true;
			}
		}
		
		if (type !== 'xfer' && type !== 'drop' && !extension) { //* TODO: see how xfer and drop are handled
			//TODO: add support for xfer & drop ?
			op_arr[1] === '+' || '-'
				? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
				: ((dir = null), (needle = op_arr[1]), (carrier = null));
		} else if (!extension) {
			dir = type;
		}

		if (carrier !== null && carrier !== undefined) {
			let side = dir === '+' ? ('right') : ('left');
			if (!tracked_carriers.includes(carrier)) {
				tracked_carriers.push(carrier);
				carrier_track[carrier] = {}; //new //*
			}

			carrier_track[carrier][rows.length] = { 'side': side, 'idx': row.length }; //new //*

			if (short_row_section && pass_check.length > 0) {
				// if (rows.length < first_short_row - 1) { //beep //TODO: change this to < first_short_row //? //*//*//*
				if (rows.length < first_short_row) { //beep //TODO: change this to < first_short_row //? //*//*//*
					// let side;
					// dir === '+' ? (side = 'right') : (side = 'left');
					let carrier_idx = final_carrier_pos.findIndex((el) => el.CARRIER == carrier);
					// if (carrier !== null && carrier !== undefined) { //* //new undefined
					if (carrier_idx === -1) {
						final_carrier_pos.push(
							CARRIER_PARK({
								CARRIER: carrier,
								SIDE: side,
								ROW: rows.length,
								IDX: row.length,
							})
						);
					} else {
						final_carrier_pos[carrier_idx].SIDE = side;
						final_carrier_pos[carrier_idx].ROW = rows.length;
						final_carrier_pos[carrier_idx].IDX = row.length;
					}
					// }
				}
			}
		}
		
		//TODO: since 3 happens before bindoff for shortrow, side should be right
		if (pass_check.length > 0 && (extension || pass_check[pass_check.length - 1].DIR !== dir || pass_check[pass_check.length - 1].CARRIER !== carrier)) {
			pass_check[pass_check.length - 1].DIR === '+' || pass_check[pass_check.length - 1].DIR === '-' ? pass.unshift(`;pass: ${pass_count} ;${pass_check[pass_check.length - 1].DIR};${pass_check[pass_check.length - 1].CARRIER}`) : pass.unshift(`;pass: ${pass_count} ;${pass_check[pass_check.length - 1].DIR}`);

			++pass_count;
			row.push(pass);
			pass_check = [];
			pass = [];
			pass.push(in_file[i][p]);
		} else {
			pass_check.push(
				OP({
					TYPE: type,
					DIR: dir,
					NEEDLE: needle,
					CARRIER: carrier,
				})
			);
			pass.push(in_file[i][p]);
		}
	}
	rows.push(row);
}

function findCarrierSide(c, row, passIdx) {
	let carrierRows = Object.keys(carrier_track[c]);

	if (carrierRows.includes(row)) {
		if (passIdx && carriersRows[row].idx >= passIdx) return carrier_track[c][Math.max.apply(null, carrierRows.filter(function(r){return r < row}))].side; //find most recent row excluding current row if passIdx / this carrier knits during or after given passIdx
		else return carrier_track[c][row].side;
	} else return carrier_track[c][Math.max.apply(null, carrierRows.filter(function(r){return r <= row}))].side;
}

function findCarrierOnSide(side, row, passIdx, returnAll) {
	let sideCs = [];
	for (let i = 0; i < tracked_carriers.length; ++i) {
		let cSide = findCarrierSide(tracked_carriers[i], row, passIdx);
		if (cSide == side) {
			if (returnAll) sideCs.push(tracked_carriers[i]);
			else return tracked_carriers[i];
		}
	}
	if (returnAll) return sideCs;
}


//--------------------------------------------------------------------------------------
//--- DETERMINE IF SINGLE OR DOUBLE BED //; IDENTIFY THE LEFT & RIGHT MOST NEEDLES ---//
//--------------------------------------------------------------------------------------
let needle_count_arr = rows.flat(2);
// needle_count_arr = needle_count_arr.filter((el) => !el.includes(';') && !el.includes('x-') && !el.includes('miss') && !el.includes('tuck') && !el.includes('drop') && !el.includes('xfer') && !el.includes('pause') && !el.includes('rack')); //new //remove //?

let double_bed;
needle_count_arr.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false);

let bpBed = (double_bed ? 'b' : 'f'); //new //check

// needle_count_arr = needle_count_arr.map((el) => el.match(/\d+/g)); //remove //?
// needle_count_arr = needle_count_arr.map((arr) => arr.splice(0, 1)); //remove //?
// needle_count_arr = needle_count_arr.map((el) => Number(el));//remove //?

//-----------------------------------------------
//--- DEFINE STARTING VALUE OF SIDE NEEDLES ---//
//-----------------------------------------------
let Xleft_needle = L_NEEDLE;
let Xright_needle = R_NEEDLE;

//-----------------------------------
//--- PROTO STACK DEC FUNCTIONS ---//
//-----------------------------------
const LEFT_XFER = (xfer_section, xfer_needle, count, from, rack, alt) => {
	for (let x = xfer_needle; x < xfer_needle + count; ++x) {
		if (alt === true && (x - xfer_needle) % 2 !== 0) {
			continue;
		} else {
			from === 'f' ? xfer_section.push(`xfer f${x + rack} b${x}`) : xfer_section.push(`xfer b${x} f${x + rack}`);
		}
	}
};
const RIGHT_XFER = (xfer_section, xfer_needle, count, from, rack, alt) => {
	for (let x = xfer_needle; x > xfer_needle - count; --x) {
		if (alt === true && (xfer_needle - x) % 2 !== 0) {
			continue;
		} else {
			from === 'f' ? xfer_section.push(`xfer f${x + rack} b${x}`) : xfer_section.push(`xfer b${x} f${x + rack}`);
		}
	}
};
let xfer_section = [];
////dec 1 ? count = 3 & rack = 1; dec2 ? count = 4 & rack = 2;
const decSingleBed = (dec_needle1, count1, rack1, side, dec_needle2, count2, rack2) => {
	//TODO: maybe fix this so there's no rack 2 or rack -2 (like with double bed funcs)
	////dec_needle2 & count2 could be null (if only dec on one side); if not null, should be right dec needle
	if (side === 'left') {
		LEFT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
		xfer_section.push(`rack ${rack1}`);
		// LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack, false);
		LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack1, false);
	} else if (side === 'right') {
		RIGHT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
		xfer_section.push(`rack -${rack1}`);
		// RIGHT_XFER(xfer_section, dec_needle1, count1, 'b', -rack, false);
		RIGHT_XFER(xfer_section, dec_needle1, count1, 'b', -rack1, false);
	} else { ////both
		LEFT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
		RIGHT_XFER(xfer_section, dec_needle2, count2, 'f', 0, false);
		xfer_section.push(`rack ${rack1}`);
		// LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack, false);
		LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack1, false);
		xfer_section.push(`rack -${rack2}`);
		// RIGHT_XFER(xfer_section, dec_needle2, count2, 'b', -rack, false);
		RIGHT_XFER(xfer_section, dec_needle2, count2, 'b', -rack2, false);
	}
	xfer_section.push('rack 0');
};


const dec1DoubleBed = (dec_needle, side) => { ////if double bed, need to just do it twice
	if (emptyRow.length) xfer_section.push('x-carrier-stopping-distance 3.5');

	let racking = 0;
	if (side === 'left') {
		if (!emptyRow.includes(`b${dec_needle}`)  && (!emptyRow.includes(`f${dec_needle + 1}`) || !emptyRow.includes(`b${dec_needle + 1}`))) {
			racking = 1;
			xfer_section.push('rack 1');
			
			xfer_section.push('x-add-roller-advance 150');
			xfer_section.push(`xfer b${dec_needle} f${dec_needle + 1}`);
			if (emptyRow.includes(`f${dec_needle + 1}`)) {
				racking = 0;
				xfer_section.push('rack 0');

				xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 1}`);
			}
		}

		if (!emptyRow.includes(`b${dec_needle + 1}`) && !emptyRow.includes(`f${dec_needle + 2}`)) {
			if (racking !== 1) {
				racking = 1;
				xfer_section.push('rack 1'); //put rack back to 1
			}
			xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 2}`); //come back!
		}

		if (!emptyRow.includes(`f${dec_needle}`) && (!emptyRow.includes(`b${dec_needle + 1}`) || !emptyRow.includes(`f${dec_needle + 1}`))) {
			racking = -1;
			xfer_section.push('rack -1');

			xfer_section.push('x-add-roller-advance 100');
			xfer_section.push(`xfer f${dec_needle} b${dec_needle + 1}`);
			if (emptyRow.includes(`b${dec_needle + 1}`)) {
				racking = 0;
				xfer_section.push('rack 0');
				xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 1}`);
			}
		}

		if (racking !== 0) xfer_section.push('rack 0');
	}
	if (side === 'right') {
		if (!emptyRow.includes(`b${dec_needle}`) && (!emptyRow.includes(`f${dec_needle - 1}`) || !emptyRow.includes(`b${dec_needle - 1}`))) {
			racking = -1;
			xfer_section.push('rack -1');
			xfer_section.push(`x-add-roller-advance 150`);
			xfer_section.push(`xfer b${dec_needle} f${dec_needle - 1}`);
			if (emptyRow.includes(`f${dec_needle - 1}`)) {
				racking = 0;
				xfer_section.push('rack 0');
				xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 1}`);
			}
		}

		if (!emptyRow.includes(`b${dec_needle - 1}`) && !emptyRow.includes(`f${dec_needle - 2}`)) {
			if (racking !== -1) {
				racking = -1;
				xfer_section.push('rack -1'); //put rack back to -1
			}
			xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 2}`);
		}

		if (!emptyRow.includes(`f${dec_needle}`) && (!emptyRow.includes(`b${dec_needle - 1}`) || !emptyRow.includes(`f${dec_needle - 1}`))) {
			racking = 1;
			xfer_section.push('rack 1');
			xfer_section.push('x-add-roller-advance 100');
			xfer_section.push(`xfer f${dec_needle} b${dec_needle - 1}`);

			if (emptyRow.includes(`b${dec_needle - 1}`)) {
				racking = 0;
				xfer_section.push('rack 0');
				xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 1}`);
			}
		}

		if (racking !== 0) xfer_section.push('rack 0');
	}

	if (emptyRow.length) xfer_section.push('x-carrier-stopping-distance 2.5');
};


const dec2DoubleBed = (dec_needle, side) => {
	let racking = 0;

	if (emptyRow.length) xfer_section.push('x-carrier-stopping-distance 3.5');

	if (side === 'left') {
		if (!emptyRow.includes(`b${dec_needle + 2}`)) {
			if (!emptyRow.includes(`f${dec_needle + 2}`) || !emptyRow.includes(`b${dec_needle + 3}`)) {
				xfer_section.push('x-add-roller-advance 100');
				xfer_section.push(`xfer b${dec_needle + 2} f${dec_needle + 2}`); // || !emptyRow.includes(`b${dec_needle + 3}`) //!
			}
		}

		if (!emptyRow.includes(`b${dec_needle + 3}`) && !emptyRow.includes(`f${dec_needle + 3}`)) { //* //no
			xfer_section.push(`xfer b${dec_needle + 3} f${dec_needle + 3}`);
		}

		if (!emptyRow.includes(`f${dec_needle}`) && !emptyRow.includes(`b${dec_needle + 1}`)) { //* //no
			racking = -1;
			xfer_section.push('rack -1');

			xfer_section.push('x-add-roller-advance 150');
			xfer_section.push(`xfer f${dec_needle} b${dec_needle + 1}`); //TODO: move this if necessary
		}

		if (!emptyRow.includes(`f${dec_needle + 1}`) && !emptyRow.includes(`b${dec_needle + 2}`)) {
			if (racking !== -1) {
				racking = -1;
				xfer_section.push('rack -1');
			}
			xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 2}`);
		}

		if (!emptyRow.includes(`b${dec_needle + 3}`) && (!emptyRow.includes(`f${dec_needle + 2}`) || !emptyRow.includes(`b${dec_needle + 2}`))) {
			if (racking !== -1) {
				racking = -1;
				xfer_section.push('rack -1');
			}
			xfer_section.push(`xfer f${dec_needle + 2} b${dec_needle + 3}`);
		}

		if (!emptyRow.includes(`b${dec_needle}`)) {
			if (!emptyRow.includes(`f${dec_needle + 1}`) || !emptyRow.includes(`b${dec_needle + 2}`) || !emptyRow.includes(`b${dec_needle + 1}`)) {
				racking = 1;
				xfer_section.push('rack 1');

				xfer_section.push('x-add-roller-advance 100');
				xfer_section.push(`xfer b${dec_needle} f${dec_needle + 1}`);
				if (emptyRow.includes(`f${dec_needle + 1}`) && emptyRow.includes(`b${dec_needle + 2}`)) {
					racking = 0;
					xfer_section.push('rack 0');

					xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 1}`);
				}
			}
		}

		if (!emptyRow.includes(`b${dec_needle + 1}`) && (!emptyRow.includes(`f${dec_needle + 2}`) || !emptyRow.includes(`b${dec_needle + 2}`))) {
			if (racking !== 1) {
				racking = 1;
				xfer_section.push('rack 1');
			}

			xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 2}`);
			if (emptyRow.includes(`f${dec_needle + 2}`)) {
				racking = 0;
				xfer_section.push('rack 0');
				xfer_section.push(`xfer f${dec_needle + 2} b${dec_needle + 2}`);
			}
		}

		if (!emptyRow.includes(`f${dec_needle + 1}`) && (!emptyRow.includes(`b${dec_needle + 2}`) || !emptyRow.includes(`f${dec_needle + 2}`))) {
			if (emptyRow.includes(`f${dec_needle + 2}`) && emptyRow.includes(`b${dec_needle + 3}`)) { //prevent triple stack
				racking = -2;
				xfer_section.push('rack -2');

				xfer_section.push('x-add-roller-advance 50');
				xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 3}`);
				if (emptyRow.includes(`b${dec_needle + 3}`)) {
					if (racking !== 0) {
						racking = 0;
						xfer_section.push('rack 0');
					}
					xfer_section.push(`xfer b${dec_needle + 3} f${dec_needle + 3}`);
				}
			} else {
				racking = -1;
				xfer_section.push('rack -1');

				xfer_section.push('x-add-roller-advance 50');
				xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 2}`);

				if (emptyRow.includes(`b${dec_needle + 2}`)) {
					xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 2}`);
				}
			}
		}

		if (racking !== 0) xfer_section.push('rack 0');
	} else if (side === 'right') {
		if (!emptyRow.includes(`b${dec_needle - 2}`)) {
			if (!emptyRow.includes(`f${dec_needle - 2}`) || !emptyRow.includes(`b${dec_needle - 3}`)) {
				xfer_section.push('x-add-roller-advance 100');
				xfer_section.push(`xfer b${dec_needle - 2} f${dec_needle - 2}`);
			}
		}

		if (!emptyRow.includes(`b${dec_needle - 3}`) && !emptyRow.includes(`f${dec_needle - 3}`)) { //* //no
			xfer_section.push(`xfer b${dec_needle - 3} f${dec_needle - 3}`);
		}

		if (!emptyRow.includes(`f${dec_needle}`) && !emptyRow.includes(`b${dec_needle - 1}`)) { //* //no
			racking = 1;
			xfer_section.push('rack 1');

			xfer_section.push('x-add-roller-advance 150');
			xfer_section.push(`xfer f${dec_needle} b${dec_needle - 1}`); //TODO: move this if necessary
		}

		if (!emptyRow.includes(`f${dec_needle - 1}`) && !emptyRow.includes(`b${dec_needle - 2}`)) {
			if (racking !== 1) {
				racking = 1;
				xfer_section.push('rack 1');
			}
			xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 2}`);
		}

		if (!emptyRow.includes(`b${dec_needle - 3}`) && (!emptyRow.includes(`f${dec_needle - 2}`) || !emptyRow.includes(`b${dec_needle - 2}`))) {
			if (racking !== 1) {
				racking = 1;
				xfer_section.push('rack 1');
			}
			xfer_section.push(`xfer f${dec_needle - 2} b${dec_needle - 3}`);
		}

		if (!emptyRow.includes(`b${dec_needle}`)) {
			if (!emptyRow.includes(`f${dec_needle - 1}`) || !emptyRow.includes(`b${dec_needle - 2}`) || !emptyRow.includes(`b${dec_needle - 1}`)) {
				racking = -1;
				xfer_section.push('rack -1');

				xfer_section.push('x-add-roller-advance 100');
				xfer_section.push(`xfer b${dec_needle} f${dec_needle - 1}`);
				if (emptyRow.includes(`f${dec_needle - 1}`) && emptyRow.includes(`b${dec_needle - 2}`)) {
					racking = 0;
					xfer_section.push('rack 0');
					xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 1}`);
				}
			}
		}

		if (!emptyRow.includes(`b${dec_needle - 1}`) && (!emptyRow.includes(`f${dec_needle - 2}`) || !emptyRow.includes(`b${dec_needle - 2}`))) {
			if (racking !== -1) {
				racking = -1;
				xfer_section.push('rack -1');
			}
			xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 2}`);
			if (emptyRow.includes(`f${dec_needle - 2}`)) {
				racking = 0;
				xfer_section.push('rack 0');
				xfer_section.push(`xfer f${dec_needle - 2} b${dec_needle - 2}`);
			}
		}

		if (!emptyRow.includes(`f${dec_needle - 1}`) && (!emptyRow.includes(`b${dec_needle - 2}`) || !emptyRow.includes(`f${dec_needle - 2}`))) {
			if (emptyRow.includes(`f${dec_needle - 2}`) && emptyRow.includes(`b${dec_needle - 3}`)) { //prevent triple stack
				racking = 2;
				xfer_section.push('rack 2');

				xfer_section.push('x-add-roller-advance 50');
				xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 3}`);
				if (emptyRow.includes(`b${dec_needle - 3}`)) {
					if (racking !== 0) {
						racking = 0;
						xfer_section.push('rack 0');
					}
					xfer_section.push(`xfer b${dec_needle - 3} f${dec_needle - 3}`);
				}
			} else {
				racking = 1;
				xfer_section.push('rack 1');

				xfer_section.push('x-add-roller-advance 50');
				xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 2}`);
				if (emptyRow.includes(`b${dec_needle - 2}`)) {
					xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 2}`);
				}
			}
		}

		if (racking !== 0) xfer_section.push('rack 0');
	}

	if (emptyRow.length) xfer_section.push('x-carrier-stopping-distance 2.5');
}


//---------------------------------
//--- PROTO BIND-OFF FUNCTION ---//
//---------------------------------
let left_bindC, right_bindC;
let insertLl8r = false, insertRl8r = false;
let insertl8r_arr = [];
let bindoff_carrier;
let bindoff_time = false;
let short_tail = [];
//TODO: add negative x-roller-advance or maybe binding off simultaneously from both sides to deal with too much roll tension on latter stitches when large # of needles in work (mostly last stitch breaking... so maybe use out-carrier to other side [by end stitch] to knit that one when ~8 needles to cast off left so stitch is loose & won't break)
const BINDOFF = (xfer_needle, count, side, double_bed, xfer_section) => {
	xfer_section.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`); //new //check
	let skip_knit = false;
	if (bindoff_time && !short_row_section && rib_top_dir !== undefined) {
		skip_knit = true;
		rib_top_dir === '+' ? ((side = 'right'), (xfer_needle = Xright_needle)) : ((side = 'left'), (xfer_needle = Xleft_needle));
	}
	if (side === 'right') {
		xfer_needle = xfer_needle - count + 1;
	}

	let dropInitialTuck = (count > 3 ? (3) : (count-1)); //new //*

	const posLoop = (op, bed) => {
		pos: for (let x = xfer_needle; x < xfer_needle + count; ++x) {
			if (op === 'knit') {
				xfer_section.push(`knit + ${bed}${x} ${bindoff_carrier}`);
			}
			if (op === 'xfer') {
				let receive = (bed === 'f' ? 'b' : 'f');
				xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
			}
			if (op === 'bind') {
				if (x === xfer_needle + count - 1 && bindoff_time) {
					break pos;
				}
				
				xfer_section.push(`xfer b${x} f${x}`);
				xfer_section.push('rack -1');
				xfer_section.push(`xfer f${x} b${x + 1}`);
				xfer_section.push('rack 0');
				if (x !== xfer_needle) {
					if (x > xfer_needle + 3) {
						if (bindoff_time && x > xfer_needle + 20) xfer_section.push('x-add-roller-advance -300'); //new //* //check //+10 & -200 instead?
						else xfer_section.push('x-add-roller-advance -50');
					}
					xfer_section.push(`drop b${x - 1}`);
				}
				xfer_section.push(`knit + b${x + 1} ${bindoff_carrier}`);
				if (x < xfer_needle + count - 2) xfer_section.push(`tuck - b${x} ${bindoff_carrier}`);
				
				if (!shortrow_time && x === xfer_needle + dropInitialTuck) xfer_section.push(`drop b${xfer_needle - 1}`); ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //new //!shortrow_time //*
			}
		}
	};
	const negLoop = (op, bed) => {
		neg: for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
			if (op === 'knit') {
				xfer_section.push(`knit - ${bed}${x} ${bindoff_carrier}`);
			}
			if (op === 'xfer') {
				let receive;
				bed === 'f' ? (receive = 'b') : (receive = 'f');
				xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
			}
			if (op === 'bind') {
				if (x === xfer_needle && bindoff_time) {
					break neg;
				}
				
				xfer_section.push(`xfer b${x} f${x}`);
				xfer_section.push('rack 1');
				xfer_section.push(`xfer f${x} b${x - 1}`);
				xfer_section.push('rack 0');
				if (x !== xfer_needle + count - 1) {
					if (x < xfer_needle + count - 4) {
						if (bindoff_time && x < xfer_needle + count - 21) xfer_section.push('x-add-roller-advance -300'); //-11 & -200 instead //?
						else xfer_section.push('x-add-roller-advance -50');
					}
					xfer_section.push(`drop b${x + 1}`);
				}
				xfer_section.push(`knit - b${x - 1} ${bindoff_carrier}`);
				if (x > xfer_needle + 1) xfer_section.push(`tuck + b${x} ${bindoff_carrier}`);

				if (!shortrow_time && x === xfer_needle + count - (dropInitialTuck+1)) xfer_section.push(`drop b${xfer_needle + count}`); ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //new //!shortrow_time && dropInitialTuck
			}
		}
	};
	
	const bindoffTail = (last_needle, dir, xfer_section) => {
		let skip_some = false; 
		if (short_tail.length > 0) skip_some = true;
		let otherT_dir, miss1, miss2;
		dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle + 1), (miss2 = last_needle - 1)) : ((otherT_dir = '+'), (miss1 = last_needle - 1), (miss2 = last_needle + 1));
		if (!skip_some) {
			xfer_section.push(';tail');
			if (short_row_section) {
				xfer_section.push('x-roller-advance 100');
			} else {
				xfer_section.push('x-roller-advance 200');
			}
			xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
			xfer_section.push('pause tail?');
		} else {
			xfer_section.splice(xfer_section.indexOf('insert here'), 1, `miss ${dir} b${miss1} ${bindoff_carrier}`);
		}
		for (let i = 0; i < 6; ++i) {
			if (!skip_some) {
				xfer_section.push(`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`);
				xfer_section.push(`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`);
				xfer_section.push(`knit ${dir} b${last_needle} ${bindoff_carrier}`);
				xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
				if (short_row_section) {
					if (i === 0) xfer_section.push('insert here'); //put miss here
					xfer_section.push('insert here');
				}
			} else {
				xfer_section.splice(
					xfer_section.indexOf('insert here'),
					1,
					`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`,
					`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`,
					`knit ${dir} b${last_needle} ${bindoff_carrier}`,
					`miss ${dir} b${miss1} ${bindoff_carrier}`
				);
			}
		}
		if (!skip_some) xfer_section.push('x-add-roller-advance 200');
		xfer_section.push(`drop b${last_needle}`);
	};
	
	if (side === 'left') {
		if (double_bed && bindoff_time && !skip_knit) {
			posLoop('knit', 'f');
			negLoop('knit', 'b');
		}

		posLoop('xfer', 'f');
		xfer_section.push('x-roller-advance 50');
		if (bindoff_time) {
			xfer_section.push('x-add-roller-advance -50');
			// xfer_section.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`);
		}
		if (!shortrow_time) xfer_section.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`); //(now not for just bindoff time) //TODO: check if !shortrow_time works

		xfer_section.push(`knit + b${xfer_needle} ${bindoff_carrier}`);

		posLoop('bind', null);
		if (bindoff_time) {
			if (short_row_section) {
				bindoffTail(xfer_needle + count - 1, '+', short_tail);
			} else {
				bindoffTail(xfer_needle + count - 1, '+', xfer_section);
			}
		} else if (!double_bed) xfer_section.push(`xfer b${xfer_needle + count} f${xfer_needle + count}`); //new //check
	} else if (side === 'right') {
		if (double_bed && bindoff_time && !skip_knit) {
			negLoop('knit', 'f');
			posLoop('knit', 'b');
		}

		negLoop('xfer', 'f');
		xfer_section.push('x-roller-advance 50');
		if (bindoff_time) {
			xfer_section.push('x-add-roller-advance -50');
			// xfer_section.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`);
		}
		if (!shortrow_time) xfer_section.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`);

		xfer_section.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`);

		negLoop('bind', null);
		if (bindoff_time) {
			if (short_row_section) {
				bindoffTail(xfer_needle, '-', short_tail);
			} else {
				bindoffTail(xfer_needle, '-', xfer_section);
			}
		} else if (!double_bed) xfer_section.push(`xfer b${xfer_needle-1} f${xfer_needle-1}`); //new //check
	}
}


//-----------------------------
//--- PROTO INC FUNCTIONS ---//
//-----------------------------
////twice if inc both sides
let bg_needles = [];
const incSingleBed = (Xside_needle, side, bg_side) => {
	if (side === 'left') {
		for (let b = 0; b < bg_side.length; ++b) {
			let shift_count = Math.abs(Xside_needle - bg_side[b]) + 1;
			RIGHT_XFER(xfer_section, bg_side[b], shift_count, 'f', 0, false);
			xfer_section.push('rack -1');
			RIGHT_XFER(xfer_section, bg_side[b] + 1, shift_count, 'b', -1, false);
			--Xside_needle;
		}
		xfer_section.push('rack 0');
	} else if (side === 'right') {
		for (let b = 0; b < bg_side.length; ++b) {
			let shift_count = Math.abs(Xside_needle - bg_side[b]) + 1;
			LEFT_XFER(xfer_section, bg_side[b], shift_count, 'f', 0, false);
			xfer_section.push('rack 1');
			LEFT_XFER(xfer_section, bg_side[b], shift_count, 'b', 1, false);
			xfer_section.push('rack 0');
			++Xside_needle;
		}
	}
};
function cleanInc(r) {
	return () => {
		function getRandomInt(max) {
			return Math.floor(Math.random() * Math.floor(max));
		}
		let bg_c;
		let carrier_occur = rows[r][0].map((el) => el.charAt(el.length - 1));
		carrier_occur = carrier_occur.reduce((a, b, i, arr) => (arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b), null);
		rows[r][0].some(el.charAt(el.length - 1) == bg_color ? (bg_c = bg_color) : (bg_c = carrier_occur));
		let bg_arr = rows[r][0].filter((el) => el.charAt(el.length - 1) == bg_c); // == so doesn't matter that its a number
		let bgN_arr = [];
		for (let b = 0; b < bg_arr.length; ++b) {
			let bg_op_arr = bg_arr[b].split(' ');
			bg_op_arr[2] = bg_op_arr[2].slice(1); //// remove the f or b
			bgN_arr.push(Number(bg_op_arr[2]));
		}
		let bgN_idx = [];
		for (let b = 0; b < left_xfer_count + right_xfer_count; ++b) {
			let idx = getRandomInt(bgN_arr.length);
			if (!bgN_idx.includes(idx)) {
				bgN_idx.push(idx);
				bg_needles.push(bgN_arr[idx]);
			} else {
				b -= 1;
			}
		}
	};
}

let LtwistedF, LtwistedB, RtwistedF, RtwistedB, twist;
// const inc1DoubleBed = (Xside_needle, side, left_carrier, right_carrier, arrL, arrR) => { //TODO: make it so won't increase on needles that are meant to be empty
const inc1DoubleBed = (Xside_needle, side, inc_carrier, arr) => { //TODO: make it so won't increase on needles that are meant to be empty
	if (side === 'left') { //remove //? //*
	// if (side === 'left' || (side === 'both' && inc_method === 'split')) { //* //?
		if (inc_method === 'xfer') {
			xfer_section.push('rack -1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
			xfer_section.push('rack 0');
			xfer_section.push('x-add-roller-advance -100');
			xfer_section.push(`miss + f${Xside_needle} ${inc_carrier}`); // ensures/forces order of xfers that is least likely to drop stitches
			xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
			xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 1}`);
			xfer_section.push('rack -1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
			twist = 1;
			xfer_section.push('rack 0');
			xfer_section.push(`miss - f${Xside_needle-1} ${inc_carrier}`); //miss carrier out of the way //new //TODO: test this //changed left_bindC to inc_carrier //check //?
		} else if (inc_method === 'split') {
			arr.push('rack 1');
			arr.push(`split + f${Xside_needle} b${Xside_needle-1} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split + b${Xside_needle-1} f${Xside_needle-1} ${inc_carrier}`);
			arr.push(`miss - f${Xside_needle-1} ${inc_carrier}`); //miss carrier out of the way
		} else { //twisted-stitch
			twist = 0;
		}
		LtwistedF = true;
		LtwistedB = true;
	} else if (side === 'right') {
		if (inc_method === 'xfer') {
			xfer_section.push('rack 1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
			xfer_section.push('rack 0');
			xfer_section.push('x-add-roller-advance -100');
			xfer_section.push(`miss - f${Xside_needle} ${inc_carrier}`); // ensures/forces order of xfers that is least likely to drop stitches
			xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
			xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 1}`);
			xfer_section.push('rack 1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
			twist = 1;
			xfer_section.push('rack 0');
			xfer_section.push(`miss + f${Xside_needle+1} ${inc_carrier}`); //miss carrier out of the way //new //TODO: test this //changed right_bindC to inc_carrier //check //?
		} else if (inc_method === 'split') {
			arr.push('rack -1');
			arr.push(`split - f${Xside_needle} b${Xside_needle+1} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split - b${Xside_needle+1} f${Xside_needle+1} ${inc_carrier}`);
			arr.push(`miss + f${Xside_needle+1} ${inc_carrier}`); //miss carrier out of the way
		} else {
			twist = 0;
		}
		RtwistedF = true;
		RtwistedB = true;
	// } else if (side === 'both') { //TODO: add option for inc by split for here //*
	} else if (side === 'both' && inc_method !== 'split') {
		LtwistedF = true;
		LtwistedB = true;
		RtwistedF = true;
		RtwistedB = true;
		twist = 0;
	}

	if (inc_method === 'split') { //TODO: make sure this doesn't mess anything up for if different inc method on other side
		LtwistedF = false, LtwistedB = false, RtwistedF = false, RtwistedB = false;
		twist = undefined;
	}
};

// const inc2DoubleBed = (Xside_needle, side, left_carrier, right_carrier, arrL, arrR) => { //TODO: fix this for split
const inc2DoubleBed = (Xside_needle, side, inc_carrier, arr) => { //TODO: fix this for split
	if (side === 'left') {
		if (inc_method === 'xfer') {
			xfer_section.push(`miss - f${Xside_needle - 2} ${inc_carrier}`); //miss carrier out of the way //TODO: check //new //move to end //?

			xfer_section.push('rack -1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
			xfer_section.push('rack 1');
			xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 2}`);
			xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle}`);
			xfer_section.push('rack 0');
			xfer_section.push(`xfer b${Xside_needle - 2} f${Xside_needle - 2}`);
			xfer_section.push('rack -1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
			xfer_section.push('rack 0');
			xfer_section.push(`xfer b${Xside_needle + 1} f${Xside_needle + 1}`);
			xfer_section.push('rack 1');
			xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 2}`);
			xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle}`);
			twist = 1;
		} else if (inc_method === 'split') {
			arr.push('rack 1');
			arr.push(`split + f${Xside_needle} b${Xside_needle-1} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split + b${Xside_needle-1} f${Xside_needle-1} ${inc_carrier}`);

			arr.push('rack 1');
			arr.push(`split + f${Xside_needle-1} b${Xside_needle-2} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split + b${Xside_needle-2} f${Xside_needle-2} ${inc_carrier}`);

			arr.push(`miss - f${Xside_needle-2} ${inc_carrier}`); //miss carrier out of the way
		} else {
			twist = 0;
		}
		LtwistedF = true;
		LtwistedB = true;
	} else if (side === 'right') {
		if (inc_method === 'xfer') {
			xfer_section.push(`miss + f${Xside_needle + 2} ${inc_carrier}`); //miss carrier out of the way //TODO: check //new //move to end //?

			xfer_section.push('rack 1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
			xfer_section.push('rack -1');
			xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle}`);
			xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 2}`);
			xfer_section.push('rack 0');
			xfer_section.push(`xfer b${Xside_needle + 2} f${Xside_needle + 2}`);
			xfer_section.push('rack 1');
			xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
			xfer_section.push('rack 0');
			xfer_section.push(`xfer b${Xside_needle - 1} f${Xside_needle - 1}`);
			xfer_section.push('rack -1');
			xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle}`);
			xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 2}`);
			twist = 1;
		} else if (inc_method === 'split') {
			arr.push('rack -1');
			arr.push(`split - f${Xside_needle} b${Xside_needle+1} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split - b${Xside_needle+1} f${Xside_needle+1} ${inc_carrier}`);

			arr.push('rack -1');
			arr.push(`split - f${Xside_needle+1} b${Xside_needle+2} ${inc_carrier}`);
			arr.push('rack 0');
			arr.push(`split - b${Xside_needle+2} f${Xside_needle+2} ${inc_carrier}`);

			arr.push(`miss + f${Xside_needle+2} ${inc_carrier}`); //miss carrier out of the way
		} else {
			twist = 0;
		}
		RtwistedF = true;
		RtwistedB = true;
	}

	if (inc_method === 'split') {
		LtwistedF = false, LtwistedB = false, RtwistedF = false, RtwistedB = false;
		twist = undefined;
	} else xfer_section.push('rack 0');
};

const incMultDoubleBed = (Xside_needle, count, side) => {
	xfer_section.push('rack 0.25'); ////half rack
	if (side === 'left') {
		for (let x = Xside_needle - 1; x >= Xside_needle - count; --x) {
			xfer_section.push(`knit - b${x} ${bindoff_carrier}`);
			xfer_section.push(`knit - f${x} ${bindoff_carrier}`); //TODO: determine carrier
		}
	} else if (side === 'right') {
		for (let x = Xside_needle + 1; x <= Xside_needle + count; ++x) {
			xfer_section.push(`knit + f${x} ${bindoff_carrier}`); //TODO: determine carrier
			xfer_section.push(`knit + b${x} ${bindoff_carrier}`);
		}
	}
	xfer_section.push('rack 0');
};

//----------------------------------------
//--- PROTO STITCH PATTERN FUNCTIONS ---//
//----------------------------------------
//TODO: add in support for these
let pattern_height;
function toggleBed(bed) {
	bed === 'f' ? (bed = 'b') : (bed = 'f');
}
let stitchpat_section = [];
let xfer_bed, knit_bed;

////define carrier param as '' if not used
const POS_PASS = (leftN, rightN, op, bed, spec, carrier) => {
	for (let n = leftN; n <= rightN; ++n) {
		stitchpat_section.push(`${op} + ${bed}${n} ${carrier}`.trimEnd());
		if (spec === 'half rack') stitchpat_section.push(`${op} + b${n} ${carrier}`.trimEnd());
	}
};
const NEG_PASS = (rightN, leftN, op, bed, spec, carrier) => {
	for (let n = rightN; n >= leftN; --n) {
		if (alt === true && (x - xfer_needle) % 2 !== 0) {
			continue;
		}
		stitchpat_section.push(`${op} - ${bed}${n} ${carrier}`.trimEnd());
		if (spec === 'half rack') stitchpat_section.push(`${op} - b${n} ${carrier}`.trimEnd());
		if (spec === 'alt beds') toggleBed(bed);
	}
};
const rib1x1Stitch = (prev_dir, carrier) => {
	//TODO: and xfers so needles are on correct bed ?
	if (stitchpat_section.length === 0) stitchpat_section.push('rack 0.25'); ////0.5, but 0.25 for now so visualizer can get it
	if (prev_dir === '+') {
		NEG_PASS(Xright_needle, Xleft_needle, 'knit', 'f', 'half rack', carrier);
	} else {
		POS_PASS(Xleft_needle, Xright_needle, 'knit', 'f', 'half rack', carrier);
	}
};

const rib2x2Stitch = (prev_dir, carrier) => {};

const rib3x3Stitch = (prev_dir, carrier) => {};

const rib4x4Stitch = (prev_dir, carrier) => {};

//come back! ^ make sure when acutally using this, insert 'rack 0' at end
const seedStitch = (prev_dir, carrier) => {
	//come back! //? //FIXME: (aka Q) is it okay to tell the machine to xfer from needles with no stitches? (so don't have to go thru & check with needles on backbed have stitches)
	if (stitchpat_section.length === 0) xfer_bed = 'f';
	if (prev_dir === '+') {
		if (double_bed && stitchpat_section.length === 0) RIGHT_XFER((stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false)); //+1//?
		LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, xfer_bed, 0, true); //+1//?
		NEG_PASS(Xright_needle, Xleft_needle, 'knit', 'b', 'alt beds', carrier);
	} else {
		if (double_bed && stitchpat_section.length === 0) LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false); //+1//?
		RIGHT_XFER(stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, xfer_bed, 0, true); //+1//?
		POS_PASS(Xleft_needle, Xright_needle, 'knit', 'b', 'alt beds', carrier);
	}
	toggleBed(xfer_bed);
};

const entrelacStitch = (prev_dir, carrier) => {};

const waffleStitch = (prev_dir, carrier) => {};

const irishMossStitch = (prev_dir, carrier) => {};

const piqueRibStitch = (prev_dir, carrier) => {};

const garterStitch = (prev_dir, carrier) => {};

let leftoverN, leftovers;
let first_time = false;
const checkerStitch = (prev_dir, carrier) => {
	let checker_width, checker_height, xfer_size;
	if ((Xright_needle - Xleft_needle + 1) % 6 === 0 || (Xright_needle - Xleft_needle + 1) % 5 !== 0) {
		checker_width = 6;
		checker_height = 8;
	} else {
		checker_width = 5;
		checker_height = 6;
	}
	if (stitchpat_section.length === 0) (xfer_bed = 'f'), (knit_bed = 'b'), (first_time = true), (pattern_height = 1);
	const negChecker = () => {
		neg_checker: for (let n = Xright_needle; n >= Xleft_needle + checker_width * 2; n -= checker_width * 2) {
			leftovers && n === Xright_needle ? (xfer_size = leftoverN) : (xfer_size = checker_width);
			LEFT_XFER(xfer_section, n, xfer_size, xfer_bed, 0, false); //+1//?
			if (prev_dir === '+') {
				knit_checker: for (let s = n; s > n - (checker_width + xfer_size); --s) {
					if (s < Xleft_needle) break knit_checker;
					if (s > n - xfer_size) {
						stitchpat_section.push(`knit - ${knit_bed}${s} ${carrier}`);
					} else {
						stitchpat_section.push(`knit - ${xfer_bed}${s} ${carrier}`);
					}
				}
			}
			if (first_time) {
				if (n - checker_width <= Xleft_needle && n - checker_width !== 0) {
					leftoverN = n - checker_width;
					leftovers = true;
					break neg_checker;
				} else {
					leftovers = false;
				}
				first_time = false;
			}
		}
	};
	const posChecker = () => {
		pos_checker: for (let n = Xleft_needle; n < Xright_needle - checker_width * 2; n += checker_width * 2) {
			leftovers && n === Xleft_needle ? (xfer_size = leftoverN) : (xfer_size = checker_width);
			RIGHT_XFER(xfer_section, n, xfer_size, xfer_bed, 0, false); //+1//?
			if (prev_dir === '-') {
				knit_checker: for (let s = n; s < n + (checker_width + xfer_size); ++s) {
					if (s > Xright_needle) break knit_checker;
					if (s < n + xfer_size) {
						stitchpat_section.push(`knit + ${knit_bed}${s} ${carrier}`);
					} else {
						stitchpat_section.push(`knit + ${xfer_bed}${s} ${carrier}`);
					}
				}
			}
			if (first_time) {
				if (n + checker_width >= Xright_needle && Xright_needle - n !== 0) {
					leftoverN = n + 1;
					leftovers = true;
					break pos_checker;
				} else {
					leftovers = false;
				}
				first_time = false;
			}
		}
	};
	if (prev_dir === '+') {
		if (double_bed && stitchpat_section.length === 0) RIGHT_XFER((stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false));
		negChecker();
		if (pattern_height % checker_height === 0 || pattern_height === 1) {
			toggleBed(xfer_bed);
			posChecker();
			stitchpat_section.unshift(xfer_section).flat();
		}
	} else {
		if (double_bed && stitchpat_section.length === 0) LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false);
		posChecker();
		if (pattern_height % checker_height === 0 || pattern_height === 1) {
			toggleBed(xfer_bed);
			//TODO: make this something like if % rowsofthepattern === 0, okay now make this something you deal with in the main function
			negChecker();
			stitchpat_section.unshift(xfer_section).flat();
		}
	}
	++pattern_height;
};

const laceStitch = (prev_dir, carrier) => {};

//----------------------------------
//--- INSERT TRANSFER SECTIONS ---//
//----------------------------------
let bind_nextL = 0,
	bind_nextR = 0;
let next_incL = 0,
	next_incR = 0;

let main_roller_advance = `x-roller-advance ${roller_advance}`;

let left_xfer = true; ////for now
let right_xfer = true;
let xtype, left_xfer_count, right_xfer_count, xfer_row_interval;
function parseShape(arr, r) {
	arr.some((element) => {
		if (element.ROW === r) {
			if (element.LEFT > 0 || element.RIGHT > 0) {
				xtype = 'inc';
			} else {
				xtype = 'dec';
			}
			left_xfer = right_xfer = false; ////for now
			left_xfer_count = right_xfer_count = 0; ////for now
			if (element.RIGHT !== 0) {
				xtype === 'dec' ? (right_xfer_count = -element.RIGHT) : (right_xfer_count = element.RIGHT);
				right_xfer = true;
			}
			if (element.LEFT !== 0) {
				xtype === 'dec' ? (left_xfer_count = -element.LEFT) : (left_xfer_count = element.LEFT);
				left_xfer = true;
			}
			if (arr.indexOf(element) < arr.length - 1) {
				let next_element = arr.indexOf(element) + 1;
				xfer_row_interval = arr[next_element].ROW - element.ROW;
				if (arr[next_element].LEFT < -2) {
					bind_nextL = -arr[next_element].LEFT;
				} else {
					bind_nextL = 0;
					if (arr[next_element].LEFT > 0) {
						next_incL = arr[next_element].LEFT;
					} else {
						next_incL = 0;
					}
				}
				if (arr[next_element].RIGHT < -2) {
					bind_nextR = -arr[next_element].RIGHT;
				} else {
					bind_nextR = 0;
					if (arr[next_element].RIGHT > 0) {
						next_incR = arr[next_element].RIGHT;
					} else {
						next_incR = 0;
					}
				}
			} else {
				xfer_row_interval = 1;
			}
		}
	});
}

let insertLinc, insertRinc;
let insertLeft = 0, insertRight = 0;
let insertLeftX = 0, insertRightX = 0;

function insertXferPasses(left, right, xtype, r) {
	insertLinc = undefined, insertRinc = undefined;

	emptyRow = patternEmptyNeedles[r]; //check
	if (!emptyRow) emptyRow = [];

	let xfer_needle1, xcount1, xfer_needle2, xcount2, side, stitches1, stitches2;
	let bg_arr1 = [...bg_needles]; //check if this becomes a problem for double bed inc
	let bg_arr2 = [...bg_needles];
	if (left === null) {
		xfer_needle2 = xcount2 = stitches2 = null;
		xfer_needle1 = right;
		side = 'right';		
		xcount1 = right_xfer_count + 2; //TODO: //check whether +2 for xcount is consistent when more than 2/3
		stitches1 = right_xfer_count;

		if (xtype === 'inc' && inc_method === 'split' && insertRl8r && right_xfer_count < 3) insertRinc = right_xfer_count;
	} else {
		if (right === null) {
			xfer_needle2 = xcount2 = stitches2 = null;
			xfer_needle1 = left;
			side = 'left';
			xcount1 = left_xfer_count + 2;
			stitches1 = left_xfer_count;

			if (xtype === 'inc' && inc_method === 'split' && insertLl8r && left_xfer_count < 3) insertLinc = left_xfer_count;
		} else {
			xfer_needle1 = left;
			xcount1 = left_xfer_count + 2;
			stitches1 = left_xfer_count;
			xfer_needle2 = right;
			xcount2 = right_xfer_count + 2;
			side = 'both';
			stitches2 = right_xfer_count;
			if (!double_bed) {
				for (let b = 0; b < right_xfer_count; ++b) {
					bg_arr1.pop();
				}
				for (let b = 0; b < left_xfer_count; ++b) {
					bg_arr2.shift();
				}
			}

			if (xtype === 'inc' && inc_method === 'split') {
				if (insertRl8r && right_xfer_count < 3) insertRinc = right_xfer_count;
				if (insertLl8r && left_xfer_count < 3) insertLinc = left_xfer_count;
			}
		}
	}
	let side1;
	side === 'both' ? (side1 = 'left') : (side1 = side);
	if (double_bed) {
		if (xtype === 'dec') {
			xfer_section.push(`x-speed-number ${xfer_speed_number}`);

			xfer_section.push(`;dec ${stitches1} on ${side1}`);
			if (stitches1 === 1) {
				dec1DoubleBed(xfer_needle1, side1);
			} else if (stitches1 === 2) {
				dec2DoubleBed(xfer_needle1, side1);
			} else {
				side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC); //TODO: figure out why left_bindC was 5 when it should have been 1
				if ((side === 'right' && insertRl8r) || (side !== 'right' && insertLl8r)) {
					insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`);
					insertl8r_arr.push(xfer_section.pop());
					BINDOFF(xfer_needle1, stitches1, side1, true, insertl8r_arr);
					insertl8r_arr.push(`x-speed-number ${speed_number}`, main_roller_advance);
				} else {
					BINDOFF(xfer_needle1, stitches1, side1, true, xfer_section);
				}
			}
			if (side === 'both') {
				//TODO: add bpbind for if dec on both sides with one being thru bindoff method //?
				xfer_section.push(`;dec ${stitches2} on right`);
				if (stitches2 === 1) {
					dec1DoubleBed(xfer_needle2, 'right');
				} else if (stitches2 === 2) {
					dec2DoubleBed(xfer_needle2, 'right');
				} else {
					bindoff_carrier = right_bindC;
					if (insertRl8r) {
						insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`);
						insertl8r_arr.push(xfer_section.pop());
						BINDOFF(xfer_needle2, stitches2, 'right', true, insertl8r_arr);
						insertl8r_arr.push(`x-speed-number ${speed_number}`, main_roller_advance);
					} else {
						BINDOFF(xfer_needle2, stitches2, 'right', true, xfer_section);
					}
				}
			}

			xfer_section.push(`x-speed-number ${speed_number}`, main_roller_advance); //new //temporary //remove //TODO: only insert main_roller_advance if bindoff method
		} else { //increase
			let inc_left_carrier = left_bindC,
				inc_right_carrier = right_bindC;
			
			let arrL = (insertLl8r ? insertl8r_arr : xfer_section),
				arrR = (insertRl8r ? insertl8r_arr : xfer_section);
			
			// xfer_section.push(`;inc ${stitches1} on ${side1}`); //remove //?
			let inc_speed_number = (inc_method === 'split' ? split_speed_number : xfer_speed_number);

			side1 === 'left' ? arrL.push(`x-speed-number ${inc_speed_number}`, `;inc ${stitches1} on ${side1}`) : arrR.push(`x-speed-number ${inc_speed_number}`, `;inc ${stitches1} on ${side1}`); //new //? //*
			
			let inc_carrier = (side1 === 'right' ? inc_right_carrier : inc_left_carrier);
			let inc_arr = (side1 === 'right' ? arrR : arrL);
			if (stitches1 === 1) {
				// if (side === 'both') arrR.push(`x-speed-number ${inc_speed_number}`, `;inc ${stitches2} on right`);
				inc1DoubleBed(xfer_needle1, side1, inc_carrier, inc_arr); //new //? //* //if both, for now, just does twisted stitches
				// inc1DoubleBed(xfer_needle1, side, inc_left_carrier, inc_right_carrier, arrL, arrR); //new //? //* //if both, for now, just does twisted stitches
			} else if (stitches1 === 2) {
				inc2DoubleBed(xfer_needle1, side1, inc_carrier, inc_arr); //new //? //*
				// if (side === 'both') {
				// 	arrR.push(`x-speed-number ${inc_speed_number}`, `;inc ${stitches2} on right`);
				// 	inc2DoubleBed(xfer_needle2, 'right', inc_left_carrier, inc_right_carrier, arrL, arrR); //new //? //*
				// }
			} else {
				side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
				incMultDoubleBed(xfer_needle1, stitches1, side1);
				// if (side === 'both') {
				// 	bindoff_carrier = right_bindC;
				// 	incMultDoubleBed(xfer_needle2, stitches2, 'right');
				// }
			}

			if (side === 'both') {
				arrR.push(`x-speed-number ${inc_speed_number}`, `;inc ${stitches2} on right`);
				if (stitches2 === 1) inc1DoubleBed(xfer_needle2, 'right', inc_right_carrier, arrR); //new //? //* //if both, for now, just does twisted stitches
				else if (stitches2 === 2) inc2DoubleBed(xfer_needle2, 'right', inc_right_carrier, arrR); //new //? //*
				else {
					bindoff_carrier = right_bindC;
					incMultDoubleBed(xfer_needle2, stitches2, 'right');
				}
			}

			// if (side === 'both' && inc_method !== 'split') { } //TODO: do other side?

			if (side === 'left' || side === 'both') arrL.push(`x-speed-number ${speed_number}`, main_roller_advance);
			if (side === 'right' || (side === 'both' && insertLl8r !== insertRl8r)) arrR.push(`x-speed-number ${speed_number}`, main_roller_advance);
			// if (side === 'right' || (side === 'both' && arrR !== arrL)) arrR.push(`x-speed-number ${speed_number}`, main_roller_advance); //remove //?
		}
	} else {
		xfer_section.push(`x-speed-number ${xfer_speed_number}`);
		
		if (xtype === 'dec') {
			if (stitches1 < 4 && stitches2 < 4) {
				xfer_section.push(`;dec ${stitches1} on ${side}`);
				let rack1 = stitches1;
				let rack2 = stitches2;
				let fancyDec = false; //TODO: make this based on if piece involves stitch pattern will xfers in it
				let xcount = (fancyDec ? xcount1 : stitches1);
				decSingleBed(xfer_needle1, xcount, rack1, side, xfer_needle2, xcount2, rack2);
				// decSingleBed(xfer_needle1, xcount1, rack1, side, xfer_needle2, xcount2, rack2);
			} else {
				xfer_section.push(`;dec ${stitches1} on ${side1}`);
				side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
				if ((side === 'right' && insertRl8r) || (side !== 'right' && insertLl8r)) {
					insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`);
					insertl8r_arr.push(xfer_section.pop());
					BINDOFF(xfer_needle1, stitches1, side1, false, insertl8r_arr);
					insertl8r_arr.push(`x-speed-number ${speed_number}`, main_roller_advance);
				} else BINDOFF(xfer_needle1, stitches1, side1, false, xfer_section);
				if (side === 'both') {
					xfer_section.push(`;dec ${stitches2} on right`);
					bindoff_carrier = right_bindC;
					if (insertRl8r) {
						insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`);
						insertl8r_arr.push(xfer_section.pop());
						BINDOFF(xfer_needle2, stitches2, 'right', false, insertl8r_arr);
						insertl8r_arr.push(`x-speed-number ${speed_number}`, main_roller_advance);
					} else BINDOFF(xfer_needle2, stitches2, 'right', false, xfer_section);
				}
			}
		} else {
			xfer_section.push(`;inc ${stitches1} on ${side1}`);
			incSingleBed(xfer_needle1, side1, bg_arr1);
			if (side === 'both') {
				xfer_section.push(`;inc ${stitches2} on right`);
				incSingleBed(xfer_needle2, 'right', bg_arr2);
			}
		}
		xfer_section.push(`x-speed-number ${speed_number}`, main_roller_advance); //new //temporary //remove //TODO: only insert main_roller_advance if bindoff method
	}
	// xfer_section.push(`x-speed-number ${speed_number}`, main_roller_advance); //new //temporary //remove //TODO: only insert main_roller_advance if bindoff method
}

//-----------------------------------------------------------------
//--- INSERT XFER PASSES / CUT OUT SHAPE WITH 'COOKIE CUTTER' ---//
//-----------------------------------------------------------------
let warning = false;
// let shortrow_time = false; //remove //moved up
let insert_arr = [];
let short_Xright_needle, short_Xleft_needle, last_shape_row;
if (shape_code_reverse !== null) {
	////start decreasing at first row where decreases happen
	xfer_row_interval = shaping_arr[1].ROW; //*//*//*
	if (short_row_section) last_shape_row = shaping_arr[shaping_arr.length - 1].ROW;
}
let cookie;

let shaped_rows = [];
let new_carriers = [...carriers];
shaped_rows.push(caston_section);

if (!row1_small) {
	for (let r = 0; r < xfer_row_interval; ++r) {
		shaped_rows.push(rows[r]);
	}
} else {
	xfer_row_interval = 0;
	Xleft_needle = row1_Lneedle;
	Xright_needle = row1_Rneedle;
}
let xtra_pos_carriers = [];
let back_passLpos = [];
let back_passRneg = [];

//--- MAIN FUNCTION ---
main: for (let r = xfer_row_interval; r < rows.length; r += xfer_row_interval) {
	// shaped_rows.push(`;row: ${r}`); //TODO: get this to work by pushing row during intervals
	xtype = undefined; ////reset for now in case no xfers
	if (r !== 0) {
		insertLl8r = insertRl8r = true;

		let lastKnitLn;
		findKnitPass: for (let i = 0; i < rows[r].length; ++i) { //first pass
			lastKnitLn = rows[r][i].slice().reverse().find(ln => ln.includes('knit '));
			if (lastKnitLn) {
				break findKnitPass;
			}
		}

		left_bindC = right_bindC = lastKnitLn.charAt(lastKnitLn.length - 1);
		
		for (let i = 0; i < rows[r - 1].length; ++i) {
			if (rows[r - 1][i].some((el) => el.includes(' - '))) {
				findKnit: for (let ln = rows[r - 1][i].length - 1; ln >= 0; --ln) {
					let ln_op = rows[r - 1][i][ln];
					if (ln_op.includes('knit ')) {
						left_bindC = ln_op.charAt(ln_op.length - 1);
						break findKnit;
					}
				}

				insertLl8r = false; 

				if (insertRl8r === false && left_bindC === right_bindC) insertRl8r = true;
			} else if (rows[r - 1][i].some((el) => el.includes(' + '))) {
				findKnit: for (let ln = rows[r - 1][i].length - 1; ln >= 0; --ln) {
					let ln_op = rows[r - 1][i][ln];
					if (ln_op.includes('knit ')) {
						right_bindC = ln_op.charAt(ln_op.length - 1);
						break findKnit;
					}
				}

				insertRl8r = false;

				if (insertLl8r === false && left_bindC === right_bindC) insertLl8r = true;
			}
		}
	} else {
		xfer_row_interval = shaping_arr[0].ROW;
	}
	if (shape_code_reverse !== null && !warning) {
		if (!shortrow_time) {
			parseShape(shaping_arr, r);
		} else {
			if (!new_carriers.includes(left_bindC)) {
				left_bindC = new_carriers[short_row_carriers.indexOf(left_bindC)];
			}
			if (!new_carriers.includes(right_bindC)) {
				right_bindC = new_carriers[short_row_carriers.indexOf(right_bindC)];
			}
			xfer_row_interval = 1;
			parseShape(left_shortrow_arr, r);
		}
	}
	
	main_roller_advance = undefined;
	find_xroll: for (let i = 0; i < rows[r][0].length; ++i) {
		if (rows[r][0][i].includes('x-roller-advance')) {
			main_roller_advance = rows[r][0][i];
			break find_xroll;
		}
	}
	if (main_roller_advance === undefined) main_roller_advance = 'x-roller-advance 100';
	
	if (!warning && (left_xfer || right_xfer) && r !== 0) {
		let XleftN, XrightN;
		if (!left_xfer) {
			XrightN = Xright_needle;
			XleftN = null;
		} else if (!right_xfer) {
			XleftN = Xleft_needle;
			XrightN = null;
		} else {
			XleftN = Xleft_needle;
			XrightN = Xright_needle;
		}
		if (xtype === 'inc' && !double_bed) {
			cleanInc(r);
		}
		insertXferPasses(XleftN, XrightN, xtype, r);
		shaped_rows.push(xfer_section);
		xfer_section = [];
	}
	/////////////////// //TODO: add these warnings back in but make sure to define them / incorporate them into knitout dec functions
	// if (not_enough_needles) {
	//   if (!warning) {
	//     console.log(
	//       chalk.black.bgYellow(`! WARNING:`) +
	//         ` can't decrease by more than 1 needle on each side with less than 12 stitches on the bed because it would result in stacking too many stitches on a single needle. Will hopefully fix this issue soon, but for now, BREAK.`
	//     );
	//     Xleft_needle -= left_xfer_count; ////undo this first time
	//     Xright_needle += right_xfer_count; ////undo this first time
	//   }
	//   warning = true;
	// } else if (dec_count_too_big) {
	//   if (!warning) {
	//     if (double_bed) {
	//       console.log(
	//         chalk.black.bgYellow(`! WARNING:`) +
	//           ` decreasing by more than 2 needles per row for double-bed jacquard is not currently supported by this program. Will hopefully fix this issue soon, but for now, BREAK.`
	//       );
	//     } else {
	//       console.log(
	//         chalk.black.bgYellow(`! WARNING:`) +
	//           ` decreasing by more than 3 needles per row is not currently supported by this program. Will hopefully fix this issue soon, but for now, BREAK.`
	//       );
	//     }
	//     Xleft_needle -= left_xfer_count; ////undo this first time
	//     Xright_needle += right_xfer_count; ////undo this first time
	//   }
	//   warning = true;
	// }
	
	if (!warning && r !== 0) {
		if (left_xfer) {
			xtype === 'dec' ? (Xleft_needle += left_xfer_count) : (Xleft_needle -= left_xfer_count);
		}
		if (right_xfer) {
			xtype === 'dec' ? (Xright_needle -= right_xfer_count) : (Xright_needle += right_xfer_count);
		}
	}
	
	function cookieCutter(XleftN, XrightN, other_arr, replacement, p) {
		if (XleftN !== L_NEEDLE) {
			for (let cc = L_NEEDLE; cc < XleftN; ++cc) {
				cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}
		if (XrightN !== R_NEEDLE) {
			for (let cc = R_NEEDLE + 6; cc > XrightN; --cc) { //+6 b/c of out spot in knitify
				cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}

		cookie = cookie.filter((el) => !el.includes(`xfer f${XleftN} `) && !el.includes(`xfer b${XleftN} `) && !el.includes(`xfer f${XrightN} `) && !el.includes(`xfer b${XrightN} `)); //remove any xfers of new edge-most needles //new //check //*
		if (!(cookie[0].includes(' ;xfer'))) {
			if (XleftN !== L_NEEDLE || XrightN !== R_NEEDLE) { //TODO: make this only if pass doesn't include ;xfer
				let cookie_dir, cookie_carrier, end_needle, start_needle;
				find_dir: for (let d = 0; d < cookie.length; ++d) {
					if (cookie[d].includes(' + ')) {
						cookie_dir = '+';
						cookie_carrier = cookie[d].charAt(cookie[d].length - 1);
						break find_dir;
					} else if (cookie[d].includes(' - ')) { //TODO: maybe also add ! includes.(';') //?
						cookie_dir = '-';
						cookie_carrier = cookie[d].charAt(cookie[d].length - 1);
						break find_dir;
					}
				}
				let endN = false;
				let secureL = false,
					secureR = false;

				// if (cookie[0].includes(';pass:') && cookie[0].includes(';xfer')) endN = true, secureL = true, secureR = true; //because irrelevant //new //check //*

				function findEndNeedle(end_needle) {
					find_endN: for (let e = 0; e < cookie.length; ++e) {
						if (!secureL) {
							if (cookie[e].includes(' + ') || cookie[e].includes(' - ')) { //* //new //check
								if (
									cookie[e].includes(`f${XleftN} `) ||
								cookie[e].includes(`b${XleftN} `) ||
								cookie[e].includes(`f${XleftN + 1} `) ||
								cookie[e].includes(`b${XleftN + 1} `) ||
								cookie[e].includes(`f${XleftN + 2} `) ||
								cookie[e].includes(`b${XleftN + 2} `)
								) {
									secureL = true;
								}
							}
						}
						if (!secureR) {
							if (cookie[e].includes(' + ') || cookie[e].includes(' - ')) { //* //new //check
								if (
									cookie[e].includes(`f${XrightN} `) ||
								cookie[e].includes(`b${XrightN} `) ||
								cookie[e].includes(`f${XrightN - 1} `) ||
								cookie[e].includes(`b${XrightN - 1} `) ||
								cookie[e].includes(`f${XrightN - 2} `) ||
								cookie[e].includes(`b${XrightN - 2} `)
								) {
									secureR = true;
								}
							}
						}
					
						if ((cookie[e].includes(' + ') || cookie[e].includes(' - ')) && (cookie[e].includes(`f${end_needle} `) || cookie[e].includes(`b${end_needle} `))) { //* //new //check
							// if (cookie[e].includes(`f${end_needle} `) || cookie[e].includes(`b${end_needle} `)) {
							endN = true;
						}
					}
				}
				cookie_dir === '+' ? (findEndNeedle(XrightN), (end_needle = XrightN), (start_needle = XleftN)) : (findEndNeedle(XleftN), (end_needle = XleftN), (start_needle = XrightN));
			
				if (!secureL || !secureR) {
					if (cookie_dir === '+') {
						if (!secureL) {
							let secureLN = XleftN;
							if (Number(cookie_carrier) % 3 === 2) {
								secureLN += 1;
							} else if (Number(cookie_carrier) % 3 === 0) {
								secureLN += 2;
							}
							cookie.splice(
								cookie.findIndex((el) => el.includes('knit')),
								0,
								`knit + b${secureLN} ${cookie_carrier}`
							);
						}
						if (!secureR) {
							let secureRN = XrightN;
							if (Number(cookie_carrier) % 3 === 2) {
								secureRN -= 1;
							} else if (Number(cookie_carrier) % 3 === 0) {
								secureRN -= 2;
							} else {
								endN = true;
							}
							cookie.push(`knit + b${secureRN} ${cookie_carrier}`);
						}
					} else {
						if (!secureL) {
							let secureLN = XleftN;
							if (Number(cookie_carrier) % 3 === 2) {
								secureLN += 1;
							} else if (Number(cookie_carrier) % 3 === 0) {
								secureLN += 2;
							} else {
								endN = true;
							}
							cookie.push(`knit - b${secureLN} ${cookie_carrier}`);
						}
						if (!secureR) {
							let secureRN = XrightN;
							if (Number(cookie_carrier) % 3 === 2) {
								secureRN -= 1;
							} else if (Number(cookie_carrier) % 3 === 0) {
								secureRN -= 2;
							}
							cookie.splice(
								cookie.findIndex((el) => el.includes('knit')),
								0,
								`knit - b${secureRN} ${cookie_carrier}`
							);
						}
					}
				}
			
				if (cookie_dir === '+' && next_incR > 0) {
					end_needle += next_incR;
					cookie.push(`miss + f${end_needle} ${cookie_carrier}`); 
				} else if (cookie_dir === '-' && next_incL > 0) {
					end_needle -= next_incL;
					cookie.push(`miss - f${end_needle} ${cookie_carrier}`);
				} else if (!endN) {
					if ((bind_nextL > 0 && cookie_dir === '-') || (bind_nextR > 0 && cookie_dir === '+')) {
						cookie.push(`knit ${cookie_dir} b${end_needle} ${cookie_carrier}`);
					} else {
						cookie.push(`miss ${cookie_dir} f${end_needle} ${cookie_carrier}`);
					}
				}
				if (cookie[0].includes(';pass:')) cookie[0] = `${cookie[0]};${start_needle};${end_needle}`;
			}

			if (shortrow_time) {
				let replace_carrier;
				for (let c = 0; c < other_arr.length; ++c) {
					cookie = cookie.map((el) => {
						if ((el.includes(' - ') || el.includes(' + ')) && el.charAt(el.length - 1) === other_arr[c]) {
							replace_carrier = replacement[c];

							// if (el.charAt(el.length - 1) === other_arr[c]) {
							return el.slice(0, -1).concat(replacement[c]);
						} else {
							return el;
						}
					});
				}
				if (cookie[0].includes(';pass:')) {
					cookie[0] = cookie[0].split(';');
					cookie[0].splice(3, 1, replace_carrier);
					cookie[0] = cookie[0].join(';');
				}
			}
		}
	}

	if (!warning) {
		for (let i = r; i < r + xfer_row_interval; ++i) {
			let insertL8rP = 0;
			for (let p = 0; p < rows[i].length; ++p) {
				if (shortrow_time && back_passLpos.length > 0) {
					let pass_carrier = (rows[i][p][0].includes(';pass: ') ? rows[i][p][0].charAt(rows[i][p][0].length - 1) : rows[i][p][1].charAt(rows[i][p][1].length - 1));
					let leftover_carriers = [...back_passLpos];
					for (let c = 0; c < back_passLpos.length; ++c) {
						if (i === back_passLpos[c][0] && (pass_carrier === back_passLpos[c][1] || pass_carrier === short_row_carriers[new_carriers.indexOf(back_passLpos[c][1])])) {
							shaped_rows.push(`;pass: back ;+;${back_passLpos[c][1]};${Xleft_needle};${Xright_needle}`);
							let mod = 4;
							if (back_passLpos[c][2] === 1) mod = 5;
							if (back_passLpos[c][2] === 2) mod = 3;
							if (bpBed === 'f') mod = 1;

							console.log('adding back pass.'); //remove //debug
							let emptyOffset = false;

							for (let n = Xleft_needle; n <= Xright_needle; ++n) {
								if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
									if (n === Xleft_needle || n === Xright_needle) {
										shaped_rows.push(`knit + ${bpBed}${n} ${back_passLpos[c][1]}`);
									} else if (n % mod === 0 || emptyOffset) {
										shaped_rows.push(`knit + ${bpBed}${n} ${back_passLpos[c][1]}`);
									}
									emptyOffset = false;
								} else emptyOffset = true;
							}
							leftover_carriers.splice(leftover_carriers.indexOf(back_passLpos[c]), 1);
						}
					}
					back_passLpos = leftover_carriers;
				}
				cookie = rows[i][p];
				cookieCutter(Xleft_needle, Xright_needle, short_row_carriers, new_carriers, p);
				// if (xtype === 'inc') { //remove //?
				if (xtype === 'inc' && twist !== undefined) { //new //? //*
					let pass_roller_advance, twist_roller;
					let twist_count = 1;
					roll: for (let a = p; a >= 0; --a) { //TODO: maybe go back to other rows if no roll yet?
						pass_roller_advance = rows[i][a].find((el) => el.includes('x-roller-advance'));
						if (pass_roller_advance !== undefined) {
							break roll;
						}
					}
					if (pass_roller_advance === undefined) pass_roller_advance = 'x-roller-advance 100'; ////temporary
					if (pass_roller_advance === 'x-roller-advance 450') {
						twist_roller = 'x-roller-advance 225';
					} else {
						twist_roller = 'x-roller-advance 50';
					}
					
					let info = cookie[0].split(';');
					let c_endN;
					let twisted_stitch;
					if (info.length > 4) {
						c_endN = Number(info[5]);
						info[2] === '+' ? (c_endN += 1) : (c_endN -= 1);
					} else {
						info[2] === '+' ? (c_endN = Xright_needle + 1) : (c_endN = Xleft_needle - 1);
					}
					
					if (right_xfer) {
						if (RtwistedF) { //for right inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`f${Xright_needle - twist} `) && RtwistedF) {
									twisted_stitch = cookie.indexOf(el);
									RtwistedF = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							
							if (!RtwistedF) {
								if (twist === 0 && !RtwistedB) {
									if (info[2] === '+') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss + f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${Xright_needle - 1}`) && !cookie[twisted_stitch + 1].includes(`f${Xright_needle - 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit - b${Xright_needle - 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									++twist_count;
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
						if (RtwistedB) { //for right inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`b${Xright_needle - twist} `) && RtwistedB) {
									twisted_stitch = cookie.indexOf(el);
									RtwistedB = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!RtwistedB) {
								if (twist === 0) {
									if (info[2] === '+') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss + f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${Xright_needle - 1}`) && !cookie[twisted_stitch + 1].includes(`f${Xright_needle - 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit - b${Xright_needle - 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
					}
					if (left_xfer) {
						if (LtwistedF) { //for left inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`f${Xleft_needle + twist} `) && LtwistedF) {
									twisted_stitch = cookie.indexOf(el);
									LtwistedF = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!LtwistedF) {
								if (twist === 0 && !LtwistedB) {
									if (info[2] === '-') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss - f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${Xleft_needle + 1}`) && !cookie[twisted_stitch + 1].includes(`f${Xleft_needle + 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit + b${Xleft_needle + 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
						if (LtwistedB) { //for left inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`b${Xleft_needle + twist} `) && LtwistedB) {
									twisted_stitch = cookie.indexOf(el);
									LtwistedB = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!LtwistedB) {
								if (twist === 0) {
									if (info[2] === '-') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss - f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${Xleft_needle + 1}`) && !cookie[twisted_stitch + 1].includes(`f${Xleft_needle + 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit + b${Xleft_needle + 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
					}
				}
				
				// if (p === 0 && insertl8r_arr.length > 0) {
				if (p === insertL8rP && insertl8r_arr.length > 0) {
					if (p === 0) {
						if (insertLl8r) {
							insertLeft = (insertLinc ? insertLinc : -left_xfer_count); //new //? //*
							insertRight = 0;
						} else {
							insertRight = (insertRinc ? -insertRinc : right_xfer_count); //new //? //*
							insertLeft = 0;
						}
					}
					if (rows[i][p][0].includes(';xfer')) {
						++insertL8rP;
					} else {
						if (insertLl8r) {
							bind_nextL = true;
							cookie = rows[i][p]; //reset it
							cookieCutter(Xleft_needle+insertLeft, Xright_needle, short_row_carriers, new_carriers, p); //? //*
							insertLeft = 0;
							// let insertLeft = (insertLinc ? Xleft_needle + insertLinc : Xleft_needle - left_xfer_count); //new //? //*
							// cookieCutter(insertLeft, Xright_needle, short_row_carriers, new_carriers, p); //? //*
							bind_nextL = false;
						} else if (insertRl8r) {
							bind_nextR = true;
							cookie = rows[i][p]; //reset it
							cookieCutter(Xleft_needle, Xright_needle+insertRight, short_row_carriers, new_carriers, p); //? //*
							insertRight = 0;
							// let insertRight = (insertRinc ? Xright_needle - insertRinc : Xright_needle + right_xfer_count); //new //? //*
							// cookieCutter(Xleft_needle, insertRight, short_row_carriers, new_carriers, p); //? //*
							bind_nextR = false;
						}
						shaped_rows.push(cookie, insertl8r_arr);
						insertl8r_arr = [];
					}
				} else {
					shaped_rows.push(cookie);
				}
			}
		}
	} else {
		console.log('A warning was generated.'); //remove //debug
		for (let w = r; w < rows.length; ++w) {
			for (let p = 0; p < rows[w].length; ++p) {
				cookie = rows[w][p];
				cookieCutter(Xleft_needle, Xright_needle, short_row_carriers, new_carriers, null);
				shaped_rows.push(cookie);
			}
		}
		break;
	}
	
	if (shortrow_time) {
		parseShape(right_shortrow_arr, r);
		if (left_xfer || right_xfer) {
			let XleftN, XrightN;
			if (!left_xfer) {
				XrightN = short_Xright_needle;
				XleftN = null;
			} else if (!right_xfer) {
				XleftN = short_Xleft_needle;
				XrightN = null;
			} else {
				XleftN = short_Xleft_needle;
				XrightN = short_Xright_needle;
			}
			
			for (let c = 0; c < new_carriers.length; ++c) {
				if (left_bindC === new_carriers[c]) {
					left_bindC = short_row_carriers[c];
				}
				if (right_bindC === new_carriers[c]) {
					right_bindC = short_row_carriers[c];
				}
			}
			if (xtype === 'inc' && !double_bed) {
				cleanInc(r);
			}
			insertXferPasses(XleftN, XrightN, xtype, r);
			insert_arr.push(xfer_section);
			xfer_section = [];
		}
		xtype === 'dec' ? (short_Xleft_needle += left_xfer_count) : (short_Xleft_needle -= left_xfer_count);
		xtype === 'dec' ? (short_Xright_needle -= right_xfer_count) : (short_Xright_needle += right_xfer_count);
		for (let i = r; i < r + xfer_row_interval; ++i) {
			let insertL8rP = 0; //new
			for (let p = 0; p < rows[i].length; ++p) {
				if (back_passRneg.length > 0) {
					let pass_carrier = (rows[i][p][0].includes(';pass: ') ? rows[i][p][0].charAt(rows[i][p][0].length - 1) : rows[i][p][1].charAt(rows[i][p][1].length - 1)); //check //new //*
					let leftover_carriers = [...back_passRneg];
					for (let c = 0; c < back_passRneg.length; ++c) {
						if (i === back_passRneg[c][0] && (pass_carrier === back_passRneg[c][1] || pass_carrier === new_carriers[short_row_carriers.indexOf(back_passRneg[c][1])])) {
							insert_arr.push(`;pass: back ;-;${back_passRneg[c][1]};${short_Xright_needle};${short_Xleft_needle}`);
							let mod = 3;
							if (back_passRneg[c][2] === 1) mod = 5;
							if (back_passRneg[c][2] === 2) mod = 4;
							if (bpBed === 'f') mod = 1;

							console.log('adding back pass.'); //remove //debug
							let emptyOffset = false;

							for (let n = short_Xright_needle; n >= short_Xleft_needle; --n) {
								if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
									if (n === short_Xright_needle || n === short_Xleft_needle) {
										insert_arr.push(`knit - ${bpBed}${n} ${back_passRneg[c][1]}`);
									} else if (n % mod === 0 || emptyOffset) {
										insert_arr.push(`knit - ${bpBed}${n} ${back_passRneg[c][1]}`);
									}
									emptyOffset = false;
								} else emptyOffset = true;
							}
							leftover_carriers.splice(leftover_carriers.indexOf(back_passRneg[c]), 1);
						}
					}
					back_passRneg = leftover_carriers;
				}

				cookie = rows[i][p];
				cookieCutter(short_Xleft_needle, short_Xright_needle, new_carriers, short_row_carriers, p);

				if (xtype === 'inc' && twist !== undefined) {
					let pass_roller_advance, twist_roller;
					let twist_count = 1;
					roll: for (let a = p; a >= 0; --a) {
						pass_roller_advance = rows[i][a].find((el) => el.includes('x-roller-advance'));
						if (pass_roller_advance !== undefined) {
							break roll;
						}
					}
					if (pass_roller_advance === undefined) pass_roller_advance = 'x-roller-advance 100'; ////temporary
					if (pass_roller_advance === 'x-roller-advance 450') {
						twist_roller = 'x-roller-advance 225';
					} else {
						twist_roller = 'x-roller-advance 50';
					}
					
					let info = cookie[0].split(';');
					let c_endN;
					info.length > 4 ? (c_endN = info[5]) : info[2] === '+' ? (c_endN = short_Xright_needle) : (c_endN = short_Xleft_needle);
					let twisted_stitch;
					
					if (right_xfer) {
						if (RtwistedF) { //for right inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`f${short_Xright_needle - twist} `) && RtwistedF) {
									twisted_stitch = cookie.indexOf(el);
									RtwistedF = false;
									if (el.includes(' + ')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!RtwistedF) {
								if (twist === 0 && !RtwistedB) {
									if (info[2] === '+') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss + f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${short_Xright_needle - 1}`) && !cookie[twisted_stitch + 1].includes(`f${short_Xright_needle - 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit - b${short_Xright_needle - 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									++twist_count;
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
						if (RtwistedB) { //for right inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`b${short_Xright_needle - twist} `) && RtwistedB) {
									twisted_stitch = cookie.indexOf(el);
									RtwistedB = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!RtwistedB) {
								if (twist === 0) {
									if (info[2] === '+') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss + f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${short_Xright_needle - 1}`) && !cookie[twisted_stitch + 1].includes(`f${short_Xright_needle - 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit - b${short_Xright_needle - 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
					}
					if (left_xfer) {
						if (LtwistedF) { //for left inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`f${short_Xleft_needle + twist} `) && LtwistedF) {
									twisted_stitch = cookie.indexOf(el);
									LtwistedF = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!LtwistedF) {
								if (twist === 0 && !LtwistedB) {
									if (info[2] === '-') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss - f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${short_Xleft_needle + 1}`) && !cookie[twisted_stitch + 1].includes(`f${short_Xleft_needle + 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit + b${short_Xleft_needle + 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
						if (LtwistedB) {
							//for left inc
							cookie = cookie.map((el) => {
								if (el.includes('knit') && el.includes(`b${short_Xleft_needle + twist} `) && LtwistedB) {
									twisted_stitch = cookie.indexOf(el);
									LtwistedB = false;
									if (el.includes('+')) {
										return (el = el.replace('+', '-'));
									} else if (el.includes(' - ')) {
										return (el = el.replace('-', '+'));
									}
								} else {
									return el;
								}
							});
							if (!LtwistedB) {
								if (twist === 0) {
									if (info[2] === '-') {
										let x_roll;
										if (cookie[cookie.length - 1].includes('x-roller-advance')) x_roll = cookie.pop();
										cookie.push(`miss - f${c_endN} ${info[3]}`);
										if (x_roll !== undefined) cookie.push(x_roll);
									} else {
										if (!cookie[twisted_stitch + 1].includes(`b${short_Xleft_needle + 1}`) && !cookie[twisted_stitch + 1].includes(`f${short_Xleft_needle + 1}`)) {
											cookie.splice(twisted_stitch + 1, 0, `knit + b${short_Xleft_needle + 1} ${info[3]}`);
										}
									}
								}
								if (!cookie.includes(twist_roller) && pass_roller_advance !== 'x-roller-advance 0') {
									let first_knit = cookie.findIndex((el) => el.includes('knit '));
									if (cookie[first_knit - 1].includes('x-roller-advance')) {
										cookie.splice(first_knit - 1, 1, twist_roller);
									} else {
										cookie.splice(first_knit, 0, twist_roller);
									}
									cookie.push(pass_roller_advance);
								} else if (cookie.includes(twist_roller) && twist_roller === `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`) {
									++twist_count;
									cookie.splice(
										cookie.findIndex((el) => el === twist_roller),
										1,
										`x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`
									);
									twist_roller = `x-roller-advance ${Math.ceil(450 / twist_count / 5) * 5}`;
								}
								if (pass_roller_advance !== 'x-roller-advance 0' && cookie[twisted_stitch + 1].includes('miss ')) cookie.splice(twisted_stitch + 1, 0, 'x-roller-advance 0');
							}
						}
					}
				}

				if (p === insertL8rP && insertl8r_arr.length > 0) { //here
					if (p === 0) {
						if (insertLl8r) {
							insertLeftX = (insertLinc ? insertLinc : -left_xfer_count);
							insertRightX = 0;
						} else {
							insertRightX = (insertRinc ? -insertRinc : right_xfer_count);
							insertLeftX = 0;
						}
					}

					if (rows[i][p][0].includes(';xfer')) {
						++insertL8rP;
					} else {
						if (insertLl8r) {
							cookie = rows[i][p]; //reset it
							cookieCutter(short_Xleft_needle+insertLeftX, short_Xright_needle, new_carriers, short_row_carriers, p);
							insertLeftX = 0;
						} else if (insertRl8r) {
							cookie = rows[i][p]; //reset it
							cookieCutter(short_Xleft_needle, short_Xright_needle+insertRight, new_carriers, short_row_carriers, p);
							insertRightX = 0;
						}

						insert_arr.push(cookie, insertl8r_arr);
						insertl8r_arr = [];
					}
				} else {
					insert_arr.push(cookie);
				}
			}
		}
		if ((r - first_short_row) % 2 !== 0) {
			insert_arr = insert_arr.flat();
			shaped_rows.push(insert_arr);
			insert_arr = [];
		}
	}
	
	if (shape_code_reverse !== null) {
		if (r === last_shape_row && !short_row_section) {
			if (!warning) {
				console.log(
					chalk.black.bgYellow('! WARNING:') + ` The program has finished running through all rows in the custom shape. The rest of the file will maintain the shape's final width.` //TODO: alter this once have function to chop off excess rows
				);
			}
			warning = true;
		}

		if (r <= last_shape_row && r >= shaping_arr[shaping_arr.length - 1].ROW && short_row_section) { 
			//TODO: if rows[r].length < 2 && it isn't a negative pass, no rows[first_short_row] instead 
			let shortRow1 = rows[first_short_row];

				if (r === shaping_arr[shaping_arr.length - 1].ROW) {
				let negPass = false;
				findNegPass: for (let p = 0; p < shortRow1.length; ++p) {
					if (shortRow1[p].some((el) => el.includes(' - '))) {
						negPass = true;
						break findNegPass;
					}
				}

				if (!negPass) {
					console.log('no negative pass, starting first short row one row late.'); //remove //debug
					last_shape_row += 1;
					first_short_row += 1;
					continue main;
				}
			}
			shortrow_time = true;

			for (let i = r + xfer_row_interval; i < first_short_row; ++i) {
				for (let p = 0; p < rows[i].length; ++p) {
					cookie = rows[i][p];
					cookieCutter(Xleft_needle, Xright_needle, carriers, carriers, p);
					shaped_rows.push(cookie);
				}
			}
			let bindoff_pass;
			let bind_chosen = false;

			bindoffC: for (let p = rows[first_short_row].length - 1; p >= 0; --p) {
				if (rows[first_short_row][p].some((el) => el.includes(' - ')) && !bind_chosen) {
					bind_chosen = true;

					let lineIncludesCarrier;

					findTheLine: for (let ln = 0; ln < rows[first_short_row][p].length; ++ln) {
						if (rows[first_short_row][p][ln].includes(' + ') || rows[first_short_row][p][ln].includes(' - ')) { //TODO: maybe make if isn't comment too
							lineIncludesCarrier = rows[first_short_row][p][ln];
							break findTheLine;
						}
					}

					final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === lineIncludesCarrier.charAt(lineIncludesCarrier.length - 1))].SIDE = 'left';
					bindoff_pass = p; ////keeps redefining until end, so ends up being final match
					continue bindoffC;
				} else if (bind_chosen) {
					let srP = rows[first_short_row][p];

					let srC;
					findC: for (let ln = 0; ln < srP.length; ++ln) {
						let info = srP[ln].split(' ');
						if (info[0] === 'knit' || info[0] === 'tuck') {
							srC = info[3];
							break findC;
						}
					}

					if (rows[first_short_row][p].some((el) => el.includes(' - '))) {
						final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === srC)].SIDE = 'left';
					} else if (rows[first_short_row][p].some((el) => el.includes(' + '))) {
						final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === srC)].SIDE = 'right';
					}
				}
			}
			let bp_bindoff = [];
			if (bindoff_pass === undefined) {
				let passIdx = 0;

				checkForXferPass: for (let p = 0; p < rows[first_short_row].length; ++p) {
					if (rows[first_short_row][p][0].includes(';xfer')) passIdx += 1;
					else break checkForXferPass;
				}
				let sr1 = rows[first_short_row][passIdx];
				let sr1C;
				findC: for (let ln = 0; ln < sr1.length; ++ln) {
					let info = sr1[ln].split(' ');
					if (info[0] === 'knit' || info[0] === 'tuck') {
						sr1C = info[3];
						break findC;
					}
				}

				bp_bindoff.push(`;pass: back ;-;${sr1C};${Xright_needle};${Xleft_needle}`);
				let mod = 3;
				if (bpBed === 'f') mod = 1;

				console.log('adding back pass.'); //remove //debug
				let emptyOffset = false;

				for (let n = Xright_needle; n >= Xleft_needle; --n) {
					if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
						if (n === Xright_needle || n === Xleft_needle) {
							bp_bindoff.push(`knit - ${bpBed}${n} ${sr1C}`);
						} else if (n % mod === 0 || emptyOffset) {
							bp_bindoff.push(`knit - ${bpBed}${n} ${sr1C}`);
						}
						emptyOffset = false; //*
					} else emptyOffset = true;
				}
				bindoff_pass = passIdx;

				final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === sr1C)].SIDE = 'left';
			}
			shaped_rows.push(';short row section');
			
			new_carriers = [...carriers];
			let carriers_defined = false;
			let shortrow_colors = carriers.filter((el) => !short_row_carriers.includes(el));
			if (!errors) {
				if (shortrow_colors.length < 3 && !carriers.includes(draw_thread)) { //TODO: make back pass an extra seed pass instead to comply with pattern
					if (shortrow_colors.length === 1) {
						let carrier_idx = new_carriers.indexOf(shortrow_colors[0]);
						short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
						short_row_carriers.splice(carrier_idx, 0, draw_thread);
						carriers_defined = true;
					} else {
						let left_carrier = findCarrierOnSide('left', first_short_row, bindoff_pass);

						if (left_carrier !== undefined) {
							let carrier_idx = new_carriers.indexOf(left_carrier);

							short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
							short_row_carriers.splice(carrier_idx, 0, draw_thread);
						}
					}
				} else if (!carriers.includes(draw_thread) && !new_carriers.includes(draw_thread)) {
					new_carriers.push(draw_thread);
					short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
				}
			}
			if (!carriers_defined) {
				new_carriers = new_carriers.filter((el) => !short_row_carriers.includes(el));

				for (let i = 0; i < tracked_carriers.length; ++i) {
					if (findCarrierSide(tracked_carriers[i], first_short_row, bindoff_pass) === 'right' && new_carriers.includes(tracked_carriers[i])) {
						let carrier_idx = new_carriers.indexOf(tracked_carriers[i]);
						let replacement_carrier = short_row_carriers.splice(carrier_idx, 1, tracked_carriers[i]);
						new_carriers.splice(carrier_idx, 1, replacement_carrier);
					}
				}

				new_carriers = new_carriers.flat();
				if (new_carriers.length > short_row_carriers.length) {
					even_out: for (let c = new_carriers.length - 1; c >= 0; --c) {
						if (!carriers.includes(new_carriers[c])) {
							let move = new_carriers.splice(c, 1);
							short_row_carriers.push(move);
							break even_out;
						}
					}
					short_row_carriers = short_row_carriers.flat();
				}
				
				if (short_row_carriers.length > 3) {
					let splice_start = 6 - short_row_carriers.length;
					short_row_carriers.splice(splice_start, short_row_carriers.length - splice_start);
					new_carriers.splice(splice_start, new_carriers.length - splice_start);
				}
			}
			
			//TODO: add in something similar for if more than 3 carriers ARE used in body (but only 3 in shortrowsection so OK), to make it so if it ends up on left, add in extra pass to make it end up on right
			xtra_neg_carriers = xtra_neg_carriers.filter((c) => short_row_carriers.includes(c) || new_carriers.includes(c));
			for (let c = 0; c < short_row_carriers.length; ++c) {
				if (xtra_neg_carriers.includes(short_row_carriers[c]) && !xtra_pos_carriers.includes(short_row_carriers[c])) {
					xtra_pos_carriers.push(short_row_carriers[c]);
				}
			}
			
			xtra_neg_carriers = xtra_neg_carriers.filter((c) => !xtra_pos_carriers.includes(c));
			//TODO: move xtra_neg_carriers splicing down here so don't add in more carriers than necessary
			for (let p = 0; p < bindoff_pass; ++p) {
				cookie = rows[first_short_row][p];
				cookieCutter(Xleft_needle, Xright_needle, carriers, carriers, null);
				shaped_rows.push(cookie);
			}
			let bp_count = 3;

			for (let c = 0; c < tracked_carriers.length; ++c) { //TODO: make this only for color carriers
				if (new_carriers.includes(tracked_carriers[c]) && findCarrierSide(tracked_carriers[c], first_short_row, bindoff_pass) === 'right') {
					shaped_rows.push(`;pass: back ;-;${tracked_carriers[c]};${Xright_needle};${Xleft_needle}`);
					let mod = bp_count;
					if (bpBed === 'f') mod = 1;

					console.log('adding back pass.'); //remove //debug
					let emptyOffset = false;

					for (let n = Xright_needle; n >= Xleft_needle; --n) {
						if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) { //come back! //check //*
							if (n === Xright_needle || n === Xleft_needle) {
								shaped_rows.push(`knit - ${bpBed}${n} ${tracked_carriers[c]}`);
							} else if (n % mod === 0 || emptyOffset) {
								shaped_rows.push(`knit - ${bpBed}${n} ${tracked_carriers[c]}`);
							}
							emptyOffset = false;
						} else emptyOffset = true;
					}
					++bp_count;
				} else if (short_row_carriers.includes(tracked_carriers[c]) && findCarrierSide(tracked_carriers[c], first_short_row, bindoff_pass) === 'left') {
					shaped_rows.push(`;pass: back ;+;${tracked_carriers[c]};${Xleft_needle};${Xright_needle}`);
					let mod = bp_count;
					if (bpBed === 'f') mod = 1;

					console.log('adding back pass.'); //remove //debug
					let emptyOffset = false;

					for (let n = Xleft_needle; n <= Xright_needle; ++n) {
						if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
							if (n === Xleft_needle || n === Xright_needle) {
								shaped_rows.push(`knit + ${bpBed}${n} ${tracked_carriers[c]}`);
							} else if (n % mod === 0 || emptyOffset) {
								shaped_rows.push(`knit + ${bpBed}${n} ${tracked_carriers[c]}`);
							}
							emptyOffset = false;
						} else emptyOffset = true;
					}
					++bp_count;
				}
			}
			
			short_Xleft_needle = shortrow_bindoff[1];
			short_Xright_needle = Xright_needle; //shortrow section is right side
			Xright_needle = shortrow_bindoff[0];
			
			cookie = rows[first_short_row][bindoff_pass];
			if (bp_bindoff.length > 0) {
				let bpBindC = bp_bindoff[0].split(';')[3];
				//0: '' ; 1: pass... ; 2:dir ; 3:carrier ; 4:start_needle ; 5:end_needle (length === 6)
				let placementPass = [];
				placementPass.push(`;pass: back ;+;${bpBindC};${Xleft_needle};${Xright_needle}`); //TODO: ensure carrier used in bindoff pass is 
				let mod = 3;
				if (bpBed === 'f') mod = 1;

				console.log('adding back pass.'); //remove //debug
				let emptyOffset = false;

				for (let n = Xleft_needle; n <= Xright_needle; ++n) {
					if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
						if (n === Xright_needle || n === Xleft_needle) {
							placementPass.push(`knit + ${bpBed}${n} ${bpBindC}`);
						} else if (n % mod === 0 || emptyOffset) {
							placementPass.push(`knit + ${bpBed}${n} ${bpBindC}`);
						}
						emptyOffset = false;
					} else emptyOffset = true;
				}
				shaped_rows.push(placementPass);

				cookie = bp_bindoff;
			}
			cookieCutter(short_Xleft_needle, short_Xright_needle, carriers, carriers);
			shaped_rows.push(cookie);

			bindoff_carrier = cookie.slice().reverse().find(ln => ln.includes('knit ')).slice(-1);

			xfer_section.push(`x-speed-number ${xfer_speed_number}`);
			xfer_section.push('x-roller-advance 50');
			BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed, xfer_section);
			xfer_section.push(`x-speed-number ${speed_number}`);
			shaped_rows.push(xfer_section);
			xfer_section = [];

			cookie = rows[first_short_row][bindoff_pass];

			if (bp_bindoff.length > 0) {
				cookie = bp_bindoff.slice(1);
			}
			cookieCutter(Xleft_needle, Xright_needle, carriers, carriers);
			shaped_rows.push(cookie);

			let left_carriers = [];
			let right_carriers = [];

			find_dir: for (let y = first_short_row; y < rows.length; ++y) {
				if (left_carriers.length + right_carriers.length === new_carriers.length) break find_dir;
				parse_pass: for (let i = 0; i < rows[y].length; ++i) {
					if (y === first_short_row) {
						if (bp_bindoff.length > 0 && bindoff_pass > i) {
							continue parse_pass;
						} else if (bindoff_pass >= i) continue parse_pass;
					}
					if (rows[y][i].some((el) => el.includes(' - '))) {
						let opC;

						findLastKnitC: for (let o = rows[y][i].length - 1; o >= 0; --o) {
							if (rows[y][i][o].includes('knit -')) {
								opC = rows[y][i][o].charAt(rows[y][i][o].length - 1);
								break findLastKnitC;
							}
						}

						if (!left_carriers.includes(opC) && !right_carriers.includes(opC)) {
							if (new_carriers.includes(opC)) {
								if (!back_passLpos.some(el => el[1] == opC)) back_passLpos.push([y, opC, back_passLpos.length]);
							} else {
								if (!back_passLpos.some(el => el[1] == new_carriers[short_row_carriers.indexOf(opC)])) back_passLpos.push([y, new_carriers[short_row_carriers.indexOf(opC)], back_passLpos.length]);
							}

							left_carriers.push(opC);
						}
					} else if (rows[y][i].some((el) => el.includes(' + '))) {
						let opC;

						findLastKnitC: for (let o = rows[y][i].length - 1; o >= 0; --o) {
							if (rows[y][i][o].includes('knit +')) {
								opC = rows[y][i][o].charAt(rows[y][i][o].length - 1);
								break findLastKnitC;
							}
						}

						if (!left_carriers.includes(opC) && !right_carriers.includes(opC)) {
							if (short_row_carriers.includes(opC)) {
								if (!back_passRneg.some(el => el[1] == opC)) back_passRneg.push([y, opC, back_passRneg.length]); //beep
							} else {
								if (!back_passRneg.some(el => el[1] == short_row_carriers[new_carriers.indexOf(opC)])) back_passRneg.push([y, short_row_carriers[new_carriers.indexOf(opC)], back_passRneg.length]);
							}	
							right_carriers.push(opC);
						}
					}
				}
			}
			
			for (let c = 0; c < new_carriers.length; ++c) {
				if (carriers.includes(new_carriers[c]) && shortrow_colors.includes(new_carriers[c])) {
					redefine_carriers.push([new_carriers[c], short_row_carriers[c]]);
				} else if (carriers.includes(short_row_carriers[c]) && shortrow_colors.includes(short_row_carriers[c])) {
					redefine_carriers.push([short_row_carriers[c], new_carriers[c]]);
				}
			}

			shaped_rows = shaped_rows.flat(); //flatten so can properly splice
			
			for (let rC = 0; rC < redefine_carriers.length; ++rC) {
				if (carriers.includes(redefine_carriers[rC][1]) && !shortrow_colors.includes(redefine_carriers[rC][1])) { //pause to change yarn if it was used early in piece
					findSpot: for (let sr = shaped_rows.length - 1; sr >= 0; --sr) {
						if (shaped_rows[sr].charAt(shaped_rows[sr].length - 1) == redefine_carriers[rC][1] && (shaped_rows[sr].includes('knit ') || shaped_rows[sr].includes('tuck ') || shaped_rows[sr].includes('miss ') || shaped_rows[sr].includes('split '))) {
							shaped_rows.splice(sr + 1, 0, `pause switch C${redefine_carriers[rC][1]}`); //TODO: maybe add the x-vis-color in here instead //?
							break findSpot;
						}
					}
				}
			}
			
			if (rows[first_short_row][rows[first_short_row].length - 1] !== rows[first_short_row][bindoff_pass]) { //bindoff pass isn't the last one
				if (bp_bindoff.length > 0) --bindoff_pass;
				
				for (let p = bindoff_pass + 1; p < rows[first_short_row].length; ++p) {
					let srP = rows[first_short_row][p];
					let srC;

					findC: for (let ln = 0; ln < srP.length; ++ln) {
						let info = srP[ln].split(' ');
						if (info[0] === 'knit' || info[0] === 'tuck') {
							srC = info[3];
							break findC;
						}
					}
						
					if (back_passLpos.length > 0) {
						let leftover_carriers = [...back_passLpos];
						for (let c = 0; c < back_passLpos.length; ++c) {
							if (first_short_row === back_passLpos[c][0] && (srC === back_passLpos[c][1] || srC === short_row_carriers[new_carriers.indexOf(back_passLpos[c][1])])) {
								shaped_rows.push(`;pass: back ;+;${back_passLpos[c][1]};${Xleft_needle};${Xright_needle}`);
								let mod = 4;
								if (back_passLpos[c][2] === 1) mod = 5;
								if (back_passLpos[c][2] === 2) mod = 3;
								if (bpBed === 'f') mod = 1;

								console.log('adding back pass.'); //remove //debug
								let emptyOffset = false;

								for (let n = Xleft_needle; n <= Xright_needle; ++n) {
									if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`${bpBed}${n}`)) {
										if (n === Xleft_needle || n === Xright_needle) {
											shaped_rows.push(`knit + ${bpBed}${n} ${back_passLpos[c][1]}`);
										} else if (n % mod === 0 || emptyOffset) {
											shaped_rows.push(`knit + ${bpBed}${n} ${back_passLpos[c][1]}`);
										}
										emptyOffset = false;
									} else emptyOffset = true;
								}
								leftover_carriers.splice(leftover_carriers.indexOf(back_passLpos[c]), 1);
							}
						}
						back_passLpos = leftover_carriers;
					}
					
					cookie = rows[first_short_row][p];
					cookieCutter(Xleft_needle, Xright_needle, short_row_carriers, new_carriers);
					shaped_rows.push(cookie);
					
					if (back_passRneg.length > 0) {
						let leftover_carriers = [...back_passRneg];

						let srP = rows[first_short_row][p];
						let srC;
						findC: for (let ln = 0; ln < srP.length; ++ln) {
							let info = srP[ln].split(' ');
							if (info[0] === 'knit' || info[0] === 'tuck') {
								srC = info[3];
								break findC;
							}
						} //new //^

						for (let c = 0; c < back_passRneg.length; ++c) {
							if (first_short_row === back_passRneg[c][0] && (srC === back_passRneg[c][1] || srC === new_carriers[short_row_carriers.indexOf(back_passRneg[c][1])])) {
								insert_arr.push(`;pass: back ;-;${back_passRneg[c][1]};${short_Xright_needle};${short_Xleft_needle}`);
								let mod = 3;
								if (back_passRneg[c][2] === 1) mod = 5;
								if (back_passRneg[c][2] === 2) mod = 4;
								if (bpBed === 'f') mod = 1;

								console.log('adding back pass.'); //remove //debug
								let emptyOffset = false;

								for (let n = short_Xright_needle; n >= short_Xleft_needle; --n) {
									if (!patternEmptyNeedles[r + 1] || !patternEmptyNeedles[r + 1].includes(`b${n}`)) {
										if (n === short_Xright_needle || n === short_Xleft_needle) {
											insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
										} else if (n % mod === 0 || emptyOffset) {
											insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
										}
										emptyOffset = false;
									} else emptyOffset = true;
								}
								leftover_carriers.splice(leftover_carriers.indexOf(back_passRneg[c]), 1);
							}
						}
						back_passRneg = leftover_carriers;
					}
					cookie = rows[first_short_row][p];
					cookieCutter(short_Xleft_needle, short_Xright_needle, new_carriers, short_row_carriers); //*
					insert_arr.push(cookie);
				}
			}
			xfer_row_interval = first_short_row - r + 1;
		}
	}
	
	if (!short_row_section && r + xfer_row_interval > shaping_arr[shaping_arr.length - 1].ROW) {
		console.log(`Heads up that no more shaping happens after row ${r} (generating warning because xfer_row_interval ${xfer_row_interval} is too large and the shaping part of the piece only goes up to row ${shaping_arr[shaping_arr.length - 1].ROW}).\n`); //debug
		warning = true;
	}
	// if (rows[r + xfer_row_interval + xfer_row_interval] === undefined) {
	if (rows[r + xfer_row_interval + 1] === undefined) { //TODO: //check //*
		if (shape_code_reverse === null) {
			break;
		} else {
			if (r !== shaping_arr[shaping_arr.length - 1].ROW) {
				break;
			}
		}
	}
}

//---------------------
//--- ADD BINDOFF ---//
//---------------------
shaped_rows = shaped_rows.flat();
let bindoff = [];
let bindoff_side, Bxfer_needle, bindoff_count;
let bindCs = [];
last_carrier: for (let i = shaped_rows.length - 1; i > 0; --i) {
	if (shaped_rows[i].includes('knit')) {
		bindoff_carrier = shaped_rows[i].charAt(shaped_rows[i].length - 1);
		bindCs.push(bindoff_carrier);
		shaped_rows[i].includes('+') ? (bindoff_side = 'right') : (bindoff_side = 'left');
		break last_carrier;
	}
}
if (rib_top !== undefined) {
	if (!short_row_section) {
		bindoff_carrier = rib_top[1].charAt(rib_top[1].length - 1);
		rib_top[1].includes('+') ? (bindoff_side = 'right') : (bindoff_side = 'left');
		bindCs[0] = bindoff_carrier;
	}
}
if (short_row_section && short_row_carriers.includes(bindoff_carrier)) {
	bindoff_side === 'right' ? (Bxfer_needle = short_Xright_needle) : (Bxfer_needle = short_Xleft_needle);
	bindoff_count = short_Xright_needle - short_Xleft_needle + 1;
} else {
	bindoff_side === 'right' ? (Bxfer_needle = Xright_needle) : (Bxfer_needle = Xleft_needle);
	bindoff_count = Xright_needle - Xleft_needle + 1;
}
bindoff_time = true;
xfer_section.push(';bindoff section', 'pause bindoff');
// xfer_section.push('x-speed-number 100', 'x-roller-advance 100');
xfer_section.push(`x-speed-number ${xfer_speed_number}`, 'x-roller-advance 100');

BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed, xfer_section);
bindoff.push(xfer_section);
xfer_section = [];
if (short_row_section) {
	function bindOtherSide(carrier_arr) {
		last_carrier: for (let i = shaped_rows.length - 1; i > 0; --i) {
			for (let c = 0; c < carrier_arr.length; ++c) {
				if (shaped_rows[i].includes('knit') && shaped_rows[i].charAt(shaped_rows[i].length - 1) === carrier_arr[c]) {
					bindoff_carrier = carrier_arr[c];
					shaped_rows[i].includes('+') ? (bindoff_side = 'right') : (bindoff_side = 'left');
					break last_carrier;
				}
			}
		}
		bindCs.push(bindoff_carrier);
	}
	if (!short_row_carriers.includes(bindoff_carrier)) {
		bindOtherSide(short_row_carriers);
		bindoff_side === 'right' ? (Bxfer_needle = short_Xright_needle) : (Bxfer_needle = short_Xleft_needle);
		bindoff_count = short_Xright_needle - short_Xleft_needle + 1;
	} else {
		bindOtherSide(new_carriers);
		bindoff_side === 'right' ? (Bxfer_needle = Xright_needle) : (Bxfer_needle = Xleft_needle);
		bindoff_count = Xright_needle - Xleft_needle + 1;
	}
	xfer_section.push('x-roller-advance 50');
	BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed, xfer_section);
	bindoff.push(xfer_section);
	xfer_section = [];
	bindoff.push(short_tail);
}

if (rib_top !== undefined) {
	if (!short_row_section) {
		if (Xleft_needle !== L_NEEDLE) {
			for (let cc = L_NEEDLE; cc < Xleft_needle; ++cc) {
				rib_top = rib_top.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}
		if (Xright_needle !== R_NEEDLE) {
			for (let cc = R_NEEDLE; cc > Xright_needle; --cc) {
				rib_top = rib_top.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
			}
		}
		bindoff.unshift(rib_top);
	} else {
		console.log(
			chalk`{black.bgYellow \n! WARNING:} {bold This program does not currently support ribbing at the top of pieces with short rowing, so the top rib section will be removed.}`
		);
	}
}

bindoff = bindoff.flat();
shaped_rows.push(bindoff);
shaped_rows = shaped_rows.flat();

//---------------------------------------------------------------------------------------------
//--- ADD EXTRA POS PASSES TO YARN IN SECTION FOR CARRIERS THAN START WITH NEG DIR PASSES ---//
//---------------------------------------------------------------------------------------------
if (xtra_neg_carriers.length > 0) {
	for (let i = 0; i < xtra_neg_carriers.length; ++i) {
		let xcarrier = xtra_neg_carriers[i];

		let pos_carrier_caston = [], neg_carrier_caston = [];
		let b = 'f';
		for (let n = Number(xcarrier); n <= row1_Rneedle; n += 6) {
			pos_carrier_caston.push(`knit + ${b}${n} ${xcarrier}`);
			b === 'f' ? (b = 'b') : (b = 'f');
			neg_carrier_caston.unshift(`knit - ${b}${n} ${xcarrier}`);
		}
		let xtra_passes = [...pos_carrier_caston, ...neg_carrier_caston, ...pos_carrier_caston, ...neg_carrier_caston];
		if (!neg_carrier_caston[neg_carrier_caston.length - 1].includes(L_NEEDLE)) xtra_passes.push(`miss - f${L_NEEDLE} ${xcarrier}`);

		shaped_rows.splice(
			shaped_rows.indexOf(';kniterate yarns in'),
			0,
			`;pass: yarn in ;-;${xcarrier};${row1_Rneedle};${L_NEEDLE}`, //TODO: maybe add the miss for this too
			`${yarn_in} ${xcarrier}`,
			xtra_passes
		);
	}
}

if (xtra_pos_carriers.length > 0) { //xtra_xtra_pos_yarnInyarn is for carriers that need an extra pos pass
	for (let i = 0; i < xtra_pos_carriers.length; ++i) {
		let xcarrier = xtra_pos_carriers[i];
		
		let pos_carrier_caston = [], neg_carrier_caston = [];
		let b = 'f';
		for (let n = Number(xcarrier); n <= row1_Rneedle; n += 6) {
			pos_carrier_caston.push(`knit + ${b}${n} ${xcarrier}`);
			b === 'f' ? (b = 'b') : (b = 'f');
			neg_carrier_caston.unshift(`knit - ${b}${n} ${xcarrier}`);
		}
		let xtra_passes = [...pos_carrier_caston, ...neg_carrier_caston, ...pos_carrier_caston, ...neg_carrier_caston, ...pos_carrier_caston];
		if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(R_NEEDLE)) xtra_passes.push(`miss + f${R_NEEDLE} ${xcarrier}`);

		shaped_rows.splice(shaped_rows.indexOf(`;kniterate yarns in`), 0, `;pass: yarn in ;+;${xcarrier};${row1_Lneedle};${R_NEEDLE}`, `${yarn_in} ${xcarrier}`, xtra_passes);
	}
}

// //0: '' ; 1: pass... ; 2:dir ; 3:carrier ; 4:start_needle ; 5:end_needle (length === 6)

//------------------------------------------------------------------------------------
//--- ADD MISSES TO BUMP CARRIERS OUT OF WAY FOR INCREASING & INSERT BACK-PASSES ---//
//------------------------------------------------------------------------------------
let last_carrier_spot = [];
const LastSPOT = ({ CARRIER, StartN, DIR }) => ({
	CARRIER,
	StartN,
	DIR,
});

let start_pt;
short_row_section ? (start_pt = shaped_rows.indexOf(';short row section')) : (start_pt = shaped_rows.indexOf(';bindoff section'));

inc_miss: for (let i = start_pt; i >= 0; --i) {
	if (shaped_rows[i].includes(';pass:')) {
		let info = shaped_rows[i].split(';');

		if (info[2] === 'xfer' || info[2] === 'drop') continue inc_miss; //* //new //check
		//0: '' ; 1: pass... ; 2:dir ; 3:carrier ; 4:start_needle ; 5:end_needle (length === 6)
		let carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER == info[3]);
		if (info.length > 4) {
			// shaped_rows[i] = `;${info[1]}`; //go back! //? ////this just cleans things up, but might be nice to keep it for debugging purposes
			if (carrier_idx === -1) {
				last_carrier_spot.push(
					LastSPOT({
						CARRIER: info[3],
						StartN: Number(info[4]),
						DIR: info[2],
					})
				);
			} else {
				if (last_carrier_spot[carrier_idx].DIR === info[2]) {
					let back_pass = [';back pass'];
					let interval;
					Number(info[3]) % 2 === 0 ? (interval = 2) : (interval = 3);
					
					if (info[2] === '-') {
						for (let n = Number(info[5]); n <= last_carrier_spot[carrier_idx].StartN; n += interval) {
							back_pass.push(`knit + b${n} ${info[3]}`);
							if (n + interval > last_carrier_spot[carrier_idx].StartN && n !== last_carrier_spot[carrier_idx].StartN) {
								back_pass.push(`knit + b${last_carrier_spot[carrier_idx].StartN} ${info[3]}`);
							}
						}
					} else {
						for (let n = Number(info[5]); n >= last_carrier_spot[carrier_idx].StartN; n -= interval) {
							back_pass.push(`knit - b${n} ${info[3]}`);
							if (n - interval < last_carrier_spot[carrier_idx].StartN && n !== last_carrier_spot[carrier_idx].StartN) {
								back_pass.push(`knit - b${last_carrier_spot[carrier_idx].StartN} ${info[3]}`);
							}
						}
					}
					find_spot: for (let s = i + 1; s < shaped_rows.length; ++s) {
						if (
							(shaped_rows[s].includes('x-') && (shaped_rows[s - 1].includes('knit ') || shaped_rows[s - 1].includes('tuck ') || shaped_rows[s - 1].includes('miss '))) ||
              shaped_rows[s].includes(';pass:')
						) {
							shaped_rows.splice(s, 0, back_pass);
							break find_spot;
						}
					}
				} else {
					if ((info[2] === '+' && Number(info[5]) < last_carrier_spot[carrier_idx].StartN) || (info[2] === '-' && Number(info[5]) > last_carrier_spot[carrier_idx].StartN)) {
						find_spot: for (let s = i + 1; s < shaped_rows.length; ++s) {
							if (
								(shaped_rows[s].includes('x-') && (shaped_rows[s - 1].includes('knit ') || shaped_rows[s - 1].includes('tuck ') || shaped_rows[s - 1].includes('miss '))) ||
                shaped_rows[s].includes(';pass:')
							) {
								if (shaped_rows[s - 1].includes('rack') || shaped_rows[s - 1].includes(';')) --s;

								shaped_rows.splice(s, 0, `miss ${info[2]} f${last_carrier_spot[carrier_idx].StartN} ${info[3]}`);
								break find_spot;
							}
						}
					}
				}
				last_carrier_spot[carrier_idx].StartN = Number(info[4]);
				last_carrier_spot[carrier_idx].DIR = info[2];
			}
		} else {
			let start_needle;
			info[2] === '+' ? (start_needle = L_NEEDLE) : (start_needle = R_NEEDLE); //TODO: maybe just break once at this point? (or after all)
			if (carrier_idx === -1) {
				last_carrier_spot.push(
					LastSPOT({
						CARRIER: info[3],
						StartN: start_needle,
						DIR: info[2],
					})
				);
			} else {
				last_carrier_spot[carrier_idx].StartN = start_needle;
				last_carrier_spot[carrier_idx].DIR = info[2];
			}
		}
	}
}

shaped_rows = shaped_rows.flat();

let short_miss = false;
miss: for (let i = 0; i < shaped_rows.length; ++i) {
	if (shaped_rows[i] === ';bindoff section') {
		break miss;
	} else if (shaped_rows[i] === ';short row section') {
		short_miss = true;
	}
	
	let next = i + 1;
	if (shaped_rows[i].includes('knit')) {
		next_knit: for (let p = i + 1; p < shaped_rows.length; ++p) {
			if (
				short_miss &&
        ((new_carriers.includes(shaped_rows[i].charAt(shaped_rows[i].length - 1)) && !new_carriers.includes(shaped_rows[p].charAt(shaped_rows[p].length - 1))) ||
          (short_row_carriers.includes(shaped_rows[i].charAt(shaped_rows[i].length - 1)) && !short_row_carriers.includes(shaped_rows[p].charAt(shaped_rows[p].length - 1))))
			) {
				++next;
				continue next_knit;
			}
			if (shaped_rows[p].includes('knit')) {
				break next_knit;
			} else if (shaped_rows[p].includes('x-') || shaped_rows[p].includes(';')) {
				++next;
			}
		}
	}
	if (
		shaped_rows[i].includes('knit + ') &&
    shaped_rows[next].includes('knit - ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) < Number(shaped_rows[next].split(' ')[2].slice(1)) &&
    Number(shaped_rows[next].split(' ')[2].slice(1)) - Number(shaped_rows[i].split(' ')[2].slice(1)) <= 4 //TODO: maybe move this in brackets, & add else knit [instead of miss]
	) {
		
		shaped_rows.splice(i + 1, 0, `miss + ${shaped_rows[next].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`);
	} else if (
		shaped_rows[i].includes('knit - ') &&
    shaped_rows[next].includes('knit + ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) > Number(shaped_rows[next].split(' ')[2].slice(1)) &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) - Number(shaped_rows[next].split(' ')[2].slice(1)) <= 4
	) {
		shaped_rows.splice(i + 1, 0, `miss - ${shaped_rows[next].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`);
	}
}

//-----------------------------------
//--- ADD OUT / OUTHOOK BACK IN ---//
//-----------------------------------
//TODO: do this for inhook & releasehook for shima
((carriers_arr) => {
	short_row_section && !sinkers ? (carriers_arr = [...new Set([...new_carriers, redefine_carriers, carriers].flat(2))]) : (carriers_arr = carriers);

	for (let i = 0; i < maybeNewCs.length; ++i) {
		if (maybeNewCs[i] !== undefined && !carriers_arr.includes(maybeNewCs[i])) carriers_arr.push(maybeNewCs[i]); //new //check
	}
	
	let end_splice = shaped_rows.indexOf(';tail');
	for (let i = 0; i <= carriers_arr.length; ++i) {
		let carrier_search = shaped_rows.map((el) => el.includes(` ${carriers_arr[i]}`) && (el.includes('knit') || el.includes('miss')));
		let last = carrier_search.lastIndexOf(true);
		if (last !== -1) {
			
			if (!bindCs.includes(carriers_arr[i]) && (shaped_rows[last].includes(' + ') || (short_row_section && short_row_carriers.includes(carriers_arr[i])))) {
				let dir;
				let out_spot = Number(shaped_rows[last].split(' ')[2].slice(1));
				if (shaped_rows[last].includes(' + ')) {
					dir = '+';
					if (!short_row_section || short_row_carriers.includes(carriers_arr[i])) {
						// out_spot += 6;
						out_spot = R_NEEDLE + 3; //miss past right-most needle
					} else {
						out_spot += 1; //if on left side and shortrowing
					}
				} else {
					dir = '-';
					out_spot -= 1; //TODO: probably make this L_NEEDLE ?
				}
				shaped_rows.splice(last + 1, 0, `miss ${dir} f${out_spot} ${carriers_arr[i]} ;yarn-out`);
				if (last + 1 < end_splice) ++end_splice;
				shaped_rows.splice(end_splice, 0, `${yarn_out} ${carriers_arr[i]}`);
			} else {
				shaped_rows.splice(last + 1, 0, `${yarn_out} ${carriers_arr[i]}`); ////include bindCs here so takes the carrier out before drop
				if (last + 1 < end_splice) ++end_splice;
			}
		}
	}
	// if (!carriers_arr.includes(draw_thread)) shaped_rows.splice(end_splice, 0, `${yarn_out} ${draw_thread}`); //go back! //? // removed because now knitify takes out draw thread
})();

//------------------------------------------------------------
//--- ADD x-vis-color FOR SHORTROW CARRIERS IF NECESSARY ---//
//------------------------------------------------------------
if (short_row_section && !sinkers) {
	for (let i = 0; i < redefine_carriers.length; ++i) {
		let correspond_color = header.find((line) => line.includes('x-vis-color') && line.charAt(line.length - 1) === `${redefine_carriers[i][0]}`).split(' ');
		correspond_color = correspond_color[1];
		shaped_rows.splice(shaped_rows.indexOf(';short row section') + 1, 0, `x-vis-color ${correspond_color} ${redefine_carriers[i][1]}`);
	}
}
shaped_rows.unshift(header);

//--------------------------------
//--- ADDITIONAL ERROR CHECK ---//
//--------------------------------
if (shaped_rows.some((line) => line.includes(undefined) || line.includes(NaN) || line.includes(null))) {
	console.log(chalk`{red.bold ERR:} {red file includes invalid value such as 'undefined'.}`);
	errors = true;
}

//---------------------------------------
//--- FINALLY, STRINGIFY FINAL_FILE ---//
//---------------------------------------
shaped_rows = shaped_rows.flat();
let final_file = JSON.stringify(shaped_rows).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
final_file = final_file.join('\n');

//--------------------------------------------------
//--- CHECK FOR ERRORS BEFORE WRITING THE FILE ---//
//--------------------------------------------------
if (!errors && !shape_error) {
	console.log(
		chalk`{green \nno errors found :-)}\n{black.bgYellow ! WARNING:} {bold IT IS RECOMMENDED THAT YOU VIEW THE NEW FILE ON THE KNITOUT LIVE VISUALIZER} {italic (https://textiles-lab.github.io/knitout-live-visualizer/)} {bold BEFORE USE TO ENSURE THAT IT WILL PRODUCE A KNIT TO YOUR LIKING.\n***contact:} {italic info@edgygrandma.com} {bold if you have any questions about this program.}`
	);
}

//--------------------------------
//--- WRITE THE FINAL FILE ! ---//
//--------------------------------
if (!errors && !shape_error) {
	fs.writeFile(`./knit-out-files/${new_file}`, final_file, function (err) {
		if (err) return console.log(err);
		console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`));
	});
} else {
	if (shape_error) {
		console.log(
			chalk.red(
				`ShapeError: no overlapping stitches between row #${shape_err_row + 1} and row #${
					shape_err_row + 2
				}.\nCheck working directory for 'shape_code.png' to see visualization of first error in image. (Error pixels are red)\n`
			)
		);
	} else {
		console.log(chalk.red.bgWhite.bold(`\nErrors found--unable to write file. Please refer to console log for details.`));
		// fs.writeFile(`./knit-out-files/${new_file}`, final_file, function (err) { //remove ////for debugging purposes
		//   if (err) return console.log(err);
		//   console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`));
		// }); //remove
	}
}