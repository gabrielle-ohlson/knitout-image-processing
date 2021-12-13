const Jimp = require('jimp');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');

let img;
let needle_count = 0;
let row_count = 0;

let saveAnswers = false;
let preloadFile, promptAnswers = {};

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
	}
	if (fs.existsSync(`./prompt-answers/knitify/${input}`)) {
		if (input !== 'answers.json') fs.copyFileSync(`./prompt-answers/knitify/${input}`, './prompt-answers/knitify/answers.json'); //check
		return /\.json$/i.test(input);
	}
});
if (preloadFile) { //TODO: have option of still asking prompt in one of the keys is missing fom the preloaded file
	console.log(chalk.green(`-- Reading prompt answers from: ${preloadFile}`));
	promptAnswers = JSON.parse(fs.readFileSync('./prompt-answers/knitify/answers.json'));

	console.log('Prompt answers:');
	console.log(promptAnswers); //remove //?

	img = promptAnswers['img'];
	needle_count = Number(promptAnswers['needle_count']);
	row_count = Number(promptAnswers['row_count']);

} else {
	if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to save the prompt answers you provide in this session?}`)) saveAnswers = true;

	readlineSync.setDefaultOptions({ prompt: chalk`{blue.italic \n(press Enter to skip if using only stitch pattern) }{blue.bold Colorwork image file: }` }); //TODO: make option to skip this and only do stitch pattern
	readlineSync.promptLoop(function (input) {
		img = input;
		if (input === '') { //if skipping
			img = undefined;
			return true;
		}

		if (!/\.jpg|\.jpeg|\.png$/i.test(input) || !fs.existsSync(`./in-colorwork-images/${input}`)) {
			let error_message = console.log(chalk.red(`-- The image must be a PNG or JPG that exists in the 'in-colorwork-images' folder.`));
			return error_message;
		}
		if (fs.existsSync(`./in-colorwork-images/${input}`)) {
			return /\.jpg|\.jpeg|\.png$/i.test(input);
		}
	});
	if (img) console.log(chalk.green(`-- Reading colorwork data from: ${img}`));

	readlineSync.setDefaultOptions({ prompt: '' });
	if (img) console.log(chalk`{blue.italic \n(press Enter to scale stitches according to img dimensions)}`);
	if (saveAnswers) promptAnswers['img'] = img; //new //*

	needle_count = readlineSync.questionInt(chalk.blue.bold('How many stitches wide? '), {
		defaultInput: -1, //new
		limit: Number,
		limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	});
	needle_count = Number(needle_count);
	needle_count === -1 ? console.log(chalk.green('-- Needle count: AUTO')) : console.log(chalk.green(`-- Needle count: ${needle_count}`)); //new
	if (needle_count === -1) needle_count = Jimp.AUTO;
	if (saveAnswers) promptAnswers['needle_count'] = needle_count; //new //*

	// console.log(chalk.green(`-- Needle count: ${needle_count}`));
	//TODO: maybe limit needle_count and row_count to whole numbers (and limit needle_count to >0) ? or could just do .toFixed

	if (img) console.log(chalk`{blue.italic \n(press Enter to scale rows according to img dimensions)}`);
	row_count = readlineSync.question(chalk`{blue.bold How many rows long?} `, {
	// row_count = readlineSync.question(chalk`{blue.bold \nHow many rows long?} {blue.italic (press Enter to scale rows according to img dimensions) }`, { //TODO: remove default/enter if using only stitch pattern
		defaultInput: -1,
		limit: Number,
		limitMessage: chalk.red('-- $<lastInput> is not a number.'),
	});
	row_count = Number(row_count);
	row_count === -1 ? console.log(chalk.green('-- Row count: AUTO')) : console.log(chalk.green(`-- Row count: ${row_count}`));
	if (row_count === -1) row_count = Jimp.AUTO;
	if (saveAnswers) {
		promptAnswers['row_count'] = row_count; //new //*

		fs.writeFileSync('./prompt-answers/knitify/saved.json', JSON.stringify(promptAnswers), { flag: 'w' }); //new //*
	}
	if (fs.existsSync('./prompt-answers/knitify/answers.json')) {
		readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` The program is about to delete the file 'answers.json' located in the '/prompt-answers/knitify' folder. Please rename the file now if you will to keep it.\nReady to proceed?`);

		fs.unlinkSync('./prompt-answers/knitify/answers.json'); //new //check
	}
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

if (img) {
	Jimp.read(`./in-colorwork-images/${img}`, (err, image) => {
		if (err) throw err;
		if (needle_count == -1 && row_count == -1) row_count = image.getHeight(); //if both auto (so Jimp doesn't throw an error)
		image.resize(needle_count, row_count).write(colorwork_path);
	});
} else { //if just stitch pattern
	new Jimp(needle_count, row_count, (err, image) => {
		if (err) throw err;
		for (let y = 0; y < row_count; ++y) {
			for (let x = 0; x < needle_count; ++x) {
				image.setPixelColor(4294967295, x, y); //set it all as white
			}
		}

		image.write('./out-colorwork-images/stitch.png'); //*
	});
}