//TODO: spend some time working on this & getting it in working order

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const { shape_code } = require('./shape-processor');

const DIMENSIONS = ({ WAIST, HIPS, INSEAM, CHEST, SHOULDER, TORSO, ARM_CIRC, WRIST_CIRC, ARM_LENGTH, NECK_CIRC, HEAD_CIRC }) => ({
	WAIST,
	HIPS,
	INSEAM,
	CHEST,
	SHOULDER,
	ARM_CIRC,
	WRIST_CIRC,
	TORSO,
	ARM_LENGTH,
	NECK_CIRC,
	HEAD_CIRC,
});

let template, dimensions;
//
let pieces_arr = [];
let piece1, template_neckline, template_width, template_height;

// let

///////////////////////////
class Sweater {
	calculate(fit, sleeve_style) {
		this.body_rib_L = 5;
		this.sleeve_rib_L = 5;
		this.neck_rib_L = 3.3;
		this.sleeve_straight_L = 2.2;
		this.body_straight_L = 3;
		if (fit === 'Fitted') {
			this.neckline_W = Number((dimensions.NECK_CIRC * 0.4).toFixed(1));
			this.chest_ease = 0;
			this.hip_ease = 0;
			this.armhole_ease = 0;
			this.upper_arm_ease = 0;
			this.wrist_ease = 0;
		} else {
			this.neckline_W = Number((dimensions.NECK_CIRC * 0.47).toFixed(1)); //? - rib?
			if (fit === 'Classic') {
				this.chest_ease = 10;
				this.hip_ease = 5;
				this.armhole_ease = 1.5; //FIXME: maybe 0 if straight sleeves?
				this.upper_arm_ease = dimensions.ARM_CIRC - 16;
				this.wrist_ease = dimensions.WRIST_CIRC - 7.5;
			}
			if (fit === 'Oversized') {
				this.chest_ease = 20;
				this.hip_ease = 15;
				this.armhole_ease = 4.5;
				this.upper_arm_ease = dimensions.ARM_CIRC - 7;
				this.wrist_ease = dimensions.WRIST_CIRC - 5.5;
			}
		}
		this.neckline_L = this.neckline_W - 5.8;
		this.sweater_bottom_W = Number(((dimensions.HIPS + this.hip_ease) / 2).toFixed(1));
		this.sweater_chest_W = Number(((dimensions.CHEST + this.chest_ease) / 2).toFixed(1));
		if (this.sweater_chest_W > this.sweater_bottom_W) {
			this.sweater_chest_W = this.sweater_bottom_W;
		}
		this.sweater_midsection_L = Number((dimensions.TORSO * 0.57 - this.body_rib_L).toFixed(1)); //TODO: //FIXME: remove rib from calculations //?
		//
		this.sleeve_bottom_W = dimensions.WRIST_CIRC + this.wrist_ease;
		if (sleeve_style === 'Straight') {
			this.sweater_top_W = this.sweater_chest_W;
			//
			this.sleeve_top_W = dimensions.ARM_CIRC + this.upper_arm_ease;
			this.sleeve_total_L = dimensions.ARM_LENGTH - this.sleeve_rib_L;
			this.armhole_L = Math.round(dimensions.TORSO * 0.43); //new
			this.armhole_sloped_L = 0;
		}
		if (sleeve_style === 'Set-in') {
			this.sweater_top_W = dimensions.SHOULDER; //+ ease //?
			this.armhole_L = Math.round(dimensions.TORSO * 0.43 + this.armhole_ease - this.body_rib_L);
			this.armhole_sloped_L = Number(((this.armhole_L * 0.335) / 2).toFixed(1));
			//
			this.scye_L = this.armhole_L - 4;
			if (this.scye_L < 16) {
				this.armpit_seam_W = 1.5;
			} else {
				if (this.scye_L <= 17.5) {
					this.armpit_seam_W = 2;
				} else {
					if (this.scye_L <= 20) {
						this.armpit_seam_W = 2.5;
					} else {
						this.armpit_seam_W = 3;
					}
				}
			}
			//
			let proto_armhole = 20.5;
			let proto_expo = 1.0165; //1.0165;
			let proto_diff = (this.armhole_L - proto_armhole) / 0.5;
			let sleeve_curve = Number(((2 * this.armhole_L) ** (proto_expo + 0.0026 * proto_diff)).toFixed(1));
			this.sleeve_top_W = Number((sleeve_curve - 2 * this.scye_L).toFixed(1));
			//
			this.sleeve_total_L = dimensions.ARM_LENGTH - this.sleeve_rib_L + 1;
			let B = (this.sleeve_arm_W - this.armpit_seam_W * 2 - this.sleeve_top_W) / 2;
			this.sleeve_shaping_L = Math.sqrt(this.scye_L ** 2 - B ** 2);
		}
		this.sleeve_arm_W = dimensions.ARM_CIRC + this.upper_arm_ease;
		this.sweater_shoulder_W = Number(((this.sweater_top_W - this.neckline_W) / 2).toFixed(1));
	}
}
//
class Skirt {}
//
class Dress {}
//
class Pants {
	calculate(style, rise) {
		if (style === 'Leggings') {
			this.hip_W = Number((dimensions.HIPS / 2).toFixed(1));
			this.ankle_W = (this.hip_W * 0.44).toFixed(1);
			this.waist_W = Number((dimensions.WAIST / 2).toFixed(1));
			this.inseam_L = Number((dimensions.INSEAM * 0.92).toFixed(1));
			if (rise === 'High') {
				this.rise_L = (this.inseam_L * 0.5).toFixed(1);
			}
			this.crotch_L = (this.rise_L * 0.2).toFixed(1);
			this.waistrib_L = (this.crotch_L * 0.2).toFixed(1);
		}
		//TODO: add calculations for other styles & rises
	}
}
//
class Hat {}
class TankTop {}
/////////////////////////////////////////////
let chosen_template;

