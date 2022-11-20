const fs = require('fs'); //TODO: update with all swg stuff for web version

const readlineSync = require('readline-sync');
const chalk = require('chalk');

const Jimp = require('jimp');


const processImage = require('./knitify/process-image.js');

const colorwork = require('./knitify/colorwork.js');
const stitchPatterns = require('./knitify/stitch-pattern.js');


let img_out_path = './out-colorwork-images'; // ../ since will be passing to files in knitify/ subdir


let img_path;
let needle_count = 0;
let row_count = 0;

let preloadFile;
let saveAnswers = false;
let answersFile;
let promptAnswers = {};

let machine, dithering;
let palette_opt = [];

let opts = {};

let stitch_number, speed_number; //main_stitch_number
let back_style = 'Default';
let rib_info;
let rib = false;
let rib_carrier, rib_top = null, rib_bottom = null, ribT_rows, ribB_rows;

let max_needles;

let stitchOnly = false;
let stImg;
let stData;
let stPatOpts = ['Rib', 'Garter', 'Bubbles', 'Seed', 'Lace', 'Horizontal Buttonholes']; //TODO: add more
let customStPat = ['Rib', 'Garter', 'Bubbles', 'Lace']; //new //*
let stPatNullCarrier = ['Horizontal Buttonholes']; //new //*

let stitchPats = [];

class StitchPattern {
	constructor(name, hex, carrier) {
		this.name = name;
		this.color = hex;
		this.carrier = carrier;
		this.options = {};
	}
}

// function stitchData(resized_height, resized_width, stImg, stitchPats, img_out_path) {
// const stPromise = new Promise((resolve) => {
//     stitchPatterns.getStitchData(resized_height, resized_width, stImg, stitchPats, img_out_path).then((data) => {
//       // stData = data;
//       resolve(data); //?
//     });
//   });
//   return stPromise;
// }

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

// ------------------

// let xfer_speed = 300;
let wasteSettings = {};
let caston_carrier;


let waste_stitch = 5, //6
	waste_speed = 400,
	waste_roller = 150,
	waste_rows = 40; //35

// --------------


function undefinedify(val) {
  return (val === null ? undefined : val);
}

