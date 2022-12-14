const fs = require('fs');
const readlineSync = require('readline-sync');
// const chalk = require('chalk');

const shapeProcessor = require('./shapeify_new/process-image.js');

const shape = require('./shapeify_new/shape.js');


// const styler = require('./styleLog.js');
// const { style } = require('./shapeify/utils.js');

const styler = require('./shapeify_new/utils.js').styler;

let specs = {};

let final_file;

let img, source_dir;
let row_count, needle_count;

let shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, section_count; //, shape_error, shape_err_row;

// readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nShape image file: ') }); //remove
readlineSync.setDefaultOptions({ prompt: styler('\nShape image file: ', ['blue', 'bold']) });
readlineSync.promptLoop(function (input) {
	img = input;
	if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-shape-images/${input}`)) {
    if (!/\.$/i.test(input)) { //doesn't include extension
      for (let ext of ['.png', '.jpg', '.jpeg']) {
        if (fs.existsSync(`./in-shape-images/${input}${ext}`)) {
          console.log(`Using existing file with ${ext} extension.`);
          img += ext;
          return true;
        }
      }
    }

		// let error_message = console.log(chalk.red(`The image must be a PNG, JPG, or BMP that exists in the 'in-shape-images' folder.`)); //remove
    let error_message = console.log(styler(`The image must be a PNG, or JPG that exists in the 'in-shape-images' folder.`, ['red']));
		return error_message;
	}
	if (fs.existsSync(`./in-shape-images/${input}`)) {
		return /\.jpg|\.jpeg|\.png$/i.test(input);
	}
});
// console.log(chalk.green(`-- Reading shape data from: ${img}`)); //remove
console.log(styler(`-- Reading shape data from: ${img}`, ['green']));
readlineSync.setDefaultOptions({ prompt: '' });

img = `./in-shape-images/${img}`; //new

//TODO: maybe add option of writing file front scratch here? (with no colorwork); for now, just using a file from image processing program (don't think there is proper support for panels with stitch patterns yet, need to do that)
// let colorwork_file = readlineSync.question(chalk`{blue.bold \nWhat is the name of the file that you would like to add shaping to? }`, { //remove
let colorwork_file = readlineSync.question(styler('\nWhat is the name of the file that you would like to add shaping to? ', ['blue', 'bold']), {
	limit: [
		function (input) {
			if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
			input = `${input}.k`;
			return fs.existsSync(`./knit-in-files/${input}`) || fs.existsSync(`./knit-out-files/${input}`);
		},
	],
	// limitMessage: chalk`{red -- Input valid name of a knitout (.k) file that exists in either the 'knit-out-files' or 'knit-in-files' folder, please.}`, //remove
  limitMessage: styler("-- Input valid name of a knitout (.k) file that exists in either the 'knit-out-files' or 'knit-in-files' folder, please.", ['red']),
});

if (colorwork_file.includes('.')) colorwork_file = colorwork_file.slice(0, colorwork_file.indexOf('.'));
colorwork_file = `${colorwork_file}.k`;
// console.log(chalk.green(`-- Reading from: ${colorwork_file}\n\nPlease wait...`)); //remove
console.log(styler(`-- Reading from: ${colorwork_file}\n\nPlease wait...`, ['green']));
if (fs.existsSync(`./knit-in-files/${colorwork_file}`)) {
	source_dir = './knit-in-files/';
} else if (fs.existsSync(`./knit-out-files/${colorwork_file}`)) {
	source_dir = './knit-out-files/';
}


let inc_methods, inc_method;

// (inc_methods = ['xfer', 'twisted-stitch', 'split']), (inc_method = readlineSync.keyInSelect(inc_methods, chalk.blue.bold(`^Which increasing method would you like to use?`))); //remove
(inc_methods = ['xfer', 'twisted-stitch', 'split']), (inc_method = readlineSync.keyInSelect(inc_methods, styler(`^Which increasing method would you like to use?`, ['blue', 'bold'])));

if (inc_method == -1) {
  console.log(styler('Killing program.', ['red']))
  process.kill(process.pid);
}

specs.inc_method = inc_methods[inc_method];


let xfer_speed_number = readlineSync.question(
	// chalk`{blue.bold \nWhat carriage speed would you like to use for transfer operations?} {blue.italic (press Enter to use default speed, 300). }`, //remove
  styler('\nWhat carriage speed would you like to use for transfer operations? ', ['blue', 'bold']) + styler('(press Enter to use default speed, 300). ', ['blue', 'italic']),
	{
		defaultInput: 300,
		limit: Number,
		// limitMessage: chalk.red('-- $<lastInput> is not a number.') //remove
    limitMessage: styler('-- $<lastInput> is not a number.', ['red'])
	}
);


// readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave new file as: ') }); //remove
readlineSync.setDefaultOptions({ prompt: styler('\nSave new file as: ', ['blue', 'bold']) });
let new_file, overwrite;
readlineSync.promptLoop(function (input) {
	if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
	input = `${input}.k`;
	new_file = input;
	if (fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-out-files/${input}.k`)) {
		// overwrite = readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`); //remove
    overwrite = readlineSync.keyInYNStrict(styler('! WARNING:', ['black', 'bgYellow']) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`);
		return overwrite;
	}
	if (!fs.existsSync(`./knit-out-files/${input}`)) {
		return !fs.existsSync(`./knit-out-files/${input}.k`);
	}
});
// console.log(chalk.green(`-- Saving new file as: ${new_file}`)); //remove
console.log(styler(`-- Saving new file as: ${new_file}`, ['green']));
readlineSync.setDefaultOptions({ prompt: '' });


// fs.writeFileSync('SOURCE_FILE.txt', `${in_file}\n${source_dir}`);
let in_file = fs
	.readFileSync(source_dir + colorwork_file)
	.toString();

let in_lines = in_file.split('\n');

let carriers_header = in_lines.find(el => el.includes(';;Carriers:'));
let machine_header = in_lines.find(el => el.includes(';;Machine:'));
let visColor_headers = in_lines.filter(el => el.includes('x-vis-color '));

specs.carriers = carriers_header.split(':')[1].trim().split(' ');
specs.machine = machine_header ? machine_header.split(':')[1].trim().toLowerCase() : (specs.carriers.length === 6 ? 'kniterate' : 'swgn2');
specs.visColors = {};
if (visColor_headers.length) {
  for (let header of visColor_headers) {
    let info = header.split(' ');
    specs.visColors[info[2]] = info[1];
  }
}


let row_count_arr = in_lines.filter((el) => el.includes(';row:'));
row_count = row_count_arr[row_count_arr.length - 1].replace(';row: ', '');
let needle_count_arr = in_lines.filter((el) => el.trim().length && !el.includes(';') && !el.includes('x-') && !el.includes('miss') && !el.includes('tuck') && !el.includes('drop') && !el.includes('xfer') && !el.includes('pause') && !el.includes('rack'));
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

row_count = Number(row_count);



// ------------------------

async function getData() {
  await shapeProcessor.process(img, true, needle_count, row_count, '.')
  .then((result) => {
    let shape_info = result;

    shape_code = shape_info[0],
    shape_code_reverse = shape_info[1],
    shortrow_code = shape_info[2],
    short_row_section = shape_info[3]
    first_short_row = shape_info[4],
    last_short_row = shape_info[5],
    section_count = shape_info[6];
    // shape_error = shape_info[7],
    // shape_err_row = shape_info[8];
  })
  .then(() => {
    let txt_file = JSON.stringify(shape_code).replace(/\[/g, '').split('],');
    txt_file = txt_file.join('\n').replace(/\]|,/g, '');

    fs.writeFileSync('SHAPE-CODE.txt', txt_file, function (err) {
      if (err) return console.log(err);
    });
  })
}

getData()
.then(() => {
  // console.log(
    // styler('If you would like to edit the shape in the .txt file, please do so now.', ['black', 'bold', 'bgYellow'])
  // );
  // console.log(
  //   styler('Valid characters are 0 (white space) and 1 (shape).', ['black', 'bold', 'bgYellow'])
  // );

  console.log(
  //   // chalk`{bgYellow.black.bold WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.\nIf you would like to edit the shape in the .txt file, please do so now.\nValid characters are: 0 }{black.bgYellow [white space] }{bgYellow.black.bold and 1 }{black.bgYellow [shape]}` //remove
    styler(`\nWRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.\nIf you would like to edit the shape in the .txt file, please do so now.\nValid characters are: 0 `, ['bgYellow', 'black', 'bold']) +
    styler('(white space) ', ['bgYellow', 'black']) +
    styler('and 1 ', ['bgYellow', 'black', 'bold']) +
    styler('(shape)', ['black', 'bgYellow'])
    // styler(`WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.\nIf you would like to edit the shape in the .txt file, please do so now.\nValid characters are 0 (white space) and 1 (shape)`, ['black', 'bgYellow'])
  );
  
  // readlineSync.keyInYNStrict(chalk.blue.bold('Are you ready to proceed?')); //remove
  let proceed = readlineSync.keyInYNStrict(styler('Are you ready to proceed?', ['blue', 'bold']));

  if (!proceed) {
    console.log(styler('Killing program.', ['red']))
    process.kill(process.pid);
  }

  let new_code = [];
  let shape_code_txt = fs.readFileSync('./SHAPE-CODE.txt').toString().split('\n');
  for (let y = 0; y < shape_code_txt.length; ++y) {
    shape_code_txt[y] = shape_code_txt[y].split('');
    let shape_row = [];
    for (let x = 0; x < shape_code_txt[y].length; ++x) {
      shape_row.push(Number(shape_code_txt[y][x]));
    }
    new_code.push(shape_row);
    shape_row = [];
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) {
      for (let x = 0; x < a[i].length; ++x) {
        if (a[i][x] !== b[i][x]) return false;
      }
    }
    return true;
  }

  if (!arraysEqual(new_code, shape_code)) {
    console.log('processing shape code changes...'); //?
    shape_code = [...new_code];
    shape_code_reverse = shape_code.reverse();

    // get new first_short_row
    findNew1stShortRow: for (let r = 0; r < shape_code_reverse.length; ++r) {
      let blackpx = false, whiteMidpx = false;
      for (let p = 0; p < shape_code_reverse[r].length; ++p) {
        if (blackpx && whiteMidpx && shape_code_reverse[r][p] === 1) {
          first_short_row = r;
          break findNew1stShortRow;
        }
        if (blackpx && shape_code_reverse[r][p] === 0) whiteMidpx = true;
        if (shape_code_reverse[r][p] === 1) blackpx = true;
      }	
    }
  }
})
.then(() => {
  // let { shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, section_count, shape_error, shape_err_row } = require('./shape-processor');


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


  final_file = shape.generateKnitout(in_file, shape_code_reverse, specs.machine, specs.carriers, specs.inc_method, specs.visColors);
  // final_file = shape.generateKnitout(in_file, shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, section_count, inc_method, xfer_speed_number);
})
.finally(() => {
  //--------------------------------
  //--- WRITE THE FINAL FILE ! ---//
  //-------------------------------- //TODO: comment back in
  fs.writeFile(`./knit-out-files/${new_file}`, final_file, function (err) {
    if (err) return console.log(err);
    // console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`)); //remove
    console.log(styler(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`, ['green']));
  });
});





// function generateKnitout(in_file, shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, section_count, shape_error, shape_err_row, inc_method, xfer_speed_number, console, chalk) {