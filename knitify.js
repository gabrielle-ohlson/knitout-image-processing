const fs = require('fs'); //web
const readlineSync = require('readline-sync'); //web
const chalk = require('chalk'); //web
const imageColors = require('./image-color-quantize.js'); //web

const colorwork = require('./colorwork');

let stitchOnly = fs.existsSync('./out-colorwork-images/stitch.png');

let machine, colors_data, background, color_count, colors_arr, stitch_number, speed_number, caston_carrier, wasteSettings, back_style = 'Default', rib_info, stData;

// colors_data
// background
// palette
// colors_arr



// new //v
// let stitch_number, main_stitch_number, speed_number, back_style = 'Default', rib = false, rib_top = null, rib_bottom = null, ribT_rows, ribB_rows;
// let stitch_number, main_stitch_number, speed_number, back_style = 'Default';

let loadAnswers = false, saveAnswers = false;
let promptAnswers = {};

if (fs.existsSync('./prompt-answers/knitify/answers.json')) {
	loadAnswers = true;
	promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/answers.json'));

	stitch_number = promptAnswers['stitch_number'];
	// main_stitch_number = stitch_number;
	speed_number = promptAnswers['speed_number'];
	wasteSettings = promptAnswers['wasteSettings']; //TODO: check about null
	
	wasteSettings['waste_carrier'] = promptAnswers['waste_carrier'];

	back_style = promptAnswers['back_style'];
	//TODO: stitch pattern answers
	stData = promptAnswers['stData']; //?
	caston_carrier = promptAnswers['caston_carrier'];

	rib_info = promptAnswers['rib'];
} else {
	if (fs.existsSync('./prompt-answers/knitify/saved.json')) {
		saveAnswers = true;
		promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/saved.json'));
	}
}


process.on('unhandledRejection', (reason, promise) => { //throw Error if issue
	throw new Error(reason.stack || reason);
});


const quantify = new Promise((resolve, reject) => {
	imageColors.getData().then((result) => {
		resolve(result);
		return result;
	});
});