readlineSync.setDefaultOptions({ prompt: chalk`{blue.italic (press Enter to skip and answer prompts) }{blue.bold Filename for pre-loaded prompt answers: }` }); //TODO: make option to skip this and only do stitch pattern
readlineSync.promptLoop(function (input) {
	if (input === '') { //if skipping
		preloadFile = undefined;
		return true;
	}

	if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
	input = `${input}.json`;
	preloadFile = input;

	if (!/\.json$/i.test(input) || !fs.existsSync(`./prompt-answers/knitify/${input}`)) {
		let error_message = console.log(chalk.red(`-- The pre-loaded answers must be a JSON file that exists in the 'prompt-answers/knitify' folder.`));
		return error_message;
	} else return input;
	// if (fs.existsSync(`./prompt-answers/knitify/${input}`)) {
	// 	if (input !== 'answers.json') fs.copyFileSync(`./prompt-answers/knitify/${input}`, './prompt-answers/knitify/answers.json'); //check
	// 	return /\.json$/i.test(input);
	// }
});
if (preloadFile) { //TODO: have option of still asking prompt if one of the keys is missing fom the preloaded file
	console.log(chalk.green(`-- Reading prompt answers from: ${preloadFile}`));
  promptAnswers = JSON.parse(fs.readFileSync(`./prompt-answers/knitify/${preloadFile}`));

	// promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/answers.json'));

	console.log('Prompt answers:');
	console.log(promptAnswers); //remove //?

	img_path = promptAnswers['img'];

  if (img_path) img_path = `./in-colorwork-images/${img_path}`; //new //*
  else stitchOnly = true;

  machine = promptAnswers['machine'];
  max_colors = Number(promptAnswers['max_colors']);
	dithering = promptAnswers['dithering']; //TODO: check about null
	palette_opt = promptAnswers['palette'];

	needle_count = Number(promptAnswers['needle_count']);
	row_count = Number(promptAnswers['row_count']);

  stitch_number = Number(promptAnswers['stitch_number']);
	// main_stitch_number = stitch_number;
	speed_number = Number(promptAnswers['speed_number']);
	
  wasteSettings = promptAnswers['wasteSettings']; //TODO: check about null
  wasteSettings['waste_carrier'] = undefinedify(promptAnswers['waste_carrier']);

  back_style = promptAnswers['back_style'];

  stData = promptAnswers['stData']; //?

  caston_carrier = undefinedify(promptAnswers['caston_carrier']); //new

	rib_info = promptAnswers['rib'];
} else {
	if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to save the prompt answers you provide in this session?}`)) {
    saveAnswers = true;

    answersFile = readlineSync.question(chalk`{blue.bold \nSave prompt answers as: }`);
    if (answersFile.includes('.')) answersFile = answersFile.slice(0, input.indexOf('.'));
  }

	readlineSync.setDefaultOptions({ prompt: chalk`{blue.italic \n(press Enter to skip if using only stitch pattern) }{blue.bold Colorwork image file: }` }); //TODO: make option to skip this and only do stitch pattern
	readlineSync.promptLoop(function (input) {
		img_path = input;
		if (input === '') { //if skipping
			img_path = undefined;
			return true;
		}

		if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-colorwork-images/${input}`)) {
      if (!/\.$/i.test(input)) { //doesn't include extension
        for (let ext of ['.png', '.jpg', '.jpeg']) {
          if (fs.existsSync(`./in-colorwork-images/${input}${ext}`)) {
            console.log(`Using existing file with ${ext} extension.`);
            img_path += ext;
            return true;
          }
        }
      }
			let error_message = console.log(chalk.red(`-- The image must be a PNG or JPG that exists in the 'in-colorwork-images' folder.`));
			return error_message;
		}
		if (fs.existsSync(`./in-colorwork-images/${input}`)) {
			return /\.jpg|\.jpeg|\.png$/i.test(input);
		}
	});

  if (saveAnswers) promptAnswers['img'] = img_path; //new //*

	if (img_path) {
    console.log(chalk.green(`-- Reading colorwork data from: ${img_path}`));
    img_path = `./in-colorwork-images/${img_path}`; //new //*
  } else stitchOnly = true;

	readlineSync.setDefaultOptions({ prompt: '' });
	if (img_path) console.log(chalk`{blue.italic \n(press Enter to scale stitches according to img dimensions)}`);
	// if (saveAnswers) promptAnswers['img'] = img_path; //new //*

	// needle_count = readlineSync.questionInt(chalk.blue.bold('How many stitches wide? '), {
	// 	defaultInput: -1,
	// 	limit: Number,
	// 	limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	// });
  needle_count = readlineSync.question(chalk.blue.bold('\nHow many stitches wide? '), {
		defaultInput: (img_path ? -1 : ''), //new
		limit: function(input) {
			input = Number(input);
			if (img_path) return Number.isInteger(input);
			else return Number.isInteger(input) && input > 0 && input <= 252;
		},
		limitMessage: chalk.red('-- $<lastInput> is not a valid needle count.'),
	});
	needle_count = Number(needle_count);
	needle_count === -1 ? console.log(chalk.green('-- Needle count: AUTO')) : console.log(chalk.green(`-- Needle count: ${needle_count}`));
	if (needle_count === -1) needle_count = Jimp.AUTO;
	if (saveAnswers) promptAnswers['needle_count'] = needle_count;

	if (img_path) console.log(chalk`{blue.italic \n(Either input an exact row count, press Enter to scale rows according to needle count for true img dimensions, or input a float number for a specific scale.)}`);
	// row_count = readlineSync.question(chalk`{blue.bold How many rows long?} `, {
	// 	defaultInput: -1,
	// 	limit: Number,
	// 	limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	// });
  row_count = readlineSync.question(chalk`{blue.bold \nHow many rows long?} `, {
		defaultInput: (img_path ? -1 : ''), //new
		limit: function(input) {
			input = Number(input);
			if (img_path) return !isNaN(input);
			else return Number.isInteger(input) && input > 0 && input <= 252;
		},
		limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	});

	if (row_count % 1 !== 0) { //scale
		console.log(chalk.green(`-- Row count scale: ${row_count}`));
	} else {
		if (row_count == -1) {
			console.log(chalk.green('-- Row count: AUTO'));
			row_count = Jimp.AUTO;
		} else console.log(chalk.green(`-- Row count: ${row_count}`));
		// row_count === -1 ? console.log(chalk.green('-- Row count: AUTO')) : console.log(chalk.green(`-- Row count: ${row_count}`));
	}
	// if (row_count === -1) row_count = Jimp.AUTO;
	if (saveAnswers) promptAnswers['row_count'] = row_count;

		// fs.writeFileSync('./prompt-answers/knitify/saved.json', JSON.stringify(promptAnswers), { flag: 'w' });
	// }
	// if (fs.existsSync('./prompt-answers/knitify/answers.json')) {
	// 	readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` The program is about to delete the file 'answers.json' located in the '/prompt-answers/knitify' folder. Please rename the file now if you will to keep it.\nReady to proceed?`);

	// 	fs.unlinkSync('./prompt-answers/knitify/answers.json'); //new //check
	// }
} //new