if (shape_code === null) {
	let templates = ['Sweater', 'Skirt', 'Dress', 'Pants', 'Tank-Top', 'Hat'],
		shape = readlineSync.keyInSelect(templates, chalk.blue.bold('^Which template would you like to use?'));
	console.log(chalk.green('-- Knitting: ' + templates[shape]));
	template = templates[shape];
	let dim_opt = ['Size', 'Custom Measurements(cm)'],
		method = readlineSync.keyInSelect(dim_opt, chalk.blue.bold(`^How would you like to determine the dimensions of the ${template}?`));
	console.log(chalk.green('-- Determining dimensions by: ' + dim_opt[method]));
	if (dim_opt[method] === 'Size') {
		let guides = ['Female', 'Gender-Neutral'],
			guide = readlineSync.keyInSelect(
				guides,
				chalk`{blue.bold ^Which size guide would you like to base your dimensions on?} {blue.italic (NOTE: these dimensions are from standard sizes commonly used by clothing companies--they are by no means universal, so please use the alternative 'Custom Measurements' option if you feel these sizes are not applicable to you.)}`
			);
		console.log(chalk.green('-- Basing dimensions on: ' + genders[gender] + ' sizes'));
		guide = guides[guide];
		//TODO: add chart with dimensions associated with each size
		let sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'], //TODO: maybe add childrens sizes ??
			size = readlineSync.keyInSelect(sizes, chalk`{blue.bold ^Which size?}`);
		console.log(chalk.green('-- Size: ' + sizes[size]));
		size = sizes[size];
		//TODO: for pants, do petite regular and tall //?
		//TODO: for all, add option for style (i.e. sweater - fitted/relaxed/oversized; v-neck/square/scoop; saddle-sleeve/etc)
		if (guide === 'Female') {
			if (size === 'XXS') {
				//2/4 UK
				dimensions = DIMENSIONS({
					//TODO: check these dimensions, measuring everyone in house
					WAIST: 61, //cm 24in
					HIPS: 83.5, //cm 33in
					INSEAM: 68.5, //cm //27in
					CHEST: 78, //cm 31in
					SHOULDER: 35, //cm
					TORSO: 55, //cm //nape to hips //?
					ARM_CIRC: 24, //cm
					WRIST_CIRC: 15, //cm //TODO: check my wrist size
					ARM_LENGTH: 54, //cm //TO UNDERARM-inner //?
					NECK_CIRC: 34,
					HEAD_CIRC: 53, //cm
				});
			}
			if (size === 'XS') {
				//6 UK
				dimensions = DIMENSIONS({
					WAIST: 63.5, //cm 25in
					HIPS: 86, //cm //34in
					INSEAM: 71, //cm //28in
					CHEST: 81, //cm //32in
					SHOULDER: 33, //cm //37cmb4 //TODO: check mine
					TORSO: 59.5, //cm //? //47cmb4 //TODO: check mine
					ARM_CIRC: 26, //cm
					WRIST_CIRC: 15.5, //cm
					ARM_LENGTH: 56, //cm //from sholder instead
					NECK_CIRC: 35.5,
					HEAD_CIRC: 54, //cm
				});
			}
			if (size === 'S') {
				//8/10 UK
				dimensions = DIMENSIONS({
					WAIST: 68.5, //cm 27in
					HIPS: 91.5, //cm //36in
					INSEAM: 76, //cm //30in
					CHEST: 86, //cm //34in
					SHOULDER: 34, //cm //38cmb4
					TORSO: 60.5, //cm //52cmb4
					ARM_CIRC: 27, //cm //?
					WRIST_CIRC: 16, //cm
					ARM_LENGTH: 58, //cm //from sholder instead
					NECK_CIRC: 37,
					HEAD_CIRC: 55, //cm
				});
			}
			if (size === 'M') {
				//12 UK
				dimensions = DIMENSIONS({
					WAIST: 76, //cm 30in
					HIPS: 99, //cm //39in
					INSEAM: 81, //cm //32in
					CHEST: 94, //cm //37in
					SHOULDER: 35.5, //cm //? //40cmb4
					TORSO: 61.5, //cm //? //58cmb4
					ARM_CIRC: 29, //cm
					WRIST_CIRC: 16.5, //cm
					ARM_LENGTH: 58.5, //cm
					NECK_CIRC: 38,
					HEAD_CIRC: 57, //cm
				});
			}
			if (size === 'L') {
				//16 UK
				dimensions = DIMENSIONS({
					WAIST: 85, //cm 33.5in
					HIPS: 106, //cm 42in
					INSEAM: 82.5, //cm //32.5in
					CHEST: 104, //cm //41in
					SHOULDER: 38, //cm //? //44cmb4
					TORSO: 63, //cm
					ARM_CIRC: 33, //cm
					WRIST_CIRC: 17.5, //cm
					ARM_LENGTH: 60, //cm
					NECK_CIRC: 40.5,
					HEAD_CIRC: 58, //cm
				});
			}
			if (size === 'XL') {
				//20 UK //14W
				dimensions = DIMENSIONS({
					WAIST: 94, //cm 37in
					HIPS: 117, //cm 46in
					INSEAM: 84, //cm //33in
					CHEST: 112, //cm 44in
					SHOULDER: 40, //cm //? //45cmb4
					TORSO: 64.5, //cm
					ARM_CIRC: 36, //cm
					WRIST_CIRC: 18.5, //cm
					ARM_LENGTH: 61, //cm
					NECK_CIRC: 43,
					HEAD_CIRC: 60, //cm
				});
			}
			// if (size === 7) {
			if (size === 'XXL') {
				//24 UK //18/20W
				//XXL
				dimensions = DIMENSIONS({
					WAIST: 109, //cm 43in
					HIPS: 132, //cm 52in
					INSEAM: 86, //cm //34in
					CHEST: 124.5, //cm //49in
					SHOULDER: 42.5, //cm //? //46cmb4
					TORSO: 65.5, //cm //? //69cmb4
					ARM_CIRC: 39.5, //cm
					WRIST_CIRC: 19.5, //cm
					ARM_LENGTH: 61.5, //cm
					NECK_CIRC: 45,
					HEAD_CIRC: 62, //cm
				});
			}
			if (size === '3XL') {
				//22W/24W
				dimensions = DIMENSIONS({
					WAIST: 119.5, //cm 47in
					HIPS: 142, // //56in
					INSEAM: 89, //cm //35in
					CHEST: 134.5, //cm //53in
					SHOULDER: 46, //cm
					TORSO: 66.5, //cm //? //71cmb4
					ARM_CIRC: 42.5, //cm
					WRIST_CIRC: 21, //cm
					ARM_LENGTH: 62, //cm
					NECK_CIRC: 46.5,
					HEAD_CIRC: 64, //cm
				});
			}
			// if (size === 9) {
			if (size === '4XL') {
				//26W/28W
				//4XL
				dimensions = DIMENSIONS({
					WAIST: 130, //cm 51in
					HIPS: 152, //cm 60in
					INSEAM: 91.5, //cm //36in
					CHEST: 145, //cm 57in
					SHOULDER: 50, //cm
					TORSO: 68, //cm
					ARM_CIRC: 44, //cm
					WRIST_CIRC: 22, //cm
					ARM_LENGTH: 66, //cm
					NECK_CIRC: 48,
					HEAD_CIRC: 66, //cm
				});
			}
		}
		if (guide === 'Gender-Neutral') {
			if (size === 'XXS') {
				dimensions = DIMENSIONS({
					//TODO: check these dimensions, measuring everyone in house
					WAIST: 70.5, //cm
					HIPS: 88.5,
					INSEAM: 79.5,
					CHEST: 85.5,
					SHOULDER: 39,
					TORSO: 80.5, //nape to hips
					ARM_CIRC: 30,
					WRIST_CIRC: 14.5,
					ARM_LENGTH: 45, //TO UNDERARM-inner
					NECK_CIRC: 36,
					HEAD_CIRC: 53, //cm //stay for men
				});
			}
			if (size === 'XS') {
				dimensions = DIMENSIONS({
					WAIST: 74, //cm
					HIPS: 92,
					INSEAM: 80.5,
					CHEST: 89,
					SHOULDER: 40,
					TORSO: 82,
					ARM_CIRC: 31,
					WRIST_CIRC: 16,
					ARM_LENGTH: 45.5,
					NECK_CIRC: 37,
					HEAD_CIRC: 54,
				});
			}
			if (size === 'S') {
				dimensions = DIMENSIONS({
					WAIST: 81, //cm
					HIPS: 97,
					INSEAM: 80,
					CHEST: 94.5,
					SHOULDER: 41,
					TORSO: 83, //nape to hips
					ARM_CIRC: 33,
					WRIST_CIRC: 17.5,
					ARM_LENGTH: 46.5, //TO UNDERARM-inner
					NECK_CIRC: 38,
					HEAD_CIRC: 55, //cm
				});
			}
			if (size === 'M') {
				dimensions = DIMENSIONS({
					WAIST: 84, //cm
					HIPS: 102,
					INSEAM: 82,
					CHEST: 99,
					SHOULDER: 43,
					TORSO: 84, //nape to hips
					ARM_CIRC: 35,
					WRIST_CIRC: 19,
					ARM_LENGTH: 47, //TO UNDERARM-inner
					NECK_CIRC: 40,
					HEAD_CIRC: 57, //cm
				});
			}
			if (size === 'L') {
				dimensions = DIMENSIONS({
					WAIST: 92, //cm
					HIPS: 110,
					INSEAM: 83,
					CHEST: 107,
					SHOULDER: 45,
					TORSO: 86.5, //nape to hips
					ARM_CIRC: 38,
					WRIST_CIRC: 20,
					ARM_LENGTH: 49.5, //TO UNDERARM-inner
					NECK_CIRC: 41.5,
					HEAD_CIRC: 58, //cm
				});
			}
			if (size === 'XL') {
				dimensions = DIMENSIONS({
					WAIST: 101, //cm
					HIPS: 116,
					INSEAM: 84,
					CHEST: 114,
					SHOULDER: 45.5,
					TORSO: 88.5, //nape to hips
					ARM_CIRC: 39,
					WRIST_CIRC: 21,
					ARM_LENGTH: 50, //TO UNDERARM-inner
					NECK_CIRC: 44,
					HEAD_CIRC: 60, //cm
				});
			}
			if (size === 'XXL') {
				dimensions = DIMENSIONS({
					WAIST: 119.5, //cm
					HIPS: 131.5,
					INSEAM: 84.5,
					CHEST: 129.5,
					SHOULDER: 49.5,
					TORSO: 92, //nape to hips
					ARM_CIRC: 42,
					WRIST_CIRC: 22.5,
					ARM_LENGTH: 52, //TO UNDERARM-inner
					NECK_CIRC: 46,
					HEAD_CIRC: 62, //cm
				});
			}
			if (size === '3XL') {
				dimensions = DIMENSIONS({
					WAIST: 130, //cm
					HIPS: 140,
					INSEAM: 85,
					CHEST: 140,
					SHOULDER: 50,
					TORSO: 94.5, //nape to hips
					ARM_CIRC: 44.5,
					WRIST_CIRC: 24,
					ARM_LENGTH: 53.5, //TO UNDERARM-inner
					NECK_CIRC: 49,
					HEAD_CIRC: 64, //cm
				});
			}
			// if (size === 9) {
			if (size === '4XL') {
				//26W/28W
				//4XL
				dimensions = DIMENSIONS({
					WAIST: 140, //cm
					HIPS: 145,
					INSEAM: 86,
					CHEST: 150,
					SHOULDER: 53,
					TORSO: 97, //nape to hips
					ARM_CIRC: 47,
					// WRIST_CIRC: ,
					ARM_LENGTH: 49.5, //TO UNDERARM-inner
					NECK_CIRC: 50,
					HEAD_CIRC: 66,
				});
			}
		}
		////
		if (template === 'Sweater') {
			let fits = ['Classic', 'Oversized', 'Fitted'],
				fit = readlineSync.keyInSelect(fits, chalk`{blue.bold ^Which fit?}`);
			fit = fits[fit];
			console.log(chalk.green('-- Fit: ' + fit));
			let sleeve_styles = ['Straight', 'Set-in'],
				sleeve_style = readlineSync.keyInSelect(sleeve_styles, chalk`{blue.bold ^Which sleeve style?}`);
			sleeve_style = sleeve_styles[sleeve_style];
			console.log(chalk.green('-- Sleeve style: ' + sleeve_style));
			let neckline_styles = ['V-neck', 'Scoop-neck', 'Straight-neck'],
				neckline_style = readlineSync.keyInSelect(neckline_styles, chalk`{blue.bold ^Which neckline style?}`);
			template_neckline = neckline_styles[neckline_style];
			console.log(chalk.green('-- Neckline style: ' + template_neckline));
			///
			piece1 = 'sweater front';
			chosen_template = new Sweater();
			chosen_template.calculate(fit, sleeve_style);
			console.log(
				chalk`{green.bold IN KNITOUT -- FOR THE SWEATER FRONT & BACK:} {green Please create two panels that are both ${chosen_template.sweater_bottom_W} cm wide and ${
					chosen_template.sweater_midsection_L + chosen_template.armhole_L
				} cm long.} {green.bold \n-- FOR THE SWEATER SLEEVES:} {green Please create two panels that are both ${chosen_template.sleeve_arm_W} cm wide and ${
					chosen_template.sleeve_total_L
				} cm long.} {green.bold \n***} {green Once you are finished, move the knitout files you produced (in accordance with the specs provided above) to the 'knit-in-files' folder. Then rename them: 'sweater_front', 'sweater_back', and 'sweater_sleeve'} {green.italic (if the sleeves use different files, you can label them with numbers to prevent overlap [i.e., 'sweater_sleeve1' & 'sweater_sleeve2']).} {green \nFinally, enter the file names as prompted below} {green.italic (one file at a time).}`
			); //TODO: cut the last bit of this off/relocate it
			readlineSync.question(chalk.magentaBright('Hit the Enter key when you are finished and ready to upload the files.'), { hideEchoBack: true, mask: '' });
		} else if (template === 'Pants') {
			let styles = ['Flare', 'Oversized', 'Leggings'],
				style = readlineSync.keyInSelect(fits, chalk`{blue.bold ^Which style?}`);
			style = styles[style];
			console.log(chalk.green('-- Style: ' + style));
			let rises = ['High', 'Low'],
				rise = readlineSync.keyInSelect(rises, chalk`{blue.bold ^Which rise?}`);
			rise = rises[rise];
			console.log(chalk.green('-- Rise: ' + rise));
			piece1 = 'pant leg';
			chosen_template = new Pants();
			chosen_template.calculate(style, rise);
			console.log(
				chalk`{green.bold IN KNITOUT -- FOR THE PANT LEGS:} {green Please create panel(s) that are ${chosen_template.pant_leg_W} cm wide and ${
					chosen_template.pant_inseam_L + chosen_template.pant_waist_L
				} cm long.} {green Once you are finished, move the knitout file(s) you produced (in accordance with the specs provided above) to the 'knit-in-files' folder. Then rename them: 'pant_leg'} {green.italic (if the pant legs use different files, you can label them with numbers to prevent overlap [i.e., 'pant_leg1' & 'pant_leg2']).} {green \nFinally, enter the file names as prompted below} {green.italic (one file at a time).}`
			); //TODO: cut the last bit of this off/relocate it
			readlineSync.question(chalk.magentaBright('Hit the Enter key when you are finished and ready to upload the files.'), { hideEchoBack: true, mask: '' });
		} else if (template === 'Skirt') {
			let styles = ['Flare', 'Straight', 'Fitted'],
				style = readlineSync.keyInSelect(fits, chalk`{blue.bold ^Which style?}`);
			style = styles[style];
			console.log(chalk.green('-- Style: ' + style));
			let rises = ['High', 'Low'],
				rise = readlineSync.keyInSelect(rises, chalk`{blue.bold ^Which rise?}`);
			rise = rises[rise];
			console.log(chalk.green('-- Rise: ' + rise));
			let lengths = ['Short', 'Mid', 'Long'],
				length = readlineSync.keyInSelect(rises, chalk`{blue.bold ^Which length?}`);
			length = lengths[length];
			console.log(chalk.green('-- Length: ' + length));
			piece1 = 'skirt front';
			chosen_template = new Skirt();
			chosen_template.calculate(style, rise, length);
			console.log(
				chalk`{green.bold IN KNITOUT -- FOR THE SKIRT FRONT & BACK:} {green Please create panel(s) that are ${chosen_template.skirt_bottom_W} cm wide and ${chosen_template.skirt_L} cm long.} {green Once you are finished, move the knitout file(s) you produced (in accordance with the specs provided above) to the 'knit-in-files' folder. Then rename them: 'skirt_panels'} {green.italic (if the skirt front & back use different files, you can label them with numbers to prevent overlap [i.e., 'skirt_panel1' & 'skirt_panel2']).} {green \nFinally, enter the file names as prompted below} {green.italic (one file at a time).}`
			); //TODO: cut the last bit of this off/relocate it
			readlineSync.question(chalk.magentaBright('Hit the Enter key when you are finished and ready to upload the files.'), { hideEchoBack: true, mask: '' });
		}
	} else {
		dimensions = DIMENSIONS({
			WAIST: readlineSync.questionInt(chalk`{blue.bold \nWhat is the waist measurement} {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			HIPS: readlineSync.questionInt(chalk`{blue.bold \nWhat is the hip measurement {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			INSEAM: readlineSync.questionInt(chalk`{blue.bold \nWhat is the inseam length {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			CHEST: readlineSync.questionInt(chalk`{blue.bold \nWhat is the chest measurement } {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			SHOULDER: readlineSync.questionInt(chalk`{blue.bold \nWhat is the shoulder width {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			TORSO: readlineSync.questionInt(chalk`{blue.bold \nWhat is the torso length {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			ARM_CIRC: readlineSync.questionInt(chalk`{blue.bold \nWhat is the circumference of the upper arm {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			WRIST_CIRC: readlineSync.questionInt(chalk`{blue.bold \nWhat is the circumference of the wrist {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			ARM_LENGTH: readlineSync.questionInt(chalk`{blue.bold \nWhat is the inner arm length {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			NECK_CIRC: readlineSync.questionInt(chalk`{blue.bold \nWhat is the neck circumference {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
			HEAD_CIRC: readlineSync.questionInt(chalk`{blue.bold \nWhat is the head circumference {blue.italic (cm)} {blue.bold ? }`, {
				limit: Number,
				limitMessage: chalk.red('-- $<lastInput> is not a number.'),
			}),
		});
		//TODO: add graphic with explanation of how to measure each
		if (template === 'Sweater') {
			chosen_template = new Sweater();
			chosen_template.calculate();
		} else if (template === 'Pants') {
			chosen_template = new Pants();
			chosen_template.calculate();
		} else if (template === 'Skirt') {
			chosen_template = new Skirt();
			chosen_template.calculate();
		} else if (template === 'Hat') {
			chosen_template = new Hat();
			chosen_template.calculate();
		} else if (template === 'Dress') {
			chosen_template = new Dress();
			chosen_template.calculate();
		} else if (template === 'Tank-Top') {
			chosen_template = new TankTop();
			chosen_template.calculate();
		}
	}
	//TODO: add option of decreasing/increase at custom rate
	//TODO: add saving dimensions option
	// }
}

//-----------------------
//TODO: //COME BACK! FINISH SWATCH STUFF!!
const NEW_SWATCH = ({ TITLE, HEIGHT, WIDTH, NOTES }) => ({
	TITLE,
	HEIGHT,
	WIDTH,
	NOTES,
});

let swatch_data, swatch;
if (
// readlineSync.keyInYNStrict(
// chalk.blue.bold(`Would you like to load dimensions from a stored swatch in the 'swatch_data.json' file? (input 'n' to create a new swatch instead)`)
// )
	readlineSync.keyInYNStrict(
		chalk`{blue.bold \nWould you like to load dimensions from a stored swatch in the 'swatch_data.json' file?} {blueBright.italic (input 'n' to create a new swatch instead)}`
	)
) {
	if (fs.existsSync('INPUT_DATA.json')) {
		//new //COME BACK!
		swatch_data = fs.readFileSync('./swatch_data.json').toString().split(','); //TODO: don't have it start out as existing... create it if it doesn't exist, and then have that be the cause of error below if they try to use it before it exists
	}
	console.log(swatch_data);
	///.split(',');
} else {
	swatch_data === undefined; //remove //?
}
if (swatch_data === undefined || swatch_data[0] === '') {
	//|| swatch_data[0] === '' //remove //?
	if (!swatch_data === undefined && swatch_data[0] === '') {
		console.log(chalk.red(`-- No swatches are currently stored in the 'swatch_data.json' file. Create and new swatch and save it to store data in the file.`));
	}
	let swatch_title;
	let swatch_notes;
	let swatch_height = readlineSync.questionInt(
		chalk`{bold.bgGray.underline \nNEW SWATCH:} {blue.bold What is the height of 10 rows} {blue.italic (cm)} {blue.bold for the yarn you will be using? }`,
		{
			limit: Number,
			limitMessage: chalk`{red -- $<lastInput> is not a number.}`,
		}
	);
	console.log(chalk.green('-- Swatch height: ' + swatch_height));
	let swatch_width = readlineSync.questionInt(
		chalk`{bold.bgGray.underline \nNEW SWATCH:} {blue.bold What is the width of 10 stitches} {blue.italic (cm)} {blue.bold for the yarn you will be using? }`,
		{
			limit: Number,
			limitMessage: chalk`{red -- $<lastInput> is not a number.}`,
		}
	);
	console.log(chalk.green('-- Swatch width: ' + swatch_width));
	if (readlineSync.keyInYNStrict(chalk.blue.bold(`\nWould you like to store this swatch's data for future use?`))) {
		swatch_title = readlineSync.question(chalk`{blueBright.italic \n(OPTIONAL--press enter to skip this step)} {blue.bold Input title for new swatch: }`, {
			defaultInput: '',
		});
		swatch_notes = readlineSync.question(
			chalk`{blueBright.italic \n(OPTIONAL--press enter to skip this step)} {blue.bold \nInput any additional notes to store with the swatch: }`,
			{
				defaultInput: '',
			}
		);
	}
	swatch = NEW_SWATCH({
		TITLE: swatch_title,
		HEIGHT: swatch_height,
		WIDTH: swatch_width,
		NOTES: swatch_notes,
	});
	swatch_data = []; //new
	console.log(swatch); //remove
	swatch_data.push(swatch);
	// console.log(swatch); //remove
} else {
	swatch = readlineSync.keyInSelect(swatch_data, '\nWhich swatch would you like to use?');
	console.log(swatch); //remove
	//TODO: add parsing .json file, then set const NEW_SWATCH paramaters as lines in that file for specific swatch chosen
}

fs.writeFileSync('swatch_data.json', JSON.stringify(swatch_data), 'utf8', (err) => {
	//TODO: maybe move this //? to test-kcode
	if (err) {
		throw err;
	}
});
//-----------------

///////////////////////////////////////////////////////////////
const CM_PER_STITCH = swatch.WIDTH / 10;
const CM_PER_ROW = swatch.HEIGHT / 10;
const STITCHES_PER_CM = 10 / swatch.WIDTH; //new
const ROWS_PER_CM = 10 / swatch.HEIGHT; //new
console.log(`CM_PER_STITCH = ${CM_PER_STITCH}`);
console.log(`CM_PER_ROW = ${CM_PER_ROW}`);

//-----------------

////CONVERT TO STITCHES/ROWS
let convert = {
	...chosen_template,
};
Object.keys(convert).forEach((key) => {
	key.includes('_L') ? (convert[key] = Math.round(convert[key] * ROWS_PER_CM)) : (convert[key] = Math.round(convert[key] * STITCHES_PER_CM)); //new: round for stitches and rows
});

//-----------------

class Remainder {
	REMAINDER_FACTORY(template_bottom_W, template_top_W, template_shaping_rows) {
		this.dec_per_row = [];
		console.log(`template_shaping_rows = ${template_shaping_rows}`); //remove
		console.log(`template_bottom_W = ${template_bottom_W}`); //remove
		console.log(`template_top_W = ${template_top_W}`); //remove
		// for (let p = 0; p < template_shaping_rows; ++p) {
		//   this.dec_per_row.push(1);
		//   console.log(this.dec_per_row); //remove
		// }
		this.dec_interval = Math.floor(template_shaping_rows / (template_bottom_W - template_top_W));
		console.log(`this.dec_interval = ${this.dec_interval}`); //remove
		for (let p = 1; p <= template_shaping_rows + 1; ++p) {
			if (p === 1 && no_dec_row1) {
				this.dec_per_row.push(0);
			} else {
				if (this.dec_interval !== 0) {
					p % this.dec_interval === 0 ? this.dec_per_row.push(1) : this.dec_per_row.push(0);
				} else {
					//new
					this.dec_per_row.push(1);
				}
			}
		}
		if (this.dec_interval === 0) {
			let ceil = Math.ceil(template_shaping_rows / (template_bottom_W - template_top_W)); //COME BACK! maybe change this to floor?
			let remainder = Math.floor(template_bottom_W - template_shaping_rows * ceil - template_top_W);
			if (remainder % template_shaping_rows === 0) {
				//TODO: check this
				this.dec_interval = Math.floor(template_shaping_rows / remainder);
				this.dec_per_row = this.dec_per_row.map((value) => (value += remainder / template_shaping_rows));
				this.dec_per_row.splice(0, 1, 0); //TODO: check to see if this needs to happen (to make sure the first row doesn't include decreases)
				console.log(`NOW: (first alt) this.dec_per_row = ${this.dec_per_row}`); //remove
			} else {
				// this.dec_interval = 1;
				this.dec_interval = Math.floor(template_shaping_rows / remainder);
				if (this.dec_interval === 0) {
					//new //?
					this.dec_interval = 1;
				}
				console.log(`this.dec_interval = ${this.dec_interval}`); //remove
				remainder = Math.ceil(remainder / template_shaping_rows);
				// for (let i = 0; i < template_shaping_rows; ++i) {
				// for (let i = 1; i <= template_shaping_rows + 1; ++i) { //go back! //?
				for (let i = 1; i <= template_shaping_rows; ++i) {
					console.log(chalk.red(`remainder = ${remainder}`)); //remove
					if (i % this.dec_interval === 0) {
						// if (i === template_shaping_rows + 1) {
						//   this.dec_per_row[i] += remainder;
						// } else {
						let arr = [...this.dec_per_row];
						console.log(arr.reduce((a, b) => a + b, 0) + remainder);
						console.log(template_top_W);
						// if (arr.reduce((a, b) => a + b, 0) + remainder <= template_bottom_W - template_top_W) { //go back! //?
						if (arr.reduce((a, b) => a + b, 0) <= template_bottom_W - template_top_W) {
							//?
							this.dec_per_row[i] += remainder;
						} else {
							remainder > 0 ? (remainder -= 1) : (remainder = 0);
						}

						// this.dec_per_row[i] += Math.ceil(remainder / 2);
						// this.dec_per_row[i] += Math.ceil(remainder / template_shaping_rows);
						// remainder -= Math.ceil(remainder / 2);
						// remainder -= Math.ceil(remainder / template_shaping_rows);
					}
					// if (remainder <= 0) {
					//   console.log(chalk`{red.bold ERR:} {red remainder too small}`); //TODO: deal with this / figure out why error happens
					//   break;
					// }
					console.log(`NOW: (second alt) this.dec_per_row = ${this.dec_per_row}`); //remove
				}
			}
		}
		console.log(`in func: dec_per_row = ${this.dec_per_row}`); //remove
	}
}

///////////////////////////
let left_int, right_int;
const decRatio = (left_ratio, right_ratio, section_length) => {
	let total_ratio = left_ratio + right_ratio;
	left_int = (left_ratio / total_ratio) * section_length;
	right_int = (right_ratio / total_ratio) * section_length;
	left_int = Math.round(left_int);
	right_int = Math.round(right_int);
	if (left_int % right_int === 0) {
		left_int = left_int / right_int;
		right_int = 1;
	}
	if (right_int % left_int === 0) {
		right_int = right_int / left_int;
		left_int = 1;
	}
	console.log(`left_int = ${left_int}`); //remove
	console.log(`right_int = ${right_int}`); //remove
};

const templateCode = (section, section_length, section_top, template_code, stitch_pattern) => {
	console.log(`template_width = ${template_width}`); //remove
	console.log(`template_height = ${template_height}`); //remove
	let shape_row = [];
	let big_int, small_int; //new
	let uneven_int = 0; //new
	let dec_left = true;
	if (stitch_pattern !== undefined) template_code.push(stitch_pattern);
	left_int > right_int ? (big_int = left_int) && (small_int = right_int) : (big_int = right_int) && (small_int = left_int);
	for (let y = 0; y < section_length; ++y) {
		let dec_count = section.dec_per_row[y];
		// console.log(`dec_count = ${dec_count}`); //remove
		let working_needles = template_Rneedle - template_Lneedle + 1; //TODO: check this
		// console.log(`working_needles = ${working_needles}`); //remove
		// console.log(`template_Lneedle = ${template_Lneedle}`); //remove
		// console.log(`template_Rneedle = ${template_Rneedle}`); //remove
		if ((y + 1) % section.dec_interval === 0 && working_needles - dec_count >= section_top) {
			//new
			if (!uneven_dec) {
				if (dec_count % 2 === 0) {
					//TODO: have this based off of direction of pass in row where dec is happening; //? OR have option to flip the sweater code produced if first row is not in right direction
					template_Lneedle += dec_count / 2;
					template_Rneedle -= dec_count / 2;
				} else {
					dec_left
						? // y % 2 === 0 //new ////(switched -- so default is for template_Rneedle to be greater if uneven [this is bc, when splitting neckline, right side is more likely to get less needles])
						((template_Rneedle -= Math.floor(dec_count / 2)), (template_Lneedle += Math.ceil(dec_count / 2)), (dec_left = false))
						: ((template_Lneedle += Math.floor(dec_count / 2)), (template_Rneedle -= Math.ceil(dec_count / 2)), (dec_left = true));
					// dec_left = false;
				}
			} else {
				uneven_int < big_int ? ++uneven_int : (uneven_int = 0);
				if (uneven_int > big_int - small_int) {
					//new
					//TODO: make this work for decreasing on both sides simultaneously too
					left_int > right_int ? (template_Rneedle -= dec_count) : (template_Lneedle += dec_count);
				} else {
					left_int > right_int ? (template_Lneedle += dec_count) : (template_Rneedle -= dec_count);
				}
			}
		}
		for (let x = 1; x <= template_width; ++x) {
			//new
			////x goes to widest part of shape
			x >= template_Lneedle && x <= template_Rneedle ? shape_row.push(1) : shape_row.push(0);
			if (x === template_width) {
				template_code.push(shape_row); //go back! //?
				// ++arr_count; //new //come back!
				shape_row = [];
				// break //? is this necessary?
			}
		}
	}
};
//////////////////////////////
//come back! add here
if (piece1 === 'sweater front') {
	template_width = convert.sweater_bottom_W;
	template_height = convert.sweater_midsection_L + convert.armhole_L - 1; //? minus -1? //new
} else if (piece1 === 'pant leg') {
	template_width = convert.hip_W; ////max width
	template_height = convert.inseam_L + convert.rise_L + convert.waistrib_L;
}

let piece_code1 = [];
let piece_shortrow_code1 = [];

//----------
//***SWEATER
//----------
////SWEATER BODY
let uneven_dec = false;
let no_dec_row1 = true;
let template_Lneedle = 1;
let template_Rneedle = convert.sweater_bottom_W; //? - 1 ?

////1.SWEATER BODY: MIDSECTION (NON-ARMHOLE AREA)
let midsection = new Remainder();
midsection.REMAINDER_FACTORY(convert.sweater_bottom_W, convert.sweater_chest_W, convert.sweater_midsection_L - 1);
decRatio(1, 1, convert.sweater_midsection_L - 1); //last one (section_length) -1 //? //new  //COME BACK! //? add one of these for the two below?
templateCode(midsection, convert.sweater_midsection_L, convert.sweater_chest_W, piece_code1);

///////////////////////////////////////////////
////2.SWEATER BODY: SLOPED ARMHOLE SECTION
no_dec_row1 = false;
let armhole;
if (convert.armhole_sloped_L !== 0) {
	armhole = new Remainder();
	armhole.REMAINDER_FACTORY(convert.sweater_chest_W, convert.sweater_top_W, convert.armhole_sloped_L - 1);
	templateCode(armhole, convert.armhole_sloped_L, convert.sweater_top_W, piece_code1);
}

///////////////////////////////////////////////
////3.SWEATER BODY: STRAIGHT ARMHOLE SECTION
let straight_section_length = convert.armhole_L - convert.armhole_sloped_L - convert.neckline_L;
console.log(`straight_section_length = ${straight_section_length}`); //remove
if (straight_section_length < 0) {
	console.log('!!! ERR: neckline too long!'); //TODO: make this better
}

let straight = new Remainder();
straight.REMAINDER_FACTORY(convert.sweater_bottom_W, convert.sweater_chest_W, convert.sweater_midsection_L - 1);
decRatio(1, 1, straight_section_length - 1); //last one (section_length) -1 //? //new  //COME BACK! //remove //?

templateCode(straight, straight_section_length, convert.sweater_top_W, piece_code1); //TODO: determine if this causes issues if straight === 0  //TODO: figure out why this isn't working

///////////////////////////////////////////////
no_dec_row1 = true;
// let uneven_sides;
template_width - template_Rneedle !== template_width - template_Lneedle ? (uneven_sides = true) : (uneven_sides = false); //new //?
////4.SWEATER BODY: NECKLINE SECTION //TODO: make current calcs for v-neck, and then add option of scoop neck
////values for if neckline === V-neck
let rightside_Rneedle = template_Rneedle;
let rightside_Lneedle, neckline_section_bottomL, neckline_section_bottomR;
neckline_section_bottomL = neckline_section_bottomR = (template_Rneedle - template_Lneedle) / 2;
template_Rneedle = Math.floor(template_Rneedle - neckline_section_bottomL);
rightside_Lneedle = Math.ceil(template_Lneedle + neckline_section_bottomR);

let neckline_section_length = convert.neckline_L;
let neckline_section_top = convert.sweater_shoulder_W;
let neckline_slopes = 1;

///
if (template_neckline === 'Scoop-neck') {
	let neckline_bindoff = Math.round(convert.neckline_W * 0.4);
	rightside_Lneedle += Math.ceil(neckline_bindoff / 2); //TODO: determine if these should be like this or just round here
	template_Rneedle -= Math.floor(neckline_bindoff / 2);
	///
	neckline_section_bottomL = neckline_section_bottomR -= neckline_bindoff / 2; //new //!!!!!! //come back!
	neckline_section_top = Math.ceil(neckline_section_top * 1.1); //come back! ceil or floor //?
	neckline_section_length = Math.ceil((neckline_section_bottomL - neckline_section_top) / 3); //new ////so it is 3 dec per row
	neckline_slopes = 3;
}

Number.isInteger(neckline_section_bottomL) //come back! moved //?
	? (neckline_section_bottomR += 1)
	: ((neckline_section_bottomL = Math.floor(neckline_section_bottomL)), (neckline_section_bottomR = Math.ceil(neckline_section_bottomR)));

let shortrow_arrL = [];
let shortrow_arrR = [];
uneven_dec = true;
let left_ratio = 0; //TODO: remove = #; when bring the thing below back
let right_ratio = 1;

let first_length = neckline_section_length;
let second_length = Math.ceil((convert.neckline_L - first_length) / 2);
for (let i = 0; i < neckline_slopes; ++i) {
	if (i > 0) {
		no_dec_row1 = false;
		neckline_section_bottomL = neckline_section_top;
		neckline_section_top = convert.sweater_shoulder_W;
		neckline_section_length = second_length;
		if (i > 1) {
			neckline_section_length = convert.neckline_L - first_length - second_length;
		}
	}
	decRatio(left_ratio, right_ratio, neckline_section_length - 1);
	let neckline = new Remainder();
	neckline.REMAINDER_FACTORY(neckline_section_bottomL, neckline_section_top, neckline_section_length - 1);
	templateCode(neckline, neckline_section_length, neckline_section_top, shortrow_arrL);
}
////////////////////////////
template_Rneedle = rightside_Rneedle;
template_Lneedle = rightside_Lneedle;
left_ratio = 1; //TODO: remove = #; when bring the thing below back //FIXME: actually, no, just do the suggested thing below when deciding which shortrow_arr to pull from first
right_ratio = 0;
no_dec_row1 = true;
if (template_neckline === 'Scoop-neck') {
	neckline_section_top = Math.ceil(convert.sweater_shoulder_W * 1.1); ////reset
	neckline_section_length = first_length;
}
for (let i = 0; i < neckline_slopes; ++i) {
	if (i > 0) {
		no_dec_row1 = false;
		neckline_section_bottomR = neckline_section_top;
		neckline_section_top = convert.sweater_shoulder_W;
		neckline_section_length = second_length;
		if (i > 1) {
			neckline_section_length = convert.neckline_L - first_length - second_length;
		}
	}
	decRatio(left_ratio, right_ratio, neckline_section_length - 1);
	let shortrow_neckline = new Remainder();
	shortrow_neckline.REMAINDER_FACTORY(neckline_section_bottomR, neckline_section_top, neckline_section_length - 1);
	templateCode(shortrow_neckline, neckline_section_length, neckline_section_top, shortrow_arrR);
}

for (let i = 0; i < shortrow_arrL.length; ++i) {
	piece_shortrow_code1.push(shortrow_arrL[i]);
	if (i + 1 < shortrow_arrL.length) {
		piece_shortrow_code1.push(shortrow_arrL[i + 1]);
	} else {
		piece_shortrow_code1.push(shortrow_arrL[i]); //kickback pass
	}
	piece_shortrow_code1.push(shortrow_arrR[i]);
	if (i + 1 < shortrow_arrR.length) {
		piece_shortrow_code1.push(shortrow_arrR[i + 1]);
	} else {
		piece_shortrow_code1.push(shortrow_arrR[i]); ////kickback pass
	}
	++i;
}

//--------
//***PANTS
//--------
//TODO: check over/run this
////1. PANT LEG INSEAM
uneven_dec = false;
no_dec_row1 = true;
template_Lneedle = 1;
template_Rneedle = convert.ankle_W;

let leg = new Remainder();
leg.REMAINDER_FACTORY(convert.ankle_W, convert.hip_W, convert.inseam_L - 1);
decRatio(1, 1, convert.inseam_L - 1);
templateCode(leg, convert.inseam_L, convert.hip_W, piece_code1);

///////////////////////////////////////////////
////2. RISE: CROTCH SECTION
//TODO: maybe don't have it automatically figure out this, but tell it the slope / amount of dec per section (also tell it always dec every 2 rows ?)
uneven_dec = true; //? //come back! and //check this
no_dec_row1 = false;
let crotch = new Remainder();
crotch.REMAINDER_FACTORY(convert.hip_W, convert.waist_W, convert.crotch_L - 1);
decRatio(8, 9, convert.crotch_L - 1); //last one (section_length) -1 //TODO: consider changing decRatio to true ratio (47:53)
templateCode(crotch, convert.crotch_L, convert.waist_W, piece_code1);

///////////////////////////////////////////////
////3. RAISE: STRAIGHT SECTION
straight_section_length = convert.rise_L - convert.crotch_L;
straight = new Remainder();
straight.REMAINDER_FACTORY(convert.waist_W, convert.waist_W, straight_section_length - 1);
decRatio(1, 1, straight_section_length - 1); //COME BACK! //remove //?
templateCode(straight, straight_section_length, convert.waist_W, piece_code1);

///////////////////////////////////////////////
////4. WAIST RIB
//TODO: add feature for indicating that this rib/tension changes or something
let waist_rib = new Remainder();
waist_rib.REMAINDER_FACTORY(convert.waist_W, convert.waist_W, convert.waistrib_L - 1);
// decRatio(1, 1, waistrib_L - 1); //COME BACK! //remove //?
templateCode(waist_rib, waistrib_L, convert.waist_W, piece_code1, 'Pattern: 1x1rib');

//-----------------------
pieces_arr.push(piece_code1);

let piece_obj1 = {};
for (let i = 0; i < piece_code1.length; ++i) {
	piece_obj1 = { ...piece_obj1, ...{ [i]: piece_code1[i] } };
}
let piece_shortrow_obj1 = {};
for (let i = 0; i < piece_shortrow_code1.length; ++i) {
	piece_shortrow_obj1 = { ...piece_shortrow_obj1, ...{ [i]: piece_shortrow_code1[i] } };
}

let piece_shortrow_objL = {};
for (let i = 0; i < shortrow_arrL.length; ++i) {
	piece_shortrow_objL = { ...piece_shortrow_objL, ...{ [i]: shortrow_arrL[i] } };
}
let piece_shortrow_objR = {};
for (let i = 0; i < shortrow_arrR.length; ++i) {
	piece_shortrow_objR = { ...piece_shortrow_objR, ...{ [i]: shortrow_arrR[i] } };
}

module.exports = {
	template,
	piece_obj1,
	piece_shortrow_obj1,
	piece_shortrow_objL,
	piece_shortrow_objR,
	pieces_arr, //new ////for keeping track off how many pieces there are
};

// --------------------
//remove, for testing purposes (all below)
let piece1_file = JSON.stringify(piece_code1)
	.replace('"', '')
	.replace(/\[|\]]/gi, '')
	.split('],');
piece1_file = piece1_file.join('\n');
fs.writeFileSync('piece_code1.txt', piece1_file, 'utf8', (err) => {
	if (err) {
		throw err;
	}
});

let shortrow_file = JSON.stringify(piece_shortrow_code1)
	.replace('"', '')
	.replace(/\[|\]]/gi, '')
	.split('],');
shortrow_file = shortrow_file.join('\n');
fs.writeFileSync('piece_shortrow_code1.txt', shortrow_file, 'utf8', (err) => {
	if (err) {
		throw err;
	}
});

let shortrow_file_arr2 = JSON.stringify(shortrow_arrR)
	.replace('"', '')
	.replace(/\[|\]]/gi, '')
	.split('],');
shortrow_file_arr2 = shortrow_file_arr2.join('\n');
fs.writeFileSync('shortrow_arrR.txt', shortrow_file_arr2, 'utf8', (err) => {
	if (err) {
		throw err;
	}
});