function resolvePromises() {
	const promises = new Promise((resolve) => {
		quantify.then((arr) => {
			let info_arr = arr;
			machine = info_arr.pop(); //new
			colors_data = info_arr.pop();
			background = info_arr.pop();
			color_count = info_arr.pop().length;
			colors_arr = info_arr.reverse();
		}).then(() => {
			// stitchOnly = fs.existsSync('./out-colorwork-images/stitch.png');

			if (stitchOnly) fs.renameSync('./out-colorwork-images/stitch.png', './out-colorwork-images/colorwork.png');

			// if (!stData) { //aka not loading from saved prompt answers
			if (!loadAnswers) { //aka not loading from saved prompt answers
				if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to include any stitch patterns in your motif?}`)) {
					const stitchPatterns = require('./stitch-pattern.js');
					stitchPatterns.getStitchData().then((data) => {
						stData = data;
						if (saveAnswers) promptAnswers['stData'] = stData;
						resolve(data); //?
					});
				} else resolve();
			} else resolve();
		});
	});
	return promises;
}

resolvePromises()
	.then(() => {
		if (!loadAnswers) {
			// -------------- //
			// CASTON CARRIER //
			// -------------- //
			caston_carrier = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step and use the default carrier [background color])} {blue.bold Which carrier would you like to use for the cast-on? }`, {
				defaultInput: -1,
				limit: function (input) {
					return (Number(input) >= 1 && Number(input) <= 6) || Number(input) === -1;
				},
				limitMessage: chalk.red('-- $<lastInput> is not a number between 1 and 6.'),
			});

			if (caston_carrier === '-1') caston_carrier = undefined;
			else console.log(chalk.green(`-- Cast-on carrier: ${caston_carrier}`));
			// caston_carrier === '-1' ? ((console.log(chalk.green(`-- Cast-on carrier : UNSPECIFIED, will assign default value (background color)`))), (caston_carrier = undefined)) : ((caston_carrier = Number(caston_carrier)), (console.log(chalk.green(`-- Cast-on carrier: ${caston_carrier}`))));
		
			// ------------- //
			// WASTE CARRIER //
			// ------------- //
			let waste_carrier = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step and use the default carrier [1])} {blue.bold Which carrier would you like to use for the waste section? }`, {
				defaultInput: -1,
				limit: function (input) {
					return (Number(input) >= 1 && Number(input) <= 6) || Number(input) === -1;
				},
				limitMessage: chalk.red('-- $<lastInput> is not a number between 1 and 6.'),
			});
			waste_carrier === '-1' ? ((console.log(chalk.green(`-- Waste carrier : UNSPECIFIED, will assign default value: 1`))), (waste_carrier = undefined)) : (console.log(chalk.green(`-- Waste carrier: ${waste_carrier}`)));
		
			if (waste_carrier) wasteSettings = {'waste_carrier': waste_carrier};
		
			// -------- //
			// RIB INFO //
			// -------- //
			let rib_bottom = null, rib_top = null, ribB_rows, ribT_rows;
		
			if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add rib?}`)) {
				rib_info = {};

				let rib_bot_opts = [];
		
				for (let r = 0; r < color_count; ++r) { //* after resolvePromises
					let data = colors_data[r].split(' '); //* after resolvePromises
					rib_bot_opts.push(data[1]);
				}

				if (color_count < 6) { //* after resolvePromises
					for (let r = color_count; r < 6; ++r) { //* after resolvePromises
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
					// if (rib_bottom > color_count && !user_specified_carriers.includes(rib_bottom)) user_specified_carriers.push(rib_bottom);
					ribB_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
				} else {
					rib_bottom = null;
				}

				rib_info['rib_bottom'] = rib_bottom; //new
				rib_info['ribB_rows'] = ribB_rows; //new

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
					// if (rib_top > color_count && !user_specified_carriers.includes(rib_top)) user_specified_carriers.push(rib_top);
					ribT_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
				} else {
					rib_top = null;
				}

				rib_info['rib_top'] = rib_top; //new
				rib_info['ribT_rows'] = ribT_rows; //new
			}
		
			stitch_number = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the stitch number as? }`, {
				defaultInput: -1,
				// limit: Number,
				limit: function (input) {
					return (Number(input) >= 0 && Number(input) <= 9) || Number(input) === -1;
				},
				limitMessage: chalk.red('-- $<lastInput> is not a number between 0 and 9.'),
			});
			if (stitch_number === '-1') stitch_number = undefined;
			else console.log(chalk.green(`-- Stitch number: ${stitch_number}`));

			// stitch_number === '-1' ? ((console.log(chalk.green(`-- Stitch number: UNSPECIFIED, will assign default value: 6`))), (stitch_number = 6)) : ((console.log(chalk.green(`-- Stitch number: ${stitch_number}`))), (stitch_number = Number(stitch_number)));
			// main_stitch_number = stitch_number;
			// if (saveAnswers) promptAnswers['stitch_number'] = stitch_number;
		
			speed_number = readlineSync.question(
				chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the carriage speed number as?} {blue.italic (valid speeds are between <0-600>) }`,
				{
					defaultInput: -1,
					limit: function (input) {
						return (Number(input) >= 0 && Number(input) <= 600) || Number(input) === -1;
					},
					limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-600>.'),
				}
			);

			if (speed_number === '-1') speed_number = undefined;
			else console.log(chalk.green(`-- Speed number: ${speed_number}`));

			// speed_number === '-1'
			// 	? (console.log(chalk.green('-- Speed number: UNSPECIFIED, will assign default value: 300')), (speed_number = 300))
			// 	: ((console.log(chalk.green(`-- Speed number: ${speed_number}`))), (speed_number = Number(speed_number)));
			// if (saveAnswers) promptAnswers['speed_number'] = speed_number;
			
			wasteSettings = {};

			if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to change any of the default settings for the waste section? (DEFAULT stitch number: 6, speed number: 400, roller advance: 150, rows: 35)}`)) { //TODO: have rows as an option too
				let waste_stitch = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section stitch number as? }`, {
					defaultInput: -1,
					// limit: Number,
					limit: function (input) {
						return (Number(input) >= 0 && Number(input) <= 9) || Number(input) === -1;
					},
					limitMessage: chalk.red('-- $<lastInput> is not a number between 0 and 9.'),
				});
				if (waste_stitch === '-1') waste_stitch = undefined;
				wasteSettings['waste_stitch'] = new_waste_stitch; //new
		
				let waste_speed = readlineSync.question(
					chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section carriage speed number as?} {blue.italic (valid speeds are between <0-600>) }`,
					{
						defaultInput: -1,
						limit: function (input) {
							return (Number(input) >= 0 && Number(input) <= 600) || Number(input) === -1;
						},
						limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-600>.'),
					}
				);
				if (waste_speed === '-1') waste_speed = undefined;
				wasteSettings['waste_speed'] = waste_speed;
		
				let waste_roller = readlineSync.question(
					chalk`{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold What would you like to set the waste section roller advance as? }`,
					{
						defaultInput: -1,
						limit: Number,
						limitMessage: chalk.red('-- $<lastInput> is not a number.'),
					}
				);
				if (waste_roller === '-1') waste_roller = undefined;
				wasteSettings['waste_roller'] = waste_roller; //new
		
				let waste_rows = readlineSync.question(chalk `{blue.italic \n(OPTIONAL: press Enter to skip this step)} {blue.bold How many rows for the waste section? }`, {
					defaultInput: -1,
					limit: function(input) {
						return (Number(input) >= 1) || Number(input) === -1;
					},
					limitMessage: chalk.red('-- $<lastInput> is not a positive number.'),
				});
				if (waste_rows === '-1') waste_rows = undefined;
				wasteSettings['waste_rows'] = waste_rows;
			};
			// if (saveAnswers) promptAnswers['wasteSettings'] = wasteSettings;
		
			if (!stitchOnly) {
				back_style = ['Default', 'Birdseye', 'Minimal', 'Secure'], //TODO: don't ask this if stitch pattern only
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
			// if (saveAnswers) promptAnswers['back_style'] = back_style;


			if (saveAnswers) {
				promptAnswers['rib'] = rib_info;
				promptAnswers['caston_carrier'] = caston_carrier;
				promptAnswers['waste_carrier'] = waste_carrier;

				promptAnswers['stitch_number'] = stitch_number;
				promptAnswers['speed_number'] = speed_number;
				promptAnswers['wasteSettings'] = wasteSettings;
				promptAnswers['back_style'] = back_style;

				fs.unlinkSync('./prompt-answers/knitify/saved.json');
				let answersFile = readlineSync.question(chalk`{blue.bold \nSave prompt answers as: }`);
				fs.writeFileSync(`./prompt-answers/knitify/${answersFile}.json`, JSON.stringify(promptAnswers), { flag: 'w' }); //new
			}
		}
	})
	.then(() => {
		let knitout_str = colorwork.generateKnitout(machine, colors_data, background, color_count, colors_arr, stitch_number, speed_number, caston_carrier, wasteSettings, back_style, rib_info, stitchOnly, stData, console, chalk);

		// -------------------------------------
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