let colorwork_path = './out-colorwork-images/colorwork.png';
if (fs.existsSync(colorwork_path)) {
	rename: for (let i = 1; i < 100; ++i) {
		if (!fs.existsSync(`./out-colorwork-images/colorwork${i}.png`)) {
			fs.renameSync(colorwork_path, `./out-colorwork-images/colorwork${i}.png`);
			break rename;
		}

		if (i === 99) fs.renameSync(colorwork_path, `./out-colorwork-images/colorwork${i}.png`); //? //*
	}
}

let motif_path = './out-colorwork-images/knit_motif.png';
if (fs.existsSync(motif_path)) {
  rename: for (let i = 1; i < 100; ++i) {
    if (!fs.existsSync(`../out-colorwork-images/knit_motif${i}.png`)) {
      fs.renameSync(motif_path, `./out-colorwork-images/knit_motif${i}.png`);
      break rename;
    }
  }
}

// ----------------

// if (fs.existsSync('./prompt-answers/knitify/answers.json')) {
// 	// promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/answers.json'));

// 	// machine = promptAnswers['machine'];
// 	// max_colors = Number(promptAnswers['max_colors']);
// 	// dithering = promptAnswers['dithering']; //TODO: check about null
// 	// palette_opt = promptAnswers['palette'];
// } else {
if (!preloadFile) {
  // if (fs.existsSync('./prompt-answers/knitify/saved.json')) {
	// 	saveAnswers = true;
	// 	promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/saved.json'));
	// }
  machine = readlineSync.question(chalk.blue.bold('\nWhat model knitting machine will you be using? '), {
		limit: [
			function (input) {
				return input.toLowerCase().includes('swg') || input.toLowerCase().includes('kniterate');
			},
		],
		limitMessage: chalk.red(
			'-- The program does not currently support the $<lastInput> machine. Please open an issue at the github repository (https://github.com/textiles-lab/knitout-image-processing) to request for this machine to be supported.'
		),
	});
	machine = machine.toLowerCase().trim(); //new
	console.log(chalk.green(`-- Model: ${machine}`)); //TODO: add better support for different shima models (and maybe stoll?)
	if (saveAnswers) promptAnswers['machine'] = machine;

  let carrier_count;
	machine.includes('swg') ? (carrier_count = 10) : (carrier_count = 6); //TODO: limit needle bed with this too (prob will have to use promises :,( )

	max_colors = readlineSync.question(chalk.blue.bold('\nHow many colors would you like to use? '), { //TODO: make sure this is ok when using just stitch pattern
		limit: machine.includes('swg') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6],
		limitMessage: chalk.red(
			`-- The ${machine} machine is capable of working with a max of ${carrier_count} colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.`
		),
	});
	max_colors = Number(max_colors);
	console.log(chalk.green(`-- Knitting with ${max_colors} color(s).`));
	if (saveAnswers) promptAnswers['max_colors'] = max_colors; //beep

	dithering = (stitchOnly ? null : readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to use dithering?} {blue.italic (dithering is recommended for detailed/naturalistic images, but not for graphics/digital artwork.)}`));
	dithering === true ? (dithering = 'Stucki') : (dithering = null);
	if (saveAnswers) promptAnswers['dithering'] = dithering; //beep

  if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to use a predefined palette?}`)) {
    // palette_opt = [];

		for (let i = 1; i <= max_colors; ++i) {
			let hex = readlineSync.question(chalk.blue.bold(`\nEnter hex-code for color #${i}: `));
			// palette_opt.push(hexToRGB(hex));
      palette_opt.push(hex);
		}
	}

  if (saveAnswers) promptAnswers['palette'] = palette_opt;

  opts = processImage.palOptions(max_colors, dithering, palette_opt);

  let default_stitch = (machine.includes('swg') ? 63 : 6);
  stitch_number = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the stitch number as? }`, {
		defaultInput: -1,
		// limit: Number,
		limit: function (input) {
			return (Number(input) >= 0 && (machine.includes('swg') || Number(input) <= 9)) || Number(input) === -1; //TODO: add max for swgn2
		},
		limitMessage: chalk.red('-- $<lastInput> is not a number between 0 and 9.'), //TODO: adjust for swgn2
	});
	stitch_number === '-1' ? ((console.log(chalk.green(`-- Stitch number: UNSPECIFIED, will assign default value: ${default_stitch}`))), (stitch_number = default_stitch)) : ((console.log(chalk.green(`-- Stitch number: ${stitch_number}`))), (stitch_number = Number(stitch_number)));
	// main_stitch_number = stitch_number;
	if (saveAnswers) promptAnswers['stitch_number'] = stitch_number;

  speed_number = readlineSync.question(
		chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the carriage speed number as?} {blue.italic (valid speeds are between <0-600>) }`,
		{
			defaultInput: -1,
			limit: function (input) {
				return (Number(input) >= 0 && Number(input) <= 600) || Number(input) === -1;
			},
			limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-600>.'), //TODO: adjust for swgn2
		}
	);
	speed_number === '-1'
		? (console.log(chalk.green('-- Speed number: UNSPECIFIED, will assign default value: 300')), (speed_number = 300)) //TODO: adjust for swgn2 (have no default, I guess)
		: ((console.log(chalk.green(`-- Speed number: ${speed_number}`))), (speed_number = Number(speed_number)));
	if (saveAnswers) promptAnswers['speed_number'] = speed_number;
  
  if (machine === 'kniterate') { //new
    if (readlineSync.keyInYNStrict(chalk `{blue.bold \nWould you like to change any of the default settings for the waste section? (DEFAULT stitch number: 5, speed number: 400, roller advance: 150, rows: 40)}`)) {
        keyInYNStrict //TODO: have rows as an option too //TODO: adjust for swgn2
      let new_waste_stitch = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section stitch number as? }`, {
        defaultInput: -1,
        // limit: Number,
        limit: function (input) {
          return (Number(input) >= 0 && Number(input) <= 9) || Number(input) === -1;
        },
        limitMessage: chalk.red('-- $<lastInput> is not a number between 0 and 9.'),
      });
      if (new_waste_stitch != '-1') waste_stitch = Number(new_waste_stitch);
      wasteSettings['waste_stitch'] = waste_stitch; 

      let new_waste_speed = readlineSync.question(
        chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section carriage speed number as?} {blue.italic (valid speeds are between <0-600>) }`,
        {
          defaultInput: -1,
          limit: function (input) {
            return (Number(input) >= 0 && Number(input) <= 600) || Number(input) === -1;
          },
          limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-600>.'),
        }
      );
      if (new_waste_speed != '-1') waste_speed = Number(new_waste_speed);
      wasteSettings['waste_speed'] = waste_speed;

      let new_waste_roller = readlineSync.question(
        chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section roller advance as? }`,
        {
          defaultInput: -1,
          limit: Number,
          limitMessage: chalk.red('-- $<lastInput> is not a number.'),
        }
      );
      if (new_waste_roller != '-1') waste_roller = Number(new_waste_roller);
      wasteSettings['waste_roller'] = waste_roller;

      let new_waste_rows = readlineSync.question(chalk `{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold How many rows for the waste section? }`, { //new
        defaultInput: -1,
        // limit: Number,
        limit: function(input) {
          return (Number(input) >= 1) || Number(input) === -1;
        },
        limitMessage: chalk.red('-- $<lastInput> is not a positive number.'),
      });
      if (new_waste_rows != '-1') waste_rows = Number(new_waste_rows);
      wasteSettings['waste_rows'] = waste_rows; 
    }
  }
  if (saveAnswers) promptAnswers['wasteSettings'] = wasteSettings;

  if (img_path) { //not stitch only
    back_style = ['Default', 'Birdseye', 'Minimal', 'Secure'],
		style = readlineSync.keyInSelect(
			back_style,
			chalk`{blue.bold ^What style back would you like to use?} {blue.italic (note: this doesn't matter if you're using *only* stitch patterns)} {blue.italic \n=> '}{blue.bold Default}{blue.italic ' is a freeform option that is similar to Birdseye in performance, but more suitable for pieces containing up to 5 colors.\n=> '}{blue.bold Birdseye}{blue.italic ' is not recommended for pieces that use more than 3 colors due to the build up of extra rows the method creates on the back bed.\n=> Alternatively, '}{blue.bold Minimal}{blue.italic ' creates a reasonably even ratio of front to back rows, resulting in the least amount of build up on the back.\n=> '}{blue.bold Secure}{blue.italic ' is the 'Minimal' option, with additional knits on the side needles for extra security.}`
		);

		if (style == -1) {
			console.log('Killing program.')
			process.kill(process.pid);
		}

		console.log(chalk.green('-- Back style: ' + back_style[style]));
		back_style = back_style[style];
	}
	if (saveAnswers) promptAnswers['back_style'] = back_style;
}


process.on('unhandledRejection', (reason, promise) => { //throw Error if issue
	throw new Error(reason.stack || reason);
});


function processing() {
  const promise = new Promise((resolve, reject) => {
		if (machine === 'kniterate') max_needles = 252;
		else max_needles = 540; //TODO: adjust this for other machines besides shima swgn2 and kniterate

    let info_arr = processImage.process(img_path, needle_count, row_count, img_out_path, max_colors, dithering, palette_opt, max_needles);

    resolve(info_arr);
    // imageColors.getData().then((result) => {
    // 	resolve(result);
    // 	return result; //?
    // });
  });

  return promise;
}

// function resolvePromises() {

// let info_arr = processImage.process(img_path, needle_count, row_count, colorwork_path, max_colors, dithering, palette_opt, stImg);

// let knitout = colorwork.generateKnitout(machine, colors_data, background, color_count, colors_arr, stitch_number, speed_number, caston_carrier, wasteSettings, back_style, rib_info, stitchOnly, stData, console, chalk);

let resized_height, resized_width;
let colors_arr, colors_data, background, color_count;

processing()
.then((info_arr) => {
  // stData = info_arr.pop();
  colors_arr = info_arr.pop();
  resized_height = info_arr.pop();
  resized_width = info_arr.pop();

  colors_data = colors_arr.pop();
  background = colors_arr.pop();
  color_count = colors_arr.pop().length;
  colors_arr = colors_arr.reverse();


  let carrierColors = '';
  for (let h = 1; h <= colors_data.length; ++h) {
    carrierColors += `\nCarrier ${h}: #${colors_data[h - 1]}`;
    colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
  }


  if (!preloadFile) {
    console.log(chalk`{white.bold \nYou may choose from the following list of existing carriers (along with the hex-code for the corresponding color), or specify a new carrier (if enough are left over).\nCarriers used in the motif thus far:}{white ${carrierColors}}`);

    caston_carrier = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step and use the default carrier [background color])} {blue.bold Which carrier would you like to use for the cast-on? }`, {
      defaultInput: -1,
      limit: function (input) {
        return (Number(input) >= 1 && Number(input) <= 6) || Number(input) === -1;
      },
      limitMessage: chalk.red('-- $<lastInput> is not a number between 1 and 6.'),
    });

    if (caston_carrier === '-1') {
      console.log(chalk.green(`-- Cast-on carrier : UNSPECIFIED, will assign default value (background color)`));
      caston_carrier = undefined;
    } else {
      caston_carrier = Number(caston_carrier);
      console.log(chalk.green(`-- Cast-on carrier: ${caston_carrier}`));
      // user_specified_carriers.push(caston_carrier);
    }
    if (saveAnswers) promptAnswers['caston_carrier'] = caston_carrier;
    
    if (machine === 'kniterate') { //new
      waste_carrier = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step and use the default carrier [1])} {blue.bold Which carrier would you like to use for the waste section? }`, {
        defaultInput: -1,
        limit: function (input) {
          return (Number(input) >= 1 && Number(input) <= 6) || Number(input) === -1;
        },
        limitMessage: chalk.red('-- $<lastInput> is not a number between 1 and 6.'),
      });

      if (waste_carrier === '-1') {
        console.log(chalk.green(`-- Waste carrier : UNSPECIFIED, will assign default value: 1`));
        waste_carrier = undefined;
      } else {
        waste_carrier = Number(waste_carrier);
        console.log(chalk.green(`-- Waste carrier: ${waste_carrier}`));
        // user_specified_carriers.push(waste_carrier);
      }
      if (saveAnswers) promptAnswers['waste_carrier'] = waste_carrier;
    }
  }


  if (!stData) {
    if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to include any stitch patterns in your motif?}`)) {
      console.log(chalk`{white.bold NOTE: image should only include a white background and the colors denoting stitch patterns.}`);
      readlineSync.setDefaultOptions({ prompt: chalk`{blue.italic \n(press Enter to skip if using only *one* stitch pattern that *comprises the whole piece*) }{blue.bold Stitch pattern image file: }` });

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
      if (stImg) {
        console.log(chalk.green(`-- Reading stitch pattern data from: ${stImg}`));
        stImg = `./in-stitch-pattern-images/${stImg}`; //TODO: check if should be ../
      }

      //--- collect stitch pattern names + denoting color data ---
      let stopPrompt = false;
      let patOpts = [...stPatOpts];

      while (!stopPrompt) {
        let options = [...patOpts],
        choice = readlineSync.keyInSelect(options, chalk.blue.bold(`^Select a stitch pattern to use in your motif.`));
      
        if (choice == -1) {
          console.log('Killing program.')
          process.kill(process.pid);
        }
        
        choice = stPatOpts[choice];

        console.log(chalk.green('-- Using pattern: ' + choice));

        stitchPats.push(new StitchPattern(choice));

        if (stImg) {
          if (!readlineSync.keyInYNStrict(
            chalk`{blue.bold \nWould you like to include another stitch pattern?}`
          )) stopPrompt = true;
        } else stopPrompt = true;
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

      let carrierSelect1 = true;
      for (let i = 0; i < stitchPats.length; ++i) {
        if (stImg) {
          stopPrompt = false;
          while (!stopPrompt) {
            stitchPats[i].color = readlineSync.question(chalk.blue.bold(`\nEnter the hex-code (or color name) for the color you used to denote the '${stitchPats[i].name}' stitch pattern (e.g. #0000FF or blue): `)); //TODO: list available colors to do this for
            if (Object.keys(hexColors).includes(stitchPats[i].color)) {
              stitchPats[i].color = hexColors[stitchPats[i].color];
              stopPrompt = true;
            } else if (/^#[0-9A-F]{6}$/i.test(stitchPats[i].color) || /^[0-9A-F]{6}$/i.test(stitchPats[i].color)) stopPrompt = true;
            else console.log(chalk.red(`-- ${stitchPats[i].color} is not a valid hex-code or supported color name.`));
          }
          console.log(chalk.green('-- Hex-code: ' + stitchPats[i].color));

          stitchPats[i].color = hexToRGB(stitchPats[i].color); //check
          colors.push(stitchPats[i].color);

          if (stPatNullCarrier.includes(stitchPats[i].name)) stitchPats[i].carrier = null; //new //*
          else {
            stopPrompt = false;
            if (carrierSelect1) { //TODO: remove if !stImg
              console.log(chalk`{white.bold \nYou may choose from the following list of existing carriers (along with the hex-code for the corresponding color), or specify a new carrier (if enough are left over).\nCarriers used in the motif thus far:}{white ${carrierColors}}`);
              carrierSelect1 = false;
            }
            while (!stopPrompt) {
              stitchPats[i].carrier = readlineSync.question(chalk.blue.bold(`\nEnter the carrier you'd like to use for the '${stitchPats[i].name}' stitch pattern (e.g. 1): `)); //TODO: present data of colors attached to each carrier
              if (!isNaN(stitchPats[i].carrier)) {
                stitchPats[i].carrier = Number(stitchPats[i].carrier);
                stopPrompt = true;
              }
              else console.log(chalk.red(`-- ${stitchPats[i].carrier} is not a valid carrier number.`)); //TODO: add support for 'A' etc. (kniterate)
            }
            console.log(chalk.green('-- Carrier: ' + stitchPats[i].carrier));
          }
        } else stitchPats[i].carrier = (stPatNullCarrier.includes(stitchPats[i].name) ? (null) : (1)); //only one stitchPattern, so will be 1 automatically (or null, if applicable) //new //*
        // if (stitchPats[i].name === 'Bubbles' || stitchPats[i].name === 'Lace' || stitchPats[i].name === 'Garter') {
        if (customStPat.includes(stitchPats[i].name)) { //new //*
          if (readlineSync.keyInYNStrict(chalk.blue.bold(`\nWould you like to add any other customizations for the '${stitchPats[i].name}' stitch pattern?`))) {
            if (stitchPats[i].name === 'Bubbles') {
              stitchPats[i].options.bubbleWidth = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches wide should the bubbles be? `)));
              stitchPats[i].options.bubbleHeight = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many rows long? `)));
              if (stitchPats[i].options.bubbleHeight % 2 !== 0) {
                stitchPats[i].options.bubbleHeight += 1;
                console.log('WARNING: added an extra row so carrier will end up on correct side.');
              }
              stitchPats[i].options.overlap = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many stitches should overlap between the bubbles? `)));
            } else if (stitchPats[i].name === 'Lace') {
              stitchPats[i].options.laceRows = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many rows between xfers to form new lace holes? `)));
              stitchPats[i].options.stitchesBtwHoles = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many knit stitches between lace holes? `)));
              stitchPats[i].options.holeOffset = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many needles to offset the placement of lace holes relative to the prior lace formation pass? `)));
              stitchPats[i].options.offsetReset = Number(readlineSync.questionInt(chalk.blue.bold(`\nAfter how many rows should the offset reset? (input 0 to have the reset be automatic) `)));
            } else if (stitchPats[i].name === 'Garter') {
              stitchPats[i].options.patternRows = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many garter rows (switching between knits and purls)? `)));
            } else if (stitchPats[i].name === 'Rib') {
              let frontSequence = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many front needles in sequence? (e.g. '2'): `)));
              // stitchPats[i].options.frontWidth = 'f'.repeat(rib_f);
              let backSequence = Number(readlineSync.questionInt(chalk.blue.bold(`\nHow many back needles in sequence? (e.g. '2'): `)));
              // stitchPats[i].options.backWidth = 'b'.repeat(rib_b);
              stitchPats[i].options.sequence = 'f'.repeat(frontSequence) + 'b'.repeat(backSequence);

              stitchPats[i].options.stitchNumber = Number(readlineSync.questionInt(chalk.blue.bold(`\nWhat stitch number? (e.g. '5'): `)));
            }
          } else stitchPats[i].options = undefined;
        } else stitchPats[i].options = undefined;
      }
    }
  }

  if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add rib?}`)) {
    rib_info = {};

    let rib_bot_opts = [];

    for (let r = 0; r < max_colors; ++r) {
      let data = colors_data[r].split(' ');
      rib_bot_opts.push(data[1]);
    }

    if (max_colors < 6) {
      for (let r = max_colors; r < 6; ++r) {
        rib_bot_opts.push('new carrier');
      }
    }
    let rib_top_opts = [...rib_bot_opts];
    if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add ribbing to the bottom of the piece?}`)) {
      rib_bot_opts,
      (rib_carrier = readlineSync.keyInSelect(
        rib_bot_opts,
        chalk`{blue.bold ^Which carrier would you like to use for the bottom rib?} {blue.italic (the corresponding hex code is listed next to each carrier number)}`
      ));

      if (rib_carrier == -1) {
        console.log('Killing program.')
        process.kill(process.pid);
      }

      rib_bottom = rib_carrier + 1;
      // if (rib_bottom > max_colors && !user_specified_carriers.includes(rib_bottom)) user_specified_carriers.push(rib_bottom);
      ribB_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
    } else {
      rib_bottom = null;
    }
    rib_info['rib_bottom'] = rib_bottom;
    rib_info['ribB_rows'] = ribB_rows;

    if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add ribbing to the top of the piece?}`)) {
      rib_top_opts,
      (rib_carrier = readlineSync.keyInSelect(
        rib_top_opts,
        chalk`{blue.bold ^Which carrier would you like to use for the top rib?} {blue.italic (the corresponding hex code is listed next to each carrier number)}`
      ));

      if (rib_carrier == -1) {
        console.log('Killing program.')
        process.kill(process.pid);
      }
      
      rib_top = rib_carrier + 1;
      // if (rib_top > max_colors && !user_specified_carriers.includes(rib_top)) user_specified_carriers.push(rib_top);
      ribT_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
    } else {
      rib_top = null;
    }
    rib_info['rib_top'] = rib_top;
    rib_info['ribT_rows'] = ribT_rows;
  } else {
    rib_bottom = null;
    rib_top = null;
  }

  if (saveAnswers) promptAnswers['rib'] = rib_info;
})
.finally(() => {
  stitchPatterns.getStitchData(resized_height, resized_width, stImg, stitchPats, img_out_path).then((data) => {
    stData = data;

    if (stData && saveAnswers) promptAnswers['stData'] = stData;
    // resolve(data); //?
  //   });
  // })
  // .finally(() => {
    if (stData) console.log(stData); //TODO: check
    // if (saveAnswers) fs.writeFileSync(`./prompt-answers/knitify/${answersFile}.json`, JSON.stringify(promptAnswers), { flag: 'w' });
    if (saveAnswers) fs.writeFileSync(`./prompt-answers/knitify/${answersFile}.json`, JSON.stringify(promptAnswers, (k, v) => v === undefined ? null : v), { flag: 'w' });

    

    let knitout = colorwork.generateKnitout(machine, colors_data, background, color_count, colors_arr, stitch_number, speed_number, caston_carrier, wasteSettings, back_style, rib_info, stitchOnly, stData, console, chalk);


    let knitout_str = JSON.stringify(knitout)
      .replace(/\[|\]|"/gi, '')
      .split(',');
    knitout_str = knitout_str.join('\n');

    readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave as: ') });
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
    fs.writeFile(`./knit-out-files/${new_file}`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(
        chalk`{green \nThe knitout file has successfully been written and can be found in the 'knit-out-files' folder.\nOpen 'knit_motif.png'} {green.italic (located in the 'out-colorwork-images' folder)} {green to see a visual depiction of the knitting instructions.} {green.italic (This folder also contains: 'colorwork.png', which depicts the resized image. Please note that, if applicable, the program has renamed files in that folder from earlier sessions, by appending a number to the end.)} {bold.bgGray.underline \n*** If you would like to add shaping to the file next, type 'npm run shapeify'}`
      );
    });
  });
});

// processImage.process(img_path, needle_count, row_count, colorwork_path, machine, max_colors, dithering, palette_opt, stitch_number, speed_number, caston_carrier, wasteSettings, back_style, rib_info, )